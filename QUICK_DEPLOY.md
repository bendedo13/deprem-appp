# 🚀 HIZLI DEPLOYMENT REHBERİ

## Tek Komut ile Deployment

VPS'te şu komutu çalıştır (Twilio bilgilerinle):

```bash
ssh root@46.4.123.77 'cd /opt/deprem-appp && git pull && chmod +x deploy/UPDATE_TWILIO_AND_DEPLOY.sh && ./deploy/UPDATE_TWILIO_AND_DEPLOY.sh YOUR_ACCOUNT_SID YOUR_AUTH_TOKEN YOUR_PHONE_NUMBER'
```

**NOT:** YOUR_ACCOUNT_SID, YOUR_AUTH_TOKEN ve YOUR_PHONE_NUMBER'ı kendi Twilio bilgilerinle değiştir.

## Veya Adım Adım:

### 1. VPS'e Bağlan
```bash
ssh root@46.4.123.77
```

### 2. Proje Dizinine Git
```bash
cd /opt/deprem-appp
```

### 3. Git Pull
```bash
git pull origin main
```

### 4. Script'i Çalıştırılabilir Yap
```bash
chmod +x deploy/UPDATE_TWILIO_AND_DEPLOY.sh
```

### 5. Deployment Yap (Twilio Bilgileri ile)
```bash
./deploy/UPDATE_TWILIO_AND_DEPLOY.sh YOUR_ACCOUNT_SID YOUR_AUTH_TOKEN YOUR_PHONE_NUMBER
```

**NOT:** YOUR_ACCOUNT_SID, YOUR_AUTH_TOKEN ve YOUR_PHONE_NUMBER'ı kendi Twilio bilgilerinle değiştir.

## Script Ne Yapar?

1. ✅ Git pull yapar
2. ✅ `.env` dosyasına Twilio bilgilerini ekler/günceller
3. ✅ Docker container'ları durdurur
4. ✅ Yeni image build eder (--no-cache)
5. ✅ Container'ları başlatır
6. ✅ Database migration yapar
7. ✅ Health check yapar
8. ✅ Test komutlarını gösterir

## Deployment Sonrası Test

### 1. Health Check
```bash
curl http://46.4.123.77:8001/health
```

Beklenen: `{"status":"ok","version":"1.0.0"}`

### 2. Yeni Kullanıcı Kaydı
```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test2@example.com","password":"test123456","full_name":"Test User 2"}'
```

### 3. Login
```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test2@example.com","password":"test123456"}'
```

Response'dan `access_token`'ı kopyala ve TOKEN değişkenine ata:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Acil Kişi Ekle
```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Contact","phone":"+905551234567","email":"test@example.com","relationship":"Arkadaş","channel":"sms"}'
```

### 5. "Ben İyiyim" Butonu (SMS Gönderir!)
```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/i-am-safe \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"custom_message":"Ben iyiyim!","include_location":true,"latitude":41.0082,"longitude":28.9784}'
```

Bu komut acil kişiye SMS gönderecek!

## Logları İzle

```bash
# Backend logları
docker logs -f deprem_backend

# Celery logları (SMS gönderimi için)
docker logs -f deprem_celery

# Tüm container'lar
docker ps
```

## Sorun Giderme

### Twilio SMS Gönderilmiyor

```bash
# .env dosyasını kontrol et
docker exec deprem_backend cat .env | grep TWILIO

# Backend loglarında Twilio hatası var mı?
docker logs deprem_backend | grep -i twilio

# Celery loglarında hata var mı?
docker logs deprem_celery | grep -i twilio
```

### Container Başlamıyor

```bash
# Container durumunu kontrol et
docker ps -a

# Logları kontrol et
docker logs deprem_backend
docker logs deprem_celery

# Yeniden başlat
cd /opt/deprem-appp/deploy
docker compose -f docker-compose.prod.yml restart
```

### Migration Hatası

```bash
# Manuel migration
docker exec deprem_backend alembic upgrade head

# Migration geçmişi
docker exec deprem_backend alembic current
```

## Önemli Notlar

- ✅ Twilio bilgileri script içinde güvenli şekilde saklanıyor
- ✅ `.env` dosyası otomatik güncelleniyor
- ✅ Docker no-cache build yapılıyor (eski kod problemi yok)
- ✅ Health check otomatik yapılıyor
- ⚠️ SMS gönderimi için Twilio hesabında kredi olmalı
- ⚠️ Test için gerçek telefon numarası kullan

## Başarı Kriterleri

Deployment başarılı sayılır eğer:

1. ✅ Health check 200 OK dönüyor
2. ✅ Register/Login çalışıyor
3. ✅ Acil kişi eklenebiliyor
4. ✅ "Ben İyiyim" butonu SMS gönderiyor
5. ✅ Container'lar "Up" durumunda

## Hızlı Komutlar

```bash
# Tek satırda deployment
ssh root@46.4.123.77 'cd /opt/deprem-appp && git pull && chmod +x deploy/UPDATE_TWILIO_AND_DEPLOY.sh && ./deploy/UPDATE_TWILIO_AND_DEPLOY.sh'

# Sadece restart
ssh root@46.4.123.77 'cd /opt/deprem-appp/deploy && docker compose -f docker-compose.prod.yml restart'

# Logları izle
ssh root@46.4.123.77 'docker logs -f deprem_backend'
```
