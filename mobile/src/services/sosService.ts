/**
 * S.O.S Voice Alert API Service
 * Ses kaydını backend'e yükler ve işlenme durumunu takip eder.
 */

import { api } from "./api";

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

/**
 * S.O.S ses kaydını backend'e yükler.
 */
export async function uploadSOSRecording(
    audioUri: string,
    latitude: number,
    longitude: number
): Promise<SOSAnalyzeResponse> {
    const formData = new FormData();

    formData.append("audio_file", {
        uri: audioUri,
        type: "audio/m4a",
        name: "sos_audio.m4a",
    } as unknown as Blob);

    formData.append("timestamp", new Date().toISOString());
    formData.append("latitude", String(latitude));
    formData.append("longitude", String(longitude));

    const { data } = await api.post<SOSAnalyzeResponse>(
        "/api/v1/sos/analyze",
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
            timeout: 30_000,
        }
    );

    return data;
}

/**
 * Belirli bir S.O.S kaydının işlenme durumunu döner.
 */
export async function checkSOSStatus(taskId: string): Promise<SOSStatusResponse> {
    const { data } = await api.get<SOSStatusResponse>(`/api/v1/sos/status/${taskId}`);
    return data;
}

/**
 * S.O.S durumunu tamamlanana kadar periyodik olarak sorgular.
 */
export async function pollSOSStatus(
    taskId: string,
    onUpdate?: (status: SOSStatusResponse) => void,
    maxAttempts: number = 30
): Promise<SOSStatusResponse> {
    for (let i = 0; i < maxAttempts; i++) {
        const status = await checkSOSStatus(taskId);

        onUpdate?.(status);

        if (status.status === "completed" || status.status === "failed") {
            return status;
        }

        // Bir sonraki sorgudan önce 2 saniye bekle
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("S.O.S işleme süresi aşıldı.");
}

