"""
Bildirim tercihleri butonları testleri.
FCM token kaydet/sil, tercih görüntüle/güncelle, test bildirimi gönder.
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


class TestFCMTokenButton:
    """FCM Token Kaydet butonu testleri."""

    @pytest.mark.asyncio
    async def test_register_fcm_token_success(self, client: AsyncClient, auth_headers):
        """✅ FCM Token Kaydet — başarılı kayıt."""
        response = await client.post(
            "/api/v1/notifications/fcm-token",
            headers=auth_headers,
            json={"fcm_token": "test-fcm-token-abcdefghijklmnopqrstuvwxyz"},
        )
        assert response.status_code == 200
        assert response.json()["ok"] is True

    @pytest.mark.asyncio
    async def test_register_fcm_token_too_short(self, client: AsyncClient, auth_headers):
        """❌ FCM Token Kaydet — çok kısa token."""
        response = await client.post(
            "/api/v1/notifications/fcm-token",
            headers=auth_headers,
            json={"fcm_token": "kisa"},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_fcm_token_unauthorized(self, client: AsyncClient):
        """❌ FCM Token Kaydet — token olmadan."""
        response = await client.post(
            "/api/v1/notifications/fcm-token",
            json={"fcm_token": "test-fcm-token-abcdefghijklmnopqrstuvwxyz"},
        )
        assert response.status_code == 403


class TestDeleteFCMTokenButton:
    """FCM Token Sil (Bildirimleri Kapat) butonu testleri."""

    @pytest.mark.asyncio
    async def test_delete_fcm_token_success(self, client: AsyncClient, auth_headers):
        """✅ FCM Token Sil — başarılı silme."""
        response = await client.delete(
            "/api/v1/notifications/fcm-token",
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["ok"] is True

    @pytest.mark.asyncio
    async def test_delete_fcm_token_unauthorized(self, client: AsyncClient):
        """❌ FCM Token Sil — token olmadan."""
        response = await client.delete("/api/v1/notifications/fcm-token")
        assert response.status_code == 403


class TestNotificationPreferencesButton:
    """Bildirim Tercihleri butonu testleri."""

    @pytest.mark.asyncio
    async def test_get_preferences_success(self, client: AsyncClient, auth_headers):
        """✅ Tercihleri Getir — başarılı (varsayılan oluşturulur)."""
        response = await client.get(
            "/api/v1/notifications/preferences",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "min_magnitude" in data
        assert "push_enabled" in data

    @pytest.mark.asyncio
    async def test_update_preferences_success(self, client: AsyncClient, auth_headers):
        """✅ Tercihleri Güncelle — başarılı güncelleme."""
        response = await client.put(
            "/api/v1/notifications/preferences",
            headers=auth_headers,
            json={
                "min_magnitude": 4.0,
                "radius_km": 200.0,
                "is_enabled": True,
            },
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_update_preferences_invalid_magnitude(
        self, client: AsyncClient, auth_headers
    ):
        """❌ Tercihleri Güncelle — geçersiz büyüklük değeri."""
        response = await client.put(
            "/api/v1/notifications/preferences",
            headers=auth_headers,
            json={
                "min_magnitude": 15.0,  # 10'dan büyük olamaz
                "radius_km": 200.0,
                "is_enabled": True,
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_preferences_unauthorized(self, client: AsyncClient):
        """❌ Tercihleri Getir — token olmadan."""
        response = await client.get("/api/v1/notifications/preferences")
        assert response.status_code == 403


class TestTestNotificationButton:
    """Test Bildirimi Gönder butonu testleri."""

    @pytest.mark.asyncio
    async def test_send_test_notification_no_fcm(self, client: AsyncClient, auth_headers):
        """❌ Test Bildirimi — FCM token kayıtlı değil."""
        response = await client.post(
            "/api/v1/notifications/test",
            headers=auth_headers,
            json={"magnitude": 5.0, "location": "Test Konumu"},
        )
        assert response.status_code == 400
        assert "FCM token" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_send_test_notification_with_fcm(
        self, client: AsyncClient, auth_headers, db_session, test_user
    ):
        """✅ Test Bildirimi — FCM token kayıtlıyken."""
        # FCM token ekle
        test_user.fcm_token = "test-fcm-token-abcdefghijklmnopqrstuvwxyz"
        await db_session.commit()

        with patch("app.services.fcm.send_earthquake_push", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = True
            response = await client.post(
                "/api/v1/notifications/test",
                headers=auth_headers,
                json={"magnitude": 5.0, "location": "Test Konumu"},
            )
        assert response.status_code == 200

        # Temizle
        test_user.fcm_token = None
        await db_session.commit()

    @pytest.mark.asyncio
    async def test_send_test_notification_unauthorized(self, client: AsyncClient):
        """❌ Test Bildirimi — token olmadan."""
        response = await client.post(
            "/api/v1/notifications/test",
            json={"magnitude": 5.0, "location": "Test"},
        )
        assert response.status_code == 403