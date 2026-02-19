"""Deprem listesi ve detay endpoint'leri (stub)."""
from fastapi import APIRouter
router = APIRouter()


@router.get("")
async def list_earthquakes():
    return {"items": [], "total": 0}
