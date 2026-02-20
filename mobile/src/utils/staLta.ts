/**
 * STA/LTA sismik algoritma — pure TypeScript fonksiyonlar.
 * Test edilebilir, yan etkisiz.
 */

/** Yüksek geçişli IIR filtre — düşük frekanslı gürültüyü (yürüme) eler. */
export function highPassFilter(
    sample: number,
    prevRaw: number,
    prevFiltered: number,
    alpha: number
): number {
    return alpha * (prevFiltered + sample - prevRaw);
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

    return lta > 0 ? sta / lta : 0;
}
