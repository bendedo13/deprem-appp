/**
 * EarthquakeService — Professional multi-source earthquake data aggregator.
 *
 * Sources:
 *  1. AFAD  (Türkiye — POST endpoint, best for regional data)
 *  2. USGS  (Global — FDSN/GeoJSON, very reliable)
 *  3. EMSC  (Europe/Mediterranean — FDSN JSON)
 *  4. Sunucu (Our own backend — authenticated, always tried first)
 *
 * Uses Promise.allSettled so a failed source never crashes the pipeline.
 * Deduplicates overlapping events by proximity in time + space.
 */

import axios from "axios";
import { api } from "./api";
import type { EarthquakeSource, UnifiedEarthquake } from "../types/earthquake";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toIsoNoMs(d: Date): string {
    return d.toISOString().slice(0, 19); // "YYYY-MM-DDTHH:MM:SS"
}

function toAfadDate(d: Date): string {
    return d.toISOString().replace("T", " ").slice(0, 19);
}

function parseAfadDate(s: string): Date {
    // Handles "YYYY.MM.DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS"
    const normalized = s.replace(/\./g, "-").replace(" ", "T") + "Z";
    const parsed = new Date(normalized);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// ─── AFAD ─────────────────────────────────────────────────────────────────────

interface AfadEvent {
    eventID?: string | number;
    date?: string;
    latitude?: string | number;
    longitude?: string | number;
    depth?: string | number;
    magnitude?: string | number;
    type?: string;
    location?: string;
}

async function fetchAFAD(hours: number): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);

    const { data } = await axios.post<AfadEvent[]>(
        "https://deprem.afad.gov.tr/apiv2/event/filter",
        {
            start: toAfadDate(start),
            end: toAfadDate(end),
            minlat: 30,
            maxlat: 45,
            minlon: 24,
            maxlon: 46,
            minDepth: 0,
            maxDepth: 700,
            minMag: 1,
            maxMag: 10,
            orderby: "timedesc",
            limit: 100,
            skip: 0,
        },
        {
            timeout: 12000,
            headers: { "Content-Type": "application/json" },
        }
    );

    const list: AfadEvent[] = Array.isArray(data) ? data : [];
    return list.map((e, i): UnifiedEarthquake => ({
        id: `afad_${e.eventID ?? i}`,
        magnitude: parseFloat(String(e.magnitude ?? 0)),
        depth: parseFloat(String(e.depth ?? 0)),
        coordinates: {
            latitude: parseFloat(String(e.latitude ?? 0)),
            longitude: parseFloat(String(e.longitude ?? 0)),
        },
        title: e.location ?? "Bilinmiyor",
        date: e.date ? parseAfadDate(e.date) : new Date(),
        source: "AFAD",
        magType: e.type?.toUpperCase() ?? "ML",
    }));
}

// ─── USGS ─────────────────────────────────────────────────────────────────────

interface UsgsFeature {
    id: string;
    geometry: { coordinates: [number, number, number] };
    properties: {
        mag: number;
        place: string;
        time: number;   // ms since epoch
        magType: string;
    };
}

async function fetchUSGS(hours: number): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);

    const url =
        `https://earthquake.usgs.gov/fdsnws/event/1/query` +
        `?format=geojson` +
        `&starttime=${toIsoNoMs(start)}` +
        `&endtime=${toIsoNoMs(end)}` +
        `&minmagnitude=1` +
        `&orderby=time` +
        `&limit=100`;

    const { data } = await axios.get<{ features: UsgsFeature[] }>(url, { timeout: 12000 });

    return (data?.features ?? []).map((f): UnifiedEarthquake => ({
        id: `usgs_${f.id}`,
        magnitude: f.properties.mag ?? 0,
        depth: f.geometry.coordinates[2] ?? 0,
        coordinates: {
            latitude: f.geometry.coordinates[1],
            longitude: f.geometry.coordinates[0],
        },
        title: f.properties.place ?? "Unknown",
        date: new Date(f.properties.time),
        source: "USGS",
        magType: f.properties.magType?.toUpperCase() ?? "ML",
    }));
}

// ─── EMSC ─────────────────────────────────────────────────────────────────────

interface EmscFeature {
    properties: {
        evid?: string;
        mag?: number;
        magtype?: string;
        depth?: number;
        lat?: number;
        lon?: number;
        region?: string;
        flynn_region?: string;
        time?: string;
    };
}

async function fetchEMSC(hours: number): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3600 * 1000);

    const url =
        `https://www.seismicportal.eu/fdsnws/event/1/query` +
        `?format=json` +
        `&limit=100` +
        `&minmagnitude=1` +
        `&orderby=time` +
        `&starttime=${toIsoNoMs(start)}` +
        `&endtime=${toIsoNoMs(end)}`;

    const { data } = await axios.get<{ features: EmscFeature[] }>(url, { timeout: 12000 });

    return (data?.features ?? []).map((f, i): UnifiedEarthquake => {
        const p = f.properties;
        return {
            id: `emsc_${p.evid ?? i}`,
            magnitude: p.mag ?? 0,
            depth: p.depth ?? 0,
            coordinates: {
                latitude: p.lat ?? 0,
                longitude: p.lon ?? 0,
            },
            title: p.flynn_region ?? p.region ?? "Unknown",
            date: p.time ? new Date(p.time) : new Date(),
            source: "EMSC",
            magType: p.magtype?.toUpperCase() ?? "ML",
        };
    });
}

// ─── Backend ──────────────────────────────────────────────────────────────────

interface BackendEq {
    id: string;
    source?: string;
    magnitude: number;
    depth: number;
    latitude: number;
    longitude: number;
    location?: string;
    occurred_at: string;
}

async function fetchBackend(): Promise<UnifiedEarthquake[]> {
    const { data } = await api.get<{ items?: BackendEq[] } | BackendEq[]>(
        "/api/v1/earthquakes?page_size=100&hours=24"
    );
    const list: BackendEq[] = Array.isArray(data)
        ? data
        : (data as { items?: BackendEq[] }).items ?? [];

    return list.map((e): UnifiedEarthquake => ({
        id: `backend_${e.id}`,
        magnitude: e.magnitude,
        depth: e.depth,
        coordinates: { latitude: e.latitude, longitude: e.longitude },
        title: e.location ?? "Bilinmiyor",
        date: new Date(e.occurred_at),
        source: "SUNUCU",
        magType: e.source?.toUpperCase() === "AFAD" ? "Mw" : "ML",
    }));
}

// ─── Turkey bounds ────────────────────────────────────────────────────────────

const TURKEY_BOUNDS = { minLat: 35.5, maxLat: 42.5, minLon: 25.5, maxLon: 44.8 };

function isTurkey(eq: UnifiedEarthquake): boolean {
    const { latitude: lat, longitude: lon } = eq.coordinates;
    return (
        lat >= TURKEY_BOUNDS.minLat && lat <= TURKEY_BOUNDS.maxLat &&
        lon >= TURKEY_BOUNDS.minLon && lon <= TURKEY_BOUNDS.maxLon
    );
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Removes earthquakes that are very close in time and space.
 * Priority order (AFAD → USGS → EMSC → SUNUCU) is already baked in via sort order.
 */
function deduplicate(sorted: UnifiedEarthquake[]): UnifiedEarthquake[] {
    const result: UnifiedEarthquake[] = [];
    for (const eq of sorted) {
        const isDuplicate = result.some((r) => {
            const secDiff = Math.abs(r.date.getTime() - eq.date.getTime()) / 1000;
            const latDiff = Math.abs(r.coordinates.latitude - eq.coordinates.latitude);
            const lonDiff = Math.abs(r.coordinates.longitude - eq.coordinates.longitude);
            return secDiff < 120 && latDiff < 0.2 && lonDiff < 0.2;
        });
        if (!isDuplicate) result.push(eq);
    }
    return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

const PRIORITY: EarthquakeSource[] = ["AFAD", "USGS", "EMSC", "SUNUCU"];

export interface FetchResult {
    earthquakes: UnifiedEarthquake[];
    /** Sources that returned data successfully */
    activeSources: EarthquakeSource[];
    /** Sources that failed (for debugging) */
    failedSources: EarthquakeSource[];
}

export async function fetchAllEarthquakes(hours = 24): Promise<FetchResult> {
    const fetchers: [EarthquakeSource, () => Promise<UnifiedEarthquake[]>][] = [
        ["AFAD",   () => fetchAFAD(hours)],
        ["USGS",   () => fetchUSGS(hours)],
        ["EMSC",   () => fetchEMSC(hours)],
        ["SUNUCU", () => fetchBackend()],
    ];

    const settled = await Promise.allSettled(fetchers.map(([, fn]) => fn()));

    const all: UnifiedEarthquake[] = [];
    const activeSources: EarthquakeSource[] = [];
    const failedSources: EarthquakeSource[] = [];

    settled.forEach((result, idx) => {
        const source = fetchers[idx][0];
        if (result.status === "fulfilled" && result.value.length > 0) {
            all.push(...result.value);
            activeSources.push(source);
        } else {
            failedSources.push(source);
            if (result.status === "rejected") {
                console.warn(`[EarthquakeService] ${source} failed:`, result.reason?.message ?? result.reason);
            }
        }
    });

    // Sort by priority first so deduplication keeps higher-priority sources
    all.sort((a, b) => {
        const pa = PRIORITY.indexOf(a.source);
        const pb = PRIORITY.indexOf(b.source);
        if (pa !== pb) return pa - pb;
        return b.date.getTime() - a.date.getTime();
    });

    const deduped = deduplicate(all);

    // Final sort: Turkey-first, then newest within each group
    deduped.sort((a, b) => {
        const aTR = isTurkey(a);
        const bTR = isTurkey(b);
        if (aTR !== bTR) return aTR ? -1 : 1;
        return b.date.getTime() - a.date.getTime();
    });

    return { earthquakes: deduped, activeSources, failedSources };
}
