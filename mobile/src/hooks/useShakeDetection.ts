/**
 * İvmeölçer ile 'deprem benzeri' sarsıntıyı tespit eden hook.
 * Low-pass + eşik + süre mantığı; doğrulandığında backend'e tek seferlik payload atar.
 */

import { useEffect, useRef, useCallback } from "react";
import * as Device from "expo-device";
import * as Location from "expo-location";
import { subscribeAccelerometer, lowPass, magnitude } from "../services/accelerometer";
import { reportShake } from "../services/shakeReport";
import {
  SHAKE_THRESHOLD_MS2,
  SHAKE_DURATION_MS,
  SHAKE_COOLDOWN_MS,
} from "../config/constants";

type ShakeDetectionOptions = {
  onShakeReported?: (confirmed: boolean) => void;
  enabled?: boolean;
};

/**
 * Arka planda ivmeölçer dinler; eşik + süre sağlanınca backend'e shake gönderir.
 * Cooldown süresince tekrar gönderim yapılmaz.
 */
export function useShakeDetection(options: ShakeDetectionOptions = {}) {
  const { onShakeReported, enabled = true } = options;
  const lastFiltered = useRef({ x: 0, y: 0, z: 0 });
  const aboveThresholdSince = useRef<number | null>(null);
  const lastReportTime = useRef<number>(0);
  const deviceIdRef = useRef<string | null>(null);

  const tryReport = useCallback(async () => {
    if (Date.now() - lastReportTime.current < SHAKE_COOLDOWN_MS) return;
    lastReportTime.current = Date.now();

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getLastKnownPositionAsync({});
        if (loc) {
          latitude = loc.coords.latitude;
          longitude = loc.coords.longitude;
        }
      }
    } catch {
      // Konum yoksa da gönder; backend kümelemede konumlu sinyalleri kullanır
    }

    const id = deviceIdRef.current ?? "anonymous";
    const result = await reportShake({
      device_id: id,
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });
    onShakeReported?.(result.confirmed);
  }, [onShakeReported]);

  useEffect(() => {
    if (!enabled) return;

    (async () => {
      const id = await Device.getDeviceName?.() ?? Device.modelName ?? "unknown";
      deviceIdRef.current = id;
    })();

    const unsubscribe = subscribeAccelerometer((raw) => {
      const filtered = lowPass(lastFiltered.current, raw);
      lastFiltered.current = filtered;
      const mag = magnitude(filtered.x, filtered.y, filtered.z);

      if (mag >= SHAKE_THRESHOLD_MS2) {
        const now = Date.now();
        if (aboveThresholdSince.current === null) {
          aboveThresholdSince.current = now;
        } else if (now - aboveThresholdSince.current >= SHAKE_DURATION_MS) {
          aboveThresholdSince.current = null;
          tryReport();
        }
      } else {
        aboveThresholdSince.current = null;
      }
    });

    return () => unsubscribe();
  }, [enabled, tryReport]);

  return { reportShake: tryReport };
}
