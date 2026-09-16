import unittest
import time
import os
import json
from validator import parse_and_validate_telemetry
from live_state import live_manager
from database import db
from pm25_simulator import pm25_sim

class TestVitalEdgeBackend(unittest.TestCase):
    def test_anti_mock_initial_state(self):
        """Verify that when no telemetry has been processed, all vitals are None (--)"""
        snapshot = live_manager.evaluate_freshness()
        self.assertEqual(snapshot.communication_state, "NO LIVE TELEMETRY")
        self.assertIsNone(snapshot.hr)
        self.assertIsNone(snapshot.spo2)
        self.assertIsNone(snapshot.temperature)
        self.assertIsNone(snapshot.movement)
        self.assertIsNone(snapshot.riskScore)
        self.assertIsNone(snapshot.riskLevel)
        self.assertEqual(snapshot.system.xiao, "OFFLINE")
        self.assertEqual(snapshot.system.lilygo, "OFFLINE")

    def test_validator_valid_packet(self):
        sample = json.dumps({
            "device": "VITALEDGE-001",
            "bpm": 68,
            "hr": 68,
            "spo2": 99,
            "temperature": 36.4,
            "movement": 6.4,
            "tempDrift": 0.02,
            "ecg": 0.12,
            "leadsOff": False,
            "riskScore": 21,
            "riskLevel": "NORMAL",
            "sos": False,
            "buzzer": False,
            "latitude": 12.840784,
            "longitude": 80.154024,
            "altitude": 20,
            "satellites": 0,
            "gpsFix": False
        })
        pkt, err = parse_and_validate_telemetry(sample, source="serial")
        self.assertIsNone(err)
        self.assertIsNotNone(pkt)
        self.assertEqual(pkt.hr, 68.0)
        self.assertEqual(pkt.spo2, 99.0)
        self.assertFalse(pkt.gpsFix)

    def test_validator_malformed(self):
        pkt, err = parse_and_validate_telemetry("INVALID_DATA", source="serial")
        self.assertIsNone(pkt)
        self.assertIsNotNone(err)

    def test_gps_fallback_coordinates(self):
        sample = json.dumps({
            "device": "VITALEDGE-001",
            "hr": 75,
            "spo2": 98,
            "temperature": 36.5,
            "movement": 1.0,
            "gpsFix": False  # No fix indoors
        })
        pkt, _ = parse_and_validate_telemetry(sample)
        state = live_manager.process_telemetry(pkt)
        self.assertEqual(state.latitude, 12.840784)
        self.assertEqual(state.longitude, 80.154024)
        self.assertFalse(state.gpsFix)
        self.assertEqual(state.gpsSource, "fallback_vit_chennai")
        self.assertEqual(state.system.gnss, "SEARCHING")

    def test_database_insert_and_retrieval(self):
        sample = json.dumps({
            "device": "VITALEDGE-001",
            "hr": 80,
            "bpm": 80,
            "spo2": 97,
            "temperature": 36.7,
            "movement": 2.5,
            "riskScore": 15,
            "riskLevel": "NORMAL"
        })
        pkt, _ = parse_and_validate_telemetry(sample)
        db.insert_telemetry(pkt)
        history = db.get_recent_telemetry(limit=5)
        self.assertTrue(len(history) > 0)
        latest = history[-1]
        self.assertEqual(latest["hr"], 80.0)

    def test_pm25_simulation(self):
        val, status = pm25_sim.update()
        self.assertGreaterEqual(val, 10.0)
        self.assertLessEqual(val, 120.0)
        self.assertIn(status, ["GOOD", "MODERATE", "HIGH"])

if __name__ == "__main__":
    unittest.main()
