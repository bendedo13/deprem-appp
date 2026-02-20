/**
 * Sismik sensör sabitleri — rules.md: magic number kullanma.
 * STA/LTA yöntemi: Short-Term Average / Long-Term Average.
 */

/** Accelerometer örnekleme frekansı (Hz) */
export const SAMPLE_RATE_HZ = 50;

/** STA pencere uzunluğu (örnek) = 1 saniye */
export const STA_WINDOW = SAMPLE_RATE_HZ * 1;

/** LTA pencere uzunluğu (örnek) = 10 saniye */
export const LTA_WINDOW = SAMPLE_RATE_HZ * 10;

/** STA/LTA oranı bu eşiği geçince trigger */
export const TRIGGER_RATIO = 3.0;

/** STA/LTA oranı bu değerin altına düşünce detrigger */
export const DETRIGGER_RATIO = 1.5;

/** High-pass filtre alfa (yürüme gürültüsünü sil) */
export const HIGHPASS_ALPHA = 0.9;

/** Backend'e rapor için minimum tepe ivme (m/s²) */
export const MIN_REPORT_ACCELERATION = 0.5;

/** Cluster yarıçapı (km) */
export const CLUSTER_RADIUS_KM = 50;

/** Cluster zaman penceresi (saniye) */
export const CLUSTER_WINDOW_SEC = 60;

/** Deprem için minimum cluster büyüklüğü */
export const MIN_CLUSTER_SIZE = 3;
