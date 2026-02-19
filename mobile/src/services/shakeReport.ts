/**
 * Sarsıntı sinyalini backend'e gönderir.
 * POST /api/v1/sensors/shake — hızlı payload, rate limit ve cooldown mobil tarafta da uygulanır.
 */

import { API_BASE_URL } from "../config/constants";

export type ShakePayload = {
  device_id: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: string; // ISO 8601
  intensity?: number;
};

export type ShakeReportResult = {
  ok: boolean;
  message: string;
  confirmed: boolean;
};

/**
 * Backend'e tek bir sarsıntı sinyali gönderir.
 * Hata durumunda exception fırlatmaz; { ok: false } döner veya loglanır.
 */
export async function reportShake(payload: ShakePayload): Promise<ShakeReportResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/sensors/shake`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[shakeReport] API error", res.status, text);
      return { ok: false, message: text || "request_failed", confirmed: false };
    }

    const data = (await res.json()) as ShakeReportResult;
    return data;
  } catch (e) {
    console.warn("[shakeReport] Network error", e);
    return { ok: false, message: "network_error", confirmed: false };
  }
}
