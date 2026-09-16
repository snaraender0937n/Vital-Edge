import time
import logging
from typing import Optional, List, Dict, Any
import config
from models import NormalizedTelemetryState, SystemStatus, RawTelemetryPacket, EmergencyEvent
from database import db
from pm25_simulator import pm25_sim

logger = logging.getLogger("vitaledge.live_state")

class LiveStateManager:
    def __init__(self):
        self.state = NormalizedTelemetryState()
        self.last_serial_activity: Optional[float] = None
        self.last_udp_activity: Optional[float] = None
        self.serial_port_status: str = "NOT AVAILABLE"
        self.udp_listener_status: str = "NO DATA"
        self.prev_sos: bool = False

    def update_hardware_status(self, serial_status: Optional[str] = None, udp_status: Optional[str] = None):
        if serial_status is not None:
            self.serial_port_status = serial_status
        if udp_status is not None:
            self.udp_listener_status = udp_status

    def process_telemetry(self, packet: RawTelemetryPacket) -> NormalizedTelemetryState:
        now = time.time()
        self.state.last_seen = now
        self.state.communication_state = "LIVE"
        self.state.device = packet.device or config.DEVICE_ID
        self.state.data_source = "COM9" if packet.source == "serial" else "UDP:5005"

        if packet.source == "serial":
            self.last_serial_activity = now
            self.serial_port_status = "CONNECTED"
        elif packet.source == "udp":
            self.last_udp_activity = now
            self.udp_listener_status = "RECEIVING"

        # Hardware connection states
        self.state.system.lilygo = "ONLINE"
        self.state.system.xiao = "ONLINE"
        self.state.system.esp_now = "CONNECTED"

        # Vitals - Only update from hardware!
        self.state.hr = packet.hr
        self.state.bpm = packet.bpm or packet.hr
        self.state.spo2 = packet.spo2
        self.state.temperature = packet.temperature
        self.state.tempDrift = packet.tempDrift
        self.state.movement = packet.movement
        self.state.ecg = packet.ecg
        self.state.leadsOff = packet.leadsOff
        self.state.riskScore = packet.riskScore
        self.state.riskLevel = packet.riskLevel

        # Actuators & SOS
        self.state.buzzer = packet.buzzer
        new_sos = packet.sos
        if new_sos and not self.prev_sos:
            # Transitioned to active SOS -> log event in DB
            logger.warning(f"EMERGENCY SOS TRIGGERED by {self.state.device}!")
            ev = EmergencyEvent(
                timestamp=now,
                device_id=self.state.device,
                event_type="SOS_BUTTON_PRESSED",
                risk_score=packet.riskScore,
                latitude=self.state.latitude,
                longitude=self.state.longitude,
                acknowledged=False
            )
            db.insert_emergency_event(ev)
        self.prev_sos = new_sos
        self.state.sos = new_sos

        # Sensors health validation based on packet
        self.state.system.max30102 = "VALID" if (packet.hr is not None and packet.spo2 is not None) else "UNAVAILABLE"
        self.state.system.mpu6050 = "VALID" if packet.movement is not None else "UNAVAILABLE"
        self.state.system.ds18b20 = "VALID" if packet.temperature is not None else "UNAVAILABLE"
        
        if packet.leadsOff:
            self.state.system.ecg = "LEAD OFF"
        elif packet.ecg is not None:
            self.state.system.ecg = "ACTIVE"
        else:
            self.state.system.ecg = "UNAVAILABLE"

        # GNSS Handling
        if packet.gpsFix and packet.latitude is not None and packet.longitude is not None:
            self.state.latitude = packet.latitude
            self.state.longitude = packet.longitude
            self.state.altitude = packet.altitude or 20.0
            self.state.satellites = packet.satellites or 4
            self.state.gpsFix = True
            self.state.gpsSource = "real_gnss"
            self.state.locationLabel = "GPS VIT Chennai (GNSS)"
            self.state.system.gnss = "AVAILABLE"
        else:
            # Fallback to predefined VIT Chennai coordinates
            self.state.latitude = config.VIT_CHENNAI_LAT
            self.state.longitude = config.VIT_CHENNAI_LON
            self.state.altitude = config.VIT_CHENNAI_ALT
            self.state.satellites = packet.satellites or 0
            self.state.gpsFix = False  # NEVER FALSELY REPORT TRUE GNSS FIX
            self.state.gpsSource = "fallback_vit_chennai"
            self.state.locationLabel = "GPS VIT Chennai"
            self.state.system.gnss = "SEARCHING"

        # Persist into database
        db.insert_telemetry(packet)

        # Refresh PM2.5 and system statuses
        return self.get_snapshot()

    def evaluate_freshness(self) -> NormalizedTelemetryState:
        """Periodic tick to evaluate staleness/offline timeouts"""
        now = time.time()
        
        # Check overall telemetry freshness
        if self.state.last_seen is not None:
            age = now - self.state.last_seen
            self.state.age_seconds = round(age, 1)

            if age >= config.OFFLINE_THRESHOLD_SEC:
                # Disappeared -> NO LIVE TELEMETRY
                self.state.communication_state = "NO LIVE TELEMETRY"
                self.state.data_source = None
                
                # REVERT VALUES TO MISSING (--), NEVER INVENT VALUES!
                self.state.hr = None
                self.state.bpm = None
                self.state.spo2 = None
                self.state.temperature = None
                self.state.tempDrift = None
                self.state.movement = None
                self.state.ecg = None
                self.state.riskScore = None
                self.state.riskLevel = None
                self.state.sos = False
                self.state.buzzer = False

                self.state.system.xiao = "OFFLINE"
                self.state.system.lilygo = "OFFLINE"
                self.state.system.esp_now = "LOST"
                self.state.system.max30102 = "UNAVAILABLE"
                self.state.system.mpu6050 = "UNAVAILABLE"
                self.state.system.ds18b20 = "UNAVAILABLE"
                self.state.system.ecg = "UNAVAILABLE"
                self.state.system.gnss = "SEARCHING"

            elif age >= config.STALE_THRESHOLD_SEC:
                # Stale warning
                self.state.communication_state = "STALE DATA"
        else:
            self.state.communication_state = "NO LIVE TELEMETRY"
            self.state.age_seconds = None

        # Check port statuses
        if self.last_serial_activity is not None and (now - self.last_serial_activity > config.OFFLINE_THRESHOLD_SEC):
            if self.serial_port_status == "CONNECTED":
                self.serial_port_status = "NO DATA"

        if self.last_udp_activity is not None and (now - self.last_udp_activity > config.OFFLINE_THRESHOLD_SEC):
            self.udp_listener_status = "NO DATA"

        return self.get_snapshot()

    def get_snapshot(self) -> NormalizedTelemetryState:
        # Update PM2.5 simulated reading
        pm25_val, pm25_stat = pm25_sim.update()
        self.state.pm25 = pm25_val
        self.state.pm25Status = pm25_stat

        # Update system matrix from tracking vars
        self.state.system.serial = self.serial_port_status  # CONNECTED / NO DATA / NOT AVAILABLE
        self.state.system.udp = self.udp_listener_status    # RECEIVING / NO DATA
        self.state.system.backend = "RUNNING"
        self.state.system.database = "ACTIVE"
        self.state.system.pm25 = "SIMULATED"

        return self.state

live_manager = LiveStateManager()
