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

/** 7/24: Her zaman aktif. Gece: Sadece 23:00-07:00 arası (pil tasarrufu) */
export type SensorMode = "24_7" | "night";

export interface SensorAlarmSettings {
    /** 7/24 Koruma veya Gece Modu (23:00-07:00) */
    mode: SensorMode;
    /** Çalışma başlangıç saati (HH:MM) — Gece modunda 23:00 */
    workStart: string;
    /** Çalışma bitiş saati (HH:MM) — Gece modunda 07:00 */
    workEnd: string;
    /** Deprem algılandığında kamera flaşı yanıp sönsün mü */
    flashEnabled: boolean;
    /** Telefon sessizde olsa bile yüksek sesli alarm çalsın mı (iOS silent mode bypass) */
    loudAlarmEnabled: boolean;
    /** Titreşim motoru çalışsın mı */
    vibrationEnabled: boolean;
}

export const DEFAULT_SETTINGS: SensorAlarmSettings = {
    mode: "24_7",
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
            mode: parsed.mode ?? DEFAULT_SETTINGS.mode,
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
/** Şu anki saat çalışma penceresinde mi? */
export function isWithinWorkHours(workStart: string, workEnd: string): boolean {
    const now = new Date();
    const [sh, sm] = workStart.split(":").map(Number);
    const [eh, em] = workEnd.split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (startMin > endMin) {
        // Gece modu: 23:00-07:00 → 23:00'dan sonra veya 07:00'dan önce
        return nowMin >= startMin || nowMin < endMin;
    }
    return nowMin >= startMin && nowMin < endMin;
}

/** Sensör şu an aktif mi? (mode + work hours) */
export function isSensorActive(settings: SensorAlarmSettings): boolean {
    if (settings.mode === "24_7") return true;
    return isWithinWorkHours(settings.workStart, settings.workEnd);
}

export async function saveSensorSettings(settings: SensorAlarmSettings): Promise<void> {
    const json = JSON.stringify(settings);
    await SecureStore.setItemAsync(SETTINGS_KEY, json);
    console.log("[SensorSettings] Ayarlar başarıyla kaydedildi:", settings);
}
