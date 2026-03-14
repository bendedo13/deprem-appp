/**
 * Nükleer alarm servisi — arka planda 1.8G+ algılandığında tam ekran uyarı + maksimum ses.
 * Sessiz / DND modunu deler; kullanıcı "Sesi Kapat / Güvendeyim" basana kadar alarm çalar.
 */

import { showEarthquakeAlarm } from "./earthquakeAlarm";
import { playAlarmSound, stopAlarmSound } from "./earthquakeAlarm";
import { setAlarmVolumeMax, restoreAlarmVolume } from "./nuclearAlarmBridge";

type Listener = (playing: boolean) => void;
const listeners: Listener[] = [];

function notify(playing: boolean) {
    listeners.forEach((cb) => {
        try {
            cb(playing);
        } catch (e) {
            console.warn("[CriticalAlarm] Listener error:", e);
        }
    });
}

export function subscribeCriticalAlarm(callback: Listener): () => void {
    listeners.push(callback);
    return () => {
        const i = listeners.indexOf(callback);
        if (i >= 0) listeners.splice(i, 1);
    };
}

let isPlaying = false;

export function isCriticalAlarmPlaying(): boolean {
    return isPlaying;
}

/**
 * Tam ekran deprem uyarısı + alarm sesi (maksimum, sessiz modda da çalar).
 * Kullanıcı "Güvendeyim" basana kadar stopCriticalAlarm() çağrılmalıdır.
 */
export async function startCriticalAlarm(latitude?: string, longitude?: string): Promise<void> {
    if (isPlaying) return;
    isPlaying = true;
    notify(true);

    try {
        await setAlarmVolumeMax();
        await playAlarmSound();
        await showEarthquakeAlarm({
            type: "EARTHQUAKE_CONFIRMED",
            latitude: latitude ?? "",
            longitude: longitude ?? "",
            timestamp: new Date().toISOString(),
            device_count: "SENSOR-1.8G",
        });
    } catch (err) {
        console.warn("[CriticalAlarm] startCriticalAlarm error:", err);
    }
}

/**
 * Alarm sesini durdurur ve UI'ya bildirir.
 */
export async function stopCriticalAlarm(): Promise<void> {
    if (!isPlaying) return;
    try {
        await stopAlarmSound();
        await restoreAlarmVolume();
    } catch (e) {
        console.warn("[CriticalAlarm] stopAlarmSound error:", e);
    }
    isPlaying = false;
    notify(false);
}
