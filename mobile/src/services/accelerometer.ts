/**
 * İvmeölçer verisi ve low-pass filtre.
 * Ham ivmeyi filtreleyerek düşme (yüksek frekans) ile deprem sarsıntısını ayırt etmeye yardımcı olur.
 */

import { Accelerometer } from "expo-sensors";
import { LOW_PASS_ALPHA } from "../config/constants";

export type AccelerometerData = { x: number; y: number; z: number };

/** Filtrelenmiş ivme vektörünün büyüklüğü (m/s²). */
export function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Tek kutu (single-pole) low-pass filter.
 * Yüksek frekanslı darbeleri zayıflatır, deprem benzeri sürekli titreşimi korur.
 */
export function lowPass(
  prev: AccelerometerData,
  next: AccelerometerData,
  alpha: number = LOW_PASS_ALPHA
): AccelerometerData {
  return {
    x: alpha * prev.x + (1 - alpha) * next.x,
    y: alpha * prev.y + (1 - alpha) * next.y,
    z: alpha * prev.z + (1 - alpha) * next.z,
  };
}

/**
 * İvmeölçer aboneliğini başlatır. Her okumada callback çağrılır.
 * @returns Aboneliği iptal eden fonksiyon.
 */
export function subscribeAccelerometer(
  callback: (data: AccelerometerData) => void,
  intervalMs: number = 16
): () => void {
  Accelerometer.setUpdateInterval(intervalMs);
  const sub = Accelerometer.addListener((e) => {
    callback({ x: e.x, y: e.y, z: e.z });
  });
  return () => sub.remove();
}
