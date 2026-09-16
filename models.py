from pydantic import BaseModel, Field
from typing import Optional, List, Literal

class RawTelemetryPacket(BaseModel):
    """Raw telemetry payload sent by LilyGO over Serial or UDP"""
    device: Optional[str] = "VITALEDGE-001"
    bpm: Optional[float] = None
    hr: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    movement: Optional[float] = None
    tempDrift: Optional[float] = None
    ecg: Optional[float] = None
    leadsOff: Optional[bool] = False
    riskScore: Optional[float] = None
    riskLevel: Optional[str] = "NORMAL"
    sos: Optional[bool] = False
    buzzer: Optional[bool] = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    satellites: Optional[int] = 0
    gpsFix: Optional[bool] = False
    timestamp: Optional[float] = None
    seq: Optional[int] = None
    source: Optional[str] = "serial"  # 'serial' or 'udp'

class SystemStatus(BaseModel):
    xiao: Literal["ONLINE", "OFFLINE"] = "OFFLINE"
    esp_now: Literal["CONNECTED", "LOST"] = "LOST"
    lilygo: Literal["ONLINE", "OFFLINE"] = "OFFLINE"
    serial: Literal["CONNECTED", "NO DATA", "NOT AVAILABLE"] = "NOT AVAILABLE"
    udp: Literal["RECEIVING", "NO DATA"] = "NO DATA"
    backend: Literal["RUNNING", "ERROR"] = "RUNNING"
    websocket: Literal["CONNECTED", "DISCONNECTED"] = "CONNECTED"
    database: Literal["ACTIVE", "ERROR"] = "ACTIVE"
    gnss: Literal["AVAILABLE", "SEARCHING"] = "SEARCHING"
    lte: Literal["READY", "NOT REGISTERED", "UNKNOWN"] = "READY"
    max30102: Literal["VALID", "UNAVAILABLE"] = "UNAVAILABLE"
    mpu6050: Literal["VALID", "UNAVAILABLE"] = "UNAVAILABLE"
    ds18b20: Literal["VALID", "UNAVAILABLE"] = "UNAVAILABLE"
    ecg: Literal["ACTIVE", "LEAD OFF", "UNAVAILABLE"] = "UNAVAILABLE"
    pm25: Literal["SIMULATED"] = "SIMULATED"

class NormalizedTelemetryState(BaseModel):
    """Normalized live state exposed to frontend via WebSocket / REST"""
    device: str = "VITALEDGE-001"
    communication_state: Literal["NO LIVE TELEMETRY", "STALE DATA", "LIVE", "DEGRADED"] = "NO LIVE TELEMETRY"
    last_seen: Optional[float] = None
    age_seconds: Optional[float] = None
    data_source: Optional[str] = None  # 'COM9' or 'UDP:5005'
    
    # Physiological vitals (None = displayed as '--')
    bpm: Optional[float] = None
    hr: Optional[float] = None
    spo2: Optional[float] = None
    temperature: Optional[float] = None
    tempDrift: Optional[float] = None
    movement: Optional[float] = None
    ecg: Optional[float] = None
    leadsOff: bool = False
    riskScore: Optional[float] = None
    riskLevel: Optional[str] = None  # 'NORMAL', 'WARNING', 'HIGH', or None
    
    # Emergency & Actuators
    sos: bool = False
    buzzer: bool = False
    
    # Location
    latitude: float = 12.840784
    longitude: float = 80.154024
    altitude: float = 20.0
    satellites: int = 0
    gpsFix: bool = False
    gpsSource: Literal["real_gnss", "fallback_vit_chennai"] = "fallback_vit_chennai"
    locationLabel: str = "GPS VIT Chennai"
    
    # Environmental (Simulated locally)
    pm25: float = 28.0
    pm25Status: Literal["GOOD", "MODERATE", "HIGH"] = "GOOD"
    
    # System Status Matrix
    system: SystemStatus = Field(default_factory=SystemStatus)

class EmergencyEvent(BaseModel):
    id: Optional[int] = None
    timestamp: float
    device_id: str
    event_type: str
    risk_score: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    acknowledged: bool = False
