/**
 * SOS Alert Servisi — Deprem anında veya manuel SOS'ta çalışır.
 *
 * Akış:
 *  1. GPS konumunu al (timeout: 10 sn)
 *  2. Backend'e POST /api/v1/users/me/safe gönder (özel SOS mesajı)
 *     → Backend Twilio ile acil kişilere SMS + WhatsApp gönderir
 *  3. Başarısız olursa 3 kez yeniden dene (1s, 2s, 4s backoff)
 *
 * GÜVENLİK: Twilio credentials ASLA mobil uygulamaya koyulmamalı.
 * Tüm SMS/WhatsApp işlemleri backend'de yapılır.
 *
 * .env (BACKEND) ayarları:
 *   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
 */

import * as Location from "expo-location";
import { api } from "./api";

export interface SOSResult {
    success: boolean;
    notifiedContacts: number;
    location: { latitude: number; longitude: number } | null;
    error?: string;
    /** Backend'den dönen kanal bilgisi (raporlama için) */
    sms_sent?: number;
    whatsapp_sent?: number;
    channel_used?: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

/** Exponential backoff ile bekle */
async function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

const LOCATION_TIMEOUT_MS = 10_000;

/** Mevcut GPS konumunu al — yüksek doğruluk, 10 sn timeout. S.O.S mesajında canlı konum kritik. */
async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return null;

        const pos = await Promise.race([
            Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                maximumAge: 5000,
            }),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("LOCATION_TIMEOUT")), LOCATION_TIMEOUT_MS)
            ),
        ]);
        return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (err) {
        if ((err as Error).message === "LOCATION_TIMEOUT") {
            return null;
        }
        return null;
    }
}

/** Google Maps linki oluştur */
function buildMapsLink(lat: number, lng: number): string {
    return `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/**
 * SOS mesajını backend'e gönderir — retry logic ile.
 *
 * @param trigger - "sensor" (otomatik deprem algılama) veya "manual" (kullanıcı butonu)
 * @param customMessage - İsteğe bağlı ek mesaj
 */
export async function sendSOSAlert(
    trigger: "sensor" | "manual",
    customMessage?: string
): Promise<SOSResult> {
    // Konum al
    const location = await getCurrentLocation();

    // Mesaj formatla
    let message: string;
    if (trigger === "sensor") {
        message = "⚠️ ACİL: Telefonum deprem sinyali algıladı!";
    } else {
        message = "🆘 ACİL DURUM: Yardıma ihtiyacım var!";
    }

    if (location) {
        message += `\n📍 Konumum: ${buildMapsLink(location.latitude, location.longitude)}`;
    }

    if (customMessage) {
        message += `\nNot: ${customMessage}`;
    }

    let lastError: string = "Bilinmeyen hata";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const { data } = await api.post<{
                status: string;
                notified_contacts?: number;
                message?: string;
                detail?: string;
                channel_used?: string;
                sms_sent?: number;
                whatsapp_sent?: number;
            }>(
                "/api/v1/users/i-am-safe",
                {
                    custom_message: message,
                    latitude: location?.latitude ?? null,
                    longitude: location?.longitude ?? null,
                    include_location: !!location,
                    channel: "hybrid",
                },
                { timeout: 15_000 }
            );

            const notified = data.notified_contacts ?? 0;
            const backendMsg = [data.message, data.detail].find((m) => typeof m === "string") as string | undefined;
            if (data.status === "error" && backendMsg) {
                lastError = backendMsg;
                if (attempt === MAX_RETRIES - 1) {
                    return { success: false, notifiedContacts: 0, location, error: backendMsg };
                }
                continue;
            }
            return {
                success: true,
                notifiedContacts: notified,
                location,
                sms_sent: data.sms_sent,
                whatsapp_sent: data.whatsapp_sent,
                channel_used: data.channel_used,
            };
        } catch (err: unknown) {
            const axErr = err as { response?: { data?: unknown; status: number }; message?: string };
            const body = axErr.response?.data;
            const errMsg =
                (typeof body === "object" && body !== null && "detail" in body
                    ? String((body as { detail: unknown }).detail)
                    : null) ??
                axErr.message ??
                "İstek başarısız";
            lastError = errMsg;

            if (attempt < MAX_RETRIES - 1) {
                await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
            }
        }
    }

    return {
        success: false,
        notifiedContacts: 0,
        location,
        error: lastError,
    };
}
