/**
 * Arka Plan Deprem İzleme Servisi
 *
 * Mimari:
 *  - Birincil: Firebase Cloud Messaging (FCM) — sunucu M4+ depremde push gönderir
 *  - Yedek: expo-background-fetch — FCM başarısız olursa periyodik API polling yapar
 *
 * Kısıtlar:
 *  - iOS: minimum 15 dakikada bir çalışır (OS kontrolü)
 *  - Android: ~5 dakikada bir çalışır
 *  - Accelerometer arka planda ÇALIŞMAZ (Expo managed workflow kısıtı)
 *    → Bunun için sunucu taraflı kümeleme + FCM kullanılır
 *
 * Kurulum için app.json'a eklenmesi gerekenler (Görev 10'da yapılır):
 *  "expo-background-fetch" ve "expo-task-manager" plugins listesine eklenmeli
 */

import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

export const BACKGROUND_EARTHQUAKE_TASK = "background-earthquake-check";
const LAST_EQ_ID_KEY = "bg_last_earthquake_id";
const MIN_MAGNITUDE_ALERT = 4.0;

/** API URL — app.json'dan oku */
function getApiUrl(): string {
    return (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://10.0.2.2:8001";
}

// ── Bildirim kanalı (Android) ───────────────────────────────────────────────
async function ensureNotificationChannel(): Promise<void> {
    await Notifications.setNotificationChannelAsync("earthquake-bg", {
        name: "Deprem Arka Plan Uyarıları",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
    });
}

// ── Yerel bildirim gönder ───────────────────────────────────────────────────
async function sendLocalEarthquakeNotification(
    magnitude: number,
    location: string,
    depth: number
): Promise<void> {
    await Notifications.scheduleNotificationAsync({
        content: {
            title: `⚠ M${magnitude.toFixed(1)} Deprem Algılandı`,
            body: `${location} · Derinlik: ${depth} km`,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            data: { type: "EARTHQUAKE_BG_POLL" },
        },
        trigger: null, // Hemen gönder
    });
}

// ── Arka plan görevi tanımı ─────────────────────────────────────────────────
TaskManager.defineTask(BACKGROUND_EARTHQUAKE_TASK, async () => {
    try {
        const baseUrl = getApiUrl();
        const token = await SecureStore.getItemAsync("deprem_access_token");

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(
            `${baseUrl}/api/v1/earthquakes/recent?limit=1&min_magnitude=${MIN_MAGNITUDE_ALERT}`,
            { headers, signal: AbortSignal.timeout(8000) }
        );

        if (!response.ok) return BackgroundFetch.BackgroundFetchResult.Failed;

        const data = await response.json() as { earthquakes?: Array<{ id: string; magnitude: number; location: string; depth: number }> };
        const earthquakes = data?.earthquakes ?? (Array.isArray(data) ? data : []);

        if (earthquakes.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData;

        const latest = earthquakes[0];
        const lastId = await SecureStore.getItemAsync(LAST_EQ_ID_KEY);

        if (latest.id === lastId) return BackgroundFetch.BackgroundFetchResult.NoData;

        // Yeni deprem — kaydet ve bildirim gönder
        await SecureStore.setItemAsync(LAST_EQ_ID_KEY, latest.id);
        await ensureNotificationChannel();
        await sendLocalEarthquakeNotification(latest.magnitude, latest.location, latest.depth);

        return BackgroundFetch.BackgroundFetchResult.NewData;

    } catch (err) {
        console.warn("[BackgroundEQ] Görev hatası:", err);
        return BackgroundFetch.BackgroundFetchResult.Failed;
    }
});

// ── Görevi kaydet (app başlangıcında çağrılır) ──────────────────────────────
export async function registerBackgroundEarthquakeTask(): Promise<void> {
    try {
        // Bildirim izni kontrolü
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
            console.warn("[BackgroundEQ] Bildirim izni yok, arka plan görevi kaydedilemiyor.");
            return;
        }

        // Görev zaten kayıtlıysa yeniden kaydetme
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_EARTHQUAKE_TASK);
        if (isRegistered) return;

        await BackgroundFetch.registerTaskAsync(BACKGROUND_EARTHQUAKE_TASK, {
            minimumInterval: 5 * 60, // 5 dakika (iOS minimum 15 dk'ya yükseltir)
            stopOnTerminate: false,  // Android: uygulama kapatılsa bile çalış
            startOnBoot: true,       // Android: telefon yeniden başlayınca başla
        });

        console.info("[BackgroundEQ] Arka plan görevi kaydedildi.");
    } catch (err) {
        // Simulator veya izin olmayan cihazlarda sessizce başarısız ol
        console.warn("[BackgroundEQ] Görev kaydedilemedi:", err);
    }
}

/** Görevi durdurur (kullanıcı devre dışı bırakmak isterse) */
export async function unregisterBackgroundEarthquakeTask(): Promise<void> {
    try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_EARTHQUAKE_TASK);
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(BACKGROUND_EARTHQUAKE_TASK);
        }
    } catch (err) {
        console.warn("[BackgroundEQ] Görev durdurulamadı:", err);
    }
}
