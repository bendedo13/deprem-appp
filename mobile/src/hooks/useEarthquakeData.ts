/**
 * useEarthquakeData — Ülke bazlı kaynak seçimi + bbox filtreleme.
 *
 * Türkiye → AFAD + Kandilli
 * Diğer ülkeler → USGS + EMSC (ülke bbox'ı ile)
 * Dünya geneli → USGS + EMSC (bbox yok)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { fetchEarthquakes } from "../services/earthquakeService";
import { COUNTRY_PRESETS, getCountryPreset, type CountryCode } from "../data/countryPresets";
import type { EarthquakeSource, UnifiedEarthquake } from "../types/earthquake";

const POLL_INTERVAL_MS = 60_000;
const COUNTRY_STORE_KEY = "quakesense_country";
const DEFAULT_COUNTRY: CountryCode = "TR";

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
    last24hCount: number;
    last24hMaxMag: number;
    country: CountryCode;
    setCountry: (code: CountryCode) => Promise<void>;
    countryPresets: typeof COUNTRY_PRESETS;
}

export function useEarthquakeData(): UseEarthquakeDataResult {
    const [earthquakes, setEarthquakes] = useState<UnifiedEarthquake[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeSources, setActiveSources] = useState<EarthquakeSource[]>([]);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
    const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY);

    // Kayıtlı ülkeyi yükle
    useEffect(() => {
        SecureStore.getItemAsync(COUNTRY_STORE_KEY)
            .then((saved) => {
                if (saved && COUNTRY_PRESETS.some((c) => c.code === saved)) {
                    setCountryState(saved);
                }
            })
            .catch(() => {});
    }, []);

    const setCountry = useCallback(async (code: CountryCode) => {
        setCountryState(code);
        setSourceFilter("ALL");
        try {
            await SecureStore.setItemAsync(COUNTRY_STORE_KEY, code);
        } catch {
            // ignore
        }
    }, []);

    const preset = useMemo(() => getCountryPreset(country), [country]);

    const doFetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const isGlobal = preset.code !== "TR";
            const result = await fetchEarthquakes(
                preset.sources as EarthquakeSource[],
                isGlobal && preset.code !== "GLOBAL"
                    ? { bbox: preset.bbox }
                    : {}
            );
            setEarthquakes(result.earthquakes);
            setActiveSources(result.activeSources);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Veri alınamadı";
            setError(msg);
            setEarthquakes([]);
        } finally {
            setLoading(false);
        }
    }, [preset]);

    useEffect(() => {
        setSourceFilter("ALL");
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
        country,
        setCountry,
        countryPresets: COUNTRY_PRESETS,
    };
}
