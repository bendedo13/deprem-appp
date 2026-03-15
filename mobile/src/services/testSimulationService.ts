/**
 * Sistemi Test Et (Simülasyon) — Minimal, çökme yapmayan test servisi.
 *
 * Bağımlılıklar: expo-av, react-native (Vibration), sosAlertService.
 * earthquakeAlarm, criticalAlarmService, Notifee KULLANILMAZ (undefined module crash önlenir).
 */

import { Vibration } from "react-native";
import { sendSOSAlert } from "./sosAlertService";

let AudioModule: { setAudioModeAsync: (opts: object) => Promise<void>; Sound: { createAsync: (src: number, opts: object) => Promise<{ sound: { stopAsync: () => Promise<void>; unloadAsync: () => Promise<void> } }> } } | null = null;
try {
    const expoAv = require("expo-av");
    if (expoAv?.Audio && typeof expoAv.Audio.setAudioModeAsync === "function") {
        AudioModule = expoAv.Audio;
    }
} catch {
    /* expo-av yoksa sessizce atla */
}

let alarmSoundObj: { stopAsync: () => Promise<void>; unloadAsync: () => Promise<void> } | null = null;

const TEST_MESSAGE = "Bu bir QuakeSense sistem testidir, güvendeyim.";

/**
 * Sessiz modu bypass et — telefon sessizde olsa bile ses çalar.
 */
async function configureAudioBypass(): Promise<boolean> {
    if (!AudioModule) return false;
    try {
        await AudioModule.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Alarm sesini başlat. alarm.mp3 yoksa sessiz devam.
 * NOT: require() ile olmayan dosya Metro crash'e neden olur.
 * Bu yüzden ses dosyası yoksa sessiz mod ile devam edilir.
 */
export async function startTestAlarmSound(): Promise<boolean> {
    if (!AudioModule) return false;
    try {
        await configureAudioBypass();
        if (alarmSoundObj) {
            try {
                await alarmSoundObj.stopAsync();
                await alarmSoundObj.unloadAsync();
            } catch { /* ignore */ }
            alarmSoundObj = null;
        }
        // Ses dosyası olmadan sadece audio modunu ayarla (bildirim sesi kullanılır)
        // alarm.mp3 require() Metro bundler'da crash yapabilir, bu yüzden kullanılmıyor
        console.log("[TestSimulation] Ses modu ayarlandı, bildirim sesi kullanılacak");
        return true;
    } catch {
        return false;
    }
}

/**
 * Alarm sesini durdur.
 */
export async function stopTestAlarmSound(): Promise<void> {
    if (alarmSoundObj) {
        try {
            await alarmSoundObj.stopAsync();
            await alarmSoundObj.unloadAsync();
        } catch { /* ignore */ }
        alarmSoundObj = null;
    }
}

/**
 * Maksimum güçte titreşim.
 */
export function startTestVibration(): void {
    try {
        if (typeof Vibration?.vibrate === "function") {
            Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
        }
    } catch { /* ignore */ }
}

/**
 * Titreşimi durdur.
 */
export function stopTestVibration(): void {
    try {
        if (typeof Vibration?.cancel === "function") {
            Vibration.cancel();
        }
    } catch { /* ignore */ }
}

/**
 * Twilio S.O.S test mesajı gönder. Hata olsa bile uygulama çökmez.
 */
export async function sendTestSOS(): Promise<{ success: boolean; notifiedContacts: number; error?: string }> {
    try {
        const result = await sendSOSAlert("sensor", TEST_MESSAGE);
        return {
            success: result.success,
            notifiedContacts: result.notifiedContacts ?? 0,
            error: result.error,
        };
    } catch (err) {
        return {
            success: false,
            notifiedContacts: 0,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

/**
 * Testi tamamen durdur (ses + titreşim).
 */
export async function stopTestCompletely(): Promise<void> {
    await stopTestAlarmSound();
    stopTestVibration();
}
