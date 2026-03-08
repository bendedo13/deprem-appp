import AsyncStorage from "@react-native-async-storage/async-storage";
import gatheringPoints from "../data/gathering_points.json";

const CACHE_KEY = "quakesense_gathering_points_v1";

export type GatheringPoint = {
    id: number;
    name: string;
    city: string;
    district: string;
    latitude: number;
    longitude: number;
    capacity?: number;
    amenities?: {
        water?: boolean;
        electricity?: boolean;
        shelter?: boolean;
    };
};

export interface NearbyPoint extends GatheringPoint {
    distanceKm: number;
    bearingDeg: number;
}

function toRad(value: number): number {
    return (value * Math.PI) / 180;
}

export function haversineKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function bearingDeg(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δλ = toRad(lon2 - lon1);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const deg = (θ * 180) / Math.PI;
    return (deg + 360) % 360;
}

/** Statik JSON'u AsyncStorage'a yazar; offline okuma için kullanılır. */
async function warmCache(): Promise<GatheringPoint[]> {
    try {
        const json = JSON.stringify(gatheringPoints);
        await AsyncStorage.setItem(CACHE_KEY, json);
    } catch {
        // cache yazılamasa da kritik değil
    }
    return gatheringPoints as GatheringPoint[];
}

export async function loadGatheringPoints(): Promise<GatheringPoint[]> {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as GatheringPoint[];
        }
    } catch {
        // cache okunamazsa statik veriye düş
    }
    return warmCache();
}

export async function findNearestPoints(
    lat: number,
    lon: number,
    limit: number = 3
): Promise<NearbyPoint[]> {
    const points = await loadGatheringPoints();
    const enriched: NearbyPoint[] = points.map((p) => ({
        ...p,
        distanceKm: haversineKm(lat, lon, p.latitude, p.longitude),
        bearingDeg: bearingDeg(lat, lon, p.latitude, p.longitude),
    }));
    return enriched.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

