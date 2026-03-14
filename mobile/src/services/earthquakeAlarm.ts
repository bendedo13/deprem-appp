/**
 * Deprem doğrulandığında FCM data payload ile tetiklenir.
 * Sessiz modda da çalar — bypassDnd + playsInSilentModeIOS aktif.
 * Android 13+ için POST_NOTIFICATIONS izni istenir.
 *
 * GÜVENLİK: require() ile asset yoksa Metro "undefined" döner ve crash yapar.
 * Bu yüzden alarm.mp3 artık require() ile yüklenmez, bildirim sesi kullanılır.
 */

import { Platform } from "react-native";
import { Audio } from "expo-av";

// Notifee güvenli import — native modül yoksa crash olmaz
let _notifee: any = null;
let _AndroidImportance: any = { HIGH: 4 };
let _AndroidCategory: any = { ALARM: "alarm" };
let _AndroidVisibility: any = { PUBLIC: 1 };

try {
  const mod = require("@notifee/react-native");
  _notifee = mod?.default ?? mod;
  if (mod?.AndroidImportance) _AndroidImportance = mod.AndroidImportance;
  if (mod?.AndroidCategory) _AndroidCategory = mod.AndroidCategory;
  if (mod?.AndroidVisibility) _AndroidVisibility = mod.AndroidVisibility;
} catch {
  console.warn("[EarthquakeAlarm] @notifee/react-native yüklenemedi — bildirimler fallback modunda");
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
    if (!_notifee?.requestPermission) return false;
    const settings = await _notifee.requestPermission();
    return settings?.authorizationStatus >= 1;
  } catch {
    return false;
  }
}

/**
 * Bildirim kanalı: HIGH importance + bypassDnd (DND modunu geç).
 */
export async function ensureEarthquakeChannel(): Promise<void> {
  if (!_notifee?.createChannel) return;
  try {
    await _notifee.createChannel({
      id: CHANNEL_ID,
      name: "Deprem Uyarısı",
      description: "Deprem algılandığında tam ekran alarm gösterir",
      importance: _AndroidImportance.HIGH ?? 4,
      sound: "default",
      vibration: true,
      vibrationPattern: [0, 300, 200, 300, 200, 600],
      bypassDnd: true,
      visibility: _AndroidVisibility.PUBLIC ?? 1,
    });
  } catch (err) {
    console.warn("[EarthquakeAlarm] Kanal oluşturulamadı:", err);
  }
}

/**
 * Sessiz modu bypass et — iOS silent switch + Android tam ses.
 */
let alarmSoundObj: Audio.Sound | null = null;

export async function playAlarmSound(): Promise<void> {
  try {
    // Audio modunu ayarla (ses yoksa bile bu gerekli)
    if (Audio?.setAudioModeAsync) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      });
    }

    // Önceki sesi temizle
    if (alarmSoundObj) {
      try { await alarmSoundObj.unloadAsync(); } catch { /* ignore */ }
      alarmSoundObj = null;
    }

    // NOT: alarm.mp3 require() ile yüklenmiyor — dosya yoksa Metro "undefined" döner
    // ve "Requiring unknown module undefined" crash'ine neden olur.
    // Bildirim sesi kullanılıyor (notifee kanalında sound: "default").
    console.log("[EarthquakeAlarm] Ses modu ayarlandı, bildirim sesi kullanılacak");
  } catch (err) {
    console.warn("[EarthquakeAlarm] Ses modu ayarlanamadı:", err);
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

  if (!_notifee?.displayNotification) {
    console.warn("[EarthquakeAlarm] Notifee yok — bildirim gösterilemedi");
    return;
  }

  const lat = payload.latitude ?? "";
  const lon = payload.longitude ?? "";
  const body = lat && lon
    ? `Konum: ${lat}, ${lon}`
    : "Cihaz sensörü deprem sinyali algıladı";

  try {
    await _notifee.displayNotification({
      title: "⚠️ Deprem Uyarısı",
      body,
      android: {
        channelId: CHANNEL_ID,
        importance: _AndroidImportance.HIGH ?? 4,
        category: _AndroidCategory.ALARM ?? "alarm",
        visibility: _AndroidVisibility.PUBLIC ?? 1,
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
  } catch (err) {
    console.warn("[EarthquakeAlarm] Bildirim gönderilemedi:", err);
  }
}
