/**
 * Earthquake Cache & Retry Service — API çöküş koruması.
 *
 * Devlet kurumu API'leri (Son Depremler, Harita) yoğunluktan çökerse:
 * 1. En son başarılı veriyi AsyncStorage'a cache'ler
 * 2. Bağlantı koparsa 5 saniyede bir yeniden dener (retry mechanism)
 * 3. Retry sırasında cache'lenmiş veriyi ekranda gösterir
 * 4. Bağlantı geldiğinde taze veriyle günceller
 *
 * Kullanılan kütüphane:
 *   - @react-native-async-storage/async-storage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

// ── Sabitler ─────────────────────────────────────────────────────────────────
const CACHE_KEY_EARTHQUAKES = "cache_earthquakes";
const CACHE_KEY_MAP = "cache_earthquakes_map";
const CACHE_TIMESTAMP_KEY = "cache_earthquakes_ts";
const RETRY_INTERVAL_MS = 5000; // 5 saniye
const MAX_RETRIES = 60; // 5 dakika boyunca dene (60 * 5s)
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 dakika cache geçerlilik süresi

// ── Tipler ───────────────────────────────────────────────────────────────────
export interface CachedEarthquake {
    id: string;
    source: string;
    magnitude: number;
    depth: number;
    latitude: number;
    longitude: number;
    location: string;
    occurred_at: string;
}

export interface FetchResult {
    data: CachedEarthquake[];
    fromCache: boolean;
    cacheAge: number | null; // ms cinsinden cache yaşı
    error?: string;
}

// ── Cache Yönetimi ───────────────────────────────────────────────────────────

/**
 * Deprem verilerini AsyncStorage'a kaydet.
 */
async function cacheEarthquakes(
    data: CachedEarthquake[],
    key: string = CACHE_KEY_EARTHQUAKES
): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(data));
        await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch {
        // Cache yazma hatası — sessizce devam et
    }
}

/**
 * Cache'ten deprem verilerini oku.
 */
async function readCachedEarthquakes(
    key: string = CACHE_KEY_EARTHQUAKES
): Promise<{ data: CachedEarthquake[]; timestamp: number } | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        const tsRaw = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
        if (!raw) return null;

        const data = JSON.parse(raw) as CachedEarthquake[];
        const timestamp = tsRaw ? parseInt(tsRaw, 10) : 0;
        return { data, timestamp };
    } catch {
        return null;
    }
}

/**
 * Cache yaşını hesapla (ms).
 */
function getCacheAge(timestamp: number): number {
    return Date.now() - timestamp;
}

// ── Retry Mekanizması ────────────────────────────────────────────────────────

/**
 * API çağrısını retry mekanizmasıyla yap.
 * Başarısız olursa cache'ten veri döner.
 *
 * @param endpoint API endpoint (ör: "/api/v1/earthquakes?limit=50")
 * @param cacheKey AsyncStorage cache anahtarı
 * @returns Veri + kaynak bilgisi
 */
export async function fetchWithCacheAndRetry(
    endpoint: string,
    cacheKey: string = CACHE_KEY_EARTHQUAKES
): Promise<FetchResult> {
    // 1. Önce API'yi dene
    try {
        const { data } = await api.get<CachedEarthquake[]>(endpoint, {
            timeout: 8000,
        });

        // Başarılı — cache'e yaz ve taze veriyi döndür
        await cacheEarthquakes(data, cacheKey);

        return {
            data,
            fromCache: false,
            cacheAge: null,
        };
    } catch {
        // API başarısız — cache'ten dön
        const cached = await readCachedEarthquakes(cacheKey);

        if (cached && cached.data.length > 0) {
            return {
                data: cached.data,
                fromCache: true,
                cacheAge: getCacheAge(cached.timestamp),
                error: "API bağlantısı kurulamadı. Cache verileri gösteriliyor.",
            };
        }

        // Cache de boş — boş array dön
        return {
            data: [],
            fromCache: true,
            cacheAge: null,
            error: "Veri alınamadı ve cache boş.",
        };
    }
}

// ── Auto-Retry Manager ──────────────────────────────────────────────────────

type RetryCallback = (result: FetchResult) => void;

interface RetryHandle {
    stop: () => void;
    isRunning: () => boolean;
}

/**
 * Otomatik retry başlat — 5 saniyede bir API'ye bağlanmayı dener.
 * Başarılı olduğunda veya MAX_RETRIES aşıldığında durur.
 *
 * @param endpoint API endpoint
 * @param onUpdate Her denemede çağrılır (taze veri veya cache)
 * @returns Durdurma handle'ı
 */
export function startAutoRetry(
    endpoint: string,
    onUpdate: RetryCallback,
    cacheKey: string = CACHE_KEY_EARTHQUAKES
): RetryHandle {
    let running = true;
    let retryCount = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const attempt = async () => {
        if (!running || retryCount >= MAX_RETRIES) {
            running = false;
            return;
        }

        retryCount++;

        try {
            const { data } = await api.get<CachedEarthquake[]>(endpoint, {
                timeout: 8000,
            });

            // Başarılı — cache güncelle, callback çağır, retry durdur
            await cacheEarthquakes(data, cacheKey);
            onUpdate({
                data,
                fromCache: false,
                cacheAge: null,
            });
            running = false; // Başarılı — dur
            return;
        } catch {
            // Hala başarısız — cache'ten göster ve tekrar dene
            const cached = await readCachedEarthquakes(cacheKey);
            if (cached && cached.data.length > 0) {
                onUpdate({
                    data: cached.data,
                    fromCache: true,
                    cacheAge: getCacheAge(cached.timestamp),
                    error: `Yeniden bağlanılıyor... (${retryCount}/${MAX_RETRIES})`,
                });
            }
        }

        // Sonraki denemeyi planla
        if (running) {
            timer = setTimeout(attempt, RETRY_INTERVAL_MS);
        }
    };

    // İlk denemeyi hemen başlat
    attempt();

    return {
        stop: () => {
            running = false;
            if (timer) clearTimeout(timer);
        },
        isRunning: () => running,
    };
}

// ── Harita Verileri İçin ─────────────────────────────────────────────────────

/**
 * Harita verilerini cache + retry ile getir.
 */
export async function fetchMapDataWithCache(
    endpoint: string
): Promise<FetchResult> {
    return fetchWithCacheAndRetry(endpoint, CACHE_KEY_MAP);
}

/**
 * Tüm cache'i temizle.
 */
export async function clearAllCache(): Promise<void> {
    await AsyncStorage.multiRemove([
        CACHE_KEY_EARTHQUAKES,
        CACHE_KEY_MAP,
        CACHE_TIMESTAMP_KEY,
    ]);
}

/**
 * Cache bilgisini döner (debug/UI için).
 */
export async function getCacheInfo(): Promise<{
    hasCache: boolean;
    itemCount: number;
    ageMs: number | null;
    isExpired: boolean;
}> {
    const cached = await readCachedEarthquakes();
    if (!cached) {
        return { hasCache: false, itemCount: 0, ageMs: null, isExpired: true };
    }
    const age = getCacheAge(cached.timestamp);
    return {
        hasCache: true,
        itemCount: cached.data.length,
        ageMs: age,
        isExpired: age > CACHE_TTL_MS,
    };
}
