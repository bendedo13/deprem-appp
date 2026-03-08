# İvmeölçer (Titreşim) → Deprem Doğrulama Mantığı

## Akış Özeti

1. **Mobil:** Kullanıcı cihazında ivmeölçer (accelerometer) STA/LTA ile titreşim algılanır → "Titreşim Algılandı" pop-up çıkar, rapor **sunucuya gönderilir** (POST `/api/v1/sensors/shake`).
2. **Sunucu:** Gelen sinyal Redis’te **sliding window** ile tutulur: aynı **GeoHash** bölgesi + **5 saniye** penceresi.
3. **Doğrulama:** Aynı bölgede, aynı 5 sn penceresinde **en az N farklı cihaz** (varsayılan **10**) sinyal gönderdiyse sistem bunu **deprem doğrulandı** kabul eder.
4. **Doğrulama sonrası:**  
   - WebSocket ile tüm client’lara anlık bildirim.  
   - **Celery** task tetiklenir: bölgedeki kullanıcıların **acil kişilerine** (güvenilir kişi) Twilio SMS / e-posta / FCM ile “Şu konumda depreme yakalandım” benzeri bildirim gider.

## Neden Az Kullanıcıda Bildirim Gitmiyor?

- Eşik **en az 10 farklı cihaz** (ayarlanabilir: `SHAKE_MIN_DEVICES_TO_CONFIRM`).
- Uygulama yeni ve aynı bölgede 10 cihaz yoksa **deprem doğrulanmaz**, dolayısıyla acil kişilere **SMS/WhatsApp/FCM tetiklenmez**.
- Tek cihaz veya birkaç cihaz sinyali sadece sunucuda kaydedilir; **yanlış alarm** riski bu sayede azaltılır.

## Yapılandırma (backend)

- `config.py`:  
  - `SHAKE_MIN_DEVICES_TO_CONFIRM` = 10 (isteğe göre 15–20 yapılabilir; daha yüksek = daha az yanlış alarm, daha geç doğrulama).  
  - `SHAKE_WINDOW_SECONDS` = 5, `SHAKE_GEOHASH_PRECISION` = 5.

## Özet

| Adım | Açıklama |
|------|----------|
| 1 | Kullanıcı titreşim hisseder → uygulama sinyali sunucuya gönderir. |
| 2 | Sunucu aynı bölge + 5 sn içinde en az 10 farklı cihaz sayar. |
| 3 | Eşik aşılırsa “deprem doğrulandı” olur. |
| 4 | Bölgedeki kullanıcıların acil kişilerine Twilio SMS / WhatsApp / FCM ile bildirim gider. |

Az kullanıcılı dönemde otomatik bildirim/SMS gitmemesinin nedeni bu eşik mantığıdır; kullanıcı sayısı arttıkça sistem kendiliğinden anlamlı hale gelir.
