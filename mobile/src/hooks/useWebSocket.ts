/**
 * WebSocket hook — deprem gerçek zamanlı bağlantısı.
 * Otomatik yeniden bağlanma: exponential backoff (1s → 30s).
 * rules.md: auto-reconnect with exponential backoff.
 */

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? "ws://10.0.2.2:8000/ws/earthquakes";
const MAX_RETRY_DELAY_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 1_000;

export interface EarthquakeEvent {
    id: string;
    source: string;
    magnitude: number;
    depth: number;
    latitude: number;
    longitude: number;
    location: string;
    occurred_at: string;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    lastEvent: EarthquakeEvent | null;
}

export function useWebSocket(): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const retryDelayRef = useRef(INITIAL_RETRY_DELAY_MS);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<EarthquakeEvent | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setIsConnected(true);
            retryDelayRef.current = INITIAL_RETRY_DELAY_MS; // Başarılı bağlantıda sıfırla
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data as string) as EarthquakeEvent;
                setLastEvent(data);
            } catch {
                // Geçersiz JSON — sessizce geç
            }
        };

        ws.onerror = () => {
            ws.close();
        };

        ws.onclose = () => {
            setIsConnected(false);
            // Exponential backoff ile yeniden bağlan
            const delay = Math.min(retryDelayRef.current * 2, MAX_RETRY_DELAY_MS);
            retryDelayRef.current = delay;
            retryTimerRef.current = setTimeout(connect, delay);
        };
    }, []);

    useEffect(() => {
        connect();
        return () => {
            retryTimerRef.current && clearTimeout(retryTimerRef.current);
            wsRef.current?.close();
        };
    }, [connect]);

    return { isConnected, lastEvent };
}
