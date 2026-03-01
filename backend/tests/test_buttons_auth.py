"""
Kimlik doğrulama butonları testleri.
Kayıt, giriş, çıkış butonlarının tetiklediği endpoint'leri test eder.
"""

import pytest
from httpx import AsyncClient


class TestRegisterButton:
    """Kayıt Ol butonu testleri."""

    @pytest.mark.asyncio
    async def test_register_success(self, client: AsyncClient):
        """✅ Kayıt Ol butonu — başarılı kayıt."""
        response = await client.post(
            "/api/v1/users/register",
            json={"email": "yeni@example.com", "password": "Sifre1234!"},
        )
        assert response.status_code == 201, f"Beklenen 201, gelen: {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Token döndürülmedi"
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "yeni@example.com"

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client: AsyncClient, test_user):
        """❌ Kayıt Ol butonu — aynı e-posta ile tekrar kayıt."""
        response = await client.post(
            "/api/v1/users/register",
            json={"email": "test@example.com", "password": "Sifre1234!"},
        )
        assert response.status_code == 409, f"Beklenen 409, gelen: {response.status_code}"

    @pytest.mark.asyncio
    async def test_register_weak_password(self, client: AsyncClient):
        """❌ Kayıt Ol butonu — kısa şifre validasyonu."""
        response = await client.post(
            "/api/v1/users/register",
            json={"email": "zayif@example.com", "password": "123"},
        )
        assert response.status_code == 422, f"Beklenen 422, gelen: {response.status_code}"

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client: AsyncClient):
        """❌ Kayıt Ol butonu — geçersiz e-posta formatı."""
        response = await client.post(
            "/api/v1/users/register",
            json={"email": "gecersiz-email", "password": "Sifre1234!"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_fields(self, client: AsyncClient):
        """❌ Kayıt Ol butonu — eksik alanlar."""
        response = await client.post(
            "/api/v1/users/register",
            json={"email": "eksik@example.com"},
        )
        assert response.status_code == 422


class TestLoginButton:
    """Giriş Yap butonu testleri."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user):
        """✅ Giriş Yap butonu — başarılı giriş."""
        response = await client.post(
            "/api/v1/users/login",
            json={"email": "test@example.com", "password": "TestPass123!"},
        )
        assert response.status_code == 200, f"Beklenen 200, gelen: {response.status_code}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, client: AsyncClient, test_user):
        """❌ Giriş Yap butonu — yanlış şifre."""
        response = await client.post(
            "/api/v1/users/login",
            json={"email": "test@example.com", "password": "YanlisŞifre!"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client: AsyncClient):
        """❌ Giriş Yap butonu — var olmayan kullanıcı."""
        response = await client.post(
            "/api/v1/users/login",
            json={"email": "yok@example.com", "password": "Sifre1234!"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client: AsyncClient, db_session, test_user):
        """❌ Giriş Yap butonu — devre dışı hesap."""
        test_user.is_active = False
        await db_session.commit()

        response = await client.post(
            "/api/v1/users/login",
            json={"email": "test@example.com", "password": "TestPass123!"},
        )
        assert response.status_code == 403

        # Geri al
        test_user.is_active = True
        await db_session.commit()

    @pytest.mark.asyncio
    async def test_login_empty_body(self, client: AsyncClient):
        """❌ Giriş Yap butonu — boş istek gövdesi."""
        response = await client.post("/api/v1/users/login", json={})
        assert response.status_code == 422