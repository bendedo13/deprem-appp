"""Bildirim ayarları ve FCM token (stub)."""
from fastapi import APIRouter
router = APIRouter()


@router.post("/settings")
async def settings():
    return {"ok": True}
