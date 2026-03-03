# 🚀 VPS DEPLOYMENT - ADIM ADIM EXECUTIONhalt

Bu dosya VPS'de deployment'ı çalıştırmak için gerekli tüm komutları içerir.

## 🔴 SORUNLAR VE ÇÖZÜMLER

### Sorun 1: "ConnectionRefusedError: connect to port 5432"
**Nedeni:** PostgreSQL local'de çalışmıyor (standalone Python'la başlamaya çalıştığın için)
**Çözüm:** Docker Compose ile PostgreSQL container'da çalışacak

### Sorun 2: "curl: (7) Failed to connect to 46.4.123.77 port 8086"
**Nedeni:** Backend 8086'da değil, Docker'ın 8001'de olacak
**Çözüm:** Docker Compose'le başlat, port 8001'i kullan

### Sorun 3: "python3 -m app.main" çalışmıyor
**Nedeni:** Standalone Python mode çalıştırma
**Çözüm:** Docker Compose kullan

---

## ✅ VPS'DE ÇALIŞTIRILACAK KOMUTLAR (SIRASI ÖNEMLİ!)

### 1️⃣ VPS'ye SSH ile Bağlan

```bash
ssh root@46.4.123.77
```

Parola isteyecek, gir (veya key-based auth kullan)

---

### 2️⃣ Önceki Process'leri Temizle

```bash
# Çalışan Python process'lerini durdur
pkill -f "python3 -m app.main" || true
pkill -f "uvicorn" || true

# Kontrol et (boş list dönmeli)
ps aux | grep "python\|uvicorn" | grep -v grep
```

---

### 3️⃣ Deploy Dizinine Git ve OTOMATIK FIX'i Çalıştır

```bash
cd /opt/deprem-appp/deploy

# Script'i executable yap
chmod +x OTOMATIK_FIX.sh

# Otomatik deployment'ı çalıştır (TÜM HER ŞEYİ YAPACAK!)
./OTOMATIK_FIX.sh
```

Bu script şunları yapacak:
- ✅ Eski container'ları durdurur
- ✅ .env dosyası oluşturur (veya kullan)
- ✅ Docker image'larını build eder
- ✅ PostgreSQL, Redis, Backend container'larını başlatır
- ✅ Health check yapar

---

### 4️⃣ Log'ları Takip Et (Deployment sırasında)

Başka bir terminal'de veya eğer yukarıdaki script tamamlanmışsa:

```bash
# Backend log'larını izle (live)
docker logs -f deprem_backend

# Durdurmak için: Ctrl+C
```

Başarıyla başlamışsa şöyle yazmalı:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

---

### 5️⃣ Health Check (Bağlantı Tamamlandıktan Sonra)

```bash
# Backend health check
curl http://46.4.123.77:8001/api/v1/health

# Beklenen çıktı:
# {"status":"ok"}

# Eğer "Connection refused" alırsan:
# - Container'lar çalışıyor mu? docker ps
# - Backend log'ları : docker logs deprem_backend
```

---

### 6️⃣ Register Öğretmeyin

```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "full_name": "Test User"
  }'
```

Başarılı response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

**Token'ı kopyala, sonraki testler için kullanacağız!**

---

### 7️⃣ Google OAuth Test

```bash
# GOOGLE TOKEN buraya ekle (bilgisayardan aldığın gerçek token)
GOOGLE_TOKEN="real_google_token_from_frontend"

curl -X POST http://46.4.123.77:8001/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$GOOGLE_TOKEN\",
    \"device_type\": \"web\"
  }"
```

---

### 8️⃣ Rate Limiting Test (5 başarısız login = 429)

```bash
# Register'dan aldığın token (veya yeni oluştur)
TOKEN="your_jwt_token_from_step_5"

# Rate limit'i test et: 5 başarısız login
for i in {1..5}; do
  echo "Attempt $i:"
  curl -X POST http://46.4.123.77:8001/api/v1/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@test.com","password":"wrongpass"}' \
    -w "\nStatus: %{http_code}\n\n"
done

# 6. denemede 429 almalısın
echo "Attempt 6 (should be 429):"
curl -X POST http://46.4.123.77:8001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrongpass"}' \
  -w "\nStatus: %{http_code}\n"
```

**Status bilgisi:**
- 200 = İyi gitti
- 201 = Oluşturuldu
- 401 = Unauthorized (yanlış şifre)
- 429 = Too Many Requests (rate limit hit!)

---

### 9️⃣ Frontend/Mobile Uygulaması Güncelleme

OAuth endpoint'inizi şu URL'ye yönlendir:

```
http://46.4.123.77:8001/api/v1/users/oauth/google
```

JavaScript örneği:
```javascript
const googleToken = await getGoogleToken(); // Frontend'den al
const response = await fetch('http://46.4.123.77:8001/api/v1/users/oauth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    token: googleToken,
    device_type: 'web'
  })
});
const jwtToken = (await response.json()).access_token;
```

---

### 🔟 Kontrol Paneli (Sistem Status)

```bash
# Container'lar çalışıyor mu?
docker ps

# CPU/Memory kullanımı
docker stats

# Container specific log'ları
docker logs -n 50 deprem_backend    # Son 50 satır
docker logs -n 50 deprem_redis
docker logs -n 50 deprem_db

# Database bağlantısı var mı?
docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT NOW();"

# Redis bağlantısı var mı?
docker exec deprem_redis redis-cli ping
```

---

## 🛑 ACIL DURUM - Şeyler Yanlış Giderse

### Hepsi Dur ve Yeniden Başla

```bash
# Container'ları durdur
docker compose -f docker-compose.prod.yml down

# Volume'leri temizle (VERİ KAYBEDECEK!)
docker compose -f docker-compose.prod.yml down -v

# Yeniden başlat
docker compose -f docker-compose.prod.yml up -d
```

### Log'larda Error Görürsen

```bash
# Backend error'ları gör
docker logs deprem_backend 2>&1 | tail -100

# Database error'ları gör
docker logs deprem_db 2>&1 | tail -50

# Redis error'ları gör
docker logs deprem_redis 2>&1 | tail -50
```

### Tek Container'ı Yeniden Başlat

```bash
# Sadece backend yeniden başla
docker compose -f docker-compose.prod.yml restart backend

# Sadece database yeniden başla
docker compose -f docker-compose.prod.yml restart deprem_db

# Sadece redis yeniden başla
docker compose -f docker-compose.prod.yml restart deprem_redis
```

---

## 📊 ÜRÜN OLARAK DEPLOYMENT

Deployment başarılıysa:

| Servis | URL | Status |
|--------|-----|--------|
| Backend API | http://46.4.123.77:8001 | ✅ |
| Frontend | http://46.4.123.77:8002 | ✅ |
| PostgreSQL | deprem_db:5432 | ✅ (Internal) |
| Redis | deprem_redis:6379 | ✅ (Internal) |
| OAuth Endpoint | /api/v1/users/oauth/google | ✅ |
| Rate Limit | 5 attempts/15 min | ✅ |

---

## 📌 DOSYALARIN YERLERİ (VPS'DE)

```
/opt/deprem-appp/
├── .env                       ← (ÖNEMLİ: Burası!)
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── Dockerfile
├── deploy/
│   ├── docker-compose.prod.yml  ← (Buradan çalıştır)
│   ├── OTOMATIK_FIX.sh          ← (Bunu çalıştır)
│   └── PRODUCTION_DEPLOY.sh
└── [diğer dosyalar]
```

---

## 🎯 QUICK TEST (Adım Adım)

Deployment tamamlandıktan sonra sırasıyla çalıştır:

```bash
# 1. Health Check
curl http://46.4.123.77:8001/api/v1/health

# Çıktı: {"status":"ok"}

# 2. Container Status
docker ps | grep -E "deprem_backend|deprem_db|deprem_redis"

# 3. Database Bağlantı
docker exec deprem_db psql -U deprem_user deprem_db -c "SELECT version();"

# 4. Redis Bağlantı
docker exec deprem_redis redis-cli ping

# Çıktı: PONG

# 5. Backend Log'ları
docker logs --tail 20 deprem_backend
```

---

## 🔥 EĞER HALA HOŞ GELDIN SORUN YAŞARSAN

VPS Terminal'de:

```bash
# 1. Hepsi sıfırla
cd /opt/deprem-appp/deploy
docker compose -f docker-compose.prod.yml down -v

# 2. Tekrar başla
docker compose -f docker-compose.prod.yml up -d

# 3. 15 saniye bekle
sleep 15

# 4. Health check
curl http://46.4.123.77:8001/api/v1/health
```

Hala sorun varsa:
- Backend log'ları: `docker logs deprem_backend | grep -i error`
- Database log'ları: `docker logs deprem_db | grep -i error`
- Redis log'ları: `docker logs deprem_redis | grep -i error`

---

**VPS IP:** 46.4.123.77  
**Backend Port:** 8001  
**Frontend Port:** 8002  
**Database:** PostgreSQL (TimescaleDB) - Docker  
**Cache:** Redis - Docker  

✅ **TÜMAĞI HAZIR!**
