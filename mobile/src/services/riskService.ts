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
 */
export const calculateRiskScore = async (data: RiskScoreIn): Promise<RiskResult> => {
    const response = await api.post("/api/v1/risk/score", data);
    return response.data;
};

export const getRiskReportPdf = async (data: RiskScoreIn): Promise<any> => {
    const response = await api.post("/api/v1/risk/report", data, {
        responseType: "arraybuffer",
    });
    return response.data;
};
