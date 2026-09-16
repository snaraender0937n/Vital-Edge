import urllib.request
import json
import socket
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def get_status():
    req = urllib.request.urlopen(f"{BASE_URL}/api/status")
    return json.loads(req.read().decode('utf-8'))

def get_emergencies():
    req = urllib.request.urlopen(f"{BASE_URL}/api/emergency")
    return json.loads(req.read().decode('utf-8'))

def send_udp_packet(packet_dict):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    raw = json.dumps(packet_dict) + "\n"
    sock.sendto(raw.encode('utf-8'), ("127.0.0.1", 5005))
    sock.close()

def main():
    print("==================================================")
    print("VITALEDGE END-TO-END TELEMETRY PIPELINE VALIDATION")
    print("==================================================")

    # 1. Verify Anti-Mock Initial State
    print("\n[STEP 1] Validating Anti-Mock Initial State (No Hardware)...")
    initial = get_status()
    state = initial["state"]
    print(f"  Communication State: {state['communication_state']}")
    print(f"  Vitals: HR={state['hr']}, SpO2={state['spo2']}, Temp={state['temperature']}, Motion={state['movement']}, Risk={state['riskLevel']}")
    print(f"  System Matrix: XIAO={state['system']['xiao']}, LilyGO={state['system']['lilygo']}, Serial={state['system']['serial']}, PM2.5={state['system']['pm25']}")
    print(f"  GPS: {state['locationLabel']} (Lat:{state['latitude']}, Lon:{state['longitude']}, Fix:{state['gpsFix']})")
    print(f"  PM2.5 (Simulated): {state['pm25']} ug/m3 ({state['pm25Status']})")

    assert state["communication_state"] == "NO LIVE TELEMETRY", "Anti-mock failed: expected NO LIVE TELEMETRY"
    assert state["hr"] is None, "Anti-mock failed: HR must be None/--"
    assert state["spo2"] is None, "Anti-mock failed: SpO2 must be None/--"
    assert state["temperature"] is None, "Anti-mock failed: Temperature must be None/--"
    assert state["movement"] is None, "Anti-mock failed: Movement must be None/--"
    assert state["riskScore"] is None, "Anti-mock failed: Risk must be None/--"
    assert state["system"]["xiao"] == "OFFLINE", "XIAO must be OFFLINE"
    assert state["system"]["lilygo"] == "OFFLINE", "LilyGO must be OFFLINE"
    assert state["gpsFix"] is False, "GPS fix must strictly be False on fallback"
    print("  >>> PASS: Anti-Mock compliance verified successfully!")

    # 2. Ingest Hardware Telemetry
    print("\n[STEP 2] Injecting Structured Hardware Telemetry Packet via UDP:5005...")
    telemetry_sample = {
        "device": "VITALEDGE-001",
        "bpm": 74.0,
        "hr": 74.0,
        "spo2": 99.0,
        "temperature": 36.65,
        "movement": 3.20,
        "tempDrift": 0.015,
        "ecg": 0.85,
        "leadsOff": False,
        "riskScore": 18.0,
        "riskLevel": "NORMAL",
        "sos": False,
        "buzzer": False,
        "latitude": 12.840784,
        "longitude": 80.154024,
        "altitude": 20.0,
        "satellites": 0,
        "gpsFix": False
    }
    send_udp_packet(telemetry_sample)
    time.sleep(0.5)

    live = get_status()["state"]
    print(f"  Communication State: {live['communication_state']}")
    print(f"  Vitals: HR={live['hr']} BPM, SpO2={live['spo2']}%, Temp={live['temperature']}°C, Motion={live['movement']} m/s², Risk={live['riskLevel']}")
    print(f"  System Matrix: XIAO={live['system']['xiao']}, LilyGO={live['system']['lilygo']}, UDP={live['system']['udp']}")

    assert live["communication_state"] == "LIVE", "Expected LIVE status after telemetry"
    assert live["hr"] == 74.0, f"Expected HR 74.0, got {live['hr']}"
    assert live["spo2"] == 99.0, f"Expected SpO2 99.0, got {live['spo2']}"
    assert live["temperature"] == 36.65, f"Expected Temp 36.65, got {live['temperature']}"
    assert live["system"]["xiao"] == "ONLINE", "Expected XIAO ONLINE"
    assert live["system"]["lilygo"] == "ONLINE", "Expected LilyGO ONLINE"
    assert live["system"]["udp"] == "RECEIVING", "Expected UDP RECEIVING"
    print("  >>> PASS: Real hardware telemetry ingestion verified successfully!")

    # 3. Test Emergency SOS Event
    print("\n[STEP 3] Triggering Physical SOS Emergency Event...")
    sos_sample = dict(telemetry_sample)
    sos_sample["sos"] = True
    sos_sample["riskLevel"] = "HIGH"
    sos_sample["riskScore"] = 90.0
    send_udp_packet(sos_sample)
    time.sleep(0.5)

    sos_state = get_status()["state"]
    print(f"  SOS Active: {sos_state['sos']}, Risk Level: {sos_state['riskLevel']}")
    emergencies = get_emergencies()["events"]
    print(f"  Emergency Incidents in SQLite: {len(emergencies)}")
    assert sos_state["sos"] is True, "Expected SOS to be active"
    assert len(emergencies) > 0, "Expected emergency event recorded in database"
    assert emergencies[0]["event_type"] == "SOS_BUTTON_PRESSED"
    print("  >>> PASS: SOS emergency beacon and SQLite persistence verified successfully!")

    # 4. Test Telemetry Freshness & Offline Reversion
    print("\n[STEP 4] Testing Telemetry Disappearance & Offline Timeout (8 seconds)...")
    print("  Waiting 9 seconds for freshness timeout...")
    time.sleep(9.0)

    offline_state = get_status()["state"]
    print(f"  Communication State: {offline_state['communication_state']}")
    print(f"  Vitals: HR={offline_state['hr']}, SpO2={offline_state['spo2']}, Temp={offline_state['temperature']}")
    print(f"  System Matrix: XIAO={offline_state['system']['xiao']}, LilyGO={offline_state['system']['lilygo']}")

    assert offline_state["communication_state"] == "NO LIVE TELEMETRY", "Expected reversion to NO LIVE TELEMETRY"
    assert offline_state["hr"] is None, "Vitals must revert to None/-- when telemetry stops"
    assert offline_state["spo2"] is None
    assert offline_state["temperature"] is None
    assert offline_state["system"]["xiao"] == "OFFLINE"
    assert offline_state["system"]["lilygo"] == "OFFLINE"
    print("  >>> PASS: Freshness timeout and anti-mock zeroing verified successfully!")

    print("\n==================================================")
    print("ALL 4 END-TO-END PIPELINE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    main()
