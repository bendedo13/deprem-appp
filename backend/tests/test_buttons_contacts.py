"""
Acil iletişim kişisi butonları testleri.
Kişi ekle, listele, sil butonları.
"""

import pytest
from httpx import AsyncClient


class TestListContactsButton:
    """Kişileri Listele butonu testleri."""

    @pytest.mark.asyncio
    async def test_list_contacts_empty(self, client: AsyncClient, auth_headers):
        """✅ Kişileri Listele — boş liste."""
        response = await client.get("/api/v1/users/me/contacts", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_list_contacts_with_data(
        self, client: AsyncClient, auth_headers, test_contact
    ):
        """✅ Kişileri Listele — kişi varken."""
        response = await client.get("/api/v1/users/me/contacts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["name"] == "Acil Kişi"

    @pytest.mark.asyncio
    async def test_list_contacts_unauthorized(self, client: AsyncClient):
        """❌ Kişileri Listele — token olmadan."""
        response = await client.get("/api/v1/users/me/contacts")
        assert response.status_code == 403


class TestAddContactButton:
    """Kişi Ekle butonu testleri."""

    @pytest.mark.asyncio
    async def test_add_contact_success(self, client: AsyncClient, auth_headers):
        """✅ Kişi Ekle — başarılı ekleme."""
        response = await client.post(
            "/api/v1/users/me/contacts",
            headers=auth_headers,
            json={
                "name": "Annem",
                "phone": "+905551234567",
                "email": "annem@example.com",
                "relation": "Aile",
                "methods": ["sms"],
                "priority": 1,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Annem"
        assert data["relation"] == "Aile"
        assert data["priority"] == 1

    @pytest.mark.asyncio
    async def test_add_contact_minimal(self, client: AsyncClient, auth_headers):
        """✅ Kişi Ekle — minimum zorunlu alanlarla."""
        response = await client.post(
            "/api/v1/users/me/contacts",
            headers=auth_headers,
            json={
                "name": "Babam",
                "phone": "+905559876543",
                "relation": "Aile",
                "methods": ["sms"],
                "priority": 2,
            },
        )
        assert response.status_code == 201

    @pytest.mark.asyncio
    async def test_add_contact_empty_name(self, client: AsyncClient, auth_headers):
        """❌ Kişi Ekle — boş isim validasyonu."""
        response = await client.post(
            "/api/v1/users/me/contacts",
            headers=auth_headers,
            json={
                "name": "   ",
                "phone": "+905551234567",
                "relation": "Aile",
                "methods": ["sms"],
                "priority": 1,
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_add_contact_invalid_phone(self, client: AsyncClient, auth_headers):
        """❌ Kişi Ekle — geçersiz telefon numarası."""
        response = await client.post(
            "/api/v1/users/me/contacts",
            headers=auth_headers,
            json={
                "name": "Test Kişi",
                "phone": "abc-def-ghij",
                "relation": "Arkadaş",
                "methods": ["sms"],
                "priority": 1,
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_add_contact_limit_exceeded(
        self, client: AsyncClient, auth_headers, db_session, test_user
    ):
        """❌ Kişi Ekle — 5 kişi limitini aşma."""
        from app.models.emergency_contact import EmergencyContact

        # Mevcut kişileri temizle
        from sqlalchemy import delete
        await db_session.execute(
            delete(EmergencyContact).where(EmergencyContact.user_id == test_user.id)
        )
        await db_session.commit()

        # 5 kişi ekle
        for i in range(5):
            contact = EmergencyContact(
                user_id=test_user.id,
                name=f"Kişi {i}",
                phone=f"+9055512345{i:02d}",
                relation="Aile",
                methods=["sms"],
                priority=1,
            )
            db_session.add(contact)
        await db_session.commit()

        # 6. kişiyi eklemeye çalış
        response = await client.post(
            "/api/v1/users/me/contacts",
            headers=auth_headers,
            json={
                "name": "Altıncı Kişi",
                "phone": "+905551234599",
                "relation": "Arkadaş",
                "methods": ["sms"],
                "priority": 1,
            },
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_add_contact_unauthorized(self, client: AsyncClient):
        """❌ Kişi Ekle — token olmadan."""
        response = await client.post(
            "/api/v1/users/me/contacts",
            json={"name": "Test", "phone": "+905551234567", "relation": "Aile", "methods": ["sms"], "priority": 1},
        )
        assert response.status_code == 403


class TestDeleteContactButton:
    """Kişi Sil butonu testleri."""

    @pytest.mark.asyncio
    async def test_delete_contact_success(
        self, client: AsyncClient, auth_headers, test_contact
    ):
        """✅ Kişi Sil — başarılı silme."""
        response = await client.delete(
            f"/api/v1/users/me/contacts/{test_contact.id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_contact_not_found(self, client: AsyncClient, auth_headers):
        """❌ Kişi Sil — var olmayan kişi."""
        response = await client.delete(
            "/api/v1/users/me/contacts/99999",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_contact_other_user(
        self, client: AsyncClient, db_session, test_contact
    ):
        """❌ Kişi Sil — başka kullanıcının kişisini silmeye çalışma."""
        from app.models.user import User
        from app.services.auth import hash_password, create_access_token

        # Farklı kullanıcı oluştur
        other_user = User(
            email="diger@example.com",
            password_hash=hash_password("Sifre1234!"),
            is_active=True,
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)

        other_token = create_access_token(other_user.id, other_user.email)
        other_headers = {"Authorization": f"Bearer {other_token}"}

        response = await client.delete(
            f"/api/v1/users/me/contacts/{test_contact.id}",
            headers=other_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_contact_unauthorized(self, client: AsyncClient, test_contact):
        """❌ Kişi Sil — token olmadan."""
        response = await client.delete(
            f"/api/v1/users/me/contacts/{test_contact.id}"
        )
        assert response.status_code == 403