/**
 * Deprem alarmı sırasında sesi %100 yapmak için.
 * Android: native modül veya expo-av; iOS: sınırlı API.
 * Stub: gerçek uygulamada react-native-volume-manager veya native modül kullanılabilir.
 */

let _volumeBeforeAlarm: number | null = null;

/**
 * Medya ses seviyesini 1.0 (max) yapar.
 * Production'da native modül ile AudioManager.setStreamVolume kullanın.
 */
export function setVolume(value: number): void {
  if (__DEV__) {
    console.log("[volumeControl] setVolume stub:", value);
  }
  _volumeBeforeAlarm = value;
}

/**
 * Alarm sonrası önceki seviyeye döndürmek için (opsiyonel).
 */
export function restoreVolume(): void {
  if (_volumeBeforeAlarm != null) {
    if (__DEV__) console.log("[volumeControl] restore stub");
    _volumeBeforeAlarm = null;
  }
}
