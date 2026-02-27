from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.subscription import PlanType, SubscriptionStatus


class SubscriptionCreate(BaseModel):
    user_id: str
    plan_type: PlanType
    expires_at: Optional[datetime] = None
    auto_renew: bool = False
    price_paid: int = 0


class SubscriptionUpdate(BaseModel):
    plan_type: Optional[PlanType] = None
    status: Optional[SubscriptionStatus] = None
    expires_at: Optional[datetime] = None
    auto_renew: Optional[bool] = None


class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan_type: PlanType
    status: SubscriptionStatus
    started_at: datetime
    expires_at: Optional[datetime]
    auto_renew: bool
    price_paid: int
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreate(BaseModel):
    user_id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    notification_type: str = "general"
    is_global: bool = False


class NotificationBulkSend(BaseModel):
    title: str
    message: str
    target: str = Field(..., description="all | free | premium | b2b | expiring")
    notification_type: str = "general"


class NotificationTemplateCreate(BaseModel):
    name: str
    title: str
    message: str
    template_type: str = "custom"


class NotificationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None