/**
 * useShakeDetector hook — expo-sensors Accelerometer + STA/LTA algoritması.
 * Sismik titreşimi yürüme/taşıma gürültüsünden ayırt eder.
 * rules.md: try/catch, type hints, max 50 satır/fonksiyon.
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
} from "../constants/seismic";
import { highPassFilter, vectorMagnitude, computeStaLta } from "../utils/staLta";
import { reportTrigger } from "../services/seismicService";

export interface ShakeState {
    /** Sensör aktif ve tetikleme izleniyor */
    isMonitoring: boolean;
    /** Şu an sismik tetikleme aktif mi */
    isTriggered: boolean;
    /** Son tetiklemedeki tepe ivme değeri (m/s²) */
    peakAcceleration: number;
    /** Son tetikleme zamanı */
    triggerTime: Date | null;
    /** Son STA/LTA oranı */
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
    const triggered = useRef(false);
    const peakRef = useRef(0);

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
            const raw = vectorMagnitude(x, y, z);
            const filtered = highPassFilter(raw, prevRaw.current, prevFiltered.current, HIGHPASS_ALPHA);
            prevRaw.current = raw;
            prevFiltered.current = filtered;

            samples.current.push(filtered);
            if (samples.current.length > LTA_WINDOW) {
                samples.current.shift();
            }

            const ratio = computeStaLta(samples.current, STA_WINDOW, LTA_WINDOW);

            if (!triggered.current && ratio >= TRIGGER_RATIO) {
                triggered.current = true;
                peakRef.current = raw;
                setState((s) => ({ ...s, isTriggered: true, triggerTime: new Date(), staLtaRatio: ratio }));
                _sendReport(raw, ratio, latitude, longitude);
            } else if (triggered.current && ratio < DETRIGGER_RATIO) {
                triggered.current = false;
                peakRef.current = 0;
                setState((s) => ({ ...s, isTriggered: false, peakAcceleration: 0, staLtaRatio: ratio }));
            } else if (triggered.current) {
                peakRef.current = Math.max(peakRef.current, raw);
                setState((s) => ({
                    ...s,
                    peakAcceleration: peakRef.current,
                    staLtaRatio: ratio,
                }));
            }
        });

        setState((s) => ({ ...s, isMonitoring: true }));
        return () => {
            sub.remove();
            setState((s) => ({ ...s, isMonitoring: false }));
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
    await reportTrigger({
        device_id: DEVICE_ID,
        peak_acceleration: peakAccel,
        sta_lta_ratio: ratio,
        latitude: lat,
        longitude: lng,
    });
}
