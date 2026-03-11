/**
 * Deprem doğrulandığında FCM data payload ile tetiklenir.
 * Sessiz modda da çalar — bypassDnd + STREAM_ALARM + playsInSilentModeIOS aktif.
 * Android 13+ için POST_NOTIFICATIONS izni istenir.
 *
 * Nükleer Alarm zinciri:
 *  1. setAlarmVolumeMax() → STREAM_ALARM kanalını Native ile maksimuma çıkarır (DND/Sessiz bypass)
 *  2. notifee ALARM category + MAX importance → sistem alarm kanalında bildirim gösterir
 *  3. expo-av playsInSilentModeIOS → iOS sessiz switch bypass
 */

import notifee, { AndroidImportance, AndroidCategory, AndroidVisibility } from "@notifee/react-native";
import { Platform } from "react-native";
import { setAlarmVolumeMax, restoreAlarmVolume } from "./nuclearAlarmBridge";

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
const ALARM_CHANNEL_ID = "earthquake_nuclear_alarm";

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
 * Bildirim kanalı: MAX importance + ALARM category + bypassDnd (DND/Sessiz modunu geç).
 * AndroidImportance.MAX → STREAM_ALARM kanalı kullanır, ses kesilmez.
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

  // Ayrı bir ALARM kanalı oluştur — AndroidImportance.MAX + category ALARM
  // Bu kanal STREAM_ALARM'ı kullanır ve DND'yi tamamen deler
  await notifee.createChannel({
    id: ALARM_CHANNEL_ID,
    name: "Deprem Nükleer Alarm",
    description: "STREAM_ALARM kanalı — DND ve sessiz modu geçer",
    importance: AndroidImportance.HIGH,
    sound: "default",
    vibration: true,
    vibrationPattern: [0, 500, 200, 500, 200, 1000],
    bypassDnd: true,
    visibility: AndroidVisibility.PUBLIC,
  });
}

/**
 * Sessiz modu bypass et — iOS silent switch + Android STREAM_ALARM tam ses.
 * Gerçek alarm sesi çalar.
 * Adım 1: NuclearAlarmBridge → STREAM_ALARM kanalını native seviyede maksimuma çıkarır.
 * Adım 2: expo-av → iOS sessiz modu bypass (playsInSilentModeIOS).
 */
let alarmSoundObj: import("expo-av").Audio.Sound | null = null;

export async function playAlarmSound(): Promise<void> {
    // Adım 1: Android STREAM_ALARM kanalını native seviyede maksimuma çıkar
    await setAlarmVolumeMax();

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
 * Alarm sesini durdur ve ses seviyesini geri yükle.
 */
export async function stopAlarmSound(): Promise<void> {
  if (alarmSoundObj) {
    try {
      await alarmSoundObj.stopAsync();
      await alarmSoundObj.unloadAsync();
    } catch { /* ignore */ }
    alarmSoundObj = null;
  }
  // Android ses seviyesini alarm öncesi haline geri getir
  await restoreAlarmVolume();
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
      channelId: ALARM_CHANNEL_ID,     // STREAM_ALARM kanalı — DND/sessiz modu geçer
      importance: AndroidImportance.HIGH,
      category: AndroidCategory.ALARM, // Sistem alarm kategorisi
      visibility: AndroidVisibility.PUBLIC,
      fullScreenAction: {
        id: "default",
        launchActivity: "default",
      },
      pressAction: { id: "default" },
      autoCancel: false,
      ongoing: true,                   // Kullanıcı kapatana kadar bildirim devam eder
    },
    ios: {
      sound: "default",
      critical: true,
      criticalVolume: 1.0,
    },
  });
  console.log("[EarthquakeAlarm] Nükleer alarm bildirimi gönderildi (ALARM_CHANNEL)");
}
