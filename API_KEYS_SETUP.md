# API Keys Setup Guide

Bu dokümanda Deprem App için gerekli tüm API key'lerinin nasıl alınacağı ve yapılandırılacağı açıklanmaktadır.

## ✅ Tamamlanan API Keys

### 1. Firebase (Push Notifications) ✅
**Durum:** Yapılandırıldı  
**Kullanım:** Mobil uygulama push bildirimleri

Firebase credentials zaten sağlandı ve `.env.example` dosyasına eklendi.

### 2. OpenAI (Whisper for S.O.S Voice) ✅
**Durum:** Yapılandırıldı  
**Kullanım:** S.O.S sesli mesajları metne çevirme

API key sağlandı ve yapılandırıldı.

### 3. Anthropic Claude (NLP for S.O.S Voice) ✅
**Durum:** Yapılandırıldı  
**Kullanım:** S.O.S metinlerinden yapılandırılmış veri çıkarma

API key sağlandı ve yapılandırıldı.

### 4. Twilio (SMS/WhatsApp) ✅ TAMAMLANDI
**Durum:** Yapılandırıldı  
**Kullanım:** Acil kişilere SMS ve WhatsApp mesajı gönderme

#### Twilio Bilgileri:
Twilio hesabı aktif ve VPS'te yapılandırıldı!

✅ Account SID, Auth Token ve Phone Number VPS'te .env dosyasına eklendi.

## 📝 .env Dosyası Yapılandırması

VPS'teki `/opt/deprem-appp/backend/.env` dosyasını aşağıdaki gibi güncelle:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://deprem_user:deprem2024secure@localhost:5432/deprem_db

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
SECRET_KEY=your-super-secret-key-min-32-chars-change-this-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Firebase (Push Notifications) ✅
FIREBASE_PROJECT_ID=depremapp-29518
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDvtBO7yiw05fJC\nqJERKtov6ph5eVgqxv9g7HBy4s1TI1/CQeHoh6RqaEwDmi52fqjzfynMWH5GXoal\nYszpvBKoqkHXv9nS8zDGjJ/MX/MCC19AHNOqlMkHVZPFUnqFBJxFMsrs03DCFBME\ncIzc6TcTQoXZKfgBWSw+BxTAJqXgmPvvD0oaw1/+aAjsSOWtOZxeHU7ZUr2WF6Oh\n+RqylVJvvMdni8RkHzO2FycX7ml2PF3y8Hz+qiykuR8/POzIcvmu8fhwEEFWx0g7\nv8Q8Ns1OtcRRaX18+G09InOrfhRGTxPja2Nk68yKLBmFHQZT1vp4Qc/f+twpx6LD\nyiXGQM3pAgMBAAECggEABBBCcWGJBFCNndGru+XFEyDf+tcyxm7fL25yrY/ouSsV\nWX6ybLW39NHV0A3SEdIt3Qrf04YAhgLeN3mITcIRcuiH+zdWYvwabJM/tkA+J1+3\n+qdCc1bYXZZ2zdaLGywr1gR5ajBfbfrXI7EgwjH17A6ppDfQ63zughKuqF8/WqJU\n5ORJNNASTGUtNQXVKGs6vUK8mpOewZWc8zRGUSreaFkQB372jEQfhi7wrc81TLjU\nJTlqsIT3SwvyhIXLiCXDzTe/x9GTUEdJMvg8Kh6N+16UEg5c72kjMXvKz54ZYgLJ\noDeghMrAI9MVqNgOrY4kuVsmcLqULlysy1oAWwvbHQKBgQD4uGzscwKjWnbI6UXR\nsKLcDe2h42+RLtN07EyA7xEd55lWOS094S/IuztLAdmBUXIvEhao6QGUclt6s9b5\nioPO/o+rwwwU07mO3+0ROgvJcysUJfOALVicTdypScRKcTB6Iuo5o2RpZYUZzr9V\nf/YI2/NuT6xWquHFz46m/De80wKBgQD2uBcq8ICnVX01XcofOC3fTrGqWofZZ2lj\nScjSk4utOTm0y/r4+pm/tHkKOoO3FGZwxGEbTM8eTM8cfJRArWQAwYnuw0kKNmo+\ne/t0BXVrGsdrIIf26Uy5hNIM4SueBtoEqslYqmysg/7or7+7DjeEvF0s0x//LDWN\nrrEUF6Ok0wKBgQDhGnlqnsS6d3ueZpHMMGOVaf2yURd+fLTg06SB5NzHBf9fbCwo\nHxCSSfJl9myWf9IqC+L6SLgnVEC7EtzzyIt24inBuKvMhbshNkVnG/PjBRruB1MU\npPXXsRiPFrZS8ZKAV+1I8TpFsZ3/N4EvrrpMVlVBd1ZwsgPYdfuT4h3IBQKBgCeH\nLw8OIU6t/7WBJVUDJzZT4Vstzf4i91uVArvaL9K9DGXPGJKzc9anD413+opmllMS\n44wALl7oZ3Zk70u9e/wzBepfF2Cvfy4rpwnbpghW7gRX3fDNSCGhChZOLTLQXjXJ\nNyEhjO/G5hxZrBpIGNUHaNY5rTKw3pOonW5eqzVJAoGBAMGwI5JVDXrlcIJ7bAbP\n16rpkxR59vm8IVKcjzNrEucUi/3ouN57PJKIAMeS35k5bj89QN+2q7G1miO63rsB\n6r1nSJAiumHevfGoahRfwpBnnIl2+a9Gjgf8JEkowyU68eGOjkaCkVkpsw177RcB\nAb3vDV0PJQni352v6x+7s2D2\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@depremapp-29518.iam.gserviceaccount.com

# Twilio (SMS/WhatsApp) ✅ TAMAMLANDI
# VPS'te yapılandırıldı - Güvenlik nedeniyle buraya yazılmadı
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI (Whisper) ✅
OPENAI_API_KEY=sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENAI_WHISPER_MODEL=whisper-1
OPENAI_WHISPER_LANGUAGE=tr

# Anthropic Claude (NLP) ✅
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ANTHROPIC_MODEL=claude-3-haiku-20240307

# S.O.S Audio Storage
SOS_AUDIO_STORAGE_PATH=/app/sos_audio
SOS_AUDIO_BASE_URL=https://your-domain.com/sos_audio
SOS_RATE_LIMIT_PER_HOUR=10

# API URLs
AFAD_API_URL=https://deprem.afad.gov.tr/apiv2
KANDILLI_API_URL=https://api.orhanaydogdu.com.tr
USGS_API_URL=https://earthquake.usgs.gov
EMSC_API_URL=https://www.seismicportal.eu/fdsnws/event/1

# CORS
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000

# Debug
DEBUG=false
```

## 🚀 Deployment Sonrası Test

Tüm API key'leri yapılandırdıktan sonra:

1. **Backend'i Yeniden Başlat:**
   ```bash
   cd /opt/deprem-appp/deploy
   ./PRODUCTION_DEPLOY.sh
   ```

2. **API Endpoint'lerini Test Et:**
   ```bash
   # Health check
   curl http://localhost:8001/api/v1/health
   
   # Register test user
   curl -X POST http://localhost:8001/api/v1/users/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123456"}'
   
   # Login
   curl -X POST http://localhost:8001/api/v1/users/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123456"}'
   ```

3. **S.O.S Endpoint'ini Test Et:**
   ```bash
   # S.O.S analyze (multipart/form-data ile ses dosyası gönder)
   curl -X POST http://localhost:8001/api/v1/sos/analyze \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "audio_file=@test_audio.m4a" \
     -F "timestamp=2024-02-23T10:30:00Z" \
     -F "latitude=41.0082" \
     -F "longitude=28.9784"
   ```

## 📊 Özellik Durumu

| Özellik | Backend | Mobile | Test | Durum |
|---------|---------|--------|------|-------|
| Register/Login | ✅ | ✅ | ⏳ | Hazır |
| Emergency Contacts | ✅ | ⏳ | ⏳ | Backend hazır |
| "I'm Safe" Button | ✅ | ⏳ | ⏳ | Backend hazır |
| FCM Push Notifications | ✅ | ✅ | ⏳ | Yapılandırıldı |
| S.O.S Voice Alert | ✅ | ⏳ | ⏳ | Backend hazır |
| Twilio SMS | ✅ | N/A | ⏳ | Yapılandırıldı |

## ⚠️ Önemli Notlar

1. **Twilio Account SID ve Phone Number olmadan:**
   - S.O.S bildirimleri SMS olarak gönderilemez
   - Sadece FCM push notification çalışır
   - Emergency contacts'a SMS gönderimi başarısız olur

2. **Production'da:**
   - `SECRET_KEY`'i güçlü bir değerle değiştir
   - `ALLOWED_ORIGINS`'i gerçek domain'inle güncelle
   - `SOS_AUDIO_BASE_URL`'i gerçek domain'inle güncelle
   - `DEBUG=false` olarak ayarla

3. **Güvenlik:**
   - `.env` dosyasını asla Git'e commit etme
   - API key'leri kimseyle paylaşma
   - Production'da HTTPS kullan

## 📞 Destek

Sorun yaşarsan:
1. Backend loglarını kontrol et: `docker logs deprem_backend`
2. Celery worker loglarını kontrol et: `docker logs deprem_celery`
3. Redis bağlantısını test et: `redis-cli ping`
