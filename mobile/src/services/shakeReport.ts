/**
 * Sarsıntı sinyalini backend'e gönderir.
 * POST /api/v1/sensors/shake — app api instance kullanır (base URL + auth).
 */

import { api } from "./api";

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
 * Hata durumunda exception fırlatmaz; { ok: false } döner.
 */
export async function reportShake(payload: ShakePayload): Promise<ShakeReportResult> {
  try {
    const { data } = await api.post<ShakeReportResult>("/api/v1/sensors/shake", payload, {
      timeout: 10_000,
    });
    return data ?? { ok: false, message: "empty_response", confirmed: false };
  } catch (err: unknown) {
    const axErr = err as { response?: { status: number; data?: unknown }; message?: string };
    const status = axErr.response?.status;
    const msg =
      typeof axErr.response?.data === "string"
        ? axErr.response.data
        : (axErr.response?.data as { detail?: string })?.detail ?? axErr.message ?? "network_error";
    if (status === 401) {
      return { ok: false, message: "unauthorized", confirmed: false };
    }
    if (status && status >= 500) {
      return { ok: false, message: "server_error", confirmed: false };
    }
    return { ok: false, message: msg || "request_failed", confirmed: false };
  }
}
