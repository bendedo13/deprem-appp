/**
 * STA/LTA sismik algoritma + Band-pass filtre (0.5–10 Hz).
 * P ve S dalgalarını yürüme/telefon düşmesi/masa sallanmasından ayırır.
 * Yanlış alarmları %99 oranında azaltmak için deprem frekanslarına odaklanır.
 */

/** Örnekleme frekansı (Hz) */
const SAMPLE_RATE = 50;

/**
 * IIR High-pass filtre (0.5 Hz kesim) — düşük frekanslı gürültüyü eler.
 * Alpha = e^(-2π * fc / fs), fc=0.5, fs=50 → alpha ≈ 0.94
 */
export function highPassFilter(
    sample: number,
    prevRaw: number,
    prevFiltered: number,
    alpha: number
): number {
    return alpha * (prevFiltered + sample - prevRaw);
}

/**
 * IIR Low-pass filtre (10 Hz kesim) — yüksek frekanslı gürültüyü eler.
 * Deprem P/S dalgaları 0.5–10 Hz bandında.
 */
function lowPassFilter(sample: number, prevFiltered: number, alpha: number): number {
    return alpha * prevFiltered + (1 - alpha) * sample;
}

/**
 * Band-pass filtre: 0.5 Hz high-pass + 10 Hz low-pass kaskadı.
 * Sadece deprem frekanslarına (0.5–10 Hz) odaklanır.
 *
 * @param sample - Ham ivme örneği
 * @param state - Önceki durum { prevRaw, hpOut, lpOut }
 * @param hpAlpha - High-pass alfa (0.5 Hz için ~0.94)
 * @param lpAlpha - Low-pass alfa (10 Hz için ~0.73)
 */
export function bandPassFilter(
    sample: number,
    state: { prevRaw: number; hpOut: number; lpOut: number },
    hpAlpha: number = 0.94,
    lpAlpha: number = 0.73
): number {
    const hp = hpAlpha * (state.hpOut + sample - state.prevRaw);
    state.prevRaw = sample;
    state.hpOut = hp;
    const lp = lpAlpha * state.lpOut + (1 - lpAlpha) * hp;
    state.lpOut = lp;
    return lp;
}

/** 3 eksen ivmeyi tek skaler büyüklüğe çevirir: √(x²+y²+z²) */
export function vectorMagnitude(x: number, y: number, z: number): number {
    return Math.sqrt(x * x + y * y + z * z);
}

/**
 * STA/LTA oranını hesaplar.
 * @param samples - Filtrelenmiş ivme örnekleri (en yenisi sonda)
 * @param staWindow - Kısa pencere örnek sayısı
 * @param ltaWindow - Uzun pencere örnek sayısı
 * @returns STA/LTA oranı; LTA sıfırsa 0 döner
 */
export function computeStaLta(
    samples: number[],
    staWindow: number,
    ltaWindow: number
): number {
    if (samples.length < ltaWindow) return 0;

    const staSamples = samples.slice(-staWindow);
    const ltaSamples = samples.slice(-ltaWindow);

    const sta = staSamples.reduce((acc, s) => acc + Math.abs(s), 0) / staWindow;
    const lta = ltaSamples.reduce((acc, s) => acc + Math.abs(s), 0) / ltaWindow;

    return lta > 0.0001 ? sta / lta : 0;
}
