import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from .models import Base
from .routers import admin_auth

app = FastAPI(
    title="Deprem App API",
    description="Türkiye Deprem İzleme Uygulaması Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


app.include_router(admin_auth.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "deprem-app-api"}