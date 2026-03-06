/**
 * Calibration Service — Ortam titreşim baseline'ı ölçme ve kaydetme.
 *
 * Kullanıcı telefonu düz bir yüzeye koyup "Kalibrasyon Testi" butonuna
 * bastığında 5 saniye boyunca ivmeölçer verisi toplanır.
 * Ortam gürültüsü (yoldan geçen arabalar, fan titreşimi vb.) ölçülüp
 * "sıfır noktası" (baseline) olarak kaydedilir.
 *
 * Deprem algılama algoritması bu baseline'a göre:
 * - STA/LTA trigger ratio ayarlanır (gürültülü ortam → daha yüksek eşik)
 * - P/S dalgası tespiti baseline altındaki sinyalleri filtreler
 */

import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CALIBRATION_KEY = "sensor_calibration";

export interface CalibrationData {
    baselineNoise: number;         // Ortam gürültü seviyesi (m/s²)
    baselineStdDev: number;        // Standart sapma
    peakNoise: number;             // Kalibrasyon sırasındaki en yüksek gürültü
    sampleCount: number;           // Toplanan örnek sayısı
    calibratedAt: string;          // ISO timestamp
    adjustedTriggerRatio: number;  // Ayarlanmış STA/LTA tetikleme eşiği
}

const DEFAULT_CALIBRATION: CalibrationData = {
    baselineNoise: 0.05,
    baselineStdDev: 0.02,
    peakNoise: 0.1,
    sampleCount: 0,
    calibratedAt: "",
    adjustedTriggerRatio: 3.0,
};

/**
 * 5 saniye boyunca ivmeölçer verisi toplayarak baseline noise hesaplar.
 *
 * Algoritma:
 * 1. Gravity removal (exponential moving average)
 * 2. Lineer ivme vektör büyüklüğü hesaplama
 * 3. Mean, StdDev, Peak istatistikleri
 * 4. Baseline = mean + 2*stdDev (gürültü bandı üst sınırı)
 * 5. STA/LTA trigger ratio = 3.0 + (baseline / 0.1) * 0.5
 *    (gürültülü ortam → eşik 6.0'a kadar çıkabilir)
 *
 * @param onProgress 0-1 arası ilerleme callback'i
 * @returns Kalibrasyon verileri
 */
export function runCalibration(
    onProgress?: (progress: number) => void
): Promise<CalibrationData> {
    return new Promise((resolve, reject) => {
        const DURATION_MS = 5000;
        const samples: number[] = [];
        const startTime = Date.now();
        let finished = false;

        Accelerometer.setUpdateInterval(20); // 50 Hz

        const gravityRef = { x: 0, y: 0, z: 0 };
        const ALPHA = 0.8;

        const sub = Accelerometer.addListener(({ x, y, z }) => {
            if (finished) return;

            // Gravity removal with exponential moving average
            gravityRef.x = ALPHA * gravityRef.x + (1 - ALPHA) * x;
            gravityRef.y = ALPHA * gravityRef.y + (1 - ALPHA) * y;
            gravityRef.z = ALPHA * gravityRef.z + (1 - ALPHA) * z;

            const ax = x - gravityRef.x;
            const ay = y - gravityRef.y;
            const az = z - gravityRef.z;

            const magnitude = Math.sqrt(ax * ax + ay * ay + az * az);
            samples.push(magnitude);

            const elapsed = Date.now() - startTime;
            onProgress?.(Math.min(elapsed / DURATION_MS, 1));

            if (elapsed >= DURATION_MS) {
                finished = true;
                sub.remove();

                if (samples.length < 10) {
                    reject(new Error("Yeterli veri toplanamadı. Lütfen tekrar deneyin."));
                    return;
                }

                // İstatistiksel analiz
                const sum = samples.reduce((a, b) => a + b, 0);
                const mean = sum / samples.length;
                const peak = Math.max(...samples);

                // Standart sapma
                const variance =
                    samples.reduce((acc, s) => acc + (s - mean) ** 2, 0) /
                    samples.length;
                const stdDev = Math.sqrt(variance);

                // Baseline noise = mean + 2*stdDev (gürültü bandı üst sınırı)
                const baselineNoise = mean + 2 * stdDev;

                // STA/LTA trigger ratio: baseline yüksekse eşiği artır
                // Default 3.0, gürültülü ortamlarda 4.0-6.0'a çıkar
                const adjustedTriggerRatio = Math.max(
                    3.0,
                    Math.min(6.0, 3.0 + (baselineNoise / 0.1) * 0.5)
                );

                const calibration: CalibrationData = {
                    baselineNoise,
                    baselineStdDev: stdDev,
                    peakNoise: peak,
                    sampleCount: samples.length,
                    calibratedAt: new Date().toISOString(),
                    adjustedTriggerRatio,
                };

                saveCalibration(calibration)
                    .then(() => resolve(calibration))
                    .catch(() => resolve(calibration)); // Kayıt başarısız olsa da sonuç dön
            }
        });

        // Timeout safety — 7 saniye içinde bitmezse zorla kapat
        setTimeout(() => {
            if (!finished) {
                finished = true;
                sub.remove();
                reject(new Error("Kalibrasyon zaman aşımına uğradı."));
            }
        }, DURATION_MS + 2000);
    });
}

/**
 * Kalibrasyon verisini AsyncStorage'a kaydet.
 */
export async function saveCalibration(data: CalibrationData): Promise<void> {
    await AsyncStorage.setItem(CALIBRATION_KEY, JSON.stringify(data));
}

/**
 * Kayıtlı kalibrasyon verisini yükle.
 * Kalibrasyon yapılmamışsa default değerler döner.
 */
export async function loadCalibration(): Promise<CalibrationData> {
    try {
        const raw = await AsyncStorage.getItem(CALIBRATION_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_CALIBRATION, ...parsed };
        }
    } catch {
        // Parse hatası — default değerler kullan
    }
    return DEFAULT_CALIBRATION;
}

/**
 * Kalibrasyon verisini sıfırla (fabrika ayarları).
 */
export async function resetCalibration(): Promise<void> {
    await AsyncStorage.removeItem(CALIBRATION_KEY);
}
