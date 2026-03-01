"""
Risk skoru butonları testleri.
Risk hesapla, PDF rapor oluştur butonları.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient


class TestRiskScoreButton:
    """Risk Skoru Hesapla butonu testleri."""

    @pytest.mark.asyncio
    async def test_calculate_risk_score_success(self, client: AsyncClient):
        """✅ Risk Skoru Hesapla — başarılı hesaplama."""
        mock_result = MagicMock()
        mock_result.score = 6.5
        mock_result.level = "Yüksek"
        mock_result.nearest_fault = "Kuzey Anadolu Fay Hattı"
        mock_result.fault_distance_km = 15.3
        mock_result.soil_class = "Z3"
        mock_result.building_year = 1990
        mock_result.factors = {"fault": 0.7, "soil": 0.6, "building": 0.5}
        mock_result.recommendations = ["Binanızı güçlendirin", "Acil çanta hazırlayın"]

        with patch(
            "app.services.risk_calculator.RiskCalculator.calculate",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            response = await client.post(
                "/api/v1/risk/score",
                json={
                    "latitude": 39.9334,
                    "longitude": 32.8597,
                    "building_year": 1990,
                    "soil_class": "Z3",
                },
            )
        assert response.status_code == 200
        data = response.json()
        assert "score" in data
        assert "level" in data
        assert "nearest_fault" in data
        assert "recommendations" in data

    @pytest.mark.asyncio
    async def test_calculate_risk_score_invalid_lat(self, client: AsyncClient):
        """❌ Risk Skoru Hesapla — geçersiz enlem."""
        response = await client.post(
            "/api/v1/risk/score",
            json={
                "latitude": 999.0,
                "longitude": 32.8597,
                "building_year": 2000,
                "soil_class": "Z2",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_calculate_risk_score_invalid_lon(self, client: AsyncClient):
        """❌ Risk Skoru Hesapla — geçersiz boylam."""
        response = await client.post(
            "/api/v1/risk/score",
            json={
                "latitude": 39.9,
                "longitude": 999.0,
                "building_year": 2000,
                "soil_class": "Z2",
            },
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_calculate_risk_score_old_building(self, client: AsyncClient):
        """✅ Risk Skoru Hesapla — eski bina yılı."""
        mock_result = MagicMock()
        mock_result.score = 8.5
        mock_result.level = "Çok Yüksek"
        mock_result.nearest_fault = "Test Fay"
        mock_result.fault_distance_km = 5.0
        mock_result.soil_class = "Z4"
        mock_result.building_year = 1950
        mock_result.factors = {"fault": 0.9, "soil": 0.8, "building": 0.9}
        mock_result.recommendations = ["Acil tahliye planı yapın"]

        with patch(
            "app.services.risk_calculator.RiskCalculator.calculate",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            response = await client.post(
                "/api/v1/risk/score",
                json={
                    "latitude": 39.9,
                    "longitude": 32.8,
                    "building_year": 1950,
                    "soil_class": "Z4",
                },
            )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_calculate_risk_score_missing_fields(self, client: AsyncClient):
        """❌ Risk Skoru Hesapla — zorunlu alanlar eksik."""
        response = await client.post(
            "/api/v1/risk/score",
            json={"building_year": 2000},
        )
        assert response.status_code == 422


class TestRiskReportButton:
    """PDF Rapor Oluştur butonu testleri."""

    @pytest.mark.asyncio
    async def test_generate_report_success(self, client: AsyncClient, auth_headers):
        """✅ PDF Rapor Oluştur — başarılı oluşturma."""
        mock_result = MagicMock()
        mock_result.score = 5.0
        mock_result.level = "Orta"
        mock_result.nearest_fault = "Test Fay"
        mock_result.fault_distance_km = 25.0
        mock_result.soil_class = "Z2"
        mock_result.building_year = 2000
        mock_result.factors = {"fault": 0.5, "soil": 0.4, "building": 0.3}
        mock_result.recommendations = ["Deprem çantası hazırlayın"]

        mock_pdf = b"%PDF-1.4 test content"

        with patch(
            "app.services.risk_calculator.RiskCalculator.calculate",
            new_callable=AsyncMock,
            return_value=mock_result,
        ), patch(
            "app.services.report_generator.RiskReportGenerator.generate",
            return_value=mock_pdf,
        ):
            response = await client.post(
                "/api/v1/risk/report",
                headers=auth_headers,
                json={
                    "latitude": 39.9,
                    "longitude": 32.8,
                    "building_year": 2000,
                    "soil_class": "Z2",
                },
            )
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"

    @pytest.mark.asyncio
    async def test_generate_report_unauthorized(self, client: AsyncClient):
        """❌ PDF Rapor Oluştur — token olmadan."""
        response = await client.post(
            "/api/v1/risk/report",
            json={
                "latitude": 39.9,
                "longitude": 32.8,
                "building_year": 2000,
                "soil_class": "Z2",
            },
        )
        assert response.status_code == 403