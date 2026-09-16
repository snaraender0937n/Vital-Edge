import asyncio
import socket
import logging
from typing import Callable, Optional
import config
from validator import parse_and_validate_telemetry
from live_state import live_manager

logger = logging.getLogger("vitaledge.udp")

class UDPTelemetryProtocol(asyncio.DatagramProtocol):
    def __init__(self, on_packet_callback: Optional[Callable] = None):
        self.on_packet_callback = on_packet_callback
        self.transport = None

    def connection_made(self, transport):
        self.transport = transport
        logger.info(f"UDP Telemetry listener active on {config.UDP_HOST}:{config.UDP_PORT}")

    def datagram_received(self, data: bytes, addr):
        try:
            decoded = data.decode('utf-8', errors='ignore').strip()
            if not decoded:
                return

            packet, err = parse_and_validate_telemetry(decoded, source="udp")
            if packet:
                state = live_manager.process_telemetry(packet)
                if self.on_packet_callback:
                    self.on_packet_callback(state)
            else:
                logger.debug(f"UDP datagram ignored ({err}) from {addr}: {decoded[:60]}")
        except Exception as e:
            logger.error(f"Error handling UDP datagram from {addr}: {e}")

    def error_received(self, exc):
        logger.warning(f"UDP error received: {exc}")

    def connection_lost(self, exc):
        logger.info("UDP Telemetry listener closed")

async def start_udp_listener(loop: asyncio.AbstractEventLoop, on_packet_callback: Optional[Callable] = None):
    try:
        transport, protocol = await loop.create_datagram_endpoint(
            lambda: UDPTelemetryProtocol(on_packet_callback),
            local_addr=(config.UDP_HOST, config.UDP_PORT)
        )
        return transport
    except Exception as e:
        logger.error(f"Failed to bind UDP port {config.UDP_PORT}: {e}")
        return None
