/**
 * Unified Earthquake Data Model
 * AFAD, Kandilli, EMSC, USGS — 4 kaynak.
 */

export type EarthquakeSource = "AFAD" | "KANDILLI" | "EMSC" | "USGS";

export interface UnifiedEarthquake {
    id: string;
    magnitude: number;
    depth: number;
    coordinates: { latitude: number; longitude: number };
    title: string;
    date: Date;
    source: EarthquakeSource;
    magType: string;
}

export const SOURCE_META: Record<EarthquakeSource, { color: string; label: string; bg: string }> = {
    AFAD:    { color: "#dc2626", label: "AFAD",    bg: "#dc262620" },
    KANDILLI: { color: "#8b5cf6", label: "Kandilli", bg: "#8b5cf620" },
    USGS:    { color: "#3b82f6", label: "USGS",    bg: "#3b82f620" },
    EMSC:    { color: "#f97316", label: "EMSC",    bg: "#f9731620" },
};

export function magnitudeColor(mag: number): string {
    if (mag >= 6) return "#DC2626";  // kırmızı
    if (mag >= 4) return "#F97316";  // turuncu
    return "#10B981";                 // yeşil (<4)
}
