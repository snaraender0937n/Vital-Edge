import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Set

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from database import db
from live_state import live_manager
from models import NormalizedTelemetryState
from serial_reader import SerialReader
from udp_reader import start_udp_listener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("vitaledge.main")

# Active WebSocket connections
active_connections: Set[WebSocket] = set()
event_loop: asyncio.AbstractEventLoop = None

class SerialConfigUpdate(BaseModel):
    port: str
    baudrate: int = 115200

async def broadcast_state(state: NormalizedTelemetryState):
    """Broadcast state to all connected WebSockets"""
    if not active_connections:
        return
    payload = state.model_dump_json()
    disconnected = set()
    for ws in list(active_connections):
        try:
            await ws.send_text(payload)
        except Exception:
            disconnected.add(ws)
    for ws in disconnected:
        active_connections.discard(ws)

def on_telemetry_packet(state: NormalizedTelemetryState):
    """Callback fired by serial or UDP threads on new telemetry"""
    if event_loop and event_loop.is_running():
        asyncio.run_coroutine_threadsafe(broadcast_state(state), event_loop)

async def freshness_monitor_task():
    """Evaluates telemetry staleness and broadcasts periodically at 2Hz"""
    while True:
        try:
            state = live_manager.evaluate_freshness()
            await broadcast_state(state)
        except Exception as e:
            logger.error(f"Error in freshness monitor: {e}")
        await asyncio.sleep(0.5)

async def db_cleanup_task():
    """Periodically purges database records older than 24 hours"""
    while True:
        try:
            db.purge_old_data(config.DATA_RETENTION_HOURS)
        except Exception as e:
            logger.error(f"Error in database cleanup: {e}")
        await asyncio.sleep(3600)  # Check every hour

serial_worker: SerialReader = None
udp_transport = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global event_loop, serial_worker, udp_transport
    event_loop = asyncio.get_running_loop()
    
    logger.info("Initializing VitalEdge Hardware Telemetry Engine...")
    
    # 1. Start Serial Reader
    serial_worker = SerialReader(on_packet_callback=on_telemetry_packet)
    serial_worker.start()
    
    # 2. Start UDP Receiver
    udp_transport = await start_udp_listener(event_loop, on_packet_callback=on_telemetry_packet)
    
    # 3. Start background monitoring tasks
    freshness_task = asyncio.create_task(freshness_monitor_task())
    cleanup_task = asyncio.create_task(db_cleanup_task())
    
    logger.info(f"VitalEdge Backend online. Serial Port: {config.SERIAL_PORT}, UDP: {config.UDP_PORT}")
    
    yield
    
    logger.info("Shutting down VitalEdge services...")
    freshness_task.cancel()
    cleanup_task.cancel()
    if serial_worker:
        serial_worker.stop()
    if udp_transport:
        udp_transport.close()

app = FastAPI(title="VitalEdge Telemetry Engine", lifespan=lifespan)

# Allow React app on localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
async def get_system_status():
    """Returns the current live telemetry state and configuration"""
    state = live_manager.get_snapshot()
    return {
        "state": state,
        "config": {
            "serial_port": config.SERIAL_PORT,
            "baud_rate": config.BAUD_RATE,
            "udp_port": config.UDP_PORT,
            "device_id": config.DEVICE_ID,
            "vit_chennai_fallback": {
                "latitude": config.VIT_CHENNAI_LAT,
                "longitude": config.VIT_CHENNAI_LON,
                "altitude": config.VIT_CHENNAI_ALT
            }
        }
    }

@app.get("/api/history")
async def get_telemetry_history(limit: int = 100):
    """Retrieve recent telemetry records from SQLite"""
    records = db.get_recent_telemetry(limit)
    return {"count": len(records), "history": records}

@app.get("/api/emergency")
async def get_emergency_events(limit: int = 50):
    """Retrieve emergency events (SOS triggers)"""
    events = db.get_emergency_events(limit)
    return {"count": len(events), "events": events}

@app.post("/api/emergency/{event_id}/ack")
async def acknowledge_emergency(event_id: int):
    """Acknowledge an emergency event"""
    success = db.acknowledge_emergency(event_id)
    if not success:
        raise HTTPException(status_code=404, detail="Event not found or failed to acknowledge")
    return {"status": "acknowledged", "id": event_id}

@app.post("/api/config/serial")
async def update_serial_config(cfg: SerialConfigUpdate):
    """Dynamically reconfigure the serial port without restarting backend"""
    global serial_worker
    config.SERIAL_PORT = cfg.port
    config.BAUD_RATE = cfg.baudrate
    if serial_worker:
        serial_worker.stop()
        serial_worker = SerialReader(on_packet_callback=on_telemetry_packet)
        serial_worker.start()
        
    return {
        "status": "updated",
        "serial_port": config.SERIAL_PORT,
        "baud_rate": config.BAUD_RATE
    }

@app.get("/api/ports")
async def get_available_serial_ports():
    """List all detected hardware COM ports on the system"""
    import serial.tools.list_ports
    ports = []
    for p in serial.tools.list_ports.comports():
        ports.append({
            "port": p.device,
            "description": p.description,
            "hwid": p.hwid,
            "is_target": p.device == config.SERIAL_PORT
        })
    return {
        "configured_port": config.SERIAL_PORT,
        "baud_rate": config.BAUD_RATE,
        "available_ports": ports
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    logger.info(f"WebSocket client connected. Total clients: {len(active_connections)}")
    
    try:
        # Immediately push current state upon connection
        current = live_manager.get_snapshot()
        await websocket.send_text(current.model_dump_json())
        
        while True:
            # Handle any incoming client control packets
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "ping":
                    await websocket.send_text(json.dumps({"action": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(active_connections)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        active_connections.discard(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
