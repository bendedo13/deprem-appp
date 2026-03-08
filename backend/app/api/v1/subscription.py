"""
Abonelik (Subscription) API endpoint'leri.
Freemium modeli: free → trial (10 gün) → monthly_pro / yearly_pro
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class SubscriptionStatus(BaseModel):
    """Kullanıcının mevcut abonelik durumu."""
    plan: str                       # free | trial | monthly_pro | yearly_pro
    effective_plan: str             # Aktif plan (süresi dolmuşsa "free")
    is_pro: bool
    trial_used: bool
    expires_at: Optional[datetime] = None
    days_remaining: Optional[int] = None

    model_config = {"from_attributes": True}


class ActivateTrialOut(BaseModel):
    success: bool
    message: str
    expires_at: Optional[datetime] = None


class SubscribePlanIn(BaseModel):
    """Plan satın alma isteği."""
    plan: str  # monthly_pro | yearly_pro
    # Gerçek ödeme entegrasyonunda receipt/token gelir
    receipt_token: Optional[str] = None


class SubscribePlanOut(BaseModel):
    success: bool
    plan: str
    expires_at: datetime
    message: str


class ProFeatureGate(BaseModel):
    """Bir özelliğin Pro ile kilitli olup olmadığı."""
    feature: str
    locked: bool
    message: Optional[str] = None


# ─── Pro Feature Definitions ─────────────────────────────────────────────────

PRO_FEATURES = {
    "priority_notifications": "Anlık Bildirim Önceliği",
    "advanced_analysis": "Gelişmiş Deprem Analizi",
    "ad_free": "Reklamsız Deneyim",
    "detailed_risk_report": "Detaylı Risk Raporu",
    "custom_alerts": "Özel Alarm Kuralları",
    "historical_data": "Geçmiş Deprem Verisi (90 gün+)",
}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/status", response_model=SubscriptionStatus, summary="Abonelik durumu")
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
) -> SubscriptionStatus:
    """Kullanıcının mevcut abonelik planını ve süresini döner."""
    days_remaining = None
    if current_user.subscription_expires_at:
        delta = current_user.subscription_expires_at - datetime.now(tz=timezone.utc)
        days_remaining = max(0, delta.days)

    return SubscriptionStatus(
        plan=current_user.subscription_plan,
        effective_plan=current_user.effective_plan,
        is_pro=current_user.is_pro,
        trial_used=current_user.trial_used,
        expires_at=current_user.subscription_expires_at,
        days_remaining=days_remaining,
    )


@router.post("/activate-trial", response_model=ActivateTrialOut, summary="10 günlük Pro deneme başlat")
async def activate_trial(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActivateTrialOut:
    """Yeni kullanıcıya 10 günlük ücretsiz Pro deneme tanımlar. Bir kez kullanılabilir."""
    if current_user.is_pro:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Zaten aktif bir Pro aboneliğiniz var.",
        )
    
    success = current_user.activate_trial()
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Deneme hakkınızı daha önce kullandınız.",
        )
    
    await db.commit()
    await db.refresh(current_user)
    logger.info("Trial activated: user=%d expires=%s", current_user.id, current_user.subscription_expires_at)
    
    return ActivateTrialOut(
        success=True,
        message="10 günlük Pro denemeniz başladı!",
        expires_at=current_user.subscription_expires_at,
    )


@router.post("/subscribe", response_model=SubscribePlanOut, summary="Pro plana abone ol")
async def subscribe_to_plan(
    body: SubscribePlanIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscribePlanOut:
    """
    Pro plan satın alma. Gerçek uygulamada Google Play / App Store receipt
    doğrulaması yapılır. Şimdilik direkt onay verir.
    """
    valid_plans = ("monthly_pro", "yearly_pro")
    if body.plan not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Geçersiz plan. Seçenekler: {', '.join(valid_plans)}",
        )

    now = datetime.now(tz=timezone.utc)
    
    # Mevcut abonelik varsa, bitiş tarihinden itibaren uzat
    base_date = now
    if current_user.subscription_expires_at and current_user.subscription_expires_at > now:
        base_date = current_user.subscription_expires_at

    if body.plan == "monthly_pro":
        expires = base_date + timedelta(days=30)
    else:
        expires = base_date + timedelta(days=365)

    current_user.subscription_plan = body.plan
    current_user.subscription_expires_at = expires
    await db.commit()
    await db.refresh(current_user)

    logger.info("Subscription: user=%d plan=%s expires=%s", current_user.id, body.plan, expires)
    return SubscribePlanOut(
        success=True,
        plan=body.plan,
        expires_at=expires,
        message=f"{'Aylık' if body.plan == 'monthly_pro' else 'Yıllık'} Pro aboneliğiniz aktif!",
    )


@router.post("/cancel", summary="Aboneliği iptal et")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Aboneliği iptal eder. Mevcut süre sonuna kadar Pro devam eder,
    sonra free'ye düşer.
    """
    if current_user.subscription_plan == "free":
        raise HTTPException(status_code=400, detail="Zaten ücretsiz plandayız.")

    # Plan adını free yap ama bitiş tarihini koru (süre sonuna kadar active)
    old_plan = current_user.subscription_plan
    current_user.subscription_plan = "free"
    await db.commit()

    logger.info("Subscription cancelled: user=%d old_plan=%s", current_user.id, old_plan)
    return {
        "success": True,
        "message": "Aboneliğiniz iptal edildi. Mevcut süreniz sonuna kadar Pro özellikleri kullanabilirsiniz.",
    }


@router.get("/check-feature/{feature}", response_model=ProFeatureGate, summary="Özellik kilidi kontrol")
async def check_feature_access(
    feature: str,
    current_user: User = Depends(get_current_user),
) -> ProFeatureGate:
    """Özellik kilidi. Global PRO Unlock ile tüm kullanıcılar için açık."""
    if feature not in PRO_FEATURES:
        raise HTTPException(status_code=404, detail=f"Bilinmeyen özellik: {feature}")

    locked = False  # Global PRO Unlock — tüm özellikler herkese açık
    return ProFeatureGate(
        feature=feature,
        locked=locked,
        message=None,
    )
