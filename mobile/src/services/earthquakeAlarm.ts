/**
 * Deprem doğrulandığında FCM data payload ile tetiklenir.
 * Sessiz modda da çalar — bypassDnd + playsInSilentModeIOS aktif.
 * Android 13+ için POST_NOTIFICATIONS izni istenir.
 */

import notifee, { AndroidImportance, AndroidCategory, AndroidVisibility } from "@notifee/react-native";
import { Platform } from "react-native";
import { Audio } from "expo-av";

const CHANNEL_ID = "earthquake_alarm";

export type EarthquakeConfirmedPayload = {
  type: "EARTHQUAKE_CONFIRMED";
  latitude?: string;
  longitude?: string;
  timestamp?: string;
  device_count?: string;
};

/**
 * Android 13+ / iOS için bildirim iznini iste.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  } catch {
    return false;
  }
}

/**
 * Bildirim kanalı: HIGH importance + bypassDnd (DND modunu geç).
 */
export async function ensureEarthquakeChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Deprem Uyarısı",
    description: "Deprem algılandığında tam ekran alarm gösterir",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
    vibrationPattern: [0, 300, 200, 300, 200, 600],
    bypassDnd: true,
    visibility: AndroidVisibility.PUBLIC,
  });
}

/**
 * Sessiz modu bypass et — iOS silent switch + Android tam ses.
 */
export async function playAlarmSound(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });
    console.log("[EarthquakeAlarm] Ses modu: sessiz bypass aktif");
  } catch (err) {
    console.warn("[EarthquakeAlarm] Ses modu ayarlanamadı:", err);
  }
}

/**
 * Deprem doğrulandığında: izin iste → ses bypass → tam ekran bildirim.
 */
export async function showEarthquakeAlarm(payload: EarthquakeConfirmedPayload): Promise<void> {
  await requestNotificationPermission();
  await playAlarmSound();
  await ensureEarthquakeChannel();

  const lat = payload.latitude ?? "";
  const lon = payload.longitude ?? "";
  const body = lat && lon
    ? `Konum: ${lat}, ${lon}`
    : "Cihaz sensörü deprem sinyali algıladı";

  await notifee.displayNotification({
    title: "⚠️ Deprem Uyarısı",
    body,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      category: AndroidCategory.ALARM,
      visibility: AndroidVisibility.PUBLIC,
      fullScreenAction: {
        id: "default",
        launchActivity: "default",
      },
      pressAction: { id: "default" },
      autoCancel: false,
    },
    ios: {
      sound: "default",
      critical: true,
      criticalVolume: 1.0,
    },
  });
  console.log("[EarthquakeAlarm] Tam ekran bildirim gönderildi");
}
