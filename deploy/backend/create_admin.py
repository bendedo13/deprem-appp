import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, AsyncSessionLocal
from app.models import Base, AdminUser
from sqlalchemy import select
import bcrypt

async def create_admin():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AdminUser).where(AdminUser.email == "bendedo13@gmail.com")
        )
        existing = result.scalar_one_or_none()

        if existing:
            hashed = bcrypt.hashpw("Benalan.1".encode("utf-8"), bcrypt.gensalt())
            existing.password_hash = hashed.decode("utf-8")
            existing.is_active = True
            await session.commit()
            print("✅ Admin kullanıcısı güncellendi: bendedo13@gmail.com")
        else:
            hashed = bcrypt.hashpw("Benalan.1".encode("utf-8"), bcrypt.gensalt())
            admin = AdminUser(
                email="bendedo13@gmail.com",
                password_hash=hashed.decode("utf-8"),
                full_name="Admin",
                is_active=True,
                is_superadmin=True,
            )
            session.add(admin)
            await session.commit()
            print("✅ Admin kullanıcısı oluşturuldu: bendedo13@gmail.com")

if __name__ == "__main__":
    asyncio.run(create_admin())