/**
 * Deprem Simülasyon Servisi — Uçtan Uca Alarm Pipeline Testi
 *
 * M6.0 büyüklüğünde sahte bir sismik sinyal oluşturur ve gerçek alarm
 * pipeline'ını tetikler. Geliştirme ve kalite kontrol amaçlıdır.
 *
 * Test Adımları:
 *  [1] Ses Modu  — expo-av ile iOS silent mode bypass (sessizde de çalar)
 *  [2] Titreşim  — Vibration API, sismik dalga paterni
 *  [3] Flaş      — expo-camera gerektirir (kurulum notu aşağıda)
 *  [4] Bildirim  — Notifee full-screen intent, yüksek öncelik
 *  [5] Oto SOS   — Twilio SMS/WhatsApp, 3 deneme + exponential backoff
 *
 * FLAŞ KURULUMU (opsiyonel):
 *  1. yarn add expo-camera
 *  2. app.json > plugins > ["expo-camera"] ekle
 *  3. Bu dosyada tryFlashControl() içindeki yorumları kaldır
 */

import { Vibration } from "react-native";

/** expo-av güvenli yükleme — undefined modül crash'ini önler */
let AudioModule: typeof import("expo-av").Audio | null = null;
try {
    const expoAv = require("expo-av");
    if (expoAv?.Audio && typeof expoAv.Audio.setAudioModeAsync === "function") {
        AudioModule = expoAv.Audio;
    }
} catch {
    console.warn("[Simulation] expo-av yüklenemedi, ses modu atlanacak");
}

import { showEarthquakeAlarm } from "./earthquakeAlarm";
import { sendSOSAlert } from "./sosAlertService";
import { startCriticalAlarm, stopCriticalAlarm } from "./criticalAlarmService";

export interface SimulationResult {
    notificationSent: boolean;
    sosSent: boolean;
    sosContacts: number;
    soundPlayed: boolean;
    vibrated: boolean;
    error?: string;
}

// ── Adım 1: Ses Modu Yapılandırması ────────────────────────────────────────────

/**
 * iOS "Ring/Silent" anahtarını ve Android ses profilini bypass eder.
 * Bu ayar ile telefon tamamen sessizde olsa bile bildirim sesi çalar.
 */
async function configureSilentModeBypass(): Promise<boolean> {
    if (!AudioModule || typeof AudioModule.setAudioModeAsync !== "function") {
        console.warn("[Simulation] [1/5] ✗ expo-av Audio modülü yok, ses modu atlandı");
        return false;
    }
    try {
        await AudioModule.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,   // ← Ana özellik: sessiz modda çalar
            staysActiveInBackground: true, // ← Arka planda ses aktif kalır
            shouldDuckAndroid: false,      // ← Diğer sesleri kısmaz, tam ses
        });
        console.log("[Simulation] [1/5] ✓ Ses modu yapılandırıldı");
        console.log("[Simulation]   → iOS silent switch: BYPASS");
        console.log("[Simulation]   → Android DND: BYPASS (bypassDnd notifee kanalında aktif)");
        return true;
    } catch (err) {
        console.warn("[Simulation] [1/5] ✗ Ses modu yapılandırılamadı:", err);
        return false;
    }
}

// ── Adım 2: Titreşim ──────────────────────────────────────────────────────────

/**
 * Maksimum güçte kesintisiz titreşim — nükleer alarm için.
 */
export function triggerMaxVibration(): void {
    try {
        if (typeof Vibration?.vibrate === "function") {
            Vibration.vibrate([0, 500, 200, 500, 200, 500], true);
        }
    } catch {
        /* ignore */
    }
}

/**
 * Sismik P-dalgası + S-dalgası paternini taklit eden titreşim.
 * Pattern: [bekle_ms, titre_ms, dur_ms, ...] şeklinde
 *  - Başlangıç: hafif P-dalgası
 *  - Zirve: güçlü S-dalgası
 *  - Azalma: artçı sarsıntı
 */
function triggerVibration(): void {
    try {
        if (typeof Vibration?.vibrate !== "function") {
            console.warn("[Simulation] [2/5] ✗ Vibration API yok");
            return;
        }
        const pattern = [
        0,         // hemen başla
        150, 100,  // P-dalgası: hafif
        200, 80,   // P→S geçiş
        350, 80,   // S-dalgası: orta
        400, 60,   // S-dalgası: güçlü
        400, 60,   // S-dalgası: zirve
        300, 80,   // azalma
        200, 100,  // artçı
        150,       // son titre
    ];
    Vibration.vibrate(pattern, false);
    console.log("[Simulation] [2/5] ✓ Titreşim başlatıldı (sismik dalga paterni)");
    } catch (err) {
        console.warn("[Simulation] [2/5] ✗ Titreşim hatası:", err);
    }
}

// ── Adım 3: Flaş ──────────────────────────────────────────────────────────────

/**
 * Torch (flaş) kontrolü.
 * ŞU AN: expo-camera kurulu olmadığı için sadece log.
 * KURULUM: expo-camera eklenince aşağıdaki yorumları kaldırın.
 */
async function tryFlashControl(enabled: boolean): Promise<void> {
    if (!enabled) {
        console.log("[Simulation] [3/5] Flaş devre dışı — atlandı");
        return;
    }

    console.log("[Simulation] [3/5] ℹ️  Flaş kontrolü — expo-camera gerektirir");
    console.log("[Simulation]   Kurulum:");
    console.log("[Simulation]   1. yarn add expo-camera");
    console.log("[Simulation]   2. app.json > plugins > ['expo-camera']");
    console.log("[Simulation]   3. simulationService.ts > tryFlashControl() yorumları kaldır");

    // expo-camera kurulunca etkinleştir:
    // import { Camera } from "expo-camera";
    // const { status } = await Camera.requestCameraPermissionsAsync();
    // if (status !== "granted") return;
    // for (let i = 0; i < 6; i++) {
    //     await new Promise(r => setTimeout(r, 300));
    //     // Torch on/off — native module üzerinden
    // }
}

// ── Adım 4: Kritik Bildirim ────────────────────────────────────────────────────

/**
 * Notifee ile full-screen intent (tam ekran alarm) gönderir.
 * Android: Full Screen Intent, kilit ekranını geçerek açılır.
 * iOS: Banner + ses (foreground/background her ikisinde de çalışır).
 */
async function sendCriticalNotification(): Promise<boolean> {
    try {
        await showEarthquakeAlarm({
            type: "EARTHQUAKE_CONFIRMED",
            latitude: "41.0082",       // İstanbul örnek koordinatı
            longitude: "28.9784",
            timestamp: new Date().toISOString(),
            device_count: "SIM-TEST",
        });
        console.log("[Simulation] [4/5] ✓ Kritik bildirim gönderildi");
        console.log("[Simulation]   → Başlık: '⚠️ Deprem doğrulandı'");
        console.log("[Simulation]   → Android full-screen intent: aktif");
        console.log("[Simulation]   → Ses: maksimum (silent mode bypass ile)");
        return true;
    } catch (err) {
        console.warn("[Simulation] [4/5] ✗ Bildirim hatası:", err);
        return false;
    }
}

// ── Adım 5: Otomatik SOS ──────────────────────────────────────────────────────

/**
 * Backend üzerinden Twilio SMS + WhatsApp gönderir.
 * sendSOSAlert içinde 3 deneme + exponential backoff vardır.
 * Tüm işlemler backend'de yapılır — Twilio credentials mobilede YOK.
 */
async function sendAutoSOS(): Promise<{ success: boolean; contacts: number; error?: string }> {
    console.log("[Simulation] [5/5] Otomatik SOS başlatılıyor...");
    console.log("[Simulation]   → POST /api/v1/users/me/safe");
    console.log("[Simulation]   → Twilio: SMS + WhatsApp");
    console.log("[Simulation]   → Retry: 3 deneme, exponential backoff (1s, 2s, 4s)");

    try {
        const result = await sendSOSAlert(
            "sensor",
            "SIMÜLASYON TEST — Otomatik SOS test mesajı. Gerçek bir acil durum değildir."
        );

        if (result.success) {
            console.log(`[Simulation] [5/5] ✓ SOS başarıyla gönderildi`);
            console.log(`[Simulation]   → Bildirilen kişi sayısı: ${result.notifiedContacts}`);
            if (result.location) {
                const { latitude, longitude } = result.location;
                console.log(`[Simulation]   → GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                console.log(`[Simulation]   → Harita: https://maps.google.com/?q=${latitude},${longitude}`);
            }
            console.log("[Simulation]   → Twilio: SMS/WhatsApp iletildi (backend log kontrol edin)");
            return { success: true, contacts: result.notifiedContacts };
        } else {
            console.warn(`[Simulation] [5/5] ✗ SOS başarısız: ${result.error}`);
            return { success: false, contacts: 0, error: result.error };
        }
    } catch (err) {
        const msg = String(err);
        console.warn("[Simulation] [5/5] ✗ SOS exception:", msg);
        return { success: false, contacts: 0, error: msg };
    }
}

// ── Sadece Alarm (SOS olmadan) — Geri sayım testi için ─────────────────────────

export interface AlarmOnlyResult {
    soundPlayed: boolean;
    vibrated: boolean;
    notificationSent: boolean;
    error?: string;
}

/** Hibrit test sonucu: alarm + gerçek SOS test mesajı + Twilio raporu */
export interface HybridTestResult {
    soundPlayed: boolean;
    vibrated: boolean;
    notificationSent: boolean;
    sosSent: boolean;
    notifiedContacts: number;
    smsSent: number;
    whatsappSent: number;
    channelUsed: string;
    location: { latitude: number; longitude: number } | null;
    error?: string;
}

/**
 * Hibrit sensör testi: ivmeölçer simülasyonu + gerçek "TEST MESAJI" (Konum + Bu bir testtir) acil kişilere gönderilir.
 * Test bitiminde ses, titreşim, bildirim ve Twilio SMS/WhatsApp başarı durumu raporlanır.
 */
export async function runHybridSensorTest(options: {
    loudAlarmEnabled: boolean;
    vibrationEnabled: boolean;
    flashEnabled: boolean;
}): Promise<HybridTestResult> {
    const result: HybridTestResult = {
        soundPlayed: false,
        vibrated: false,
        notificationSent: false,
        sosSent: false,
        notifiedContacts: 0,
        smsSent: 0,
        whatsappSent: 0,
        channelUsed: "none",
        location: null,
    };

    try {
        if (options.loudAlarmEnabled) {
            result.soundPlayed = await configureSilentModeBypass();
        }
        if (options.vibrationEnabled) {
            try {
                triggerVibration();
                result.vibrated = true;
            } catch (e) {
                result.error = (e as Error).message;
            }
        }
        result.notificationSent = await sendCriticalNotification();

        const sosResult = await sendSOSAlert(
            "sensor",
            "Bu bir testtir. Konum + test mesajı — gerçek acil durum değildir."
        );
        result.sosSent = sosResult.success;
        result.notifiedContacts = sosResult.notifiedContacts;
        result.location = sosResult.location;
        result.smsSent = sosResult.sms_sent ?? 0;
        result.whatsappSent = sosResult.whatsapp_sent ?? 0;
        result.channelUsed = sosResult.channel_used ?? "none";
        if (sosResult.error) {
            result.error = result.error ? `${result.error}; ${sosResult.error}` : sosResult.error;
        }
    } catch (err) {
        result.error = (err as Error).message;
    }
    return result;
}

/**
 * Sadece ses + titreşim + bildirim; SOS göndermez.
 * Sensör testi akışında önce bu çalışır, ekranda 10..9..8 geri sayımı bitince SOS ayrı çağrılır.
 */
export async function runAlarmOnlyWithoutSOS(options: {
    loudAlarmEnabled: boolean;
    vibrationEnabled: boolean;
    flashEnabled: boolean;
}): Promise<AlarmOnlyResult> {
    const result: AlarmOnlyResult = {
        soundPlayed: false,
        vibrated: false,
        notificationSent: false,
    };
    try {
        if (options.loudAlarmEnabled) {
            result.soundPlayed = await configureSilentModeBypass();
        }
        if (options.vibrationEnabled) {
            try {
                triggerVibration();
                result.vibrated = true;
            } catch (e) {
                result.error = (e as Error).message;
            }
        }
        result.notificationSent = await sendCriticalNotification();
    } catch (err) {
        result.error = (err as Error).message;
    }
    return result;
}

// ── Ana Simülasyon Fonksiyonu ──────────────────────────────────────────────────

/**
 * Tam deprem simülasyonunu başlatır.
 * Tüm adımlar try-catch ile korunur — bir adım başarısız olursa diğerleri çalışmaya devam eder.
 *
 * @param options - Hangi özelliklerin aktif olduğu (ayarlardan okunur)
 * @returns SimulationResult — her adımın başarı durumu
 */
export async function startEarthquakeSimulation(options: {
    flashEnabled: boolean;
    loudAlarmEnabled: boolean;
    vibrationEnabled: boolean;
    sendSOS?: boolean;
}): Promise<SimulationResult> {
    console.log("\n[Simulation] ╔═══════════════════════════════════════════╗");
    console.log("[Simulation] ║      DEPREM SİMÜLASYONU BAŞLADI          ║");
    console.log("[Simulation] ╚═══════════════════════════════════════════╝");
    console.log("[Simulation] Simüle edilen büyüklük : M6.0");
    console.log("[Simulation] STA/LTA oranı          : ~8.5 (eşik: 5.0)");
    console.log("[Simulation] Seçenekler             :", JSON.stringify(options));
    console.log("[Simulation] ─────────────────────────────────────────────");

    const result: SimulationResult = {
        notificationSent: false,
        sosSent: false,
        sosContacts: 0,
        soundPlayed: false,
        vibrated: false,
    };

    // [1] Ses Modu
    if (options.loudAlarmEnabled) {
        result.soundPlayed = await configureSilentModeBypass();
    } else {
        console.log("[Simulation] [1/5] Ses devre dışı — atlandı");
    }

    // [2] Titreşim
    if (options.vibrationEnabled) {
        try {
            triggerVibration();
            result.vibrated = true;
        } catch (err) {
            console.warn("[Simulation] [2/5] ✗ Titreşim hatası:", err);
        }
    } else {
        console.log("[Simulation] [2/5] Titreşim devre dışı — atlandı");
    }

    // [3] Flaş
    await tryFlashControl(options.flashEnabled);

    // [4] Kritik Bildirim
    result.notificationSent = await sendCriticalNotification();
    if (!result.notificationSent && !result.error) {
        result.error = "Bildirim gönderilemedi";
    }

    // [5] Otomatik SOS
    if (options.sendSOS !== false) {
        const sos = await sendAutoSOS();
        result.sosSent = sos.success;
        result.sosContacts = sos.contacts;
        if (!sos.success && !result.error) {
            result.error = sos.error;
        }
    } else {
        console.log("[Simulation] [5/5] SOS devre dışı — atlandı");
    }

    console.log("[Simulation] ─────────────────────────────────────────────");
    console.log("[Simulation] ╔═══════════════════════════════════════════╗");
    console.log("[Simulation] ║       SİMÜLASYON TAMAMLANDI              ║");
    console.log("[Simulation] ╚═══════════════════════════════════════════╝");
    console.log("[Simulation] Sonuç:", JSON.stringify(result, null, 2));
    console.log("[Simulation] Backend logları için: docker compose logs -f backend\n");

    return result;
}

// ── 15 Saniyelik "Nasıl Çalışır?" Simülasyonu ───────────────────────────────────

export type Phase15 = "idle" | "detecting" | "alarm" | "sending" | "done";

export interface Run15SecondResult {
    phase: Phase15;
    sosSent: boolean;
    notifiedContacts: number;
    error?: string;
}

/**
 * 15 saniyelik test akışı:
 *  5sn algılama simülasyonu → 5sn tam ekran alarm + yüksek ses → 5sn "BU BİR TESTTİR" Twilio
 *
 * @param onPhaseChange - Her faz değişiminde çağrılır (UI güncellemesi için)
 * @param abortRef - { current: true } yapılırsa simülasyon anında durur
 * @param options - Ses, titreşim ayarları
 */
export async function run15SecondTest(
    onPhaseChange: (phase: Phase15) => void,
    abortRef: { current: boolean },
    options: { loudAlarmEnabled: boolean; vibrationEnabled: boolean }
): Promise<Run15SecondResult> {
    const result: Run15SecondResult = { phase: "idle", sosSent: false, notifiedContacts: 0 };

    const sleep = (ms: number) =>
        new Promise<void>((resolve) => {
            const start = Date.now();
            const check = () => {
                if (abortRef.current) return resolve();
                if (Date.now() - start >= ms) return resolve();
                setTimeout(check, 100);
            };
            check();
        });

    try {
        onPhaseChange("detecting");
        await sleep(5000);
        if (abortRef.current) return result;

        onPhaseChange("alarm");
        if (options.loudAlarmEnabled) await configureSilentModeBypass();
        if (options.vibrationEnabled) triggerMaxVibration();
        await startCriticalAlarm("41.0082", "28.9784");
        await sleep(5000);
        if (abortRef.current) {
            await stopCriticalAlarm();
            return result;
        }
        await stopCriticalAlarm();

        onPhaseChange("sending");
        const sosResult = await sendSOSAlert("sensor", "BU BİR TESTTİR");
        result.sosSent = sosResult.success;
        result.notifiedContacts = sosResult.notifiedContacts ?? 0;
        if (sosResult.error) result.error = sosResult.error;
        await sleep(5000);

        onPhaseChange("done");
        return result;
    } catch (err) {
        result.error = (err as Error).message;
        onPhaseChange("done");
        return result;
    }
}
