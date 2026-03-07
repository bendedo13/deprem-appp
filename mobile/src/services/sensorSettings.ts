/**
 * İvmeölçer Alarm Ayarları — SecureStore'da kalıcı depolama.
 *
 * Neden SecureStore?
 *  - Proje genelinde AsyncStorage yerine SecureStore kullanılıyor (JWT, dil tercihi vb.)
 *  - AES-256 şifreli, uygulama izolasyonlu
 *
 * Kayıt formatı: JSON.stringify → SecureStore.setItemAsync
 * Yükleme formatı: SecureStore.getItemAsync → JSON.parse → eksik alanlar DEFAULT ile doldurulur
 */

import * as SecureStore from "expo-secure-store";

const SETTINGS_KEY = "sensor_alarm_settings_v1";

export interface SensorAlarmSettings {
    /** Çalışma başlangıç saati (HH:MM formatı, ör: "00:00") */
    workStart: string;
    /** Çalışma bitiş saati (HH:MM formatı, ör: "08:00") */
    workEnd: string;
    /** Deprem algılandığında kamera flaşı yanıp sönsün mü */
    flashEnabled: boolean;
    /** Telefon sessizde olsa bile yüksek sesli alarm çalsın mı (iOS silent mode bypass) */
    loudAlarmEnabled: boolean;
    /** Titreşim motoru çalışsın mı */
    vibrationEnabled: boolean;
}

export const DEFAULT_SETTINGS: SensorAlarmSettings = {
    workStart: "00:00",
    workEnd: "08:00",
    flashEnabled: true,
    loudAlarmEnabled: true,
    vibrationEnabled: true,
};

/**
 * Kaydedilmiş ayarları SecureStore'dan yükler.
 * Herhangi bir hata veya eksik alan → DEFAULT_SETTINGS ile tamamlanır.
 * Bu sayede versiyonlar arası uyumluluk sağlanır.
 */
export async function loadSensorSettings(): Promise<SensorAlarmSettings> {
    try {
        const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
        if (!raw) {
            console.log("[SensorSettings] Kayıtlı ayar yok — varsayılan kullanılıyor");
            return { ...DEFAULT_SETTINGS };
        }

        const parsed = JSON.parse(raw) as Partial<SensorAlarmSettings>;

        // Eksik alanları varsayılan değerlerle doldur (güvenli merge)
        return {
            workStart: parsed.workStart ?? DEFAULT_SETTINGS.workStart,
            workEnd: parsed.workEnd ?? DEFAULT_SETTINGS.workEnd,
            flashEnabled: parsed.flashEnabled ?? DEFAULT_SETTINGS.flashEnabled,
            loudAlarmEnabled: parsed.loudAlarmEnabled ?? DEFAULT_SETTINGS.loudAlarmEnabled,
            vibrationEnabled: parsed.vibrationEnabled ?? DEFAULT_SETTINGS.vibrationEnabled,
        };
    } catch (err) {
        console.warn("[SensorSettings] Yükleme hatası (varsayılan kullanılıyor):", err);
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * Ayarları SecureStore'a JSON olarak kaydeder.
 * Başarısız olursa hata fırlatır — çağıran try-catch yapmalı.
 *
 * @throws SecureStore yazma hatası (depolama dolu, izin yok vb.)
 */
export async function saveSensorSettings(settings: SensorAlarmSettings): Promise<void> {
    const json = JSON.stringify(settings);
    await SecureStore.setItemAsync(SETTINGS_KEY, json);
    console.log("[SensorSettings] Ayarlar başarıyla kaydedildi:", settings);
}
