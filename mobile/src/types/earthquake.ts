/**
 * Unified Earthquake Data Model
 * Normalizes data from AFAD, USGS, EMSC and our own backend into a single format.
 */

export type EarthquakeSource = "AFAD" | "USGS" | "EMSC" | "SUNUCU";

export interface UnifiedEarthquake {
    /** Prefixed unique ID: "afad_xxx", "usgs_xxx", "emsc_xxx", "backend_xxx" */
    id: string;
    magnitude: number;
    /** Depth in km */
    depth: number;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    /** Human-readable location title */
    title: string;
    /** Event date/time */
    date: Date;
    /** Data source institution */
    source: EarthquakeSource;
    /** Magnitude type: Mw, ML, mb, etc. */
    magType: string;
}

/** Visual config per source (color, label) */
export const SOURCE_META: Record<EarthquakeSource, { color: string; label: string; bg: string }> = {
    AFAD:   { color: "#dc2626", label: "AFAD",    bg: "#dc262620" },
    USGS:   { color: "#3b82f6", label: "USGS",    bg: "#3b82f620" },
    EMSC:   { color: "#f97316", label: "EMSC",    bg: "#f9731620" },
    SUNUCU: { color: "#10b981", label: "Sunucu",  bg: "#10b98120" },
};
