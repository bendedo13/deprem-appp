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
import { Accelerometer } from "expo-sensors";
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
} from "../constants/seismic";
import { highPassFilter, vectorMagnitude, computeStaLta } from "../utils/staLta";
import { reportTrigger } from "../services/seismicService";

export interface ShakeState {
    isMonitoring: boolean;
    isTriggered: boolean;
    peakAcceleration: number;
    triggerTime: Date | null;
    staLtaRatio: number;
}

/** Cihazı tanımlamak için basit ID */
const DEVICE_ID = `device-${Platform.OS}-${Date.now().toString(36)}`;

export function useShakeDetector(
    latitude: number | null,
    longitude: number | null
): ShakeState {
    const samples = useRef<number[]>([]);
    const prevRaw = useRef(0);
    const prevFiltered = useRef(0);
    const triggeredRef = useRef(false);
    const triggerStartRef = useRef<number | null>(null);
    const peakRef = useRef(0);
    const cooldownUntilRef = useRef<number>(0);

    const [state, setState] = useState<ShakeState>({
        isMonitoring: false,
        isTriggered: false,
        peakAcceleration: 0,
        triggerTime: null,
        staLtaRatio: 0,
    });

    useEffect(() => {
        Accelerometer.setUpdateInterval(Math.floor(1000 / SAMPLE_RATE_HZ));

        const sub = Accelerometer.addListener(({ x, y, z }) => {
            const now = Date.now();
            const raw = vectorMagnitude(x, y, z);
            const filtered = highPassFilter(raw, prevRaw.current, prevFiltered.current, HIGHPASS_ALPHA);
            prevRaw.current = raw;
            prevFiltered.current = filtered;

            samples.current.push(filtered);
            if (samples.current.length > LTA_WINDOW) samples.current.shift();

            const ratio = computeStaLta(samples.current, STA_WINDOW, LTA_WINDOW);
            const inCooldown = now < cooldownUntilRef.current;

            if (!triggeredRef.current && !inCooldown && ratio >= TRIGGER_RATIO) {
                // Olası tetikleme başladı — süreyi kaydet, henüz onaylanmadı
                triggeredRef.current = true;
                triggerStartRef.current = now;
                peakRef.current = raw;
                setState((s) => ({ ...s, staLtaRatio: ratio }));

            } else if (triggeredRef.current && ratio < DETRIGGER_RATIO) {
                // Tetikleme bitti — süreyi kontrol et
                const duration = now - (triggerStartRef.current ?? now);
                if (duration >= MIN_TRIGGER_DURATION_MS) {
                    // GERÇEK deprem sinyali — rapor gönder + cooldown başlat
                    cooldownUntilRef.current = now + COOLDOWN_AFTER_TRIGGER_MS;
                    _sendReport(peakRef.current, ratio, latitude, longitude);
                }
                triggeredRef.current = false;
                triggerStartRef.current = null;
                peakRef.current = 0;
                setState((s) => ({ ...s, isTriggered: false, peakAcceleration: 0, staLtaRatio: ratio }));

            } else if (triggeredRef.current) {
                // Tetikleme devam ediyor
                peakRef.current = Math.max(peakRef.current, raw);
                const elapsed = now - (triggerStartRef.current ?? now);
                const confirmed = elapsed >= MIN_TRIGGER_DURATION_MS;
                setState((s) => ({
                    ...s,
                    isTriggered: confirmed,
                    triggerTime: confirmed ? (s.triggerTime ?? new Date()) : null,
                    peakAcceleration: peakRef.current,
                    staLtaRatio: ratio,
                }));
            } else {
                setState((s) => ({ ...s, staLtaRatio: ratio, isTriggered: false }));
            }
        });

        setState((s) => ({ ...s, isMonitoring: true }));
        return () => {
            sub.remove();
            setState((s) => ({ ...s, isMonitoring: false, isTriggered: false }));
        };
    }, [latitude, longitude]);

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
