"""Analitik endpoint'leri (stub)."""
from fastapi import APIRouter
router = APIRouter()


@router.get("")
async def analytics():
    return {"events": []}
