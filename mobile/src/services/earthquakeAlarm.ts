/**
 * Deprem doğrulandığında FCM data payload ile tetiklenir.
 * Sesi %100 yapar ve Notifee ile tam ekran alarm (Full Screen Intent) gösterir.
 */

import notifee, { AndroidImportance } from "@notifee/react-native";
import { Platform } from "react-native";

const CHANNEL_ID = "earthquake_alarm";

export type EarthquakeConfirmedPayload = {
  type: "EARTHQUAKE_CONFIRMED";
  latitude?: string;
  longitude?: string;
  timestamp?: string;
  device_count?: string;
};

/**
 * Bildirim kanalını oluşturur (Android). Tam ekran ve yüksek öncelik.
 */
export async function ensureEarthquakeChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Deprem Uyarısı",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
  });
}

/**
 * Deprem doğrulandığında çağrılır: ses %100 + tam ekran bildirim.
 * FCM handler'dan veya doğrudan tetiklenebilir.
 */
export async function showEarthquakeAlarm(payload: EarthquakeConfirmedPayload): Promise<void> {
  await ensureEarthquakeChannel();

  const lat = payload.latitude ?? "";
  const lon = payload.longitude ?? "";
  const ts = payload.timestamp ?? new Date().toISOString();
  const body = `Konum: ${lat}, ${lon} • ${ts}`;

  const notification: notifee.Notification = {
    title: "⚠️ Deprem doğrulandı",
    body,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      fullScreenAction: {
        launchActivity: "default",
      },
      pressAction: { id: "default" },
      smallIcon: "ic_notification",
    },
  };

  await notifee.displayNotification(notification);

  // Ses seviyesini %100 yap (sadece uyarı süresi için)
  try {
    const { setVolume } = await import("./volumeControl");
    setVolume(1.0);
  } catch {
    // volumeControl modülü yoksa sessiz devam
  }
}
