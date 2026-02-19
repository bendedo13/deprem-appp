"""Risk skoru hesaplama (stub)."""
from fastapi import APIRouter
router = APIRouter()


@router.post("/score")
async def score():
    return {"score": 0}
