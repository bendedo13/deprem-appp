/**
 * useShakeDetector hook — Gelişmiş sismik algılama.
 * Butterworth bandpass filtreleme + Recursive STA/LTA + P/S dalga ayrımı.
 * Yanlış alarm filtreleme (telefon düşürme, yürüme, dokunma).
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
    MIN_REPORT_ACCELERATION,
} from "../constants/seismic";
import {
    vectorMagnitude,
    BandpassFilter,
    RecursiveStaLta,
    isLikelyEarthquake,
} from "../utils/staLta";
import { reportTrigger } from "../services/seismicService";

export interface ShakeState {
    isMonitoring: boolean;
    isTriggered: boolean;
    peakAcceleration: number;
    triggerTime: Date | null;
    staLtaRatio: number;
}

const DEVICE_ID = `device-${Platform.OS}-${Date.now().toString(36)}`;

/** Gravity removal using exponential moving average */
const GRAVITY_ALPHA = 0.8;

/** Minimum trigger confirmation duration (ms) to avoid phone drops */
const MIN_CONFIRM_DURATION_MS = 800;

export function useShakeDetector(
    latitude: number | null,
    longitude: number | null
): ShakeState {
    // Persistent refs for filter state across renders
    const bandpass = useRef(new BandpassFilter(SAMPLE_RATE_HZ, 0.5, 20));
    const staLta = useRef(new RecursiveStaLta(STA_WINDOW, LTA_WINDOW));
    const gravityRef = useRef({ x: 0, y: 0, z: 0 });
    const triggered = useRef(false);
    const triggerStartTime = useRef(0);
    const peakRef = useRef(0);
    const recentBuffer = useRef<number[]>([]);
    const reportSent = useRef(false);

    const [state, setState] = useState<ShakeState>({
        isMonitoring: false,
        isTriggered: false,
        peakAcceleration: 0,
        triggerTime: null,
        staLtaRatio: 0,
    });

    useEffect(() => {
        Accelerometer.setUpdateInterval(Math.floor(1000 / SAMPLE_RATE_HZ));

        // Reset filter state on mount
        bandpass.current = new BandpassFilter(SAMPLE_RATE_HZ, 0.5, 20);
        staLta.current = new RecursiveStaLta(STA_WINDOW, LTA_WINDOW);

        const sub = Accelerometer.addListener(({ x, y, z }) => {
            // Remove gravity with exponential moving average
            const g = gravityRef.current;
            g.x = GRAVITY_ALPHA * g.x + (1 - GRAVITY_ALPHA) * x;
            g.y = GRAVITY_ALPHA * g.y + (1 - GRAVITY_ALPHA) * y;
            g.z = GRAVITY_ALPHA * g.z + (1 - GRAVITY_ALPHA) * z;

            const ax = x - g.x;
            const ay = y - g.y;
            const az = z - g.z;

            // Vector magnitude of linear acceleration
            const raw = vectorMagnitude(ax, ay, az);

            // Bandpass filter: keep seismic frequencies (0.5-20 Hz)
            const filtered = bandpass.current.process(raw);
            const absFiltered = Math.abs(filtered);

            // Recursive STA/LTA (O(1) per sample)
            const ratio = staLta.current.push(absFiltered);

            // Maintain recent buffer for false alarm analysis
            recentBuffer.current.push(filtered);
            if (recentBuffer.current.length > SAMPLE_RATE_HZ * 3) {
                recentBuffer.current = recentBuffer.current.slice(-SAMPLE_RATE_HZ * 2);
            }

            if (!triggered.current && ratio >= TRIGGER_RATIO) {
                // Potential trigger — start confirmation timer
                triggered.current = true;
                triggerStartTime.current = Date.now();
                peakRef.current = raw;
                reportSent.current = false;
                setState((s) => ({
                    ...s,
                    isTriggered: true,
                    triggerTime: new Date(),
                    staLtaRatio: ratio,
                    peakAcceleration: raw,
                }));
            } else if (triggered.current && ratio < DETRIGGER_RATIO) {
                // Detrigger
                const durationMs = Date.now() - triggerStartTime.current;

                // Only send report if confirmed as likely earthquake
                if (!reportSent.current && durationMs >= MIN_CONFIRM_DURATION_MS) {
                    const likely = isLikelyEarthquake(
                        recentBuffer.current,
                        durationMs,
                        peakRef.current
                    );
                    if (likely) {
                        _sendReport(peakRef.current, ratio, latitude, longitude);
                        reportSent.current = true;
                    }
                }

                triggered.current = false;
                peakRef.current = 0;
                setState((s) => ({
                    ...s,
                    isTriggered: false,
                    peakAcceleration: 0,
                    staLtaRatio: ratio,
                }));
            } else if (triggered.current) {
                peakRef.current = Math.max(peakRef.current, raw);
                const durationMs = Date.now() - triggerStartTime.current;

                // Send report if sustained long enough and not yet reported
                if (!reportSent.current && durationMs >= MIN_CONFIRM_DURATION_MS) {
                    const likely = isLikelyEarthquake(
                        recentBuffer.current,
                        durationMs,
                        peakRef.current
                    );
                    if (likely) {
                        _sendReport(peakRef.current, ratio, latitude, longitude);
                        reportSent.current = true;
                    }
                }

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
    } catch {
        // Network error — silently ignore
    }
}
