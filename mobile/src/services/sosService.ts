/**
 * S.O.S Servisi — Ses Kaydı Yükleme + Ben İyiyim Bildirimi
 *
 * Senkron zincir:
 *  uploadSOSAudio() → POST /api/v1/sos/audio (multipart/form-data)
 *    → Backend: Groq Whisper → Twilio Şelale → Anında sonuç
 *
 *  sendIAmSafe() → POST /api/v1/sos/safe
 *    → Backend: Twilio Şelale → "Ben İyiyim" mesajı
 *
 * Tüm hatalar try-catch ile yakalanır — uygulama ASLA çökmez.
 */

import * as FileSystem from "expo-file-system";
import { api } from "./api";

// ── Yanıt Tipleri ────────────────────────────────────────────────────────────

export interface SOSAudioResult {
    success: boolean;
    transcription: string;
    notifiedContacts: number;
    whatsappSent: number;
    smsSent: number;
    fallbackUsed: boolean;
    message: string;
    error?: string;
}

export interface SOSSafeResult {
    success: boolean;
    notifiedContacts: number;
    whatsappSent: number;
    smsSent: number;
    message: string;
    error?: string;
}

// Eski tip — geriye dönük uyumluluk için
export interface SOSAnalyzeResponse {
    task_id: string;
    status: string;
    message: string;
}

export interface SOSStatusResponse {
    status: "pending" | "processing" | "completed" | "failed";
    extracted_data?: {
        sos_id: string;
        durum: string;
        kisi_sayisi: number;
        aciliyet: string;
        lokasyon: string;
        orijinal_metin: string;
    };
    error_message?: string;
}

// ── Ses Dosyası Yükleme ───────────────────────────────────────────────────────

/**
 * S.O.S ses kaydını backend'e yükler ve Groq + Twilio işlemini tetikler.
 * Backend senkron çalışır — anında sonuç döner.
 *
 * @param audioUri   - expo-av kayıt URI (file://.../sos_audio.m4a)
 * @param latitude   - GPS enlem (null ise 0 gönderilir)
 * @param longitude  - GPS boylam (null ise 0 gönderilir)
 */
export async function uploadSOSAudio(
    audioUri: string,
    latitude: number | null,
    longitude: number | null,
): Promise<SOSAudioResult> {
    try {
        const formData = new FormData();

        // React Native FormData file append formatı
        formData.append("audio_file", {
            uri: audioUri,
            type: "audio/m4a",
            name: "sos_audio.m4a",
        } as unknown as Blob);

        formData.append("latitude", String(latitude ?? 0));
        formData.append("longitude", String(longitude ?? 0));
        formData.append("timestamp", new Date().toISOString());

        const { data } = await api.post<{
            success: boolean;
            transcription: string;
            notified_contacts: number;
            whatsapp_sent: number;
            sms_sent: number;
            fallback_used: boolean;
            message: string;
        }>(
            "/api/v1/sos/audio",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 45_000,  // Groq + Twilio için yeterli süre
            }
        );

        return {
            success: data.success,
            transcription: data.transcription ?? "",
            notifiedContacts: data.notified_contacts ?? 0,
            whatsappSent: data.whatsapp_sent ?? 0,
            smsSent: data.sms_sent ?? 0,
            fallbackUsed: data.fallback_used ?? false,
            message: data.message ?? "",
        };

    } catch (err: unknown) {
        const axErr = err as { response?: { data?: { detail?: string } }; message?: string };
        const errMsg =
            axErr?.response?.data?.detail ??
            axErr?.message ??
            "Ses yüklenirken hata oluştu";
        console.error("[SOSService] uploadSOSAudio hatası:", errMsg);
        return {
            success: false,
            transcription: "",
            notifiedContacts: 0,
            whatsappSent: 0,
            smsSent: 0,
            fallbackUsed: false,
            message: errMsg,
            error: errMsg,
        };
    } finally {
        // Geçici ses dosyasını temizle
        try {
            if (audioUri.startsWith("file://")) {
                await FileSystem.deleteAsync(audioUri, { idempotent: true });
            }
        } catch {
            // Dosya zaten silinmiş olabilir
        }
    }
}

/**
 * "Ben İyiyim" bildirimi gönderir.
 * Ses kaydı veya GPS gerekmez.
 */
export async function sendIAmSafe(): Promise<SOSSafeResult> {
    try {
        const { data } = await api.post<{
            success: boolean;
            notified_contacts: number;
            whatsapp_sent: number;
            sms_sent: number;
            message: string;
        }>(
            "/api/v1/sos/safe",
            {},
            { timeout: 20_000 }
        );

        return {
            success: data.success,
            notifiedContacts: data.notified_contacts ?? 0,
            whatsappSent: data.whatsapp_sent ?? 0,
            smsSent: data.sms_sent ?? 0,
            message: data.message ?? "",
        };

    } catch (err: unknown) {
        const axErr = err as { response?: { data?: { detail?: string } }; message?: string };
        const errMsg =
            axErr?.response?.data?.detail ??
            axErr?.message ??
            "Ben İyiyim bildirimi gönderilemedi";
        console.error("[SOSService] sendIAmSafe hatası:", errMsg);
        return {
            success: false,
            notifiedContacts: 0,
            whatsappSent: 0,
            smsSent: 0,
            message: errMsg,
            error: errMsg,
        };
    }
}

// ── Eski API — Geriye Dönük Uyumluluk ────────────────────────────────────────

/** @deprecated uploadSOSAudio kullanın */
export async function uploadSOSRecording(
    audioUri: string,
    latitude: number,
    longitude: number
): Promise<SOSAnalyzeResponse> {
    const result = await uploadSOSAudio(audioUri, latitude, longitude);
    return {
        task_id: `sos_${Date.now()}`,
        status: result.success ? "completed" : "failed",
        message: result.message,
    };
}

export async function checkSOSStatus(taskId: string): Promise<SOSStatusResponse> {
    try {
        const { data } = await api.get<SOSStatusResponse>(`/api/v1/sos/status/${taskId}`);
        return data;
    } catch {
        return { status: "failed", error_message: "Durum sorgulanamadı" };
    }
}

export async function pollSOSStatus(
    taskId: string,
    onUpdate?: (s: SOSStatusResponse) => void,
    maxAttempts: number = 30
): Promise<SOSStatusResponse> {
    for (let i = 0; i < maxAttempts; i++) {
        const s = await checkSOSStatus(taskId);
        onUpdate?.(s);
        if (s.status === "completed" || s.status === "failed") return s;
        await new Promise((r) => setTimeout(r, 2000));
    }
    return { status: "failed", error_message: "Süre aşıldı" };
}
