# QuakeSense 4 Aşamalı Stabilite Güncellemesi — Uygulama Raporu

## Özet

Bu rapor, işletim sistemi seviyesinde en yüksek stabilite için yapılan 4 aşamalı güncellemenin tespit edilen hatalar, düzeltmeler, izin yönlendirmeleri ve test sonuçlarını içerir.

---

## 1. Tespit Edilen Hatalar ve Yapılan Düzeltmeler

### Crash / Undefined Modül
- **Önceki düzeltmeler (mevcut kodda):** `expo-av` ve `expo-sensors` için güvenli `require()` ve null-check kullanılıyor; `simulationService.ts`, `earthquakeAlarm.ts`, `useShakeDetector.ts`, `accelerometer.ts` içinde guard'lar mevcut.
- **Bu güncellemede:** Yeni eklenen `criticalAlarmService.ts` ve `permissionService.ts` try-catch ile sarıldı; `earthquakeAlarm` import'u doğrudan yapıldı (zaten güvenli yüklü).

### Onboarding
- **Eski:** 3 hoş geldin + 2 izin (konum, pil) slaytı; pil slaytı "sensor" id ile karışıktı.
- **Yeni:** 1 hoş geldin + **4 kritik izin kartı** (Konum Her Zaman, Pil Optimizasyonu, Sensör/Fiziksel Aktivite, Kritik Bildirim); "İzin Ver" / "Ayarları Aç" ile doğrudan ilgili sistem ayarına yönlendirme.

### Hibrit Test
- **Eski:** Sensör testi alarm + geri sayım sonrası SOS; Twilio detayı ekranda yoktu.
- **Yeni:** `runHybridSensorTest()` eklendi; tek tıkla alarm + bildirim + **gerçek "Bu bir testtir" TEST MESAJI** acil kişilere gönderiliyor; ekranda **SMS sayısı, WhatsApp sayısı, kanal (channel_used)** raporlanıyor.

### Nükleer Alarm
- **Eksik:** 1.8G+ ivme için tam ekran alarm ve sessiz modu delme akışı yoktu.
- **Yeni:** `CRITICAL_ACCELERATION_MS2` (1.8G) eşiği eklendi; `useShakeDetector` içinde `onCriticalTrigger` ile `criticalAlarmService.startCriticalAlarm()` tetikleniyor; root layout’ta **"Sesi Kapat / Güvendeyim"** overlay’i ile kullanıcı basana kadar alarm çalıyor.

---

## 2. İzin Yönlendirmelerinin Sağlandığı Dosyalar

| İzin | Yönlendirme / İşlem | Dosya |
|------|----------------------|--------|
| Konum (Her Zaman) | `requestForegroundPermissionsAsync` + `requestBackgroundPermissionsAsync`; reddedilirse `Linking.openSettings()` | `src/services/permissionService.ts` → `requestLocationAlwaysAndOpenSettingsIfNeeded()` |
| Pil optimizasyonu | Android: `Linking.openURL("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS")`; fallback `Linking.openSettings()` | `src/services/permissionService.ts` → `openBatteryOptimizationSettings()` |
| Fiziksel aktivite / Sensör | Uygulama ayarları: `Linking.openSettings()` | `src/services/permissionService.ts` → `openPermissionSystemScreen("sensor_activity")` |
| Kritik bildirim | `Notifications.requestPermissionsAsync()`; reddedilirse `Linking.openSettings()` | `src/services/permissionService.ts` → `requestCriticalNotificationAndOpenSettingsIfNeeded()` |

Onboarding ekranında her izin kartı "İzin Ver" / "Ayarları Aç" ile yukarıdaki fonksiyonları çağırıyor: **`app/(auth)/onboarding.tsx`** → `handlePrimaryButton()` → `openPermissionSystemScreen(slide.permissionId)`.

---

## 3. Alarm Sisteminin Sessiz Modda Çalışma Test Sonucu

- **expo-av:** `setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: false })` ile sessiz mod bypass ediliyor (iOS ring/silent switch, Android ses profili).
- **Notifee:** Deprem kanalında `bypassDnd: true` ile Rahatsız Etmeyin modu deliniyor.
- **Akış:** 1.8G+ algılandığında `criticalAlarmService.startCriticalAlarm()` → `playAlarmSound()` (earthquakeAlarm) + `showEarthquakeAlarm()` (tam ekran bildirim). Alarm sesi `volume: 1.0`, `isLooping: true` ile çalıyor; kullanıcı root layout’taki **"Sesi Kapat / Güvendeyim"** butonuna basana kadar `stopCriticalAlarm()` çağrılmıyor.
- **Test:** Sessiz modda ve DND’de alarm sesinin çalması ve ancak "Güvendeyim" ile durması, mevcut mimari ile uyumludur; gerçek cihazda ses seviyesi ve DND bypass davranışı doğrulanmalıdır.

---

## 4. GitHub Push Onayı

Tüm değişiklikler aşağıdaki commit’lerle `main` branch’ine push edilmiştir:

- **feat(onboarding):** 4 kritik izin kartı, permissionService ile sistem ayarına yönlendirme, eksik izin uyarısı.
- **feat(sensor):** Hibrit sensör testi (runHybridSensorTest), Twilio SMS/WhatsApp raporu ekranda.
- **feat(alarm):** Nükleer alarm (1.8G+), criticalAlarmService, root layout "Sesi Kapat / Güvendeyim" overlay.
- **chore(seismic):** CRITICAL_ACCELERATION_G / CRITICAL_ACCELERATION_MS2 sabitleri.

Push komutu: `git push origin main`

---

## 5. VPS / EAS Komutları (Referans)

```bash
# VPS deploy
ssh root@VPS_IP 'cd /opt/deprem-appp && git pull origin main && cd deploy && docker compose -f docker-compose.prod.yml up -d --build'
docker exec deprem_backend alembic upgrade head

# EAS build
cd mobile && eas build --platform android --profile production
```

---

*Rapor tarihi: Bu güncelleme ile birlikte oluşturulmuştur.*
