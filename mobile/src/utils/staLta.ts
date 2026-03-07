/**
 * Gelişmiş sismik analiz — STA/LTA + P/S dalga ayrımı.
 * Pure TypeScript, yan etkisiz, test edilebilir.
 *
 * P dalgası: Yüksek frekanslı (1-10 Hz), düşük genlikli, ilk gelen
 * S dalgası: Düşük frekanslı (0.1-2 Hz), yüksek genlikli, ikinci gelen
 */

// ── Temel Filtreler ──────────────────────────────────────────────────────

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
 * 2nd order Butterworth bandpass filter (cascade of HP + LP).
 * Keeps signals between fLow and fHigh Hz.
 */
export class BandpassFilter {
    private xHP = [0, 0, 0]; // input history
    private yHP = [0, 0, 0]; // HP output history
    private xLP = [0, 0, 0];
    private yLP = [0, 0, 0];
    private a1HP: number; private a2HP: number;
    private b0HP: number; private b1HP: number; private b2HP: number;
    private a1LP: number; private a2LP: number;
    private b0LP: number; private b1LP: number; private b2LP: number;

    constructor(sampleRate: number, fLow: number, fHigh: number) {
        // High-pass coefficients (Butterworth 2nd order)
        const wHP = Math.tan(Math.PI * fLow / sampleRate);
        const w2HP = wHP * wHP;
        const sqr2 = Math.SQRT2;
        const normHP = 1 / (1 + sqr2 * wHP + w2HP);
        this.b0HP = normHP;
        this.b1HP = -2 * normHP;
        this.b2HP = normHP;
        this.a1HP = 2 * (w2HP - 1) * normHP;
        this.a2HP = (1 - sqr2 * wHP + w2HP) * normHP;

        // Low-pass coefficients (Butterworth 2nd order)
        const wLP = Math.tan(Math.PI * fHigh / sampleRate);
        const w2LP = wLP * wLP;
        const normLP = 1 / (1 + sqr2 * wLP + w2LP);
        this.b0LP = w2LP * normLP;
        this.b1LP = 2 * w2LP * normLP;
        this.b2LP = w2LP * normLP;
        this.a1LP = 2 * (w2LP - 1) * normLP;
        this.a2LP = (1 - sqr2 * wLP + w2LP) * normLP;
    }

    process(sample: number): number {
        // High-pass stage
        this.xHP[2] = this.xHP[1]; this.xHP[1] = this.xHP[0]; this.xHP[0] = sample;
        this.yHP[2] = this.yHP[1]; this.yHP[1] = this.yHP[0];
        this.yHP[0] = this.b0HP * this.xHP[0] + this.b1HP * this.xHP[1] + this.b2HP * this.xHP[2]
                     - this.a1HP * this.yHP[1] - this.a2HP * this.yHP[2];

        // Low-pass stage
        this.xLP[2] = this.xLP[1]; this.xLP[1] = this.xLP[0]; this.xLP[0] = this.yHP[0];
        this.yLP[2] = this.yLP[1]; this.yLP[1] = this.yLP[0];
        this.yLP[0] = this.b0LP * this.xLP[0] + this.b1LP * this.xLP[1] + this.b2LP * this.xLP[2]
                     - this.a1LP * this.yLP[1] - this.a2LP * this.yLP[2];

        return this.yLP[0];
    }

    reset() {
        this.xHP.fill(0); this.yHP.fill(0);
        this.xLP.fill(0); this.yLP.fill(0);
    }
}

// ── STA/LTA ──────────────────────────────────────────────────────────────

/**
 * Recursive STA/LTA — O(1) per sample instead of O(n).
 * Uses running sums for efficiency.
 */
export class RecursiveStaLta {
    private buffer: number[];
    private staSum = 0;
    private ltaSum = 0;
    private idx = 0;
    private filled = false;
    private readonly staWin: number;
    private readonly ltaWin: number;

    constructor(staWindow: number, ltaWindow: number) {
        this.staWin = staWindow;
        this.ltaWin = ltaWindow;
        this.buffer = new Array(ltaWindow).fill(0);
    }

    /** Add a new absolute-value sample and return the STA/LTA ratio */
    push(absSample: number): number {
        const oldVal = this.buffer[this.idx];
        this.buffer[this.idx] = absSample;

        // Update LTA running sum
        this.ltaSum += absSample - oldVal;

        // Update STA running sum
        const staOldIdx = (this.idx - this.staWin + this.ltaWin) % this.ltaWin;
        this.staSum += absSample - this.buffer[staOldIdx];

        this.idx = (this.idx + 1) % this.ltaWin;
        if (this.idx === 0) this.filled = true;

        if (!this.filled) return 0;

        const lta = this.ltaSum / this.ltaWin;
        if (lta <= 1e-10) return 0;

        const sta = this.staSum / this.staWin;
        return sta / lta;
    }

    reset() {
        this.buffer.fill(0);
        this.staSum = 0;
        this.ltaSum = 0;
        this.idx = 0;
        this.filled = false;
    }
}

/** Legacy function-based STA/LTA for backward compatibility */
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

// ── P/S Dalga Ayrımı ─────────────────────────────────────────────────────

/**
 * Frequency-domain energy ratio for P/S wave discrimination.
 * P waves: dominant energy at 1-10 Hz (high freq band)
 * S waves: dominant energy at 0.1-2 Hz (low freq band)
 *
 * Returns ratio > 1 = likely P-wave, < 1 = likely S-wave
 */
export function pWaveConfidence(
    pBandEnergy: number,
    sBandEnergy: number
): number {
    if (sBandEnergy <= 1e-10) return pBandEnergy > 1e-10 ? 10 : 0;
    return pBandEnergy / sBandEnergy;
}

/**
 * Kurtosis — measures "peakedness" of signal distribution.
 * Impulsive signals (P-wave arrivals) have high kurtosis.
 * Normal distribution kurtosis = 3; P-wave onset > 5.
 */
export function computeKurtosis(samples: number[]): number {
    const n = samples.length;
    if (n < 4) return 0;

    const mean = samples.reduce((a, b) => a + b, 0) / n;
    let m2 = 0;
    let m4 = 0;
    for (let i = 0; i < n; i++) {
        const d = samples[i] - mean;
        const d2 = d * d;
        m2 += d2;
        m4 += d2 * d2;
    }
    m2 /= n;
    m4 /= n;

    if (m2 <= 1e-10) return 0;
    return m4 / (m2 * m2);
}

/**
 * Zero-crossing rate — higher for P-waves (high frequency content).
 * Returns crossings per sample.
 */
export function zeroCrossingRate(samples: number[]): number {
    if (samples.length < 2) return 0;
    let crossings = 0;
    for (let i = 1; i < samples.length; i++) {
        if ((samples[i] >= 0 && samples[i - 1] < 0) ||
            (samples[i] < 0 && samples[i - 1] >= 0)) {
            crossings++;
        }
    }
    return crossings / (samples.length - 1);
}

// ── False Alarm Filtreleme ───────────────────────────────────────────────

/**
 * Multi-criteria false alarm filter.
 * Returns true if the trigger is likely a real earthquake (not phone drop, walking, etc.)
 *
 * Criteria:
 * 1. Duration: Real earthquakes last > 1 second (not sudden impacts)
 * 2. Kurtosis: Moderate (3-20), not extreme spike (phone drop = kurtosis > 50)
 * 3. Sustained energy: Energy should persist, not spike and disappear
 */
export function isLikelyEarthquake(
    recentSamples: number[],
    durationMs: number,
    peakAccel: number
): boolean {
    // Phone drops: very short duration, extreme peak
    if (durationMs < 500 && peakAccel > 5.0) return false;

    // Walking/running: low kurtosis, repetitive pattern
    const kurtosis = computeKurtosis(recentSamples);
    if (kurtosis > 50) return false; // Extreme spike = not earthquake

    // Check zero-crossing rate — earthquakes: 0.1-0.5, taps: > 0.7
    const zcr = zeroCrossingRate(recentSamples);
    if (zcr > 0.7) return false;

    // Must have sustained energy for at least 500ms
    if (durationMs < 500) return false;

    return true;
}
