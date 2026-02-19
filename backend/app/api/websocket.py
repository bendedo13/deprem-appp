"""
WebSocket bağlantı yöneticisi.
Gerçek zamanlı deprem bildirimleri için. Yeni deprem geldiğinde tüm bağlı istemcilere anlık gönderir.
"""

import json
import logging
from typing import Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
websocket_router = APIRouter()


class ConnectionManager:
    """Tüm WebSocket bağlantılarını yönetir."""

    def __init__(self) -> None:
        self.active_connections: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str | None = None) -> None:
        await websocket.accept()
        self.active_connections[websocket] = {
            "client_id": client_id,
            "subscribed_regions": [],
        }
        logger.info("Yeni WS bağlantısı. Toplam: %s", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.pop(websocket, None)
        logger.info("WS bağlantısı kesildi. Toplam: %s", len(self.active_connections))

    async def broadcast(self, message: dict) -> None:
        if not self.active_connections:
            return
        json_message = json.dumps(message, ensure_ascii=False, default=str)
        disconnected = []
        for ws in self.active_connections:
            try:
                await ws.send_text(json_message)
            except Exception as e:
                logger.warning("WS gönderme hatası: %s", e)
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect(ws)

    async def broadcast_earthquake(self, earthquake_data: dict) -> None:
        await self.broadcast({"type": "NEW_EARTHQUAKE", "data": earthquake_data})


manager = ConnectionManager()


@websocket_router.websocket("/ws/earthquakes")
async def websocket_endpoint(websocket: WebSocket, client_id: str | None = None) -> None:
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "PONG"}))
            elif data.startswith("{"):
                try:
                    filter_data = json.loads(data)
                    if filter_data.get("type") == "SET_FILTER":
                        manager.active_connections[websocket]["subscribed_regions"] = (
                            filter_data.get("regions", [])
                        )
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket hatası: %s", e)
        manager.disconnect(websocket)
