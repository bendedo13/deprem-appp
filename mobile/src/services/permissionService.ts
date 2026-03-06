/**
 * Permission Service — İzin yönetimi ve durumu takibi.
 *
 * Tüm izinler tek bir yerden yönetilir.
 * İzin reddedilirse uygulama çökmez — ilgili özellik devre dışı bırakılır.
 *
 * Yönetilen izinler:
 * 1. Konum (foreground + background)
 * 2. Bildirimler
 * 3. SMS gönderme
 * 4. Kamera (flaş)
 */

import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { Camera } from "expo-camera";
import * as SMS from "expo-sms";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Linking } from "react-native";

// ── Tipler ───────────────────────────────────────────────────────────────────
export type PermissionType = "location" | "notifications" | "sms" | "camera" | "backgroundLocation";

export type PermissionStatus = "granted" | "denied" | "undetermined";

export interface PermissionState {
    location: PermissionStatus;
    backgroundLocation: PermissionStatus;
    notifications: PermissionStatus;
    sms: PermissionStatus;
    camera: PermissionStatus;
}

const ONBOARDING_DONE_KEY = "onboarding_permissions_done";
const PERMISSION_STATE_KEY = "permission_state_cache";

const DEFAULT_STATE: PermissionState = {
    location: "undetermined",
    backgroundLocation: "undetermined",
    notifications: "undetermined",
    sms: "undetermined",
    camera: "undetermined",
};

// ── Tek Tek İzin İsteme ──────────────────────────────────────────────────────

/**
 * Konum izni iste (foreground).
 */
export async function requestLocationPermission(): Promise<PermissionStatus> {
    try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        return status === "granted" ? "granted" : "denied";
    } catch {
        return "denied";
    }
}

/**
 * Arka plan konum izni iste.
 */
export async function requestBackgroundLocationPermission(): Promise<PermissionStatus> {
    try {
        // Önce foreground izin gerekli
        const fg = await Location.getForegroundPermissionsAsync();
        if (fg.status !== "granted") {
            const fgReq = await Location.requestForegroundPermissionsAsync();
            if (fgReq.status !== "granted") return "denied";
        }

        const { status } = await Location.requestBackgroundPermissionsAsync();
        return status === "granted" ? "granted" : "denied";
    } catch {
        return "denied";
    }
}

/**
 * Bildirim izni iste.
 */
export async function requestNotificationPermission(): Promise<PermissionStatus> {
    try {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === "granted" ? "granted" : "denied";
    } catch {
        return "denied";
    }
}

/**
 * SMS erişilebilirliğini kontrol et.
 * Not: SMS için OS seviyesinde izin istenmez, cihaz desteği kontrol edilir.
 */
export async function checkSmsAvailability(): Promise<PermissionStatus> {
    try {
        const available = await SMS.isAvailableAsync();
        return available ? "granted" : "denied";
    } catch {
        return "denied";
    }
}

/**
 * Kamera (flaş) izni iste.
 */
export async function requestCameraPermission(): Promise<PermissionStatus> {
    try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        return status === "granted" ? "granted" : "denied";
    } catch {
        return "denied";
    }
}

// ── Toplu İzin Kontrol ──────────────────────────────────────────────────────

/**
 * Tüm izinlerin mevcut durumunu kontrol et (istemeden).
 */
export async function checkAllPermissions(): Promise<PermissionState> {
    const state: PermissionState = { ...DEFAULT_STATE };

    try {
        const locFg = await Location.getForegroundPermissionsAsync();
        state.location = locFg.status === "granted" ? "granted" : locFg.canAskAgain ? "undetermined" : "denied";
    } catch {
        state.location = "denied";
    }

    try {
        const locBg = await Location.getBackgroundPermissionsAsync();
        state.backgroundLocation = locBg.status === "granted" ? "granted" : locBg.canAskAgain ? "undetermined" : "denied";
    } catch {
        state.backgroundLocation = "denied";
    }

    try {
        const notif = await Notifications.getPermissionsAsync();
        state.notifications = notif.status === "granted" ? "granted" : notif.canAskAgain ? "undetermined" : "denied";
    } catch {
        state.notifications = "denied";
    }

    try {
        const smsOk = await SMS.isAvailableAsync();
        state.sms = smsOk ? "granted" : "denied";
    } catch {
        state.sms = "denied";
    }

    try {
        const cam = await Camera.getCameraPermissionsAsync();
        state.camera = cam.status === "granted" ? "granted" : cam.canAskAgain ? "undetermined" : "denied";
    } catch {
        state.camera = "denied";
    }

    // Cache'e kaydet
    await AsyncStorage.setItem(PERMISSION_STATE_KEY, JSON.stringify(state));
    return state;
}

/**
 * Cache'li izin durumunu oku (hızlı).
 */
export async function getCachedPermissions(): Promise<PermissionState> {
    try {
        const raw = await AsyncStorage.getItem(PERMISSION_STATE_KEY);
        if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_STATE;
}

// ── Onboarding ──────────────────────────────────────────────────────────────

/**
 * Onboarding tamamlandı mı?
 */
export async function isOnboardingDone(): Promise<boolean> {
    const val = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
    return val === "true";
}

/**
 * Onboarding'i tamamlandı olarak işaretle.
 */
export async function markOnboardingDone(): Promise<void> {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
}

/**
 * Ayarlar'a yönlendir (izin reddedildiğinde).
 */
export function openAppSettings(): void {
    if (Platform.OS === "ios") {
        Linking.openURL("app-settings:");
    } else {
        Linking.openSettings();
    }
}
