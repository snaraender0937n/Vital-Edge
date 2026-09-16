import json
import logging
import time
from typing import Optional, Tuple
from models import RawTelemetryPacket
import config

logger = logging.getLogger("vitaledge.validator")

def parse_and_validate_telemetry(raw_str: str, source: str = "serial") -> Tuple[Optional[RawTelemetryPacket], Optional[str]]:
    """
    Parses a JSON line and validates bounds/types.
    Returns (RawTelemetryPacket, None) if valid, or (None, error_reason) if invalid.
    """
    cleaned = raw_str.strip()
    if not cleaned:
        return None, "Empty line"
    
    # Must look like JSON
    if not (cleaned.startswith("{") and cleaned.endswith("}")):
        return None, "Not a valid JSON object string"
        
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        return None, f"JSON decode error: {e}"
        
    if not isinstance(data, dict):
        return None, "Parsed JSON is not an object"

    # Normalize keys if needed
    # HR / BPM
    hr = data.get("hr", data.get("bpm"))
    if hr is not None:
        try:
            hr = float(hr)
            if hr < 0 or hr > 260:
                hr = None
        except (ValueError, TypeError):
            hr = None

    bpm = hr

    # SpO2
    spo2 = data.get("spo2")
    if spo2 is not None:
        try:
            spo2 = float(spo2)
            if spo2 < 50 or spo2 > 100:
                # Sensor might report 0 or erroneous values when finger detached
                if spo2 == 0:
                    spo2 = None
        except (ValueError, TypeError):
            spo2 = None

    # Temperature
    temp = data.get("temperature", data.get("temp"))
    if temp is not None:
        try:
            temp = float(temp)
            if temp < 20.0 or temp > 50.0:
                temp = None
        except (ValueError, TypeError):
            temp = None

    # Movement
    movement = data.get("movement", data.get("motion"))
    if movement is not None:
        try:
            movement = float(movement)
        except (ValueError, TypeError):
            movement = None

    # Temperature drift
    tempDrift = data.get("tempDrift")
    if tempDrift is not None:
        try:
            tempDrift = float(tempDrift)
        except (ValueError, TypeError):
            tempDrift = 0.0

    # ECG
    ecg = data.get("ecg")
    if ecg is not None:
        try:
            ecg = float(ecg)
        except (ValueError, TypeError):
            ecg = None

    leadsOff = bool(data.get("leadsOff", False))
    sos = bool(data.get("sos", False))
    buzzer = bool(data.get("buzzer", False))
    
    # Risk Score & Level
    riskScore = data.get("riskScore")
    if riskScore is not None:
        try:
            riskScore = float(riskScore)
        except (ValueError, TypeError):
            riskScore = None

    riskLevel = data.get("riskLevel", "NORMAL")
    if riskLevel not in ["NORMAL", "WARNING", "HIGH"]:
        riskLevel = "NORMAL"

    # GPS coordinates
    lat = data.get("latitude")
    lon = data.get("longitude")
    alt = data.get("altitude", 20.0)
    sats = data.get("satellites", 0)
    gpsFix = bool(data.get("gpsFix", False))

    # Validate coordinate sanity
    if lat is not None and lon is not None:
        try:
            lat = float(lat)
            lon = float(lon)
            alt = float(alt) if alt is not None else 20.0
            sats = int(sats) if sats is not None else 0
            # Ensure not 0.0, 0.0 unless genuine, but 0,0 is Gulf of Guinea
            if abs(lat) > 90 or abs(lon) > 180 or (lat == 0.0 and lon == 0.0):
                lat = None
                lon = None
                gpsFix = False
        except (ValueError, TypeError):
            lat = None
            lon = None
            gpsFix = False
    else:
        lat = None
        lon = None
        gpsFix = False

    device_id = str(data.get("device", config.DEVICE_ID))
    packet_time = data.get("timestamp", time.time())
    seq = data.get("seq")

    packet = RawTelemetryPacket(
        device=device_id,
        bpm=bpm,
        hr=hr,
        spo2=spo2,
        temperature=temp,
        movement=movement,
        tempDrift=tempDrift,
        ecg=ecg,
        leadsOff=leadsOff,
        riskScore=riskScore,
        riskLevel=riskLevel,
        sos=sos,
        buzzer=buzzer,
        latitude=lat,
        longitude=lon,
        altitude=alt,
        satellites=sats,
        gpsFix=gpsFix,
        timestamp=packet_time,
        seq=seq,
        source=source
    )
    return packet, None
