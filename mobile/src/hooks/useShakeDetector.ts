/**
 * useShakeDetector hook — Gelişmiş STA/LTA + false alarm önleme.
 *
 * YENİ KORUMALAR:
 *  1. MIN_TRIGGER_DURATION_MS — tetikleme en az 1.5 sn sürmeli (tek vuruş elenir)
 *  2. COOLDOWN_AFTER_TRIGGER_MS — tetik sonrası 45 sn yeni alarm yok
 *  3. TRIGGER_RATIO 5.0 — yüksek eşik (yürüme/araç titreşimi elenir)
 *  4. MIN_REPORT_ACCELERATION 1.0 — zayıf titreşimler raporlanmaz
 */

import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
    SAMPLE_RATE_HZ,
    STA_WINDOW,
    LTA_WINDOW,
    TRIGGER_RATIO,
    DETRIGGER_RATIO,
    HIGHPASS_ALPHA,
    MIN_REPORT_ACCELERATION,
    MIN_TRIGGER_DURATION_MS,
    COOLDOWN_AFTER_TRIGGER_MS,
    CRITICAL_ACCELERATION_MS2,
} from "../constants/seismic";
import { highPassFilter, vectorMagnitude, computeStaLta } from "../utils/staLta";
import { reportTrigger } from "../services/seismicService";

/** expo-sensors güvenli yükleme — undefined modül crash'ini önler */
let AccelerometerModule: typeof import("expo-sensors").Accelerometer | null = null;
try {
    const expoSensors = require("expo-sensors");
    if (expoSensors?.Accelerometer && typeof expoSensors.Accelerometer.addListener === "function") {
        AccelerometerModule = expoSensors.Accelerometer;
    }
} catch {
    console.warn("[useShakeDetector] expo-sensors yüklenemedi");
}

export interface ShakeState {
    isMonitoring: boolean;
    isTriggered: boolean;
    peakAcceleration: number;
    triggerTime: Date | null;
    staLtaRatio: number;
}

/** Cihazı tanımlamak için basit ID */
const DEVICE_ID = `device-${Platform.OS}-${Date.now().toString(36)}`;

/** UI state güncellemesi için throttle aralığı (ms) — JS Thread korunur */
const UI_THROTTLE_MS = 200;

/** Nükleer alarm tetiklemesi için minimum aralık (ms) — 60 sn */
const CRITICAL_TRIGGER_COOLDOWN_MS = 60_000;

export function useShakeDetector(
    latitude: number | null,
    longitude: number | null,
    onCriticalTrigger?: (lat: number | null, lng: number | null) => void
): ShakeState {
    const samples = useRef<number[]>([]);
    const prevRaw = useRef(0);
    const prevFiltered = useRef(0);
    const triggeredRef = useRef(false);
    const triggerStartRef = useRef<number | null>(null);
    const peakRef = useRef(0);
    const cooldownUntilRef = useRef<number>(0);
    const lastCriticalTriggerRef = useRef<number>(0);
    /** Son UI güncelleme zamanı — throttle için */
    const lastUiUpdateRef = useRef<number>(0);

    const [state, setState] = useState<ShakeState>({
        isMonitoring: false,
        isTriggered: false,
        peakAcceleration: 0,
        triggerTime: null,
        staLtaRatio: 0,
    });

    useEffect(() => {
        if (!AccelerometerModule || typeof AccelerometerModule.addListener !== "function") {
            console.warn("[useShakeDetector] İvmeölçer kullanılamıyor (expo-sensors yok veya eksik)");
            return;
        }

        AccelerometerModule.setUpdateInterval(Math.floor(1000 / SAMPLE_RATE_HZ));

        const sub = AccelerometerModule.addListener(({ x, y, z }) => {
            const now = Date.now();
            const raw = vectorMagnitude(x, y, z);
            const filtered = highPassFilter(raw, prevRaw.current, prevFiltered.current, HIGHPASS_ALPHA);
            prevRaw.current = raw;
            prevFiltered.current = filtered;

            samples.current.push(filtered);
            if (samples.current.length > LTA_WINDOW) samples.current.shift();

            const ratio = computeStaLta(samples.current, STA_WINDOW, LTA_WINDOW);
            const inCooldown = now < cooldownUntilRef.current;

            // Nükleer alarm: 1.8G+ ivme (m/s²) aşılırsa tam ekran alarm (cooldown ile tekrarsız)
            if (
                onCriticalTrigger &&
                raw >= CRITICAL_ACCELERATION_MS2 &&
                now - lastCriticalTriggerRef.current >= CRITICAL_TRIGGER_COOLDOWN_MS
            ) {
                lastCriticalTriggerRef.current = now;
                onCriticalTrigger(latitude, longitude);
            }

            if (!triggeredRef.current && !inCooldown && ratio >= TRIGGER_RATIO) {
                // Olası tetikleme başladı — kritik değişim, hemen güncelle
                triggeredRef.current = true;
                triggerStartRef.current = now;
                peakRef.current = raw;
                lastUiUpdateRef.current = now;
                setState((s) => ({ ...s, staLtaRatio: ratio }));

            } else if (triggeredRef.current && ratio < DETRIGGER_RATIO) {
                // Tetikleme bitti — kritik değişim, hemen güncelle
                const duration = now - (triggerStartRef.current ?? now);
                if (duration >= MIN_TRIGGER_DURATION_MS) {
                    cooldownUntilRef.current = now + COOLDOWN_AFTER_TRIGGER_MS;
                    _sendReport(peakRef.current, ratio, latitude, longitude);
                }
                triggeredRef.current = false;
                triggerStartRef.current = null;
                peakRef.current = 0;
                lastUiUpdateRef.current = now;
                setState((s) => ({ ...s, isTriggered: false, peakAcceleration: 0, staLtaRatio: ratio }));

            } else if (triggeredRef.current) {
                // Tetikleme devam ediyor — throttle: 200ms'de bir güncelle
                peakRef.current = Math.max(peakRef.current, raw);
                const elapsed = now - (triggerStartRef.current ?? now);
                const confirmed = elapsed >= MIN_TRIGGER_DURATION_MS;
                if (now - lastUiUpdateRef.current >= UI_THROTTLE_MS) {
                    lastUiUpdateRef.current = now;
                    setState((s) => ({
                        ...s,
                        isTriggered: confirmed,
                        triggerTime: confirmed ? (s.triggerTime ?? new Date()) : null,
                        peakAcceleration: peakRef.current,
                        staLtaRatio: ratio,
                    }));
                }
            } else {
                // Normal izleme — throttle: 200ms'de bir güncelle
                if (now - lastUiUpdateRef.current >= UI_THROTTLE_MS) {
                    lastUiUpdateRef.current = now;
                    setState((s) => ({ ...s, staLtaRatio: ratio, isTriggered: false }));
                }
            }
        });

        setState((s) => ({ ...s, isMonitoring: true }));
        return () => {
            sub.remove();
            setState((s) => ({ ...s, isMonitoring: false, isTriggered: false }));
        };
    }, [latitude, longitude, onCriticalTrigger]);

    return state;
}

/** Backend'e rapor gönderir — minimum ivme eşiğini kontrol eder. */
async function _sendReport(
    peakAccel: number,
    ratio: number,
    lat: number | null,
    lng: number | null
): Promise<void> {
    if (peakAccel < MIN_REPORT_ACCELERATION || lat === null || lng === null) return;
    try {
        await reportTrigger({
            device_id: DEVICE_ID,
            peak_acceleration: peakAccel,
            sta_lta_ratio: ratio,
            latitude: lat,
            longitude: lng,
        });
    } catch (err) {
        console.warn("[SeismicReport] Rapor gönderilemedi:", err);
    }
}
