/**
 * Deprem doğrulandığında FCM data payload ile tetiklenir.
 * Sessiz modda da çalar — bypassDnd + playsInSilentModeIOS aktif.
 * Android 13+ için POST_NOTIFICATIONS izni istenir.
 */

import notifee, { AndroidImportance, AndroidCategory, AndroidVisibility } from "@notifee/react-native";
import { Platform } from "react-native";

/** expo-av güvenli yükleme — Requiring unknown module "undefined" crash'ini önler */
let AudioModule: typeof import("expo-av").Audio | null = null;
try {
    const expoAv = require("expo-av");
    if (expoAv?.Audio && typeof expoAv.Audio.setAudioModeAsync === "function") {
        AudioModule = expoAv.Audio;
    }
} catch {
    console.warn("[EarthquakeAlarm] expo-av yüklenemedi");
}

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
 * Gerçek alarm sesi çalar.
 */
let alarmSoundObj: import("expo-av").Audio.Sound | null = null;

export async function playAlarmSound(): Promise<void> {
    if (!AudioModule) {
        console.warn("[EarthquakeAlarm] expo-av yok, alarm sesi atlandı");
        return;
    }
    try {
        await AudioModule.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });

    // Önceki sesi temizle
    if (alarmSoundObj) {
      try { await alarmSoundObj.unloadAsync(); } catch { /* ignore */ }
      alarmSoundObj = null;
    }

    // Sistem uyarı sesi çal — require path sabit; undefined ile require çağrılmaz
    let soundSource: number | null = null;
    try {
      soundSource = require("../../../assets/alarm.mp3");
    } catch {
      // alarm.mp3 yoksa veya path hatalıysa sessiz devam
    }

    if (soundSource != null) {
      const { sound } = await AudioModule.Sound.createAsync(
        soundSource,
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      alarmSoundObj = sound;
      console.log("[EarthquakeAlarm] Alarm sesi çalınıyor");
    } else {
      console.warn("[EarthquakeAlarm] alarm.mp3 bulunamadı, bildirim sesiyle devam ediliyor");
    }
  } catch (err) {
    console.warn("[EarthquakeAlarm] Ses dosyası yüklenemedi, varsayılan bildirim sesi kullanılacak:", err);
    // Ses dosyası olmasa bile audio mode ayarlanmış olacak
  }
}

/**
 * Alarm sesini durdur.
 */
export async function stopAlarmSound(): Promise<void> {
  if (alarmSoundObj) {
    try {
      await alarmSoundObj.stopAsync();
      await alarmSoundObj.unloadAsync();
    } catch { /* ignore */ }
    alarmSoundObj = null;
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
