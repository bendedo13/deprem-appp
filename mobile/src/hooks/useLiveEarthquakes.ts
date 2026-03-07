/**
 * useLiveEarthquakes — Professional polling hook with in-memory caching.
 *
 * Features:
 *  - Fetches from 4 sources (AFAD, USGS, EMSC, Backend) via EarthquakeService
 *  - Polls silently every 60 seconds in the background
 *  - Merges WebSocket real-time events as they arrive
 *  - Keeps last successful data when network fails (graceful degradation)
 *  - Reports which sources are active / failed
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchAllEarthquakes } from "../services/earthquakeService";
import { useWebSocket } from "./useWebSocket";
import type { EarthquakeSource, UnifiedEarthquake } from "../types/earthquake";

const POLL_INTERVAL_MS = 60_000;

/** In-memory cache — survives component unmount/remount during the app session */
let _cache: UnifiedEarthquake[] = [];

export interface UseLiveEarthquakesResult {
    earthquakes: UnifiedEarthquake[];
    loading: boolean;
    /** null = no error, otherwise a human-readable message */
    error: string | null;
    lastUpdated: Date | null;
    /** true when showing stale (cached) data because latest fetch failed */
    isStale: boolean;
    activeSources: EarthquakeSource[];
    failedSources: EarthquakeSource[];
    /** WebSocket live connection status */
    isConnected: boolean;
    refresh: () => Promise<void>;
}

export function useLiveEarthquakes(): UseLiveEarthquakesResult {
    const [earthquakes, setEarthquakes] = useState<UnifiedEarthquake[]>(_cache);
    const [loading, setLoading] = useState(_cache.length === 0);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isStale, setIsStale] = useState(false);
    const [activeSources, setActiveSources] = useState<EarthquakeSource[]>([]);
    const [failedSources, setFailedSources] = useState<EarthquakeSource[]>([]);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const fetchingRef = useRef(false);

    const { isConnected, lastEvent } = useWebSocket();

    const doFetch = useCallback(async (silent: boolean) => {
        if (fetchingRef.current) return; // Prevent concurrent fetches
        fetchingRef.current = true;
        if (!silent) setLoading(true);

        try {
            const result = await fetchAllEarthquakes(24);
            _cache = result.earthquakes;
            setEarthquakes(result.earthquakes);
            setActiveSources(result.activeSources);
            setFailedSources(result.failedSources);
            setLastUpdated(new Date());
            setIsStale(false);
            setError(null);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Bilinmeyen hata";
            console.warn("[useLiveEarthquakes] Fetch failed:", msg);
            setError("Veri alınamadı");
            setIsStale(true);
            // Keep cached data on screen
            if (_cache.length > 0) {
                setEarthquakes(_cache);
            }
        } finally {
            fetchingRef.current = false;
            if (!silent) setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        doFetch(false);
    }, [doFetch]);

    // Background polling
    useEffect(() => {
        timerRef.current = setInterval(() => doFetch(true), POLL_INTERVAL_MS);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [doFetch]);

    // Real-time WebSocket event injection
    useEffect(() => {
        if (!lastEvent) return;
        setEarthquakes((prev) => {
            const wsId = `backend_${lastEvent.id}`;
            if (prev.some((q) => q.id === wsId || q.id === lastEvent.id)) return prev;

            const newEq: UnifiedEarthquake = {
                id: wsId,
                magnitude: lastEvent.magnitude,
                depth: lastEvent.depth,
                coordinates: {
                    latitude: lastEvent.latitude,
                    longitude: lastEvent.longitude,
                },
                title: lastEvent.location ?? "Bilinmiyor",
                date: new Date(lastEvent.occurred_at),
                source: "SUNUCU",
                magType: "ML",
            };

            const updated = [newEq, ...prev].slice(0, 200);
            _cache = updated;
            return updated;
        });
    }, [lastEvent]);

    const refresh = useCallback(() => doFetch(false), [doFetch]);

    return {
        earthquakes,
        loading,
        error,
        lastUpdated,
        isStale,
        activeSources,
        failedSources,
        isConnected,
        refresh,
    };
}
