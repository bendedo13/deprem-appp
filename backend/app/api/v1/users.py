"""Kullanıcı kayıt/giriş endpoint'leri (stub)."""
from fastapi import APIRouter
router = APIRouter()


@router.get("/me")
async def me():
    return {"id": 0, "email": ""}
