import { api } from "./api";

export interface RiskScoreIn {
    latitude: number;
    longitude: number;
    building_year?: number;
    soil_class?: string;
}

export interface RiskResult {
    score: number;
    level: string;
    nearest_fault: string;
    fault_distance_km: number;
    soil_class: string;
    building_year: number;
    factors: Record<string, number>;
    recommendations: string[];
}

/**
 * Risk analizi servisi.
 * Sunucu yanıt süresi uzun olabildiği için timeout 25 saniye.
 */
const RISK_SCORE_TIMEOUT_MS = 25_000;

export const calculateRiskScore = async (data: RiskScoreIn): Promise<RiskResult> => {
    const response = await api.post("/api/v1/risk/score", data, {
        timeout: RISK_SCORE_TIMEOUT_MS,
    });
    return response.data;
};

export const getRiskReportPdf = async (data: RiskScoreIn): Promise<any> => {
    const response = await api.post("/api/v1/risk/report", data, {
        responseType: "arraybuffer",
    });
    return response.data;
};
