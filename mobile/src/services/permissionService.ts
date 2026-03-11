/**
 * İzin Yönetimi Servisi — Onboarding ve ayar yönlendirmeleri.
 * Her izin tipi için: önce sistem popup'ı ile iste,
 * reddedilirse veya popup açılamazsa ilgili Ayarlar sayfasına yönlendir.
 */

import { Platform, Linking } from "react-native";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

export type PermissionId =
    | "location_always"
    | "battery_optimization"
    | "sensor_activity"
    | "critical_notification"
    | "dnd_access";

export interface PermissionStatus {
    locationForeground: "granted" | "denied" | "undetermined";
    locationBackground: "granted" | "denied" | "undetermined";
    notifications: "granted" | "denied" | "undetermined";
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
        result.locationForeground =
            fg.status === "granted" ? "granted" : fg.status === "denied" ? "denied" : "undetermined";

        if (Platform.OS === "android") {
            const bg = await Location.getBackgroundPermissionsAsync();
            result.locationBackground =
                bg.status === "granted" ? "granted" : bg.status === "denied" ? "denied" : "undetermined";
        } else {
            result.locationBackground = result.locationForeground;
        }
    } catch {
        // ignore
    }

    try {
        const { status } = await Notifications.getPermissionsAsync();
        result.notifications =
            status === Notifications.PermissionStatus.GRANTED
                ? "granted"
                : status === Notifications.PermissionStatus.DENIED
                ? "denied"
                : "undetermined";
    } catch {
        // ignore
    }

    return result;
}

/**
 * Konum (Her Zaman) — Önce ön plan, ardından arka plan izni ister.
 * Reddedilirse Ayarlar sayfasına yönlendirir.
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
 * Android intent URI: android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS
 * App-spesifik: android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS + data
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
    if (Platform.OS !== "android") return;

    // Önce uygulama-özelinde pil istisnası sayfasını dene
    const appSpecificUri = `android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`;
    const genericUri = `android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS`;

    // expo-intent-launcher kullanılabilirse, daha derin yönlendirme yap
    try {
        const IntentLauncher = require("expo-intent-launcher");
        await IntentLauncher.startActivityAsync(
            "android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
            { data: "package:com.quakesense" }
        );
        return;
    } catch {
        // IntentLauncher yoksa Linking ile dene
    }

    try {
        const canOpen = await Linking.canOpenURL(genericUri);
        if (canOpen) {
            await Linking.openURL(genericUri);
        } else {
            await Linking.openSettings();
        }
    } catch {
        await Linking.openSettings();
    }
}

/**
 * DND (Rahatsız Etmeyin) politika erişim ayarlarını açar (Android).
 * Bu ayardan kullanıcı QuakeSense'e DND bypass yetkisi verebilir.
 */
export async function openDndPolicySettings(): Promise<void> {
    if (Platform.OS !== "android") return;

    // expo-intent-launcher kullanılabilirse kullan
    try {
        const IntentLauncher = require("expo-intent-launcher");
        await IntentLauncher.startActivityAsync(
            "android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS"
        );
        return;
    } catch {
        // IntentLauncher yoksa
    }

    try {
        await Linking.openURL("android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS");
    } catch {
        await Linking.openSettings();
    }
}

/**
 * Uygulama Ayarlarını açar.
 */
export async function openAppSettings(): Promise<void> {
    try {
        await Linking.openSettings();
    } catch (err) {
        console.warn("[Permission] Ayarlar açılamadı:", err);
    }
}

/**
 * Bildirim izni ister; reddedilirse Ayarlar açılır.
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
 * İzin kartına tıklandığında ilgili sistem sayfasına yönlendirir.
 * "request" mod: önce sistem popup'ı; "settings" mod: direkt ayarlar sayfası.
 */
export async function openPermissionSystemScreen(permissionId: PermissionId): Promise<void> {
    switch (permissionId) {
        case "location_always":
            await requestLocationAlwaysAndOpenSettingsIfNeeded();
            break;
        case "battery_optimization":
            await openBatteryOptimizationSettings();
            break;
        case "dnd_access":
            await openDndPolicySettings();
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
 * Kritik izin durumunu döner (onboarding ilerleme için kullanılır).
 */
export async function hasCriticalPermissionsForWarning(): Promise<{
    ok: boolean;
    missing: string[];
}> {
    const status = await getPermissionStatus();
    const missing: string[] = [];
    if (status.locationForeground !== "granted") missing.push("Location");
    if (status.notifications !== "granted") missing.push("Notifications");
    return { ok: missing.length === 0, missing };
}
