# 🔧 KALICI FIX VE DOCKER DEPLOYMENT REHBERI

## ⚠️ SORUN NEDENI

Yapılan hatalar:
1. ❌ **Doğru olmayan**: `python3 -m app.main` komutu terminal'de çalıştırma  
2. ❌ **Nedeni**: PostgreSQL ve Redis çalışmıyordu (Docker container'da olması gerekiyor)
3. ❌ **Sonuç**: `ConnectionRefusedError: connect to port 5432 failed`

Doğru yol:
- ✅ Docker Compose kullanılmalı (PostgreSQL + Redis + Backend + Celery docker container'da)
- ✅ Hepsi aynı Docker network'te iletişim kuruyor
- ✅ Port forwarding: Backend 8001 (dışarıdan erişim)

---

## 🚀 ADIM 1: KALICI FIX - Önceki Process'i Temizle

VPS'de SSH ile bağlan:
```bash
ssh root@46.4.123.77
```

### 1.1 Çalışan Python Process'leri Durdur

```bash
# Tüm Python app.main process'lerini bul ve durdur
pkill -f "python3 -m app.main" || true
pkill -f "uvicorn" || true

# Kontrol et (boş liste dönmeli)
ps aux | grep python
```

### 1.2 Eski Docker Container'ları Kaldır (eğer varsa)

```bash
cd /opt/deprem-appp/deploy

# Container'ları durdur
docker compose -f docker-compose.prod.yml down

# Dangling image'ları temizle
docker system prune -f

# Kontrol et
docker ps -a
```

---

## 📝 ADIM 2: .env Dosyası Oluştur

### 2.1 .env Dosyasının Yolu

```bash
cd /opt/deprem-appp
# NOT: Backend'te değil, root project dizininde olmalı!
```

### 2.2 .env Dosyası Oluştur ve Doldur

```bash
cat > .env << 'EOF'
# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════
DB_PASSWORD=deprem_secure_prod_2024

# ═══════════════════════════════════════════════════════════════
# JWT & SECURITY
# ═══════════════════════════════════════════════════════════════
SECRET_KEY=deprem-super-secret-key-min-32-chars-CHANGE-IN-PRODUCTION-2024

# ═══════════════════════════════════════════════════════════════
# GOOGLE OAUTH
# ═══════════════════════════════════════════════════════════════
GOOGLE_CLIENT_ID=775124568904-flr9bo452no12v9giofdlb743m8gvqk4.apps.googleusercontent.com
GOOGLE_API_KEY=AIzaSyCDqiBMaJd5g4FjAxWTpmJQe2tQX66dBoY
FIREBASE_PROJECT_ID=depremapp-29518

# ═══════════════════════════════════════════════════════════════
# TWILIO (SMS/WhatsApp)
# ═══════════════════════════════════════════════════════════════
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# ═══════════════════════════════════════════════════════════════
# EXTERNAL SERVICES
# ═══════════════════════════════════════════════════════════════
OPENAI_API_KEY=sk-proj-your-key-here
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# ═══════════════════════════════════════════════════════════════
# FRONTEND URL
# ═══════════════════════════════════════════════════════════════
FRONTEND_URL=http://46.4.123.77:8002

# ═══════════════════════════════════════════════════════════════
# BACKEND URL
# ═══════════════════════════════════════════════════════════════
BACKEND_API_URL=http://46.4.123.77:8001
EOF
```

### 2.3 Dosyayı Doğrula

```bash
cat .env
```

Çıktı şöyle olmalı:
```
# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════
DB_PASSWORD=deprem_secure_prod_2024
...
```

---

## 🐳 ADIM 3: Docker Compose ile Deployment

### 3.1 Deploy Dizinine Git

```bash
cd /opt/deprem-appp/deploy
pwd  # /opt/deprem-appp/deploy yazmalı
```

### 3.2 Docker Compose ile Pull Değerleri Ayarla

**ÖNEMLI:** Docker Compose .env dosyasını parent directory'den okur!

```bash
# .env dosyası /opt/deprem-appp/.env'de olmalı
ls -la /opt/deprem-appp/.env  # Kontrol et

# Deploy directory'den komut çalıştır (docker compose parent .env'i bulur)
```

### 3.3 Container'ları Başlat (Docker Compose)

#### Option A: Basit Docker Compose (Önerilen)

```bash
cd /opt/deprem-appp/deploy

# Build ve başlat (ilk kez)
docker compose -f docker-compose.prod.yml up -d

# Log'ları takip et
docker compose -f docker-compose.prod.yml logs -f

# İçinde çıkmak: Ctrl+C
```

#### Option B: PRODUCTION_DEPLOY.sh Script'i Kullan (Daha güvenli)

```bash
cd /opt/deprem-appp/deploy

# Dosya executable yap
chmod +x PRODUCTION_DEPLOY.sh

# Deploy script'ini çalıştır
./PRODUCTION_DEPLOY.sh
```

Script'in yapacağı:
1. Git'ten son değişiklikleri çeker
2. Docker container'ları durdurur
3. Image'ları rebuild eder (--no-cache)
4. Database migration'larını çalıştırır
5. Container'ları başlatır
6. Health check yapar

---

## ✅ ADIM 4: Deployment'ı Doğrula

### 4.1 Container'lar Çalışıyor mu?

```bash
docker ps
```

Çıktı şöyle olmalı:
```
CONTAINER ID   IMAGE                          COMMAND                  PORTS
abc123...      deprem-appp-backend            "uvicorn app.main..."   0.0.0.0:8001->8000/tcp
def456...      redis:7-alpine                 "redis-server..."       
ghi789...      timescale/timescaledb:...      "postgres"              
```

### 4.2 Container Log'larını Kontrol Et

```bash
# Backend log'larını gör
docker logs deprem_backend

# Son 50 satırı görmek
docker logs --tail 50 deprem_backend

# Gerçek zamanlı izlemek
docker logs -f deprem_backend
```

Backend başarıyla başladıysa şöyle yazmalı:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### 4.3 Database Connection'ı Kontrol Et

```bash
# Database container'a bağlan
docker exec -it deprem_db psql -U deprem_user -d deprem_db -c "SELECT NOW();"

# Çıktı: 2024-03-04 10:30:00.123456 (epoch time'u lazım değil, sadece bağlantı doğrulaması)
```

### 4.4 Redis Connection'ı Kontrol Et

```bash
# Redis container'a bağlan
docker exec -it deprem_redis redis-cli ping

# Çıktı: PONG
```

---

## 🧪 ADIM 5: API Endpoints'i Test Et

### 5.1 Health Check

```bash
curl http://46.4.123.77:8001/api/v1/health
```

Beklenen çıktı:
```json
{"status":"ok"}
```

### 5.2 Register Test

```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "full_name": "Test User"
  }'
```

Response'dan token'ı kopyala:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

### 5.3 Google OAuth Test

```bash
TOKEN="your_real_google_token_here"

curl -X POST http://46.4.123.77:8001/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$TOKEN\",
    \"device_type\": \"web\"
  }"
```

Response:
```json
{
  "access_token": "...",
  "token_type": "bearer"
}
```

### 5.4 Rate Limiting Test

```bash
# 5 kez başarısız login dene
for i in {1..5}; do
  curl -X POST http://46.4.123.77:8001/api/v1/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@test.com","password":"wrongpass"}' \
    -w "\nStatus: %{http_code}\n"
done

# 6. denemede 429 (Too Many Requests) almalısın
curl -X POST http://46.4.123.77:8001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@test.com","password":"wrongpass"}'
  
# Çıktı: 429 status code + "Too many requests"
```

---

## 🔄 ADIM 6: Auto-Restart Konfigürasyonu

Docker Compose'de `restart: unless-stopped` var, yani:
- Container crash'erse otomatik yeniden başlar
- VPS yeniden başlatılırsa container'lar otomatik başlar

Bunu doğrulamak için:

### 6.1 Backend Container'ı Durdur ve Kontrol Et

```bash
# Container'ı durdur
docker stop deprem_backend

# 5 saniye bekle
sleep 5

# Kontrol et (yeniden başlamış olmalı)
docker ps | grep deprem_backend

# Çıktı: deprem_backend container'ının yeniden başladığını görmeli
```

### 6.2 VPS'i Restart Ettir ve Kontrol Et

```bash
# Logout zaten yapacak ama önemli not
# VPS restart'ında docker container'lar otomatik başlayacak

# Restart etmek için:
# sudo reboot

# 30 saniye sonra yeniden SSH bağlan ve kontrol et:
ssh root@46.4.123.77
docker ps
curl http://46.4.123.77:8001/api/v1/health
```

---

## 📊 ADIM 7: Monitoring ve Logs

### 7.1 Tüm Container'ların Status'unu İzle

```bash
# Container'lar ne kadar memory/CPU kullanıyor?
docker stats

# Çıktı:
# CONTAINER ID   NAME              CPU %     MEM USAGE / LIMIT
# abc123...      deprem_backend    0.5%      150MB / 1GB
# def456...      deprem_redis      0.1%      10MB / 1GB
# ghi789...      deprem_db         1.2%      200MB / 1GB
```

### 7.2 Backend Hatalarını İzle (Real-time)

```bash
docker logs -f --tail 100 deprem_backend
```

### 7.3 Celery (Background Job) Log'larını İzle

```bash
docker logs -f --tail 100 deprem_celery
```

---

## 🆘 SORUN GIDERME

### Problem: "Connection refused on port 5432"

**Çözüm:**
```bash
# 1. Container'ları kontrol et
docker ps -a

# 2. Database health check
docker exec deprem_db pg_isready -U deprem_user

# 3. Container'ları yeniden başlat
docker compose -f docker-compose.prod.yml restart deprem_db

# 4. Log'ları kontrol et
docker logs deprem_db
```

### Problem: "Connection refused on port 8001"

**Çözüm:**
```bash
# 1. Backend container çalışıyor mu?
docker ps | grep deprem_backend

# 2. Backend log'larını gör
docker logs deprem_backend

# 3. Port açık mı? (firewall)
netstat -tulpn | grep 8001

# 4. Docker network
docker network inspect deprem_net
```

### Problem: ".env dosyası okunmuyor"

**Çözüm:**
```bash
# .env MUTLAKA /opt/deprem-appp/.env'de olmalı
ls -la /opt/deprem-appp/.env

# Deploy directory'nden komut çalıştır
cd /opt/deprem-appp/deploy
docker compose -f docker-compose.prod.yml config | head -50
# DATABASE_URL değerini göreceksin, .env'i okumuşsa şunun içinde olacak
```

### Problem: "Database migration Error"

**Çözüm:**
```bash
# Database'i reset et (BİRLİKTE VERİ KAYBEDECEK!)
docker exec deprem_db dropdb -U deprem_user deprem_db || true
docker exec deprem_db createdb -U deprem_user deprem_db

# Backend'i yeniden başlat
docker compose -f docker-compose.prod.yml restart backend
```

---

## ✨ OZET - Hılı Başlangıç (Copy-Paste)

```bash
# 1. VPS'ye bağlan
ssh root@46.4.123.77

# 2. Önceki process'leri durdur
pkill -f "python3 -m app.main" || true
pkill -f "uvicorn" || true

# 3. Deploy dizinine git
cd /opt/deprem-appp/deploy

# 4. Container'ları durdur ve temizle
docker compose -f docker-compose.prod.yml down

# 5. .env dosyası var mı kontrol et
ls -la /opt/deprem-appp/.env

# 6. Container'ları başlat
docker compose -f docker-compose.prod.yml up -d

# 7. Log'ları takip et (10 saniye izle)
docker logs -f --tail 50 deprem_backend

# 8. Health check (Ctrl+C ile çıkıldıktan sonra)
curl http://46.4.123.77:8001/api/v1/health

# Çıktı: {"status":"ok"} yazmalı
```

---

## 📌 ÖNEMLİ NOTLAR

1. **PORT FARKI:**
   - ❌ **YANLIŞ**: 8086 port'u (standalone Python için)
   - ✅ **DOĞRU**: 8001 port'u (Docker Compose ile)

2. **.env Dosyasının Yeri:**
   - ❌ **YANLIŞ**: `/opt/deprem-appp/backend/.env`
   - ✅ **DOĞRU**: `/opt/deprem-appp/.env`

3. **Komut'u neredan çalıştırmalısın:**
   - ❌ **YANLIŞ**: `/opt/deprem-appp/backend/` dizininden `python3 -m app.main`
   - ✅ **DOĞRU**: `/opt/deprem-appp/deploy/` dizininden `docker compose -f docker-compose.prod.yml`

4. **Database Connection String:**
   - Standalone'da: `postgresql://localhost:5432` (ÇALIŞMAZ)
   - Docker'da: `postgresql://deprem_db:5432` (Çalışır - internal Docker network)

---

## 🎯 YAPILMASI GEREKEN (Step-by-Step)

1. ✅ VPS'ye SSH bağlan
2. ✅ Önceki process'leri durdur
3. ✅ Deploy directory'ne git
4. ✅ .env dosyası oluştur (veya kontrol et)
5. ✅ Docker Compose ile container'ları başlat
6. ✅ Health check yap (200 OK almalısın)
7. ✅ Register ve Login test et
8. ✅ OAuth test et
9. ✅ Rate limiting test et
10. ✅ Log'ları takip et (error var mı?)

---

**Son Güncelleme:** 04 Mart 2026  
**Status:** ✅ HAZIR DEPLOYMENT  
**VPS IP:** 46.4.123.77  
**Backend Port:** 8001
