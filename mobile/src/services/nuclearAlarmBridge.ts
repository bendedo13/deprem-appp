/**
 * NuclearAlarmBridge — withNuclearAlarm Config Plugin tarafından oluşturulan
 * NuclearAlarmModule native Kotlin modülüne JS köprüsü.
 *
 * Kullanım:
 *   import { setAlarmVolumeMax, restoreAlarmVolume } from "./nuclearAlarmBridge";
 *   await setAlarmVolumeMax();   // Alarm öncesi → STREAM_ALARM maksimuma çıkar
 *   await restoreAlarmVolume();  // Alarm sonrası → eski ses seviyesine dön
 */

import { NativeModules, Platform } from "react-native";

const { NuclearAlarm } = NativeModules;

let savedAlarmVolume: number | null = null;

/**
 * STREAM_ALARM kanalını maksimum seviyeye çıkarır, eski değeri saklar.
 * Sessiz mod / DND modunda bile çalışır.
 * Yalnızca Android'de etkilidir (iOS için expo-av playsInSilentModeIOS yeterlidir).
 */
export async function setAlarmVolumeMax(): Promise<void> {
    if (Platform.OS !== "android") return;

    if (!NuclearAlarm) {
        console.warn("[NuclearAlarm] Native modül bulunamadı. withNuclearAlarm plugin aktif mi?");
        return;
    }

    try {
        // Mevcut sesi sakla
        const volumeInfo = await NuclearAlarm.getAlarmVolume() as { current: number; max: number };
        savedAlarmVolume = volumeInfo.current;

        // Maksimuma çıkar
        const result = await NuclearAlarm.setAlarmVolumeMax() as string;
        console.info("[NuclearAlarm] STREAM_ALARM max ayarlandı:", result);
    } catch (err) {
        // Ses ayarlanamasa bile alarm çalmaya devam etmeli — sessiz fail YASAK
        console.error("[NuclearAlarm] setAlarmVolumeMax hatası (alarm devam ediyor):", err);
    }
}

/**
 * Alarm öncesi kaydedilen ses seviyesini geri yükler.
 */
export async function restoreAlarmVolume(): Promise<void> {
    if (Platform.OS !== "android") return;
    if (!NuclearAlarm) return;

    const volumeToRestore = savedAlarmVolume ?? 3; // Bilinmiyorsa orta seviye
    try {
        const result = await NuclearAlarm.restoreVolume(volumeToRestore) as string;
        console.info("[NuclearAlarm] Ses geri yüklendi:", result);
        savedAlarmVolume = null;
    } catch (err) {
        console.warn("[NuclearAlarm] restoreVolume hatası:", err);
    }
}

/**
 * Mevcut STREAM_ALARM seviyesini döndürür.
 */
export async function getAlarmVolume(): Promise<{ current: number; max: number } | null> {
    if (Platform.OS !== "android" || !NuclearAlarm) return null;
    try {
        return await NuclearAlarm.getAlarmVolume() as { current: number; max: number };
    } catch (err) {
        console.warn("[NuclearAlarm] getAlarmVolume hatası:", err);
        return null;
    }
}
