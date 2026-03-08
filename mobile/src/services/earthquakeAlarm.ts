/**
 * Deprem doğrulandığında FCM data payload ile tetiklenir.
 * Sessiz modda da çalar — bypassDnd + playsInSilentModeIOS aktif.
 * Android 13+ için POST_NOTIFICATIONS izni istenir.
 *
 * Ses dosyası: assets/sounds/alarm.mp3 yerleştirilmelidir.
 */

import notifee, {
    AndroidImportance,
    AndroidCategory,
    AndroidVisibility,
    AndroidLaunchActivityFlag,
} from "@notifee/react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

const CHANNEL_ID = "earthquake_alarm";

export type EarthquakeConfirmedPayload = {
  type: "EARTHQUAKE_CONFIRMED";
  latitude?: string;
  longitude?: string;
  timestamp?: string;
  device_count?: string;
};

/** Alarm ses nesnesi — yeniden yüklemeden kaçınmak için */
let _alarmSound: Audio.Sound | null = null;

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
 * Sessiz modu bypass ederek alarm sesini çalar.
 * iOS: Ring/Silent anahtarını yoksayar (playsInSilentModeIOS).
 * Android: DND bypass notifee kanalında (bypassDnd: true).
 *
 * Ses dosyası eksikse yalnızca mod ayarlanır; notifee kanal sesi devreye girer.
 */
export async function playAlarmSound(): Promise<void> {
  try {
    // 1. Sessiz mod bypass + arka plan ses modu
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });

    // 2. Önceki alarm sesini durdur
    if (_alarmSound) {
      try {
        await _alarmSound.stopAsync();
        await _alarmSound.unloadAsync();
      } catch {
        /* zaten durmuş */
      }
      _alarmSound = null;
    }

    // 3. Alarm ses dosyasını yükle ve tam ses ile çal
    //    Gerekli dosya: mobile/assets/sounds/alarm.mp3
    try {
      const { sound } = await Audio.Sound.createAsync(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("../../assets/sounds/alarm.mp3"),
        { shouldPlay: true, isLooping: false, volume: 1.0, isMuted: false }
      );
      _alarmSound = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          _alarmSound = null;
        }
      });
      console.log("[EarthquakeAlarm] ✓ Alarm sesi çalıyor (sessiz mod bypass aktif)");
    } catch {
      // alarm.mp3 bulunamadı — notifee kanalı varsayılan sesi çalar
      console.warn("[EarthquakeAlarm] assets/sounds/alarm.mp3 bulunamadı, notifee varsayılan sesi kullanılıyor");
    }
  } catch (err) {
    console.warn("[EarthquakeAlarm] Ses modu ayarlanamadı:", err);
  }
}

/**
 * Alarm sesini durdurur (simülasyon iptal veya ekran kapatma için).
 */
export async function stopAlarmSound(): Promise<void> {
  if (_alarmSound) {
    try {
      await _alarmSound.stopAsync();
      await _alarmSound.unloadAsync();
    } catch {
      /* sessiz başarısızlık */
    }
    _alarmSound = null;
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
        launchActivityFlags: [
          AndroidLaunchActivityFlag.NEW_TASK,
          AndroidLaunchActivityFlag.SINGLE_TOP,
        ],
      },
      pressAction: { id: "default" },
      autoCancel: false,
      ongoing: true,
    },
    ios: {
      sound: "default",
      critical: true,
      criticalVolume: 1.0,
      foregroundPresentationOptions: {
        sound: true,
        badge: true,
        banner: true,
        list: true,
      },
    },
  });
  console.log("[EarthquakeAlarm] ✓ Tam ekran bildirim gönderildi");
}
