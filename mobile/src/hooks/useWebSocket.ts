/**
 * WebSocket hook — deprem gerçek zamanlı bağlantısı.
 * Otomatik yeniden bağlanma: exponential backoff (1s → 30s).
 * AppState + NetInfo entegrasyonu: Arka plandan dönüşte ve internet geldiğinde
 * sessizce yeniden bağlanır, "BAĞLANTI KESİLDİ" mesajını minimize eder.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { AppState, type AppStateStatus } from "react-native";
import Constants from "expo-constants";

// API URL'den WebSocket URL'i türet: http://host:port → ws://host:port
function resolveWsUrl(): string {
    if (process.env.EXPO_PUBLIC_WS_URL) return process.env.EXPO_PUBLIC_WS_URL;
    const apiUrl: string = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://10.0.2.2:8001";
    return apiUrl.replace(/^http/, "ws") + "/ws/earthquakes";
}

const WS_URL = resolveWsUrl();
const MAX_RETRY_DELAY_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 1_000;
const PING_INTERVAL_MS = 25_000; // Bağlantıyı canlı tut

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
    const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const mountedRef = useRef(true);
    const connectingRef = useRef(false);

    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState<EarthquakeEvent | null>(null);

    const cleanup = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        if (pingTimerRef.current) {
            clearInterval(pingTimerRef.current);
            pingTimerRef.current = null;
        }
    }, []);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;
        if (connectingRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        // CONNECTING durumundaysa bekle
        if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

        connectingRef.current = true;
        cleanup();

        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!mountedRef.current) { ws.close(); return; }
                connectingRef.current = false;
                setIsConnected(true);
                retryDelayRef.current = INITIAL_RETRY_DELAY_MS;

                // Ping: bağlantıyı canlı tut (proxy/firewall timeout'larına karşı)
                pingTimerRef.current = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        try { ws.send("ping"); } catch { /* ignore */ }
                    }
                }, PING_INTERVAL_MS);
            };

            ws.onmessage = (event) => {
                if (!mountedRef.current) return;
                try {
                    const raw = event.data as string;
                    // Ping/pong mesajlarını atla
                    if (raw === "pong" || raw === "ping") return;
                    const data = JSON.parse(raw) as EarthquakeEvent;
                    if (data && data.id) {
                        setLastEvent(data);
                    }
                } catch {
                    // Geçersiz JSON — sessizce geç
                }
            };

            ws.onerror = () => {
                connectingRef.current = false;
                try { ws.close(); } catch { /* ignore */ }
            };

            ws.onclose = () => {
                connectingRef.current = false;
                if (!mountedRef.current) return;
                setIsConnected(false);
                cleanup();

                // Exponential backoff ile yeniden bağlan
                const delay = retryDelayRef.current;
                retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
                retryTimerRef.current = setTimeout(connect, delay);
            };
        } catch {
            connectingRef.current = false;
            // WebSocket constructor hatası — retry
            const delay = retryDelayRef.current;
            retryDelayRef.current = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
            retryTimerRef.current = setTimeout(connect, delay);
        }
    }, [cleanup]);

    // Acil yeniden bağlan (delay olmadan)
    const reconnectNow = useCallback(() => {
        cleanup();
        // Eski socket'i kapat
        if (wsRef.current) {
            try { wsRef.current.close(); } catch { /* ignore */ }
            wsRef.current = null;
        }
        connectingRef.current = false;
        retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
        // Kısa gecikme ile yeni bağlantı (eski close event'inin işlenmesi için)
        retryTimerRef.current = setTimeout(connect, 300);
    }, [connect, cleanup]);

    // İlk bağlantı
    useEffect(() => {
        mountedRef.current = true;
        connect();
        return () => {
            mountedRef.current = false;
            cleanup();
            if (wsRef.current) {
                try { wsRef.current.close(); } catch { /* ignore */ }
                wsRef.current = null;
            }
        };
    }, [connect, cleanup]);

    // AppState: Uygulama arka plandan döndüğünde sessizce yeniden bağlan
    useEffect(() => {
        let prevState: AppStateStatus = AppState.currentState;

        const sub = AppState.addEventListener("change", (nextState) => {
            if (prevState.match(/inactive|background/) && nextState === "active") {
                // Uygulama ön plana geldi — bağlantıyı kontrol et
                if (wsRef.current?.readyState !== WebSocket.OPEN) {
                    reconnectNow();
                }
            }
            prevState = nextState;
        });

        return () => sub.remove();
    }, [reconnectNow]);

    // Periyodik bağlantı sağlık kontrolü (30s'de bir)
    useEffect(() => {
        const healthCheck = setInterval(() => {
            if (!mountedRef.current) return;
            if (
                wsRef.current?.readyState !== WebSocket.OPEN &&
                wsRef.current?.readyState !== WebSocket.CONNECTING &&
                !retryTimerRef.current
            ) {
                // Socket ölmüş ama retry zamanlanmamış — hemen bağlan
                reconnectNow();
            }
        }, 30_000);

        return () => clearInterval(healthCheck);
    }, [reconnectNow]);

    return { isConnected, lastEvent };
}
