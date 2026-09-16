import threading
import time
import logging
import serial
import serial.tools.list_ports
from typing import Callable, Optional
import config
from validator import parse_and_validate_telemetry
from live_state import live_manager

logger = logging.getLogger("vitaledge.serial")

class SerialReader(threading.Thread):
    def __init__(self, on_packet_callback: Optional[Callable] = None):
        super().__init__(daemon=True, name="SerialReaderThread")
        self.port = config.SERIAL_PORT
        self.baudrate = config.BAUD_RATE
        self.on_packet_callback = on_packet_callback
        self.running = True
        self.serial_conn: Optional[serial.Serial] = None

    def check_port_exists(self) -> bool:
        available_ports = [p.device for p in serial.tools.list_ports.comports()]
        return self.port in available_ports

    def run(self):
        logger.info(f"Starting SerialReader for port {self.port} @ {self.baudrate} baud")
        
        while self.running:
            # Step 1: Check if port is available on the machine
            if not self.check_port_exists():
                live_manager.update_hardware_status(serial_status="NOT AVAILABLE")
                time.sleep(config.SERIAL_RETRY_INTERVAL)
                continue

            # Step 2: Attempt connection
            try:
                logger.info(f"Attempting connection to {self.port}...")
                self.serial_conn = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    timeout=1.0,
                    write_timeout=1.0
                )
                logger.info(f"Successfully opened {self.port}")
                live_manager.update_hardware_status(serial_status="CONNECTED")
                
                # Step 3: Read loop
                while self.running and self.serial_conn and self.serial_conn.is_open:
                    try:
                        line = self.serial_conn.readline()
                        if not line:
                            # Timeout on read, port is still open
                            continue
                            
                        decoded = line.decode('utf-8', errors='ignore').strip()
                        if not decoded:
                            continue

                        # Parse and validate incoming telemetry JSON line
                        packet, err = parse_and_validate_telemetry(decoded, source="serial")
                        if packet:
                            state = live_manager.process_telemetry(packet)
                            if self.on_packet_callback:
                                self.on_packet_callback(state)
                        else:
                            # Might be boot messages, log lightly
                            logger.debug(f"Serial line ignored ({err}): {decoded[:60]}")
                            
                    except (serial.SerialException, OSError) as e:
                        logger.warning(f"Serial connection lost on {self.port}: {e}")
                        break

            except (serial.SerialException, PermissionError, FileNotFoundError) as e:
                logger.warning(f"Unable to open serial port {self.port}: {e}")
                live_manager.update_hardware_status(serial_status="NOT AVAILABLE")
            finally:
                if self.serial_conn:
                    try:
                        self.serial_conn.close()
                    except Exception:
                        pass
                    self.serial_conn = None

            time.sleep(config.SERIAL_RETRY_INTERVAL)

    def stop(self):
        self.running = False
        if self.serial_conn:
            try:
                self.serial_conn.close()
            except Exception:
                pass
