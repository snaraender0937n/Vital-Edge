import sqlite3
import time
import logging
from typing import List, Dict, Any, Optional
import config
from models import RawTelemetryPacket, EmergencyEvent

logger = logging.getLogger("vitaledge.database")

class Database:
    def __init__(self, db_path: str = config.DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                # Telemetry history table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS telemetry_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    device_id TEXT NOT NULL,
                    hr REAL,
                    bpm REAL,
                    spo2 REAL,
                    temperature REAL,
                    temp_drift REAL,
                    movement REAL,
                    ecg REAL,
                    leads_off INTEGER,
                    risk_score REAL,
                    risk_level TEXT,
                    sos INTEGER,
                    buzzer INTEGER,
                    latitude REAL,
                    longitude REAL,
                    altitude REAL,
                    satellites INTEGER,
                    gps_fix INTEGER,
                    data_source TEXT
                );
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry_history(timestamp);")

                # Emergency events table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS emergency_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    device_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    risk_score REAL,
                    latitude REAL,
                    longitude REAL,
                    acknowledged INTEGER DEFAULT 0
                );
                """)
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_emergency_timestamp ON emergency_events(timestamp);")
                conn.commit()
                logger.info(f"Database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")

    def insert_telemetry(self, p: RawTelemetryPacket) -> bool:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO telemetry_history (
                    timestamp, device_id, hr, bpm, spo2, temperature, temp_drift,
                    movement, ecg, leads_off, risk_score, risk_level, sos, buzzer,
                    latitude, longitude, altitude, satellites, gps_fix, data_source
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    p.timestamp or time.time(),
                    p.device,
                    p.hr,
                    p.bpm,
                    p.spo2,
                    p.temperature,
                    p.tempDrift,
                    p.movement,
                    p.ecg,
                    1 if p.leadsOff else 0,
                    p.riskScore,
                    p.riskLevel,
                    1 if p.sos else 0,
                    1 if p.buzzer else 0,
                    p.latitude,
                    p.longitude,
                    p.altitude,
                    p.satellites,
                    1 if p.gpsFix else 0,
                    p.source
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error inserting telemetry: {e}")
            return False

    def insert_emergency_event(self, event: EmergencyEvent) -> bool:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT INTO emergency_events (
                    timestamp, device_id, event_type, risk_score, latitude, longitude, acknowledged
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    event.timestamp,
                    event.device_id,
                    event.event_type,
                    event.risk_score,
                    event.latitude,
                    event.longitude,
                    1 if event.acknowledged else 0
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error recording emergency event: {e}")
            return False

    def get_recent_telemetry(self, limit: int = 100) -> List[Dict[str, Any]]:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                SELECT * FROM telemetry_history 
                ORDER BY timestamp DESC LIMIT ?
                """, (limit,))
                rows = cursor.fetchall()
                return [dict(r) for r in reversed(rows)]
        except Exception as e:
            logger.error(f"Error fetching recent telemetry: {e}")
            return []

    def get_emergency_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                SELECT * FROM emergency_events 
                ORDER BY timestamp DESC LIMIT ?
                """, (limit,))
                rows = cursor.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error fetching emergency events: {e}")
            return []

    def acknowledge_emergency(self, event_id: int) -> bool:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE emergency_events SET acknowledged = 1 WHERE id = ?", (event_id,))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error acknowledging emergency event: {e}")
            return False

    def purge_old_data(self, hours: int = config.DATA_RETENTION_HOURS) -> int:
        """Purge records older than retention threshold (24 hours)"""
        cutoff = time.time() - (hours * 3600)
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM telemetry_history WHERE timestamp < ?", (cutoff,))
                deleted = cursor.rowcount
                conn.commit()
                if deleted > 0:
                    logger.info(f"Purged {deleted} telemetry records older than {hours} hours.")
                return deleted
        except Exception as e:
            logger.error(f"Error purging old telemetry: {e}")
            return 0

db = Database()
