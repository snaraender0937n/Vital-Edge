import os

# Serial Configuration (Primary Demo Input)
SERIAL_PORT = os.getenv("SERIAL_PORT", "COM9")
BAUD_RATE = int(os.getenv("BAUD_RATE", "115200"))
SERIAL_RETRY_INTERVAL = 2.0  # seconds between reconnection attempts

# UDP Configuration (Optional Network Input from LilyGO Wi-Fi)
UDP_HOST = os.getenv("UDP_HOST", "0.0.0.0")
UDP_PORT = int(os.getenv("UDP_PORT", "5005"))

# Database
DB_PATH = os.getenv("DB_PATH", os.path.join(os.path.dirname(__file__), "vitaledge.db"))
DATA_RETENTION_HOURS = 24

# Device & Fallback Metadata
DEVICE_ID = "VITALEDGE-001"
VIT_CHENNAI_LAT = 12.840784
VIT_CHENNAI_LON = 80.154024
VIT_CHENNAI_ALT = 20.0

# Freshness Timeouts
STALE_THRESHOLD_SEC = 3.0
OFFLINE_THRESHOLD_SEC = 8.0
