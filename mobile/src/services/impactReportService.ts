import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const CACHE_KEY = "quakesense_impact_reports_v1";

export type ImpactType = "building_damage" | "road_blocked" | "fire";

export interface ImpactReport {
    id: string;
    type: ImpactType;
    latitude: number;
    longitude: number;
    description?: string;
    created_at: string;
}

export async function loadImpactReports(): Promise<ImpactReport[]> {
    try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as ImpactReport[];
    } catch {
        return [];
    }
}

export async function saveImpactReports(
    reports: ImpactReport[]
): Promise<void> {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(reports));
    } catch {
        // sessizce geç
    }
}

export async function addImpactReport(
    report: Omit<ImpactReport, "id" | "created_at">
): Promise<ImpactReport[]> {
    const existing = await loadImpactReports();
    const full: ImpactReport = {
        ...report,
        id: `r-${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 7)}`,
        created_at: new Date().toISOString(),
    };
    const next = [full, ...existing].slice(0, 200);
    await saveImpactReports(next);

    // Backend'e de gönder (fire-and-forget, hata olursa yerel kayıt yeterli)
    try {
        await api.post("/api/v1/impact-reports", {
            type: full.type,
            latitude: full.latitude,
            longitude: full.longitude,
            description: full.description ?? null,
        });
    } catch {
        // Backend henüz hazır değilse veya hata olursa sessizce devam et
    }

    return next;
}

