/**
 * Sismik sensör sabitleri — gelişmiş yanlış alarm önleme.
 * STA/LTA: Short-Term Average / Long-Term Average.
 *
 * DEĞİŞTİRİLEN DEĞERLER (false alarm azaltma):
 *  - TRIGGER_RATIO: 3.0 → 5.0 (daha yüksek eşik = daha az yanlış alarm)
 *  - MIN_REPORT_ACCELERATION: 0.5 → 1.0 (düşme/masaya vurma filtrele)
 *  - MIN_TRIGGER_DURATION_MS: YENİ — 1.5 saniye sürekli tetik gerekli
 *  - COOLDOWN_AFTER_TRIGGER_MS: YENİ — tetik sonrası 45 sn bekleme
 *  - HIGHPASS_ALPHA: 0.9 → 0.94 (daha güçlü düşük frekans filtresi)
 */

/** Accelerometer örnekleme frekansı (Hz) */
export const SAMPLE_RATE_HZ = 50;

/** STA pencere uzunluğu (örnek) = 1 saniye */
export const STA_WINDOW = SAMPLE_RATE_HZ * 1;

/** LTA pencere uzunluğu (örnek) = 10 saniye */
export const LTA_WINDOW = SAMPLE_RATE_HZ * 10;

/**
 * STA/LTA oranı bu eşiği geçince OLASI tetikleme başlar.
 * 3.0 → 5.0: Yürüme, araç titreşimi gibi false alarmları önler.
 * Gerçek P-dalgası: >6.0 tipik değer.
 */
export const TRIGGER_RATIO = 5.0;

/**
 * STA/LTA oranı bu değerin altına düşünce tetiklenme biter.
 * TRIGGER_RATIO'dan düşük olmalı — hysteresis sağlar.
 */
export const DETRIGGER_RATIO = 2.0;

/**
 * Yüksek geçişli IIR filtre alfa katsayısı.
 * 0.94: Yürüme (<2 Hz) ve araç titreşimini eler, P-dalgası (1-10 Hz) geçirir.
 */
export const HIGHPASS_ALPHA = 0.94;

/**
 * Backend'e rapor için minimum tepe ivme (m/s²).
 * 1.0: Telefon düşürme ve masa vurmasını (anlık spike) filtreler.
 * Gerçek sismik: genellikle >2.0 m/s².
 */
export const MIN_REPORT_ACCELERATION = 1.0;

/**
 * Tetiklemenin SÜRDÜRÜLMESI gereken minimum süre (ms).
 * 1500ms: Tek vuruş/düşme anında tetiklenmeyi önler.
 * Depremler >2s sürer; tek darbe <100ms'dir.
 */
export const MIN_TRIGGER_DURATION_MS = 1500;

/**
 * Tetiklemeden sonra yeni tetikleme için bekleme süresi (ms).
 * 45 saniye: Tek deprem için birden fazla alarm çıkmaz.
 */
export const COOLDOWN_AFTER_TRIGGER_MS = 45_000;

/** Cluster yarıçapı (km) */
export const CLUSTER_RADIUS_KM = 50;

/** Cluster zaman penceresi (saniye) */
export const CLUSTER_WINDOW_SEC = 60;

/** Deprem için minimum cluster büyüklüğü */
export const MIN_CLUSTER_SIZE = 3;
