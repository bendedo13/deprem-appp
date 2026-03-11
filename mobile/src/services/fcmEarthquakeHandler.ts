/**
 * FCM data mesajı geldiğinde EARTHQUAKE_CONFIRMED ise Nükleer Alarm tetikler.
 *
 * FCM Mesaj Yapısı (Backend'den gönderilen):
 *   data.type = "EARTHQUAKE_CONFIRMED"
 *   data.latitude, data.longitude, data.timestamp, data.device_count
 *
 * Tetikleme Zinciri (hem foreground hem background):
 *   FCM mesaj gelir → showEarthquakeAlarm() →
 *     1. setAlarmVolumeMax()     → STREAM_ALARM native maksimuma çıkar (Android DND bypass)
 *     2. playAlarmSound()        → expo-av alarm.mp3 çalar (iOS sessiz bypass)
 *     3. notifee.displayNotification() → Tam ekran bildirim (ALARM_CHANNEL_ID)
 *
 * Android priority="high" + TTL=30sn → Doze Mode'daki telefon FCM ile uyanır.
 * iOS content-available=1 + critical=true → Sessiz mod bypass edilir.
 */

import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging";
import { showEarthquakeAlarm, EarthquakeConfirmedPayload } from "./earthquakeAlarm";

type RemoteMessage = FirebaseMessagingTypes.RemoteMessage;

/** FCM data payload'ını type-safe şekilde ayıklar. */
function extractEarthquakePayload(
    data: Record<string, string> | undefined
): EarthquakeConfirmedPayload | null {
    if (!data || data.type !== "EARTHQUAKE_CONFIRMED") return null;
    return {
        type: "EARTHQUAKE_CONFIRMED",
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: data.timestamp,
        device_count: data.device_count,
    };
}

/**
 * Foreground'da (uygulama açıkken) gelen FCM data mesajını işler.
 * messaging().onMessage() ile çağrılır.
 */
export function setupFcmEarthquakeHandler(): () => void {
    const unsub = messaging().onMessage(async (remoteMessage: RemoteMessage) => {
        const payload = extractEarthquakePayload(
            remoteMessage.data as Record<string, string> | undefined
        );
        if (!payload) return;

        console.info(
            "[FCM] EARTHQUAKE_CONFIRMED (foreground) — lat=%s lng=%s devices=%s",
            payload.latitude, payload.longitude, payload.device_count
        );

        try {
            await showEarthquakeAlarm(payload);
        } catch (err) {
            console.error("[FCM] showEarthquakeAlarm hatası (foreground):", err);
        }
    });

    return unsub;
}

/**
 * Arka planda / quit durumda gelen data mesajı için handler.
 *
 * ÖNEMLI: Bu handler en yüksek seviye çağrıda (index.js veya App.tsx'in en üstünde)
 * çağrılmalıdır:
 *   import { setBackgroundEarthquakeHandler } from "@/services/fcmEarthquakeHandler";
 *   setBackgroundEarthquakeHandler();
 *
 * Android priority="high" FCM mesajı Doze Mode'daki cihazı uyandırır;
 * bu handler çalışarak showEarthquakeAlarm() → Nükleer Alarm zincirini başlatır.
 */
export function setBackgroundEarthquakeHandler(): void {
    messaging().setBackgroundMessageHandler(async (remoteMessage: RemoteMessage) => {
        const payload = extractEarthquakePayload(
            remoteMessage.data as Record<string, string> | undefined
        );
        if (!payload) return;

        console.info(
            "[FCM] EARTHQUAKE_CONFIRMED (background) — lat=%s lng=%s devices=%s",
            payload.latitude, payload.longitude, payload.device_count
        );

        try {
            await showEarthquakeAlarm(payload);
        } catch (err) {
            // Background handler'da sessiz fail YASAK — logla
            console.error("[FCM] showEarthquakeAlarm hatası (background):", err);
        }
    });
}

/**
 * Uygulama tamamen kapalıyken (quit state) FCM mesajı geldiğinde
 * uygulamayı açan "initial notification"ı işler.
 * App.tsx içinde useEffect ile çağrılmalı.
 */
export async function handleInitialEarthquakeNotification(): Promise<void> {
    try {
        const initialMessage = await messaging().getInitialNotification();
        if (!initialMessage) return;

        const payload = extractEarthquakePayload(
            initialMessage.data as Record<string, string> | undefined
        );
        if (!payload) return;

        console.info(
            "[FCM] EARTHQUAKE_CONFIRMED (initial/quit) — lat=%s lng=%s devices=%s",
            payload.latitude, payload.longitude, payload.device_count
        );

        await showEarthquakeAlarm(payload);
    } catch (err) {
        console.error("[FCM] handleInitialEarthquakeNotification hatası:", err);
    }
}
