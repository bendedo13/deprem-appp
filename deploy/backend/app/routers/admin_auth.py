from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import AdminUser
from ..schemas import AdminLoginRequest, AdminLoginResponse, AdminMeResponse
from ..auth import verify_password, create_access_token, get_current_admin

router = APIRouter(prefix="/api/admin/auth", tags=["Admin Auth"])


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(payload: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AdminUser).where(AdminUser.email == payload.email)
    )
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hesap deaktif edilmiş",
        )

    if not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )

    admin.last_login = datetime.utcnow()
    await db.commit()

    token = create_access_token({"sub": str(admin.id), "email": admin.email})

    return AdminLoginResponse(
        access_token=token,
        admin_id=str(admin.id),
        email=admin.email,
        full_name=admin.full_name,
        is_superadmin=admin.is_superadmin,
    )


@router.get("/me", response_model=AdminMeResponse)
async def admin_me(current_admin: AdminUser = Depends(get_current_admin)):
    return AdminMeResponse(
        id=str(current_admin.id),
        email=current_admin.email,
        full_name=current_admin.full_name,
        is_active=current_admin.is_active,
        is_superadmin=current_admin.is_superadmin,
        created_at=current_admin.created_at,
        last_login=current_admin.last_login,
    )


@router.post("/logout")
async def admin_logout(current_admin: AdminUser = Depends(get_current_admin)):
    return {"message": "Başarıyla çıkış yapıldı"}