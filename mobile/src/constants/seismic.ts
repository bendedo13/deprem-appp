/**
 * Sismik sensör sabitleri — STA/LTA + Band-pass (0.5–10 Hz).
 * P ve S dalgaları: 0.5–10 Hz bandında.
 * Yürüme/araç/masa: <0.5 Hz veya >10 Hz → filtrelenir.
 */

/** Accelerometer örnekleme frekansı (Hz) */
export const SAMPLE_RATE_HZ = 50;

/** STA pencere uzunluğu (örnek) = 1 saniye */
export const STA_WINDOW = SAMPLE_RATE_HZ * 1;

/** LTA pencere uzunluğu (örnek) = 10 saniye */
export const LTA_WINDOW = SAMPLE_RATE_HZ * 10;

/**
 * STA/LTA oranı bu eşiği geçince tetikleme başlar.
 * 5.0: Yürüme, araç titreşimi elenir. Gerçek P-dalgası: >6.0 tipik.
 */
export const TRIGGER_RATIO = 5.0;

/** STA/LTA oranı bu değerin altına düşünce tetiklenme biter (hysteresis). */
export const DETRIGGER_RATIO = 2.0;

/** Band-pass: High-pass alfa (0.5 Hz kesim) */
export const BANDPASS_HP_ALPHA = 0.94;

/** Band-pass: Low-pass alfa (10 Hz kesim) */
export const BANDPASS_LP_ALPHA = 0.73;

/** Eski high-pass (geri uyumluluk) */
export const HIGHPASS_ALPHA = 0.94;

/** Backend rapor için minimum tepe ivme (m/s²) */
export const MIN_REPORT_ACCELERATION = 1.0;

/** Tetiklemenin sürdürülmesi gereken minimum süre (ms) */
export const MIN_TRIGGER_DURATION_MS = 1500;

/** Tetiklemeden sonra yeni tetikleme için bekleme (ms) */
export const COOLDOWN_AFTER_TRIGGER_MS = 45_000;

/** Nükleer alarm: bu ivme (G) aşılırsa tam ekran alarm */
export const CRITICAL_ACCELERATION_G = 1.8;
export const CRITICAL_ACCELERATION_MS2 = CRITICAL_ACCELERATION_G * 9.80665;

/** Nükleer alarm tetiklemesi için minimum aralık (ms) */
export const CRITICAL_TRIGGER_COOLDOWN_MS = 60_000;

/** Gece modu varsayılan: 23:00 - 07:00 */
export const NIGHT_MODE_START = "23:00";
export const NIGHT_MODE_END = "07:00";
