/**
 * FCM data mesajı geldiğinde EARTHQUAKE_CONFIRMED ise tam ekran alarm gösterir.
 * Uygulama arka planda veya kapalıyken de tetiklenmeli (background handler).
 */

import messaging from "@react-native-firebase/messaging";
import { showEarthquakeAlarm, EarthquakeConfirmedPayload } from "./earthquakeAlarm";

/**
 * Foreground'da gelen FCM data mesajını işler.
 */
export function setupFcmEarthquakeHandler(): () => void {
  const unsub = messaging().onMessage(async (remoteMessage) => {
    const data = remoteMessage.data as Record<string, string> | undefined;
    if (!data || data.type !== "EARTHQUAKE_CONFIRMED") return;

    await showEarthquakeAlarm({
      type: "EARTHQUAKE_CONFIRMED",
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp,
      device_count: data.device_count,
    });
  });

  return unsub;
}

/**
 * Arka planda/quit durumda gelen data mesajı için handler.
 * index.js veya App bileşeninde çağrılmalı: messaging().setBackgroundMessageHandler(...)
 */
export function setBackgroundEarthquakeHandler(): void {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    const data = remoteMessage.data as Record<string, string> | undefined;
    if (!data || data.type !== "EARTHQUAKE_CONFIRMED") return;

    await showEarthquakeAlarm({
      type: "EARTHQUAKE_CONFIRMED",
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp,
      device_count: data.device_count,
    });
  });
}
