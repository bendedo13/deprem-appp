# Deployment Instructions - S.O.S Feature

## 📋 Önkoşullar

1. VPS'te `/opt/deprem-appp` dizininde proje mevcut
2. PostgreSQL ve Redis çalışıyor
3. Docker ve Docker Compose yüklü
4. Git yapılandırılmış

## 🔑 Adım 1: API Keys Yapılandırması

### Twilio Account SID ve Phone Number Al

1. **Twilio Console'a git:**
   ```
   https://console.twilio.com/
   ```

2. **Account SID'yi kopyala:**
   - Console > Account Info > Account SID

3. **Telefon numarası al:**
   - Console > Phone Numbers > Manage > Buy a number
   - Türkiye için +90 veya test için +1 US numarası seç

### VPS'te .env Dosyasını Güncelle

```bash
# VPS'e bağlan
ssh root@your-vps-ip

# Backend dizinine git
cd /opt/deprem-appp/backend

# .env dosyasını düzenle
nano .env
```

Aşağıdaki değerleri ekle/güncelle:

```bash
# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=depremapp-29518
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDvtBO7yiw05fJC\nqJERKtov6ph5eVgqxv9g7HBy4s1TI1/CQeHoh6RqaEwDmi52fqjzfynMWH5GXoal\nYszpvBKoqkHXv9nS8zDGjJ/MX/MCC19AHNOqlMkHVZPFUnqFBJxFMsrs03DCFBME\ncIzc6TcTQoXZKfgBWSw+BxTAJqXgmPvvD0oaw1/+aAjsSOWtOZxeHU7ZUr2WF6Oh\n+RqylVJvvMdni8RkHzO2FycX7ml2PF3y8Hz+qiykuR8/POzIcvmu8fhwEEFWx0g7\nv8Q8Ns1OtcRRaX18+G09InOrfhRGTxPja2Nk68yKLBmFHQZT1vp4Qc/f+twpx6LD\nyiXGQM3pAgMBAAECggEABBBCcWGJBFCNndGru+XFEyDf+tcyxm7fL25yrY/ouSsV\nWX6ybLW39NHV0A3SEdIt3Qrf04YAhgLeN3mITcIRcuiH+zdWYvwabJM/tkA+J1+3\n+qdCc1bYXZZ2zdaLGywr1gR5ajBfbfrXI7EgwjH17A6ppDfQ63zughKuqF8/WqJU\n5ORJNNASTGUtNQXVKGs6vUK8mpOewZWc8zRGUSreaFkQB372jEQfhi7wrc81TLjU\nJTlqsIT3SwvyhIXLiCXDzTe/x9GTUEdJMvg8Kh6N+16UEg5c72kjMXvKz54ZYgLJ\noDeghMrAI9MVqNgOrY4kuVsmcLqULlysy1oAWwvbHQKBgQD4uGzscwKjWnbI6UXR\nsKLcDe2h42+RLtN07EyA7xEd55lWOS094S/IuztLAdmBUXIvEhao6QGUclt6s9b5\nioPO/o+rwwwU07mO3+0ROgvJcysUJfOALVicTdypScRKcTB6Iuo5o2RpZYUZzr9V\nf/YI2/NuT6xWquHFz46m/De80wKBgQD2uBcq8ICnVX01XcofOC3fTrGqWofZZ2lj\nScjSk4utOTm0y/r4+pm/tHkKOoO3FGZwxGEbTM8eTM8cfJRArWQAwYnuw0kKNmo+\ne/t0BXVrGsdrIIf26Uy5hNIM4SueBtoEqslYqmysg/7or7+7DjeEvF0s0x//LDWN\nrrEUF6Ok0wKBgQDhGnlqnsS6d3ueZpHMMGOVaf2yURd+fLTg06SB5NzHBf9fbCwo\nHxCSSfJl9myWf9IqC+L6SLgnVEC7EtzzyIt24inBuKvMhbshNkVnG/PjBRruB1MU\npPXXsRiPFrZS8ZKAV+1I8TpFsZ3/N4EvrrpMVlVBd1ZwsgPYdfuT4h3IBQKBgCeH\nLw8OIU6t/7WBJVUDJzZT4Vstzf4i91uVArvaL9K9DGXPGJKzc9anD413+opmllMS\n44wALl7oZ3Zk70u9e/wzBepfF2Cvfy4rpwnbpghW7gRX3fDNSCGhChZOLTLQXjXJ\nNyEhjO/G5hxZrBpIGNUHaNY5rTKw3pOonW5eqzVJAoGBAMGwI5JVDXrlcIJ7bAbP\n16rpkxR59vm8IVKcjzNrEucUi/3ouN57PJKIAMeS35k5bj89QN+2q7G1miO63rsB\n6r1nSJAiumHevfGoahRfwpBnnIl2+a9Gjgf8JEkowyU68eGOjkaCkVkpsw177RcB\nAb3vDV0PJQni352v6x+7s2D2\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@depremapp-29518.iam.gserviceaccount.com

# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Twilio Console'dan kopyala
TWILIO_AUTH_TOKEN=oWKkDulLItaS3oUwDISCzTWJgwKDBXn1
TWILIO_PHONE_NUMBER=+905551234567  # Satın aldığın numara

# OpenAI (Whisper)
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_WHISPER_LANGUAGE=tr

# Anthropic Claude (NLP)
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ANTHROPIC_MODEL=claude-3-haiku-20240307

# S.O.S Audio Storage
SOS_AUDIO_STORAGE_PATH=/app/sos_audio
SOS_AUDIO_BASE_URL=https://your-domain.com/sos_audio
SOS_RATE_LIMIT_PER_HOUR=10
```

Kaydet ve çık (Ctrl+X, Y, Enter)

## 🚀 Adım 2: Deployment

```bash
# Deploy dizinine git
cd /opt/deprem-appp/deploy

# Deployment script'ini çalıştır
./PRODUCTION_DEPLOY.sh
```

Script şunları yapacak:
1. Git'ten son değişiklikleri çeker
2. Docker container'ları durdurur
3. Yeni image'ları build eder (--no-cache ile)
4. Database migration'ları çalıştırır (sos_records tablosu oluşturulur)
5. Container'ları başlatır
6. Health check yapar

## ✅ Adım 3: Test

### 1. Health Check

```bash
curl http://localhost:8001/api/v1/health
```

Beklenen çıktı:
```json
{"status":"ok","version":"1.0.0"}
```

### 2. Register Test User

```bash
curl -X POST http://localhost:8001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

Response'dan `access_token`'ı kaydet.

### 3. Login Test

```bash
curl -X POST http://localhost:8001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### 4. Emergency Contact Ekle

```bash
curl -X POST http://localhost:8001/api/v1/users/me/contacts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acil Kişi",
    "phone": "+905551234567",
    "email": "emergency@example.com",
    "channel": "sms"
  }'
```

### 5. S.O.S Test (Ses Dosyası ile)

Önce bir test ses dosyası oluştur:
```bash
# Test için basit bir ses dosyası oluştur (veya gerçek bir ses dosyası kullan)
echo "Test audio" > test_audio.m4a
```

S.O.S endpoint'ini test et:
```bash
curl -X POST http://localhost:8001/api/v1/sos/analyze \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "audio_file=@test_audio.m4a" \
  -F "timestamp=2024-02-23T10:30:00Z" \
  -F "latitude=41.0082" \
  -F "longitude=28.9784"
```

Beklenen response:
```json
{
  "task_id": "abc123-def456-...",
  "status": "accepted",
  "message": "S.O.S kaydınız işleniyor..."
}
```

### 6. S.O.S Status Kontrol

```bash
curl http://localhost:8001/api/v1/sos/status/TASK_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📊 Adım 4: Log Kontrolü

### Backend Logs

```bash
docker logs deprem_backend --tail 50 -f
```

Kontrol edilecekler:
- ✅ Firebase Admin SDK başlatıldı
- ✅ Twilio client başlatıldı
- ✅ S.O.S router yüklendi
- ❌ Hata mesajları yok

### Celery Worker Logs

```bash
docker logs deprem_celery --tail 50 -f
```

Kontrol edilecekler:
- ✅ Celery worker başladı
- ✅ `process_sos_audio_task` task'ı registered
- ✅ Task'lar işleniyor

### Database Migration Kontrolü

```bash
docker exec -it deprem_backend bash
alembic current
```

Beklenen çıktı:
```
004 (head)
```

## 🔍 Adım 5: Database Kontrolü

```bash
# PostgreSQL'e bağlan
psql -U deprem_user -d deprem_db

# sos_records tablosunu kontrol et
\d sos_records

# Kayıtları listele
SELECT id, user_id, durum, aciliyet, processing_status, created_at FROM sos_records;

# Çık
\q
```

## 🐛 Troubleshooting

### Problem: Firebase başlatılamadı

**Çözüm:**
```bash
# .env dosyasında FIREBASE_PRIVATE_KEY'in doğru escape edildiğinden emin ol
# \n karakterleri literal olarak yazılmalı, gerçek newline olmamalı
```

### Problem: Twilio SMS gönderilemiyor

**Çözüm:**
```bash
# Twilio credentials'ı kontrol et
docker exec -it deprem_backend python -c "
from app.config import settings
print('Account SID:', settings.TWILIO_ACCOUNT_SID)
print('Phone:', settings.TWILIO_PHONE_NUMBER)
"
```

### Problem: Whisper/Claude API hatası

**Çözüm:**
```bash
# API key'leri kontrol et
docker exec -it deprem_backend python -c "
from app.config import settings
print('OpenAI Key:', settings.OPENAI_API_KEY[:20] + '...')
print('Anthropic Key:', settings.ANTHROPIC_API_KEY[:20] + '...')
"
```

### Problem: S.O.S task başarısız oluyor

**Çözüm:**
```bash
# Celery worker loglarını detaylı incele
docker logs deprem_celery --tail 100

# Redis bağlantısını test et
docker exec -it deprem_backend python -c "
import redis
r = redis.from_url('redis://deprem_redis:6379/0')
print(r.ping())
"
```

## 📱 Mobile App Entegrasyonu

Mobile app'te S.O.S özelliğini kullanmak için:

1. **Voice Recorder Component:**
   - `expo-av` kullanarak ses kaydı yap
   - Kayıt bitince `/api/v1/sos/analyze` endpoint'ine gönder

2. **API Call:**
   ```typescript
   const formData = new FormData();
   formData.append('audio_file', {
     uri: audioUri,
     type: 'audio/m4a',
     name: 'sos_audio.m4a'
   });
   formData.append('timestamp', new Date().toISOString());
   formData.append('latitude', location.latitude.toString());
   formData.append('longitude', location.longitude.toString());

   const response = await fetch('http://your-vps-ip:8001/api/v1/sos/analyze', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${accessToken}`
     },
     body: formData
   });
   ```

3. **Status Polling:**
   - Task ID'yi al
   - `/api/v1/sos/status/{task_id}` endpoint'ini poll et
   - Status "completed" olunca sonucu göster

## 🎉 Başarı Kriterleri

- ✅ Health endpoint çalışıyor
- ✅ Register/Login çalışıyor
- ✅ Emergency contacts CRUD çalışıyor
- ✅ S.O.S analyze endpoint 202 dönüyor
- ✅ Celery task'ları işleniyor
- ✅ Firebase push notification gönderiliyor
- ✅ Twilio SMS gönderiliyor (Account SID eklenince)
- ✅ Database'de sos_records tablosu var
- ✅ Loglar temiz, hata yok

## 📞 Destek

Sorun yaşarsan:
1. Logları kontrol et
2. `.env` dosyasını kontrol et
3. API key'lerin geçerli olduğundan emin ol
4. Database migration'ların çalıştığını kontrol et
