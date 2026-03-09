# Erken Uyarı Modülü — Teknik Rapor

## 1. STA/LTA Algoritması

**Kurulum:**
- `mobile/src/utils/staLta.ts` — `computeStaLta(samples, STA_WINDOW, LTA_WINDOW)`
- STA (Short-Time Average): 1 saniye = 50 örnek @ 50 Hz
- LTA (Long-Time Average): 10 saniye = 500 örnek
- Tetik eşiği: STA/LTA ≥ 5.0 (TRIGGER_RATIO)
- Detrigger: STA/LTA < 2.0 (hysteresis)
- Minimum tetik süresi: 1.5 sn (tek vuruş elenir)
- Cooldown: 45 sn (tek deprem için tek alarm)

**Band-pass filtre (0.5–10 Hz):**
- High-pass: 0.5 Hz kesim (alfa ≈ 0.94) — yürüme/araç titreşimini eler
- Low-pass: 10 Hz kesim (alfa ≈ 0.73) — yüksek frekans gürültüyü eler
- Deprem P/S dalgaları 0.5–10 Hz bandında
- `bandPassFilter()` — `staLta.ts` içinde kaskad IIR

## 2. Arka Plan Servisi

**Teknik kısıt:** iOS ve Android, uygulama arka planda veya kapalıyken ivmeölçeri sürekli dinlemeye izin vermez (pil tüketimi). Expo managed workflow bu izni desteklemez.

**Mevcut çözüm:**
- `expo-background-fetch` + `expo-task-manager` — periyodik API polling (5–15 dk)
- Sunucu AFAD/Kandilli/USGS verilerini izler, M4+ depremde FCM push gönderir
- `mobile/src/services/backgroundSeismic.ts`

**Öneri:** Native (ejected) build ile Android Foreground Service eklenebilir; bu durumda ivmeölçer arka planda çalışabilir (sürekli bildirim çubuğunda "QuakeSense Sizi Koruyor" gösterilir).

## 3. Çalışma Modları

- **7/24 Koruma:** Sensör her zaman aktif (uygulama açıkken)
- **Gece Modu (23:00–07:00):** Sadece bu saatler arasında sensör işler (pil tasarrufu)
- `isWithinWorkHours(workStart, workEnd)` — gece modu için 23:00–07:00 aralığı
- Bildirim çubuğunda: Aktifken "QuakeSense Sizi Koruyor" gösterilir

## 4. Nükleer Alarm

- **Ses:** expo-av `playsInSilentModeIOS: true`, `shouldDuckAndroid: false` — sessiz modda da çalar
- **Overlay:** Modal tam ekran, kırmızı "DEPREM UYARISI", "Sesi Kapat / Güvendeyim" butonu
- **Titreşim:** `Vibration.vibrate([0, 500, 200, 500, 200, 500], true)` — maksimum güç paterni
- 1.8G+ ivme algılandığında tetiklenir

## 5. 15 Saniyelik Simülasyon

- **Test Başlat:** 5sn algılama → 5sn tam ekran alarm + ses + titreşim → 5sn "BU BİR TESTTİR" Twilio
- **Simülasyonu Durdur:** Anında sonlandırır
- `run15SecondTest(onPhaseChange, abortRef, options)` — `simulationService.ts`

## 6. Twilio Entegrasyonu

- Backend: `POST /api/v1/users/i-am-safe` — acil kişilere SMS + WhatsApp
- Test mesajı: `"BU BİR TESTTİR"` — Alan İnal (05513521373) ve diğer acil kişilere gönderilir
- Konum linki: `https://maps.google.com/?q=lat,lng`

## 7. Dosya Özeti

| Dosya | Değişiklik |
|-------|------------|
| `utils/staLta.ts` | Band-pass filtre (0.5–10 Hz) eklendi |
| `constants/seismic.ts` | BANDPASS_HP_ALPHA, BANDPASS_LP_ALPHA, NIGHT_MODE |
| `hooks/useShakeDetector.ts` | bandPassFilter, sensorActive parametresi |
| `services/sensorSettings.ts` | mode: "24_7" \| "night", isSensorActive() |
| `services/simulationService.ts` | run15SecondTest(), triggerMaxVibration() |
| `app/(tabs)/sensor.tsx` | 7/24/Gece modu, Test Başlat/Durdur, "QuakeSense Sizi Koruyor" |
