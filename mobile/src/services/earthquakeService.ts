/**
 * EarthquakeService — 4 kaynak: AFAD, Kandilli, EMSC, USGS.
 * Her kaynak için en güncel 20 depremi getirir.
 */

import axios from "axios";
import type { EarthquakeSource, UnifiedEarthquake } from "../types/earthquake";

const LIMIT_PER_SOURCE = 20;
const HOURS = 24;

function toIsoNoMs(d: Date): string {
    return d.toISOString().slice(0, 19);
}

function toAfadDate(d: Date): string {
    return d.toISOString().replace("T", " ").slice(0, 19);
}

function parseAfadDate(s: string): Date {
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

async function fetchAFAD(): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - HOURS * 3600 * 1000);

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
            limit: LIMIT_PER_SOURCE,
            skip: 0,
        },
        { timeout: 12000, headers: { "Content-Type": "application/json" } }
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

// ─── Kandilli ──────────────────────────────────────────────────────────────────

interface KandilliResult {
    earthquake_id: string;
    title: string;
    mag: number;
    depth: number;
    geojson: { coordinates: [number, number] }; // [lon, lat]
    date_time: string;
}

async function fetchKandilli(): Promise<UnifiedEarthquake[]> {
    const { data } = await axios.get<{ result?: KandilliResult[] }>(
        "https://api.orhanaydogdu.com.tr/deprem/kandilli/live",
        { timeout: 12000 }
    );

    const list: KandilliResult[] = data?.result ?? [];
    const seen = new Set<string>();
    return list
        .filter((e) => {
            const key = `${e.geojson.coordinates[0]}:${e.geojson.coordinates[1]}:${e.date_time}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, LIMIT_PER_SOURCE)
        .map((e): UnifiedEarthquake => ({
            id: `kandilli_${e.earthquake_id}`,
            magnitude: e.mag ?? 0,
            depth: e.depth ?? 0,
            coordinates: {
                latitude: e.geojson.coordinates[1],
                longitude: e.geojson.coordinates[0],
            },
            title: e.title ?? "Bilinmiyor",
            date: e.date_time ? new Date(e.date_time.replace(" ", "T") + "Z") : new Date(),
            source: "KANDILLI",
            magType: "ML",
        }));
}

// ─── USGS ─────────────────────────────────────────────────────────────────────

interface UsgsFeature {
    id: string;
    geometry: { coordinates: [number, number, number] };
    properties: { mag: number; place: string; time: number; magType: string };
}

async function fetchUSGS(): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - HOURS * 3600 * 1000);

    const url =
        `https://earthquake.usgs.gov/fdsnws/event/1/query` +
        `?format=geojson` +
        `&starttime=${toIsoNoMs(start)}` +
        `&endtime=${toIsoNoMs(end)}` +
        `&minmagnitude=1` +
        `&orderby=time` +
        `&limit=${LIMIT_PER_SOURCE}`;

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

async function fetchEMSC(): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - HOURS * 3600 * 1000);

    const url =
        `https://www.seismicportal.eu/fdsnws/event/1/query` +
        `?format=json` +
        `&limit=${LIMIT_PER_SOURCE}` +
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

// ─── USGS/EMSC bbox versiyonları ──────────────────────────────────────────────

type Bbox = { minlat: number; maxlat: number; minlon: number; maxlon: number };

async function fetchUSGSWithBbox(bbox: Bbox): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - HOURS * 3600 * 1000);
    const url =
        `https://earthquake.usgs.gov/fdsnws/event/1/query` +
        `?format=geojson` +
        `&starttime=${toIsoNoMs(start)}` +
        `&endtime=${toIsoNoMs(end)}` +
        `&minmagnitude=1` +
        `&orderby=time` +
        `&limit=${LIMIT_PER_SOURCE}` +
        `&minlatitude=${bbox.minlat}` +
        `&maxlatitude=${bbox.maxlat}` +
        `&minlongitude=${bbox.minlon}` +
        `&maxlongitude=${bbox.maxlon}`;

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

async function fetchEMSCWithBbox(bbox: Bbox): Promise<UnifiedEarthquake[]> {
    const end = new Date();
    const start = new Date(end.getTime() - HOURS * 3600 * 1000);
    const url =
        `https://www.seismicportal.eu/fdsnws/event/1/query` +
        `?format=json` +
        `&limit=${LIMIT_PER_SOURCE}` +
        `&minmagnitude=1` +
        `&orderby=time` +
        `&starttime=${toIsoNoMs(start)}` +
        `&endtime=${toIsoNoMs(end)}` +
        `&minlat=${bbox.minlat}` +
        `&maxlat=${bbox.maxlat}` +
        `&minlon=${bbox.minlon}` +
        `&maxlon=${bbox.maxlon}`;

    const { data } = await axios.get<{ features: EmscFeature[] }>(url, { timeout: 12000 });
    return (data?.features ?? []).map((f, i): UnifiedEarthquake => {
        const p = f.properties;
        return {
            id: `emsc_${p.evid ?? i}`,
            magnitude: p.mag ?? 0,
            depth: p.depth ?? 0,
            coordinates: { latitude: p.lat ?? 0, longitude: p.lon ?? 0 },
            title: p.flynn_region ?? p.region ?? "Unknown",
            date: p.time ? new Date(p.time) : new Date(),
            source: "EMSC",
            magType: p.magtype?.toUpperCase() ?? "ML",
        };
    });
}

// ─── Deduplication ────────────────────────────────────────────────────────────

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

const FETCHERS: Record<EarthquakeSource, () => Promise<UnifiedEarthquake[]>> = {
    AFAD: fetchAFAD,
    KANDILLI: fetchKandilli,
    USGS: fetchUSGS,
    EMSC: fetchEMSC,
};

export interface FetchResult {
    earthquakes: UnifiedEarthquake[];
    activeSources: EarthquakeSource[];
    failedSources: EarthquakeSource[];
}

export interface FetchOptions {
    bbox?: { minlat: number; maxlat: number; minlon: number; maxlon: number };
}

export async function fetchEarthquakes(
    sources: EarthquakeSource[],
    options: FetchOptions = {}
): Promise<FetchResult> {
    const { bbox } = options;

    const getFetcher = (s: EarthquakeSource): (() => Promise<UnifiedEarthquake[]>) => {
        if (bbox && s === "USGS") return () => fetchUSGSWithBbox(bbox);
        if (bbox && s === "EMSC") return () => fetchEMSCWithBbox(bbox);
        return FETCHERS[s] ?? (() => Promise.resolve([]));
    };

    const settled = await Promise.allSettled(sources.map((s) => getFetcher(s)()));

    const all: UnifiedEarthquake[] = [];
    const activeSources: EarthquakeSource[] = [];
    const failedSources: EarthquakeSource[] = [];

    settled.forEach((result, idx) => {
        const source = sources[idx];
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

    const priority: EarthquakeSource[] = ["AFAD", "KANDILLI", "EMSC", "USGS"];
    all.sort((a, b) => {
        const pa = priority.indexOf(a.source);
        const pb = priority.indexOf(b.source);
        if (pa !== pb) return pa - pb;
        return b.date.getTime() - a.date.getTime();
    });

    const deduped = deduplicate(all);
    deduped.sort((a, b) => b.date.getTime() - a.date.getTime());

    return { earthquakes: deduped, activeSources, failedSources };
}
