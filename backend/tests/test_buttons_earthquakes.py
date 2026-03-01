"""
Deprem listesi ve detay butonları testleri.
Deprem listele, filtrele, detay görüntüle butonları.
"""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient


class TestEarthquakeListButton:
    """Depremleri Listele butonu testleri."""

    @pytest.mark.asyncio
    async def test_list_earthquakes_default(self, client: AsyncClient, test_earthquake):
        """✅ Depremleri Listele — varsayılan parametrelerle."""
        with patch("app.services.cache_manager.get_earthquake_cache", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = None
            with patch("app.services.cache_manager.set_earthquake_cache", new_callable=AsyncMock):
                response = await client.get("/api/v1/earthquakes")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

    @pytest.mark.asyncio
    async def test_list_earthquakes_filter_magnitude(
        self, client: AsyncClient, test_earthquake
    ):
        """✅ Depremleri Listele — büyüklük filtresi."""
        with patch("app.services.cache_manager.get_earthquake_cache", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = None
            with patch("app.services.cache_manager.set_earthquake_cache", new_callable=AsyncMock):
                response = await client.get(
                    "/api/v1/earthquakes",
                    params={"min_magnitude": 5.0, "max_magnitude": 6.0},
                )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_list_earthquakes_pagination(self, client: AsyncClient):
        """✅ Depremleri Listele — sayfalama parametreleri."""
        with patch("app.services.cache_manager.get_earthquake_cache", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = None
            with patch("app.services.cache_manager.set_earthquake_cache", new_callable=AsyncMock):
                response = await client.get(
                    "/api/v1/earthquakes",
                    params={"page": 1, "page_size": 10},
                )
        assert response.status_code == 200
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 10

    @pytest.mark.asyncio
    async def test_list_earthquakes_invalid_magnitude(self, client: AsyncClient):
        """❌ Depremleri Listele — geçersiz büyüklük değeri."""
        response = await client.get(
            "/api/v1/earthquakes",
            params={"min_magnitude": -1.0},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_earthquakes_invalid_hours(self, client: AsyncClient):
        """❌ Depremleri Listele — geçersiz saat değeri."""
        response = await client.get(
            "/api/v1/earthquakes",
            params={"hours": 0},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_list_earthquakes_cache_hit(self, client: AsyncClient):
        """✅ Depremleri Listele — cache'den yanıt."""
        cached_data = {
            "items": [],
            "total": 0,
            "page": 1,
            "page_size": 50,
        }
        with patch("app.services.cache_manager.get_earthquake_cache", new_callable=AsyncMock) as mock_cache:
            mock_cache.return_value = cached_data
            response = await client.get("/api/v1/earthquakes")
        assert response.status_code == 200


class TestEarthquakeDetailButton:
    """Deprem Detayı butonu testleri."""

    @pytest.mark.asyncio
    async def test_get_earthquake_detail_success(
        self, client: AsyncClient, test_earthquake
    ):
        """✅ Deprem Detayı — var olan deprem."""
        response = await client.get(f"/api/v1/earthquakes/{test_earthquake.id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_earthquake.id
        assert data["magnitude"] == test_earthquake.magnitude
        assert data["location"] == test_earthquake.location

    @pytest.mark.asyncio
    async def test_get_earthquake_detail_not_found(self, client: AsyncClient):
        """❌ Deprem Detayı — var olmayan deprem."""
        response = await client.get("/api/v1/earthquakes/yok-12345")
        assert response.status_code == 404