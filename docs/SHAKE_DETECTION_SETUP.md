# Deprem Algılama (Shake) Kurulum

Bu doküman, EARTHQUAKE_DETECTION_ALGORITHM.md ile uyumlu cihaz sarsıntısı + kümeleme akışının nasıl çalıştırıldığını özetler.

## Backend

### Gereksinimler
- Python 3.11+
- Redis 7
- PostgreSQL (acil kişi bildirimi için)

### Çalıştırma
```bash
cd backend
pip install -r requirements.txt
# .env: REDIS_URL, DATABASE_URL
uvicorn app.main:app --reload --port 8000
```

### Celery Worker (deprem doğrulandığında FCM + acil kişi bildirimi)
```bash
celery -A app.tasks.celery_app worker -l info -Q default,notifications
```

### Endpoint
- **POST /api/v1/sensors/shake** — Mobil sarsıntı sinyali (body: device_id, latitude?, longitude?, timestamp, intensity?)

## Mobil (Expo)

### Gereksinimler
- Node 20+, Expo CLI
- FCM için Firebase projesi; Notifee tam ekran için native build (expo prebuild)

### Çalıştırma
```bash
cd mobile
npm install
npx expo start
```

### Yapılandırma
- `src/config/constants.ts`: API_BASE_URL, SHAKE_THRESHOLD_MS2, SHAKE_DURATION_MS, SHAKE_COOLDOWN_MS
- Firebase: `google-services.json` (Android), `GoogleService-Info.plist` (iOS)
- Notifee tam ekran: Android `AndroidManifest.xml` içinde `USE_FULL_SCREEN_INTENT` ve ilgili activity

### Kullanım
- `useShakeDetection({ enabled: true, onShakeReported })` — Ana ekranda veya root layout’ta hook’u kullanın.
- FCM data mesajı `type: EARTHQUAKE_CONFIRMED` geldiğinde `earthquakeAlarm.ts` tam ekran bildirim + ses açma tetiklenir.

## Akış Özeti
1. Mobil: ivmeölçer → low-pass → eşik + süre → POST /sensors/shake
2. Backend: Redis sliding window (5 sn), GeoHash bölge, ≥10 cihaz → deprem doğrulandı
3. Doğrulama sonrası: WebSocket broadcast, Celery task (FCM + acil kişilere mesaj)
4. Mobil: FCM data → Notifee tam ekran alarm + ses %100
