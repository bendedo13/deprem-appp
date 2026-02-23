# 🚀 MANUEL DEPLOYMENT REHBERİ

## Twilio SMS ve Sesli S.O.S Entegrasyonu

### 1. Git Push

```bash
git add -A
git commit -m "feat: Twilio SMS ve Sesli S.O.S entegrasyonu"
git push origin main
```

### 2. VPS'e Bağlan

```bash
ssh root@46.4.123.77
```

### 3. Git Pull

```bash
cd /opt/deprem-appp
git stash
git pull origin main
```

### 4. .env Dosyasını Güncelle

```bash
cd /opt/deprem-appp/backend
nano .env
```

Şu satırları ekle/güncelle:

```bash
# Twilio (SMS/WhatsApp)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**NOT:** Gerçek Twilio bilgilerinizi kullanın (güvenlik nedeniyle buraya yazılmadı).

Kaydet ve çık: `Ctrl+X`, `Y`, `Enter`

### 5. Deployment

```bash
cd /opt/deprem-appp/deploy
./PRODUCTION_DEPLOY.sh
```

### 6. Test

```bash
# Health check
curl http://localhost:8001/health

# Backend logları
docker logs -f deprem_backend

# Celery logları
docker logs -f deprem_celery
```

## Test Komutları

### 1. Kullanıcı Kaydı

```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "full_name": "Test User"
  }'
```

### 2. Login

```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

Response'dan `access_token`'ı kopyala.

### 3. Acil Kişi Ekle

```bash
TOKEN="your_jwt_token_here"

curl -X POST http://46.4.123.77:8001/api/v1/users/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test Contact",
    "phone": "+905551234567",
    "email": "test@example.com",
    "relationship": "Arkadaş",
    "channel": "sms"
  }'
```

### 4. "Ben İyiyim" Butonu (SMS Gönderir!)

```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/i-am-safe \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "custom_message": "Ben iyiyim, endişelenmeyin!",
    "include_location": true,
    "latitude": 41.0082,
    "longitude": 28.9784
  }'
```

Bu komut acil kişilere SMS gönderecek!

### 5. S.O.S Test

```bash
# Ses dosyası yükle (Postman kullan)
# POST http://46.4.123.77:8001/api/v1/sos/analyze
# Headers: Authorization: Bearer $TOKEN
# Body: form-data
#   - audio_file: (ses dosyası)
#   - timestamp: 2024-02-24T10:30:00Z
#   - latitude: 41.0082
#   - longitude: 28.9784
```

## Özellik Durumu

✅ Twilio SMS entegrasyonu  
✅ "Ben İyiyim" SMS gönderimi  
✅ Deprem bildirimi SMS  
✅ Sesli S.O.S backend  
✅ Whisper API (speech-to-text)  
✅ Claude LLM (NLP extraction)  
✅ Mobile app S.O.S UI  

## Sorun Giderme

### Twilio SMS Gönderilmiyor

```bash
# Backend loglarını kontrol et
docker logs deprem_backend | grep -i twilio

# .env dosyasını kontrol et
docker exec deprem_backend cat .env | grep TWILIO
```

### Celery Task Çalışmıyor

```bash
# Celery loglarını kontrol et
docker logs deprem_celery

# Celery restart
docker restart deprem_celery
```

### S.O.S İşlenmiyor

```bash
# Whisper/Claude API key kontrolü
docker exec deprem_backend cat .env | grep -E "OPENAI|ANTHROPIC"

# Task durumu
docker logs deprem_celery | grep -i sos
```
