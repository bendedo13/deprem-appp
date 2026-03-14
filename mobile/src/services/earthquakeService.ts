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

// ─── İl Merkezi Koordinatları (reverse-geocode) ──────────────────────────────

const TURKEY_PROVINCES: [number, number, string][] = [
    [39.92, 32.85, "Ankara"], [41.01, 28.98, "İstanbul"], [38.42, 27.14, "İzmir"],
    [37.00, 35.32, "Adana"], [36.88, 30.71, "Antalya"], [40.18, 29.07, "Bursa"],
    [39.77, 30.52, "Eskişehir"], [38.73, 35.49, "Kayseri"], [37.87, 32.48, "Konya"],
    [40.66, 29.29, "Kocaeli"], [38.35, 38.31, "Malatya"], [37.58, 36.94, "Kahramanmaraş"],
    [37.75, 30.29, "Burdur"], [37.77, 29.09, "Denizli"], [38.68, 29.41, "Afyonkarahisar"],
    [41.29, 36.33, "Samsun"], [41.00, 40.52, "Trabzon"], [39.65, 27.89, "Balıkesir"],
    [40.19, 36.40, "Tokat"], [39.92, 41.28, "Erzurum"], [39.75, 37.01, "Sivas"],
    [37.07, 37.38, "Gaziantep"], [37.16, 28.36, "Muğla"], [40.77, 30.40, "Sakarya"],
    [39.23, 43.05, "Ağrı"], [38.39, 43.28, "Van"], [37.92, 40.22, "Diyarbakır"],
    [37.76, 38.28, "Adıyaman"], [39.14, 34.16, "Kırşehir"], [38.63, 34.72, "Nevşehir"],
    [40.60, 43.10, "Kars"], [41.20, 32.63, "Kastamonu"], [41.67, 26.56, "Edirne"],
    [40.17, 26.40, "Çanakkale"], [38.94, 40.23, "Bingöl"], [38.50, 43.38, "Bitlis"],
    [38.37, 42.12, "Muş"], [37.31, 40.74, "Mardin"], [37.92, 41.95, "Batman"],
    [37.05, 41.22, "Siirt"], [38.26, 40.54, "Elazığ"], [39.65, 39.92, "Erzincan"],
    [38.73, 39.50, "Tunceli"], [40.72, 39.67, "Gümüşhane"], [40.33, 39.72, "Bayburt"],
    [41.12, 40.93, "Rize"], [41.19, 41.82, "Artvin"], [40.92, 38.39, "Giresun"],
    [40.72, 37.37, "Ordu"], [41.57, 36.01, "Sinop"], [40.60, 33.61, "Çorum"],
    [41.67, 27.95, "Tekirdağ"], [40.65, 35.84, "Amasya"], [37.59, 36.17, "Osmaniye"],
    [36.80, 34.63, "Mersin"], [37.38, 33.23, "Karaman"], [38.02, 32.51, "Aksaray"],
    [39.85, 33.52, "Kırıkkale"], [40.41, 30.97, "Bilecik"], [38.25, 34.03, "Niğde"],
    [36.40, 36.35, "Hatay"], [37.45, 44.05, "Hakkari"], [37.56, 42.46, "Şırnak"],
    [41.43, 31.79, "Zonguldak"], [41.73, 32.34, "Bartın"],
    [38.63, 27.43, "Manisa"], [38.02, 28.52, "Aydın"], [37.85, 27.85, "Aydın"],
    [40.39, 49.88, "Iğdır"],
];

/** Koordinata en yakın Türkiye ilini bulur */
function findNearestProvince(lat: number, lon: number): string | null {
    if (lat < 34 || lat > 43 || lon < 25 || lon > 45) return null;
    let best = Infinity;
    let name: string | null = null;
    for (const [plat, plon, pname] of TURKEY_PROVINCES) {
        const d = (plat - lat) ** 2 + (plon - lon) ** 2;
        if (d < best) { best = d; name = pname; }
    }
    return name;
}

const REGION_TR_MAP: Record<string, string> = {
    "WESTERN TURKEY": "Batı Türkiye",
    "EASTERN TURKEY": "Doğu Türkiye",
    "CENTRAL TURKEY": "İç Anadolu",
    "SOUTHERN TURKEY": "Güney Türkiye",
    "AEGEAN SEA": "Ege Denizi",
    "SEA OF MARMARA": "Marmara Denizi",
    "BLACK SEA": "Karadeniz",
    "EASTERN MEDITERRANEAN SEA": "Doğu Akdeniz",
    "DODECANESE ISLANDS, GREECE": "Ege Denizi",
    "GREECE-TURKEY BORDER REGION": "Ege Bölgesi",
    "TURKEY-IRAN BORDER REGION": "Doğu Türkiye",
    "TURKEY-IRAQ BORDER REGION": "Güneydoğu Türkiye",
    "TURKEY-SYRIA BORDER REGION": "Hatay/Gaziantep",
};

function isInTurkey(lat: number, lon: number): boolean {
    return lat >= 35.5 && lat <= 42.5 && lon >= 25.5 && lon <= 44.8;
}

/** USGS/EMSC İngilizce lokasyonu Türkçe İl adına dönüştürür */
function localizeTitle(raw: string, lat: number, lon: number, source: "USGS" | "EMSC" | "AFAD" | "SUNUCU"): string {
    if (!raw || raw === "Unknown" || raw === "Bilinmiyor") {
        return findNearestProvince(lat, lon) ?? "Bilinmiyor";
    }

    // AFAD/Sunucu zaten Türkçe
    if (source === "AFAD" || source === "SUNUCU") {
        return cleanAfadLocation(raw);
    }

    // Bilinen bölge eşlemesi
    const upper = raw.toUpperCase().trim();
    if (REGION_TR_MAP[upper]) {
        const province = findNearestProvince(lat, lon);
        return province ?? REGION_TR_MAP[upper];
    }

    // USGS "24 km NW of Bodrum, Turkey" formatı
    const usgsMatch = raw.match(/^\d+\s*km\s+\w+\s+of\s+(.+?)(?:,\s*Turkey)?$/i);
    if (usgsMatch) {
        const place = usgsMatch[1].trim();
        const province = findNearestProvince(lat, lon);
        if (province) {
            const clean = place.charAt(0).toUpperCase() + place.slice(1);
            return clean.toLowerCase() !== province.toLowerCase()
                ? `${province}, ${clean}`
                : province;
        }
        return place;
    }

    // Türkiye içi koordinatsa en yakın ili göster
    if (isInTurkey(lat, lon)) {
        const province = findNearestProvince(lat, lon);
        if (province) return province;
    }

    return raw;
}

/** AFAD/Kandilli "İLÇE-İL" formatını "İl, İlçe" formatına çevirir */
function cleanAfadLocation(raw: string): string {
    let text = raw.trim();
    // Parantez içini temizle
    text = text.replace(/\s*\([^)]*\)\s*/g, " ").trim();

    if (text.includes("-")) {
        const idx = text.lastIndexOf("-");
        const ilce = text.slice(0, idx).trim();
        const il = text.slice(idx + 1).trim();
        if (il && ilce) {
            const ilTitle = toTurkishTitle(il);
            const ilceTitle = toTurkishTitle(ilce);
            return ilTitle.toLowerCase() !== ilceTitle.toLowerCase()
                ? `${ilTitle}, ${ilceTitle}`
                : ilTitle;
        }
    }
    return toTurkishTitle(text);
}

function toTurkishTitle(s: string): string {
    return s
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
        .replace(/\bIzmir\b/g, "İzmir")
        .replace(/\bIstanbul\b/g, "İstanbul")
        .replace(/\bIgdir\b/g, "Iğdır");
}

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
    return list.map((e, i): UnifiedEarthquake => {
        const lat = parseFloat(String(e.latitude ?? 0));
        const lon = parseFloat(String(e.longitude ?? 0));
        return {
            id: `afad_${e.eventID ?? i}`,
            magnitude: parseFloat(String(e.magnitude ?? 0)),
            depth: parseFloat(String(e.depth ?? 0)),
            coordinates: { latitude: lat, longitude: lon },
            title: localizeTitle(e.location ?? "Bilinmiyor", lat, lon, "AFAD"),
            date: e.date ? parseAfadDate(e.date) : new Date(),
            source: "AFAD",
            magType: e.type?.toUpperCase() ?? "ML",
        };
    });
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

    return (data?.features ?? []).map((f): UnifiedEarthquake => {
        const lat = f.geometry.coordinates[1];
        const lon = f.geometry.coordinates[0];
        return {
            id: `usgs_${f.id}`,
            magnitude: f.properties.mag ?? 0,
            depth: f.geometry.coordinates[2] ?? 0,
            coordinates: { latitude: lat, longitude: lon },
            title: localizeTitle(f.properties.place ?? "Unknown", lat, lon, "USGS"),
            date: new Date(f.properties.time),
            source: "USGS",
            magType: f.properties.magType?.toUpperCase() ?? "ML",
        };
    });
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
        const lat = p.lat ?? 0;
        const lon = p.lon ?? 0;
        return {
            id: `emsc_${p.evid ?? i}`,
            magnitude: p.mag ?? 0,
            depth: p.depth ?? 0,
            coordinates: { latitude: lat, longitude: lon },
            title: localizeTitle(p.flynn_region ?? p.region ?? "Unknown", lat, lon, "EMSC"),
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
        title: localizeTitle(e.location ?? "Bilinmiyor", e.latitude, e.longitude, "SUNUCU"),
        date: new Date(e.occurred_at),
        source: "SUNUCU",
        magType: e.source?.toUpperCase() === "AFAD" ? "Mw" : "ML",
    }));
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

    // Final sort: newest first
    deduped.sort((a, b) => b.date.getTime() - a.date.getTime());

    return { earthquakes: deduped, activeSources, failedSources };
}
