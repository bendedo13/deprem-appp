/**
 * Sensör ve shake algılama sabitleri.
 * EARTHQUAKE_DETECTION_ALGORITHM.md ile uyumlu.
 */

/** Low-pass filter alpha (0–1). Küçük = daha yumuşak, düşme darbeleri zayıflar. */
export const LOW_PASS_ALPHA = 0.2;

/** Sarsıntı eşiği (m/s²). Bu değerin üzeri deprem benzeri kabul edilir. */
export const SHAKE_THRESHOLD_MS2 = 2.0;

/** Eşik üzerinde kalma süresi (ms). Kısa sarsıntı = düşme, uzun = deprem. */
export const SHAKE_DURATION_MS = 800;

/** Backend'e tekrar gönderim için bekleme (ms). Spam önleme. */
export const SHAKE_COOLDOWN_MS = 30_000;

/** API base URL. Geliştirme için .env veya app.config'de override edin. */
export const API_BASE_URL = "http://localhost:8000";
