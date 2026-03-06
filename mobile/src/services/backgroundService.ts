/**
 * Background/Foreground Service — Kesintisiz arka plan sensör servisi.
 *
 * Android: Foreground Service + sticky notification ile OS tarafından
 *          öldürülmeyi engeller. Kalıcı bildirim kullanıcıya gösterilir.
 * iOS:     Background fetch + processing task ile periyodik çalışma.
 *
 * Kullanılan kütüphaneler:
 *   - expo-notifications (sticky notification)
 *   - expo-task-manager + expo-background-fetch (arka plan görev)
 *   - @react-native-async-storage/async-storage (durum saklama)
 */

import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, AppState, AppStateStatus } from "react-native";

// ── Sabitler ─────────────────────────────────────────────────────────────────
export const BACKGROUND_SENSOR_TASK = "QUAKESENSE_BG_SENSOR_TASK";
export const BG_NOTIFICATION_CHANNEL = "seismic-monitor";
export const BG_STATUS_KEY = "bg_sensor_active";
const STICKY_NOTIFICATION_ID = "quakesense-bg-sticky";

// ── Notification Handler ─────────────────────────────────────────────────────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.LOW,
    }),
});

// ── Background Task Tanımla ──────────────────────────────────────────────────
/**
 * TaskManager task — modül seviyesinde tanımlanmalı.
 * app/_layout.tsx'ten import edilerek app bundle yüklendiğinde çağrılır.
 */
export function defineBackgroundSensorTask(): void {
    if (TaskManager.isTaskDefined(BACKGROUND_SENSOR_TASK)) return;

    TaskManager.defineTask(BACKGROUND_SENSOR_TASK, async () => {
        try {
            const status = await AsyncStorage.getItem(BG_STATUS_KEY);
            if (status !== "active") {
                return BackgroundFetch.BackgroundFetchResult.NoData;
            }
            // Heartbeat güncelle — servisin hala çalıştığını kanıtlar
            await AsyncStorage.setItem("bg_last_heartbeat", new Date().toISOString());
            return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch {
            return BackgroundFetch.BackgroundFetchResult.Failed;
        }
    });
}

// ── Android Notification Channel ─────────────────────────────────────────────
async function ensureNotificationChannel(): Promise<void> {
    if (Platform.OS !== "android") return;

    await Notifications.setNotificationChannelAsync(BG_NOTIFICATION_CHANNEL, {
        name: "Deprem İzleme Servisi",
        importance: Notifications.AndroidImportance.LOW,
        description: "Erken uyarı sistemi arka planda çalışırken gösterilir.",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: false,
        showBadge: false,
        sound: undefined,
    });
}

// ── Sticky Notification Göster ───────────────────────────────────────────────
async function showStickyNotification(): Promise<void> {
    await ensureNotificationChannel();

    // Mevcut sticky bildirimi temizle
    try {
        await Notifications.dismissNotificationAsync(STICKY_NOTIFICATION_ID);
    } catch {
        // İlk seferde bildirim yoksa hata verebilir — yoksay
    }

    await Notifications.scheduleNotificationAsync({
        identifier: STICKY_NOTIFICATION_ID,
        content: {
            title: "QuakeSense Koruma Aktif",
            body: "Erken uyarı sistemi arka planda çalışıyor. Deprem algılama sensörü izleniyor.",
            data: { type: "bg_sensor_sticky" },
            sticky: true,
            priority: Notifications.AndroidNotificationPriority.LOW,
            ...(Platform.OS === "android"
                ? { channelId: BG_NOTIFICATION_CHANNEL }
                : {}),
        },
        trigger: null, // Anında göster
    });
}

// ── Sticky Notification Gizle ────────────────────────────────────────────────
async function hideStickyNotification(): Promise<void> {
    try {
        await Notifications.dismissNotificationAsync(STICKY_NOTIFICATION_ID);
    } catch {
        // Bildirim zaten yoksa hata verme
    }
}

// ── Background Fetch Kayıt ───────────────────────────────────────────────────
async function registerBackgroundFetch(): Promise<void> {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_SENSOR_TASK
        );
        if (isRegistered) return;

        await BackgroundFetch.registerTaskAsync(BACKGROUND_SENSOR_TASK, {
            minimumInterval: 60, // 60 saniye (OS minimum ~15 dk olabilir)
            stopOnTerminate: false,
            startOnBoot: true,
        });
    } catch {
        // Background fetch desteklenmiyorsa sessizce devam et
    }
}

// ── Background Fetch İptal ───────────────────────────────────────────────────
async function unregisterBackgroundFetch(): Promise<void> {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_SENSOR_TASK
        );
        if (!isRegistered) return;
        await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SENSOR_TASK);
    } catch {
        // Sessizce devam et
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Arka plan sensör servisini başlat.
 * - Sticky notification gösterir (Android foreground service etkisi)
 * - Background fetch task kaydeder
 * - Status'u AsyncStorage'a yazar
 */
export async function startBackgroundSensorService(): Promise<void> {
    await AsyncStorage.setItem(BG_STATUS_KEY, "active");
    await showStickyNotification();
    await registerBackgroundFetch();
}

/**
 * Arka plan sensör servisini durdur.
 * - Sticky notification kaldırır
 * - Background fetch iptal eder
 * - Status'u temizler
 */
export async function stopBackgroundSensorService(): Promise<void> {
    await AsyncStorage.setItem(BG_STATUS_KEY, "inactive");
    await hideStickyNotification();
    await unregisterBackgroundFetch();
}

/**
 * Servis şu anda aktif mi?
 */
export async function isBackgroundServiceActive(): Promise<boolean> {
    const status = await AsyncStorage.getItem(BG_STATUS_KEY);
    return status === "active";
}

/**
 * App state değişikliklerini dinleyerek arka plan geçişlerinde
 * sticky notification'ı günceller.
 * Kullanım: useEffect içinde cleanup fonksiyonu olarak döner.
 */
export function setupAppStateListener(): () => void {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
        const isActive = await isBackgroundServiceActive();
        if (!isActive) return;

        if (nextState === "background" || nextState === "inactive") {
            await showStickyNotification();
        }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
}

/**
 * Son heartbeat zamanını döner (debug/monitoring için).
 */
export async function getLastHeartbeat(): Promise<string | null> {
    return AsyncStorage.getItem("bg_last_heartbeat");
}
