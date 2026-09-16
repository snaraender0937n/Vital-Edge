#!/usr/bin/env python3
"""
VitalEdge Hardware Telemetry Test CLI
Allows sending structured telemetry packets via UDP (port 5005) or Serial port
to verify backend parsing, anti-mock compliance, freshness, SOS, and tactical dashboard display.
"""

import socket
import time
import json
import argparse
import sys
import math

VIT_CHENNAI_LAT = 12.840784
VIT_CHENNAI_LON = 80.154024
VIT_CHENNAI_ALT = 20.0

def generate_packet(mode="healthy", seq=0, gps_fix=False, leads_off=False, sos=False):
    t = time.time()
    
    if mode == "healthy":
        hr = 70 + 4 * math.sin(t / 5.0)
        spo2 = 98 + math.sin(t / 8.0)
        temp = 36.5 + 0.1 * math.sin(t / 12.0)
        motion = 1.2 + 0.8 * math.sin(t / 2.0)
        risk = 18.0
        risk_level = "NORMAL"
    elif mode == "stress":
        hr = 135 + 8 * math.sin(t / 3.0)
        spo2 = 92 + math.sin(t / 5.0)
        temp = 38.4 + 0.2 * math.sin(t / 10.0)
        motion = 14.5 + 4.0 * math.sin(t / 1.5)
        risk = 82.0
        risk_level = "HIGH"
    elif mode == "warning":
        hr = 105 + 5 * math.sin(t / 4.0)
        spo2 = 94 + math.sin(t / 6.0)
        temp = 37.8 + 0.1 * math.sin(t / 8.0)
        motion = 8.0 + 2.0 * math.sin(t / 2.0)
        risk = 52.0
        risk_level = "WARNING"
    else:
        hr = 72.0
        spo2 = 98.0
        temp = 36.6
        motion = 2.0
        risk = 20.0
        risk_level = "NORMAL"

    # ECG simulated heart wave point (P-Q-R-S-T)
    phase = (t * 1.5) % 1.0
    if 0.20 <= phase < 0.25:
        ecg_val = 0.25  # P wave
    elif 0.35 <= phase < 0.38:
        ecg_val = -0.15 # Q
    elif 0.38 <= phase < 0.43:
        ecg_val = 1.25  # R peak
    elif 0.43 <= phase < 0.46:
        ecg_val = -0.35 # S
    elif 0.55 <= phase < 0.65:
        ecg_val = 0.35  # T wave
    else:
        ecg_val = 0.05 * math.sin(t * 10)

    if leads_off:
        ecg_val = 0.0

    packet = {
        "device": "VITALEDGE-001",
        "bpm": round(hr, 1),
        "hr": round(hr, 1),
        "spo2": round(spo2, 1),
        "temperature": round(temp, 2),
        "movement": round(motion, 2),
        "tempDrift": 0.02,
        "ecg": round(ecg_val, 3),
        "leadsOff": leads_off,
        "riskScore": round(risk, 1),
        "riskLevel": risk_level,
        "sos": sos,
        "buzzer": sos or (risk_level == "HIGH"),
        "latitude": VIT_CHENNAI_LAT + (0.00015 * math.sin(t / 20.0) if gps_fix else 0.0),
        "longitude": VIT_CHENNAI_LON + (0.00015 * math.cos(t / 20.0) if gps_fix else 0.0),
        "altitude": VIT_CHENNAI_ALT,
        "satellites": 7 if gps_fix else 0,
        "gpsFix": gps_fix,
        "seq": seq,
        "timestamp": t
    }
    return packet

def main():
    parser = argparse.ArgumentParser(description="VitalEdge Telemetry Hardware Injector")
    parser.add_argument("--mode", choices=["healthy", "stress", "warning"], default="healthy")
    parser.add_argument("--udp-host", default="127.0.0.1")
    parser.add_argument("--udp-port", type=int, default=5005)
    parser.add_argument("--rate", type=float, default=2.0, help="Packets per second (Hz)")
    parser.add_argument("--count", type=int, default=0, help="Number of packets to send (0 = infinite)")
    parser.add_argument("--sos", action="store_true", help="Set active SOS button press")
    parser.add_argument("--leads-off", action="store_true", help="Simulate ECG lead disconnection")
    parser.add_argument("--gps-fix", action="store_true", help="Simulate real GNSS satellite fix")
    parser.add_argument("--serial-port", default=None, help="Optional serial port to write to instead of UDP")
    args = parser.parse_args()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    
    print(f"==================================================")
    print(f"VitalEdge Hardware Telemetry Injector")
    print(f"Destination: UDP {args.udp_host}:{args.udp_port}")
    print(f"Mode: {args.mode.upper()} | Rate: {args.rate} Hz | SOS: {args.sos} | GPS Fix: {args.gps_fix}")
    print(f"Press Ctrl+C to stop sending.")
    print(f"==================================================")

    seq = 0
    interval = 1.0 / max(0.1, args.rate)
    
    try:
        while True:
            seq += 1
            pkt = generate_packet(
                mode=args.mode,
                seq=seq,
                gps_fix=args.gps_fix,
                leads_off=args.leads_off,
                sos=args.sos
            )
            raw = json.dumps(pkt) + "\n"
            
            sock.sendto(raw.encode('utf-8'), (args.udp_host, args.udp_port))
            print(f"[{seq}] Sent -> HR:{pkt['hr']} SpO2:{pkt['spo2']}% Temp:{pkt['temperature']}°C Risk:{pkt['riskLevel']} SOS:{pkt['sos']}")
            
            if args.count > 0 and seq >= args.count:
                break
                
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\nTelemetry injector stopped. Dashboard should gracefully transition to STALE -> NO LIVE TELEMETRY.")

if __name__ == "__main__":
    main()
