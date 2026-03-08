/**
 * İzin Yönetimi Servisi — Onboarding ve ayar yönlendirmeleri.
 * Clean Architecture: tek sorumluluk, try-catch ile graceful fail.
 */

import { Platform, Linking } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

export type PermissionId = "location_always" | "battery_optimization" | "sensor_activity" | "critical_notification";

export interface PermissionStatus {
    locationForeground: "granted" | "denied" | "undetermined";
    locationBackground: "granted" | "denied" | "undetermined";
    notifications: "granted" | "denied" | "undetermined";
    /** Android: pil optimizasyonu kapalı mı (requestIgnoreBatteryOptimizations) — bilinmiyorsa null */
    batteryOptimizationDisabled: boolean | null;
}

/**
 * Tüm kritik izinlerin anlık durumunu döner.
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
    const result: PermissionStatus = {
        locationForeground: "undetermined",
        locationBackground: "undetermined",
        notifications: "undetermined",
        batteryOptimizationDisabled: null,
    };

    try {
        const fg = await Location.getForegroundPermissionsAsync();
        result.locationForeground = fg.status === "granted" ? "granted" : fg.status === "denied" ? "denied" : "undetermined";

        if (Platform.OS === "android") {
            const bg = await Location.getBackgroundPermissionsAsync();
            result.locationBackground = bg.status === "granted" ? "granted" : bg.status === "denied" ? "denied" : "undetermined";
        } else {
            result.locationBackground = result.locationForeground;
        }
    } catch {
        // ignore
    }

    try {
        const { status } = await Notifications.getPermissionsAsync();
        result.notifications = status === Notifications.PermissionStatus.GRANTED ? "granted" : status === Notifications.PermissionStatus.DENIED ? "denied" : "undetermined";
    } catch {
        // ignore
    }

    return result;
}

/**
 * Konum (Her Zaman) — Önce ön plan, ardından arka plan izni ister; reddedilirse ayarları açar.
 */
export async function requestLocationAlwaysAndOpenSettingsIfNeeded(): Promise<boolean> {
    try {
        const { status: fg } = await Location.requestForegroundPermissionsAsync();
        if (fg !== "granted") {
            await Linking.openSettings();
            return false;
        }
        if (Platform.OS === "android") {
            const { status: bg } = await Location.requestBackgroundPermissionsAsync();
            if (bg !== "granted") {
                await Linking.openSettings();
                return false;
            }
        }
        return true;
    } catch (err) {
        console.warn("[Permission] Konum hatası:", err);
        await Linking.openSettings();
        return false;
    }
}

/**
 * Pil optimizasyonunu devre dışı bırakma sayfasını açar (Android).
 * Intent: android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
    if (Platform.OS !== "android") return;
    try {
        const opened = await Linking.canOpenURL("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
        if (opened) {
            await Linking.openURL("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
        } else {
            await Linking.openSettings();
        }
    } catch {
        await Linking.openSettings();
    }
}

/**
 * Uygulama ayarlarını açar (Sensör / Fiziksel aktivite izni için kullanıcı manuel kontrol edebilir).
 */
export async function openAppSettings(): Promise<void> {
    try {
        await Linking.openSettings();
    } catch (err) {
        console.warn("[Permission] Ayarlar açılamadı:", err);
    }
}

/**
 * Bildirim izni ister; kritik kanal için Notifee kullanılıyorsa kanal oluşturulur (earthquakeAlarm içinde).
 */
export async function requestCriticalNotificationAndOpenSettingsIfNeeded(): Promise<boolean> {
    try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== Notifications.PermissionStatus.GRANTED) {
            await Linking.openSettings();
            return false;
        }
        return true;
    } catch (err) {
        console.warn("[Permission] Bildirim hatası:", err);
        await Linking.openSettings();
        return false;
    }
}

/**
 * İzin kartına tıklandığında ilgili sistem ayarına/sayfaya yönlendirir.
 */
export async function openPermissionSystemScreen(permissionId: PermissionId): Promise<void> {
    switch (permissionId) {
        case "location_always":
            await requestLocationAlwaysAndOpenSettingsIfNeeded();
            break;
        case "battery_optimization":
            await openBatteryOptimizationSettings();
            break;
        case "sensor_activity":
            await openAppSettings();
            break;
        case "critical_notification":
            await requestCriticalNotificationAndOpenSettingsIfNeeded();
            break;
        default:
            await openAppSettings();
    }
}

/**
 * Kritik izinler verilmeden ana ekrana geçiş yapılabilir mi? (Uyarı göstermek için kullanılır)
 */
export async function hasCriticalPermissionsForWarning(): Promise<{ ok: boolean; missing: string[] }> {
    const status = await getPermissionStatus();
    const missing: string[] = [];
    if (status.locationForeground !== "granted") missing.push("Konum");
    if (status.notifications !== "granted") missing.push("Bildirim");
    return { ok: missing.length === 0, missing };
}
