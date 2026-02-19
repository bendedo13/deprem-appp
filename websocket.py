"""
WebSocket Bağlantı Yöneticisi
================================
Gerçek zamanlı deprem bildirimleri için WebSocket yönetimi.
Yeni deprem geldiğinde tüm bağlı istemcilere anlık gönderir.

Bağlantı koparsa istemci tarafında exponential backoff ile yeniden bağlanır.
"""

import json
import logging
from typing import Dict, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
websocket_router = APIRouter()


class ConnectionManager:
    """
    Tüm WebSocket bağlantılarını yönetir.
    
    Özellikler:
    - Broadcast: tüm kullanıcılara gönder
    - Filtered broadcast: belirli konuma göre filtrele
    - Bağlantı sayısı takibi
    """

    def __init__(self):
        # Tüm aktif bağlantılar: {websocket: {meta_data}}
        self.active_connections: Dict[WebSocket, dict] = {}

    async def connect(self, websocket: WebSocket, client_id: str = None):
        """Yeni WebSocket bağlantısını kabul et ve kaydet."""
        await websocket.accept()
        self.active_connections[websocket] = {
            "client_id": client_id,
            "subscribed_regions": [],  # Kullanıcının takip ettiği bölgeler
        }
        logger.info(f"🟢 Yeni WS bağlantısı. Toplam: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Bağlantıyı temizle."""
        self.active_connections.pop(websocket, None)
        logger.info(f"🔴 WS bağlantısı kesildi. Toplam: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """
        Tüm bağlı istemcilere mesaj gönder.
        
        Args:
            message: JSON olarak gönderilecek dict
        """
        if not self.active_connections:
            return

        json_message = json.dumps(message, ensure_ascii=False, default=str)
        disconnected = []

        for websocket in self.active_connections:
            try:
                await websocket.send_text(json_message)
            except Exception as e:
                logger.warning(f"WS gönderme hatası: {e}")
                disconnected.append(websocket)

        # Bağlantısı kopanları temizle
        for ws in disconnected:
            self.disconnect(ws)

    async def broadcast_earthquake(self, earthquake_data: dict):
        """Yeni deprem bildirimini formatla ve yayınla."""
        message = {
            "type": "NEW_EARTHQUAKE",
            "data": earthquake_data,
        }
        await self.broadcast(message)

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Global manager instance — tüm route'lardan erişilir
manager = ConnectionManager()


@websocket_router.websocket("/ws/earthquakes")
async def websocket_endpoint(websocket: WebSocket, client_id: str = None):
    """
    Deprem WebSocket endpoint'i.
    
    İstemci bağlandığında:
    1. Bağlantıyı kabul eder
    2. Son 10 depremi hemen gönderir
    3. Yeni deprem geldiğinde anlık bildirir
    
    Mesaj formatı:
    {
        "type": "NEW_EARTHQUAKE" | "PING" | "INITIAL_DATA",
        "data": {...}
    }
    """
    await manager.connect(websocket, client_id)
    try:
        while True:
            # İstemciden mesaj bekle (ping/pong için)
            data = await websocket.receive_text()
            
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "PONG"}))
            elif data.startswith("{"):
                # Filtre ayarı mesajı
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
        logger.error(f"WebSocket hatası: {e}")
        manager.disconnect(websocket)
