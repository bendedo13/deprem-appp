"""
Seismic (sensör) API endpoint'leri.
POST /seismic/report → cihaz titreşim raporu al, cluster güncelle.
GET  /seismic/clusters → aktif cluster listesi.
rules.md: rate limit, type hints, logging, try/catch.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.seismic_report import SeismicReport
from app.schemas.seismic import SeismicReportIn, SeismicReportOut, SeismicClusterOut
from app.services.seismic_cluster import (
    find_nearby_cluster_id,
    get_next_cluster_id,
    get_cluster_size,
    is_likely_earthquake,
)

logger = logging.getLogger(__name__)
router = APIRouter()

_CLUSTER_WINDOW_SEC: int = 60


@router.post(
    "/report",
    response_model=SeismicReportOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cihaz titreşim raporu gönder",
)
async def report_trigger(
    body: SeismicReportIn,
    db: AsyncSession = Depends(get_db),
) -> SeismicReportOut:
    """
    Cihaz STA/LTA eşiğini aştığında buraya rapor gönderir.
    Yakın raporlarla kümelenerek olası deprem tespiti yapılır.
    """
    now = datetime.now(tz=timezone.utc)

    cluster_id = await find_nearby_cluster_id(body.latitude, body.longitude, now, db)
    if cluster_id is None:
        cluster_id = await get_next_cluster_id(db)

    report = SeismicReport(
        device_id=body.device_id,
        peak_acceleration=body.peak_acceleration,
        sta_lta_ratio=body.sta_lta_ratio,
        latitude=body.latitude,
        longitude=body.longitude,
        cluster_id=cluster_id,
        reported_at=now,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    size = await get_cluster_size(cluster_id, db)
    earthquake = is_likely_earthquake(size)

    if earthquake:
        logger.warning(
            "Olası crowd-sourced deprem! cluster_id=%d size=%d lat=%.4f lng=%.4f",
            cluster_id, size, body.latitude, body.longitude,
        )

    return SeismicReportOut(
        id=report.id,
        device_id=report.device_id,
        cluster_id=report.cluster_id,
        cluster_size=size,
        is_likely_earthquake=earthquake,
        reported_at=report.reported_at,
    )


@router.get(
    "/clusters",
    response_model=List[SeismicClusterOut],
    summary="Aktif sismik cluster'ları listele",
)
async def list_clusters(db: AsyncSession = Depends(get_db)) -> List[SeismicClusterOut]:
    """Son 60 saniyedeki aktif cluster'ları döner."""
    since = datetime.now(tz=timezone.utc) - timedelta(seconds=_CLUSTER_WINDOW_SEC)
    result = await db.execute(
        select(
            SeismicReport.cluster_id,
            func.count(SeismicReport.id).label("report_count"),
            func.avg(SeismicReport.latitude).label("center_lat"),
            func.avg(SeismicReport.longitude).label("center_lng"),
            func.max(SeismicReport.peak_acceleration).label("max_accel"),
            func.min(SeismicReport.reported_at).label("first_at"),
        )
        .where(SeismicReport.reported_at >= since, SeismicReport.cluster_id.is_not(None))
        .group_by(SeismicReport.cluster_id)
        .order_by(func.count(SeismicReport.id).desc())
    )
    rows = result.all()
    return [
        SeismicClusterOut(
            cluster_id=int(r.cluster_id),
            report_count=int(r.report_count),
            center_latitude=float(r.center_lat),
            center_longitude=float(r.center_lng),
            max_acceleration=float(r.max_accel),
            is_likely_earthquake=is_likely_earthquake(int(r.report_count)),
            first_report_at=r.first_at,
        )
        for r in rows
    ]
