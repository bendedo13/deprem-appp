# Deprem Algılama Algoritması — Cihaz Sarsıntısı + Kümeleme

Bu belge, mobil cihaz ivmeölçer verisi ile “düşme” ve “deprem sarsıntısı” ayrımı, backend’de bölgesel kümeleme ve doğrulama, alarm ve acil kişi bildirimi akışını tanımlar.

---

## 1. Genel Mimari

```
[Mobil Cihaz]                    [Backend]
  expo-sensors                     FastAPI
  (ivmeölçer)  ──► Low-pass  ──►   POST /api/v1/sensors/shake
  eşik + süre       filtre            │
       │                              ▼
       │                         Redis (GeoHash)
       │                         Sliding Window 5 sn
       │                         Kümeleme: ≥10 cihaz, ~10 km
       │                              │
       │                              ▼
       │                         Deprem doğrulandı
       │                              │
       │         ◄────────────────────┼────────────────────►
       │         │                    │                     │
       │    FCM (data)           Celery Task            WebSocket
       │    Notifee              Acil kişilere           Tüm client’lara
       │    Tam ekran alarm      "Depreme yakalandım"    NEW_EARTHQUAKE
       │    Ses %100             (PostgreSQL)
```

---

## 2. Mobil Taraf: Sarsıntı Algılama

### 2.1 Veri Kaynağı
- **expo-sensors** `Accelerometer` (m/s²), örnek hızı en az 50–100 Hz önerilir.

### 2.2 Düşme vs Deprem Ayrımı (Basit Eşik + Süre)
- **Low-pass filter**: Ham ivmeyi düşük frekanslı bileşene indirgemek (deprem tipik 0.1–20 Hz). Basit bir tek kutu (single-pole) low-pass ile yüksek frekanslı darbeler (düşme, çarpmalar) zayıflatılır.
- **Eşik**: Filtrelenmiş büyüklük (ör. vektör normu veya |x|+|y|+|z|) belirli bir eşiği (örn. ~1.5–2.5 m/s²) aşmalı.
- **Süre**: Eşik üzerinde kalma süresi (örn. 0.5–2 saniye). Kısa ani sarsıntı = düşme, uzun süreli titreşim = deprem benzeri.
- Cihaz, “deprem benzeri sarsıntı” doğruladığında **tek seferlik** backend’e payload atar (spam önleme: debounce / cooldown, örn. 30 sn).

### 2.3 Backend’e Gönderilen Payload
- `device_id` (anonim veya kullanıcı token’ından türetilmiş)
- `latitude`, `longitude` (GPS veya son bilinen konum)
- `timestamp` (ISO 8601)
- `intensity` (opsiyonel, filtrelenmiş ivme büyüklüğü)

---

## 3. Backend: Sinyal Toplama ve Kümeleme

### 3.1 Endpoint
- **POST /api/v1/sensors/shake** (veya WebSocket tek mesaj): Çok düşük gecikmeli, sadece validasyon + Redis yazma. İş mantığı asenkron.

### 3.2 Redis Veri Modeli (Sliding Window)
- **Anahtar**: Zaman dilimine göre (örn. 5 saniyelik pencereler için `shakes:{window_key}` veya GeoHash tabanlı `shakes:geohash:{geohash}:{window_key}`).
- **Değer**: Her sinyal için Set veya Sorted Set; üye = `device_id`, skor = timestamp. Böylece aynı cihaz aynı pencerede tek sayılır.
- **TTL**: Pencere süresi + marj (örn. 10 saniye) sonra otomatik silinir.

### 3.3 Bölge Tanımı
- **GeoHash** (örn. hassasiyet 5–6): Aynı veya komşu GeoHash’ler “aynı bölge” sayılır **veya**
- **Mesafe**: İki nokta arası Haversine ile ≤ 10 km ise aynı kümede.

### 3.4 Kümeleme (Clustering) Mantığı
- **Sliding window**: Son 5 saniye (veya N saniye) içinde gelen sinyaller.
- **Bölge**: GeoHash ile grupla veya tüm sinyalleri koordinatlarına göre 10 km çapında kümeler halinde topla.
- **Doğrulama koşulu**: Aynı bölgede (örn. 10 km çap) ve aynı 5 saniyelik pencerede **en az 10 farklı cihaz** sinyal göndermişse → “Deprem doğrulandı” kabul et.

### 3.5 Doğrulama Sonrası
- Deprem doğrulandığında:
  1. **FCM**: Risk bölgesindeki kullanıcılara yüksek öncelikli **data payload** (sessizde bile bildirim tetikler).
  2. **Celery**: PostgreSQL’de kayıtlı “acil durum kişileri”ne “Şu konumda depreme yakalandım” mesajı göndermek için task kuyruğa alınır.
  3. **WebSocket**: Tüm bağlı istemcilere `NEW_EARTHQUAKE` (kaynak = “crowdsource”) yayını.

---

## 4. Mobil: Alarm ve Tam Ekran Bildirim

### 4.1 FCM Data Payload
- `type: "EARTHQUAKE_CONFIRMED"`
- `latitude`, `longitude`, `timestamp`, (opsiyonel) `magnitude_estimate` veya `region`.

### 4.2 Notifee ile Tam Ekran Alarm
- Android: **Full Screen Intent**; kilit ekranında da tam ekran uyarı.
- iOS: **Critical Alert** (gerekli izinlerle) veya en yüksek öncelikli bildirim.
- Ses: Uygulama bildirim geldiği anda medya/ses seviyesini **%100** yap (sadece uyarı süresi için; kullanıcı deneyimi için dokümente et).

---

## 5. Celery: Acil Kişilere Bildirim

### 5.1 Tetikleyici
- Backend depremi doğruladığında, etkilenen bölgedeki kullanıcıları (konum veya FCM token bölge eşlemesi) ve bu kullanıcıların **acil durum kişilerini** (PostgreSQL’de ilişkili tablo) bul.

### 5.2 Task
- Her risk altındaki kullanıcı için bir Celery task: “Kullanıcı X, şu konumda depreme yakalandı” mesajını acil kişilere SMS / e-posta / push (tercih edilen kanal) ile gönder.

---

## 6. Hata ve Edge Case’ler

- **Redis timeout**: Tüm Redis çağrıları try/except, timeout (örn. 2 sn); hata durumunda logla, istemciye 503 veya “tekrar dene” dön.
- **Eksik konum**: Konum yoksa sinyal kabul edilebilir ama kümelemede sadece “konum bilgisi olan” sinyaller bölge hesabına katılır; konumsuz sinyaller ayrı bir bucket’ta tutulabilir veya atlanır.
- **Spam**: Aynı device_id için cooldown (mobil + backend’de rate limit).
- **Sahte pozitif**: 10 cihaz / 5 sn / 10 km ile sahte pozitif riski azaltılır; gerekirse eşik ve süre parametreleri A/B ile ayarlanır.

---

## 7. Klasör / Dosya Referansları

| Bileşen | Dosya / Klasör |
|--------|-----------------|
| Mobil ivme + filtre + API | `frontend-mobile/src/services/accelerometer.ts`, `frontend-mobile/src/hooks/useShakeDetection.ts` |
| Backend sinyal endpoint | `backend/app/api/v1/sensors.py` veya `backend/app/api/routes/sensors.py` |
| Redis sliding window + kümeleme | `backend/app/services/shake_cluster_service.py` |
| Celery acil kişi task | `backend/app/tasks/notify_emergency_contacts.py` |
| FCM + Notifee alarm | `frontend-mobile/src/services/earthquakeAlarm.ts`, bildirim dinleyici |

Bu mimariye ve mantığa sadık kalınarak geliştirme yapılacaktır.
