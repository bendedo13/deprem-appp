"""
Profil yönetimi butonları testleri.
Profil görüntüle, güncelle, şifre değiştir, hesap sil butonları.
"""

import pytest
from httpx import AsyncClient


class TestProfileViewButton:
    """Profili Görüntüle butonu testleri."""

    @pytest.mark.asyncio
    async def test_get_profile_success(self, client: AsyncClient, auth_headers, test_user):
        """✅ Profil Görüntüle — kimlik doğrulamalı istek."""
        response = await client.get("/api/v1/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert "password_hash" not in data, "Şifre hash'i response'da olmamalı!"

    @pytest.mark.asyncio
    async def test_get_profile_unauthorized(self, client: AsyncClient):
        """❌ Profil Görüntüle — token olmadan erişim."""
        response = await client.get("/api/v1/users/me")
        assert response.status_code == 403  # HTTPBearer 403 döner

    @pytest.mark.asyncio
    async def test_get_profile_invalid_token(self, client: AsyncClient):
        """❌ Profil Görüntüle — geçersiz token."""
        response = await client.get(
            "/api/v1/users/me",
            headers={"Authorization": "Bearer gecersiz.token.burada"},
        )
        assert response.status_code == 401


class TestProfileUpdateButton:
    """Profil Güncelle butonu testleri."""

    @pytest.mark.asyncio
    async def test_update_profile_name(self, client: AsyncClient, auth_headers):
        """✅ Profil Güncelle — isim güncelleme."""
        response = await client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"name": "Yeni İsim"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Yeni İsim"

    @pytest.mark.asyncio
    async def test_update_profile_phone(self, client: AsyncClient, auth_headers):
        """✅ Profil Güncelle — telefon güncelleme."""
        response = await client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"phone": "+905551112233"},
        )
        assert response.status_code == 200
        assert response.json()["phone"] == "+905551112233"

    @pytest.mark.asyncio
    async def test_update_profile_avatar(self, client: AsyncClient, auth_headers):
        """✅ Profil Güncelle — avatar emoji güncelleme."""
        response = await client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"avatar": "🦊"},
        )
        assert response.status_code == 200
        assert response.json()["avatar"] == "🦊"

    @pytest.mark.asyncio
    async def test_update_profile_short_name(self, client: AsyncClient, auth_headers):
        """❌ Profil Güncelle — çok kısa isim validasyonu."""
        response = await client.put(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"name": "A"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_profile_unauthorized(self, client: AsyncClient):
        """❌ Profil Güncelle — token olmadan."""
        response = await client.put(
            "/api/v1/users/me",
            json={"name": "Yetkisiz"},
        )
        assert response.status_code == 403


class TestTechnicalUpdateButton:
    """FCM Token / Konum Güncelle butonu testleri (PATCH /me)."""

    @pytest.mark.asyncio
    async def test_update_fcm_token(self, client: AsyncClient, auth_headers):
        """✅ FCM Token Güncelle — başarılı güncelleme."""
        response = await client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"fcm_token": "test-fcm-token-12345678901234567890"},
        )
        assert response.status_code == 200
        assert response.json()["fcm_token"] == "test-fcm-token-12345678901234567890"

    @pytest.mark.asyncio
    async def test_update_location(self, client: AsyncClient, auth_headers):
        """✅ Konum Güncelle — enlem/boylam güncelleme."""
        response = await client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"latitude": 39.9334, "longitude": 32.8597},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["latitude"] == pytest.approx(39.9334, abs=0.001)
        assert data["longitude"] == pytest.approx(32.8597, abs=0.001)

    @pytest.mark.asyncio
    async def test_update_invalid_latitude(self, client: AsyncClient, auth_headers):
        """❌ Konum Güncelle — geçersiz enlem değeri."""
        response = await client.patch(
            "/api/v1/users/me",
            headers=auth_headers,
            json={"latitude": 999.0},
        )
        assert response.status_code == 422


class TestPasswordChangeButton:
    """Şifre Değiştir butonu testleri."""

    @pytest.mark.asyncio
    async def test_change_password_success(self, client: AsyncClient, auth_headers):
        """✅ Şifre Değiştir — başarılı değişim."""
        response = await client.put(
            "/api/v1/users/me/password",
            headers=auth_headers,
            json={
                "current_password": "TestPass123!",
                "new_password": "YeniSifre456!",
            },
        )
        assert response.status_code == 200
        assert "başarıyla" in response.json()["message"]

        # Şifreyi geri al (diğer testler için)
        await client.put(
            "/api/v1/users/me/password",
            headers=auth_headers,
            json={
                "current_password": "YeniSifre456!",
                "new_password": "TestPass123!",
            },
        )

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, client: AsyncClient, auth_headers):
        """❌ Şifre Değiştir — mevcut şifre yanlış."""
        response = await client.put(
            "/api/v1/users/me/password",
            headers=auth_headers,
            json={
                "current_password": "YanlisEskiSifre!",
                "new_password": "YeniSifre456!",
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_change_password_too_short(self, client: AsyncClient, auth_headers):
        """❌ Şifre Değiştir — yeni şifre çok kısa."""
        response = await client.put(
            "/api/v1/users/me/password",
            headers=auth_headers,
            json={
                "current_password": "TestPass123!",
                "new_password": "kisa",
            },
        )
        assert response.status_code == 422


class TestDeleteAccountButton:
    """Hesabı Sil butonu testleri."""

    @pytest.mark.asyncio
    async def test_delete_account_success(self, client: AsyncClient, db_session):
        """✅ Hesabı Sil — başarılı silme."""
        from app.models.user import User
        from app.services.auth import hash_password, create_access_token

        # Silinecek kullanıcı oluştur
        user = User(
            email="silinecek@example.com",
            password_hash=hash_password("Sifre1234!"),
            is_active=True,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        token = create_access_token(user.id, user.email)
        headers = {"Authorization": f"Bearer {token}"}

        response = await client.delete("/api/v1/users/me", headers=headers)
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_account_unauthorized(self, client: AsyncClient):
        """❌ Hesabı Sil — token olmadan."""
        response = await client.delete("/api/v1/users/me")
        assert response.status_code == 403