/**
 * useEarthquakeData — Dil bazlı kaynak seçimi + useMemo ile filtre optimizasyonu.
 * Türkçe: AFAD + Kandilli. Diğer diller: tüm 4 kaynak.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { fetchEarthquakes } from "../services/earthquakeService";
import type { EarthquakeSource, UnifiedEarthquake } from "../types/earthquake";

const POLL_INTERVAL_MS = 60_000;

const ALL_SOURCES: EarthquakeSource[] = ["AFAD", "KANDILLI", "EMSC", "USGS"];
const TR_SOURCES: EarthquakeSource[] = ["AFAD", "KANDILLI"];

export type SourceFilter = "ALL" | EarthquakeSource;

export interface UseEarthquakeDataResult {
    earthquakes: UnifiedEarthquake[];
    filtered: UnifiedEarthquake[];
    loading: boolean;
    error: string | null;
    activeSources: EarthquakeSource[];
    sourceFilter: SourceFilter;
    setSourceFilter: (f: SourceFilter) => void;
    refresh: () => Promise<void>;
    /** 24 saat analizi */
    last24hCount: number;
    last24hMaxMag: number;
}

export function useEarthquakeData(): UseEarthquakeDataResult {
    const { i18n } = useTranslation();
    const [earthquakes, setEarthquakes] = useState<UnifiedEarthquake[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSources, setActiveSources] = useState<EarthquakeSource[]>([]);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

    const sourcesToFetch = useMemo(() => {
        const lang = i18n.language?.toLowerCase() ?? "tr";
        return lang.startsWith("tr") ? TR_SOURCES : ALL_SOURCES;
    }, [i18n.language]);

    const doFetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchEarthquakes(sourcesToFetch);
            setEarthquakes(result.earthquakes);
            setActiveSources(result.activeSources);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Veri alınamadı";
            setError(msg);
            setEarthquakes([]);
        } finally {
            setLoading(false);
        }
    }, [sourcesToFetch]);

    useEffect(() => {
        doFetch();
    }, [doFetch]);

    useEffect(() => {
        const timer = setInterval(doFetch, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [doFetch]);

    const filtered = useMemo(() => {
        if (sourceFilter === "ALL") return earthquakes;
        return earthquakes.filter((e) => e.source === sourceFilter);
    }, [earthquakes, sourceFilter]);

    const { last24hCount, last24hMaxMag } = useMemo(() => {
        const now = Date.now();
        const dayAgo = now - 24 * 3600 * 1000;
        const in24h = earthquakes.filter((e) => e.date.getTime() >= dayAgo);
        const maxMag = in24h.length ? Math.max(...in24h.map((e) => e.magnitude)) : 0;
        return { last24hCount: in24h.length, last24hMaxMag: maxMag };
    }, [earthquakes]);

    return {
        earthquakes,
        filtered,
        loading,
        error,
        activeSources,
        sourceFilter,
        setSourceFilter,
        refresh: doFetch,
        last24hCount,
        last24hMaxMag,
    };
}
