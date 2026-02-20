/**
 * Seismic backend servisi — titreşim raporu gönderme.
 * rules.md: try/catch zorunlu, type hints, logging yok → console.error kabul.
 */

import { api } from "./api";

export interface SeismicReportPayload {
    device_id: string;
    peak_acceleration: number;
    sta_lta_ratio: number;
    latitude: number;
    longitude: number;
}

export interface SeismicReportResponse {
    id: number;
    device_id: string;
    cluster_id: number | null;
    cluster_size: number;
    is_likely_earthquake: boolean;
    reported_at: string;
}

/**
 * Cihaz titreşim raporunu backend'e gönderir.
 * @returns Cluster bilgisi ve deprem tahmini.
 */
export async function reportTrigger(
    payload: SeismicReportPayload
): Promise<SeismicReportResponse | null> {
    try {
        const res = await api.post<SeismicReportResponse>("/api/v1/seismic/report", payload);
        return res.data;
    } catch {
        // Ağ hatası sessizce geçilir — kullanıcıyı rahatsız etme
        return null;
    }
}
