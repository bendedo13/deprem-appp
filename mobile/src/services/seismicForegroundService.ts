/**
 * SeismicForegroundService — JS Yönetici Katmanı
 *
 * Mimari:
 *  - Native SeismicForegroundService (Kotlin) başlatılır.
 *  - TYPE_SIGNIFICANT_MOTION (donanımsal, batarya sıfır) dinlenir.
 *  - Hareket algılandığında native servis "SeismicSignificantMotion" eventi gönderir.
 *  - Bu event alındığında JS tarafında STA/LTA algoritması için ivmeölçer kısa süreyle aktive edilir.
 *  - Uzun süreli ivmeölçer dinlemesi yerine "tetikle ve bırak" mimarisi → pil ömrü korunur.
 *
 * Kullanım:
 *   import { startSeismicForegroundService, stopSeismicForegroundService } from "./seismicForegroundService";
 *   startSeismicForegroundService(onSignificantMotion, onAccelData);
 */

import { NativeModules, NativeEventEmitter, Platform } from "react-native";

const { SeismicForegroundService: NativeSeismicService } = NativeModules;

const EVENT_SIGNIFICANT = "SeismicSignificantMotion";
const EVENT_MOTION = "SeismicMotion";

export interface SeismicMotionEvent {
    x: number;
    y: number;
    z: number;
    magnitude: number;
    timestamp: number;
}

export interface SignificantMotionEvent {
    type: "SIGNIFICANT_MOTION";
    timestamp: number;
}

type SignificantMotionCallback = (event: SignificantMotionEvent) => void;
type AccelDataCallback = (event: SeismicMotionEvent) => void;

let emitter: NativeEventEmitter | null = null;
let significantSub: ReturnType<NativeEventEmitter["addListener"]> | null = null;
let motionSub: ReturnType<NativeEventEmitter["addListener"]> | null = null;
let isRunning = false;

/**
 * Seismic Foreground Service'i başlatır.
 * Android'de SIGNIFICANT_MOTION sensörü dinlemeye başlar.
 * iOS'ta bu servis mevcut değil (expo-sensors kullanılır).
 *
 * @param onSignificantMotion - Büyük hareket algılandığında tetiklenir
 * @param onAccelData - İvmeölçer verisi geldiğinde tetiklenir (STA/LTA için)
 */
export async function startSeismicForegroundService(
    onSignificantMotion?: SignificantMotionCallback,
    onAccelData?: AccelDataCallback,
): Promise<void> {
    if (Platform.OS !== "android") {
        console.log("[SeismicFgService] iOS'ta Foreground Service desteklenmez — expo-sensors kullanılıyor.");
        return;
    }

    if (isRunning) {
        console.log("[SeismicFgService] Servis zaten çalışıyor.");
        return;
    }

    if (!NativeSeismicService) {
        console.warn("[SeismicFgService] Native modül bulunamadı. withSeismicForegroundService plugin aktif mi?");
        return;
    }

    try {
        // Native Foreground Service'i başlat
        const result = await NativeSeismicService.startService() as string;
        console.info("[SeismicFgService] Başlatıldı:", result);
        isRunning = true;

        // Native Event Emitter kur
        emitter = new NativeEventEmitter(NativeSeismicService);

        // SIGNIFICANT_MOTION eventi dinle
        if (onSignificantMotion) {
            significantSub = emitter.addListener(EVENT_SIGNIFICANT, (event: SignificantMotionEvent) => {
                try {
                    onSignificantMotion(event);
                } catch (err) {
                    console.warn("[SeismicFgService] SignificantMotion callback hatası:", err);
                }
            });
        }

        // İvmeölçer verisi dinle (STA/LTA için)
        if (onAccelData) {
            motionSub = emitter.addListener(EVENT_MOTION, (event: SeismicMotionEvent) => {
                try {
                    onAccelData(event);
                } catch (err) {
                    console.warn("[SeismicFgService] AccelData callback hatası:", err);
                }
            });
        }

    } catch (err) {
        console.error("[SeismicFgService] Başlatma hatası:", err);
        isRunning = false;
    }
}

/**
 * Foreground Service'i durdurur ve tüm dinleyicileri temizler.
 */
export async function stopSeismicForegroundService(): Promise<void> {
    if (Platform.OS !== "android") return;

    // Event dinleyicilerini temizle
    try {
        significantSub?.remove();
        significantSub = null;
        motionSub?.remove();
        motionSub = null;
    } catch (err) {
        console.warn("[SeismicFgService] Listener temizleme hatası:", err);
    }

    if (!NativeSeismicService || !isRunning) {
        isRunning = false;
        return;
    }

    try {
        const result = await NativeSeismicService.stopService() as string;
        console.info("[SeismicFgService] Durduruldu:", result);
    } catch (err) {
        console.warn("[SeismicFgService] Durdurma hatası:", err);
    } finally {
        isRunning = false;
        emitter = null;
    }
}

/**
 * Foreground Service'in çalışıp çalışmadığını döndürür.
 */
export function isSeismicForegroundServiceRunning(): boolean {
    return isRunning;
}
