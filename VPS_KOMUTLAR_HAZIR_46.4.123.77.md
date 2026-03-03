# 🚀 VPS Deployment - HAZIR KOMUTLAR (46.4.123.77)

**IP**: `46.4.123.77`  
**Kullanıcı**: `root`  
**Tarih**: Mart 4, 2026  

---

## ⚡ HEMEN BAŞLAT (3 adım - 30 dakika)

### ADIM 1️⃣: SSH ile VPS'ye Bağlan

```bash
ssh root@46.4.123.77
```

**Beklenen çıktı**:
```
Welcome to Ubuntu 22.04 LTS
Last login: ...
root@ubuntu:/opt/deprem-appp#
```

**Kullanıcı adı**: `root`  
**Şifre**: SSH key veya şifren

---

### ADIM 2️⃣: Dependency'leri Yükle (VPS'de SSH'den sonra)

```bash
# 1. Backend dizinine git
cd /opt/deprem-appp/backend

# 2. Pip güncelle (kök uyarılarını engelle)
pip3 install --upgrade pip --quiet 2>/dev/null

# 3. Tüm paketleri yükle (2-3 dakika)
echo "Paketler yükleniyor... (2-3 dakika)"
pip3 install -r requirements.txt --quiet

# 4. Kontrol et
echo "✓ Kontrol ediliyor..."
python3 -c "import google.auth; print('✓ Google Auth'); import fastapi; print('✓ FastAPI'); import redis.asyncio; print('✓ Redis')" 2>/dev/null || echo "Bazı paketler kurulmayabilir"
```

---

### ADIM 3️⃣: .env Dosyasını Oluştur

```bash
# VPS'nin root'una dön
cd /opt/deprem-appp

# .env oluştur
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/depremapp_db
REDIS_URL=redis://localhost:6379/0

# Google OAuth
GOOGLE_CLIENT_ID=775124568904-flr9bo452no12v9giofdlb743m8gvqk4.apps.googleusercontent.com
GOOGLE_API_KEY=AIzaSyCDqiBMaJd5g4FjAxWTpmJQe2tQX66dBoY
FIREBASE_PROJECT_ID=depremapp-29518

# Security
SECRET_KEY=Benalan.1

# Server
BACKEND_PORT=8086
DEBUG=False
WORKERS=4
EOF

# İzinleri düzelt
chmod 600 .env

echo "✓ .env oluşturuldu"
```

---

### ADIM 4️⃣: Database Migrasyonları

```bash
# Backend dizinine git
cd /opt/deprem-appp/backend

# Migrasyonları çalıştır
echo "Migrasyonlar uygulanıyor..."
python3 -m alembic upgrade head

# Kontrol et - tablolar var mı?
echo ""
echo "Database tabloları:"
psql -U postgres -d depremapp_db -c "\dt" | head -20
```

---

### ADIM 5️⃣: Backend'i Başlat

```bash
# Backend dizininde kalarak başlat
cd /opt/deprem-appp/backend

# Backend'i çalıştır
python3 -m app.main

# EXPECTED OUTPUT:
# INFO:     Uvicorn running on http://0.0.0.0:8086
# INFO:     Application startup complete
```

**Başlatıldı mı?** ✅ Eğer yukarıdaki satırlar görüldüyse başarılı!

---

### ADIM 6️⃣: API Testleri (Yeni Terminal)

**Lokal makinede PowerShell açarak:**

```powershell
# Test 1: Health Check
curl http://46.4.123.77:8086/health

# Test 2: Register
curl -X POST http://46.4.123.77:8086/api/v1/users/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"Test123!"}'

# Test 3: Google OAuth
curl -X POST http://46.4.123.77:8086/api/v1/users/oauth/google `
  -H "Content-Type: application/json" `
  -d '{"token":"test","device_type":"web"}'

# Test 4: Rate Limiting (5 başarısız → 429)
for ($i = 1; $i -le 6; $i++) {
    Write-Host "Test $i:"
    curl -s -X POST http://46.4.123.77:8086/api/v1/users/login `
      -H "Content-Type: application/json" `
      -d '{"email":"test@example.com","password":"wrong"}' | Select-String "detail"
}
```

---

## 🔧 Systemd Servis Kurulumu (Opsiyonel - Production)

Backend'i otomatik başlatmak için:

```bash
# VPS'de (SSH'de):

# 1. Servis dosyasını oluştur
sudo tee /etc/systemd/system/deprem-backend.service > /dev/null << 'EOF'
[Unit]
Description=DEPREM APP Backend (Google OAuth + Rate Limiting)
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/deprem-appp/backend
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=/opt/deprem-appp/.env
ExecStart=/usr/bin/python3 -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8086 \
  --workers 4 \
  --access-log
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 2. Systemd'i yenile
sudo systemctl daemon-reload

# 3. Servisi etkinleştir (otomatik başlasın)
sudo systemctl enable deprem-backend.service

# 4. Servisi başlat
sudo systemctl start deprem-backend.service

# 5. Durum kontrol et
sudo systemctl status deprem-backend.service
# Görmen lazım: active (running)

# 6. Log'ları izle (gerçek-zamanlı)
sudo journalctl -u deprem-backend.service -f
```

---

## 🌐 Nginx Reverse Proxy (Opsiyonel - Production)

HTTP/HTTPS'de backend'i açmak için:

```bash
# VPS'de (SSH'de):

# 1. Nginx konfigü oluştur
sudo tee /etc/nginx/sites-available/deprem-api > /dev/null << 'EOF'
upstream deprem_backend {
    server 127.0.0.1:8086;
}

server {
    listen 80;
    server_name 46.4.123.77;  # Veya domain: api.depremapp.com
    client_max_body_size 50M;

    location / {
        proxy_pass http://deprem_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
    }

    location /ws/ {
        proxy_pass http://deprem_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
EOF

# 2. Nginx'i yapılandır
sudo ln -s /etc/nginx/sites-available/deprem-api /etc/nginx/sites-enabled/

# 3. Test et
sudo nginx -t

# 4. Reload et
sudo systemctl reload nginx

# Artık şu adresle erişebilirsin:
# http://46.4.123.77/
```

---

## 📋 Hızlı Komut Referansı

```bash
# VPS'ye bağlan
ssh root@46.4.123.77

# Backend log'ları izle
sudo journalctl -u deprem-backend.service -f

# Backend'i restart et
sudo systemctl restart deprem-backend.service

# Backend durumu kontrol et
sudo systemctl status deprem-backend.service

# Database'e bağlan
psql -U postgres -d depremapp_db

# Redis'e bağlan
redis-cli

# Backend'i durdur
sudo systemctl stop deprem-backend.service

# Config'i kontrol et
cat /opt/deprem-appp/.env

# Migrasyonları kontrol et
cd /opt/deprem-appp/backend && python3 -m alembic current
```

---

## 🧪 Test Senaryoları (VPS'de Terminal 2'de)

```bash
# Terminal 1: Backend çalışıyor (python3 -m app.main)
# Terminal 2: Testler çalıştırılıyor

# Test 1: Health
curl -s http://localhost:8086/health | jq .

# Test 2: Register
curl -s -X POST http://localhost:8086/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user-'$(date +%s)'@example.com",
    "password": "TestPass123!"
  }' | jq .

# Test 3: Rate Limiting (5 başarısız deneme)
for i in {1..6}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8086/api/v1/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}')
  
  if [ "$CODE" = "401" ]; then
    echo "Deneme $i: 401 (Unauthorized)"
  elif [ "$CODE" = "429" ]; then
    echo "Deneme $i: 429 (Too Many Requests) ✓ RATE LIMITED"
    break
  fi
done

# Test 4: Google OAuth
curl -s -X POST http://localhost:8086/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid_token","device_type":"web"}' | jq .
```

---

## 📁 Lokal'den VPS'ye Dosya Aktarma (Windows PowerShell)

```powershell
# Dosyaları VPS'ye upload et
scp -r "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\*" `
    root@46.4.123.77:/opt/deprem-appp/backend/

# VPS'den lokal'a indir
scp -r root@46.4.123.77:/opt/deprem-appp/backend/* `
    "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\"

# Tek dosya gönder
scp "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\vps_deploy_complete.sh" `
    root@46.4.123.77:/opt/deprem-appp/
```

---

## ✅ Deployment Checklist

Tüm adımları tamamlandıktan sonra kontrol et:

- [ ] SSH bağlantısı çalışıyor: `ssh root@46.4.123.77`
- [ ] Paketler yüklendi: `pip3 list | grep google-auth`
- [ ] .env dosyası var: `cat /opt/deprem-appp/.env`
- [ ] Database tablolar var: `psql -U postgres -d depremapp_db -c "\dt"`
- [ ] Backend başladı: `curl http://46.4.123.77:8086/health`
- [ ] Register çalışıyor: `curl -X POST http://46.4.123.77:8086/api/v1/users/register ...`
- [ ] OAuth çalışıyor: `curl -X POST http://46.4.123.77:8086/api/v1/users/oauth/google ...`
- [ ] Rate limiting çalışıyor: `6. deneme 429 döndürüyor`
- [ ] Systemd servis kurulu: `sudo systemctl status deprem-backend.service`
- [ ] Nginx yapılandırıldı (opsiyonel): `sudo systemctl status nginx`

---

## 🆘 Sorun Giderme

### Problem: "Connection refused on port 8086"

```bash
# Çözüm 1: Backend çalışıyor mu?
sudo systemctl status deprem-backend.service

# Çözüm 2: Port'u kontrol et
netstat -tlnp | grep 8086

# Çözüm 3: Backend'i manual başlat
cd /opt/deprem-appp/backend
python3 -m app.main
```

### Problem: "ModuleNotFoundError: No module named 'app'"

```bash
# Çözüm: Doğru dizinde olmalısın
cd /opt/deprem-appp/backend
python3 -m app.main
```

### Problem: "FATAL: Ident authentication failed" (Database)

```bash
# Çözüm: .env dosyasındaki database şifresi kontrol et
cat /opt/deprem-appp/.env | grep DATABASE_URL
```

### Problem: "Redis connection refused"

```bash
# Çözüm: Redis çalışıyor mu?
redis-cli PING
# PONG dönerse OK
```

---

## 📊 Monitoring

```bash
# Backend log'ları (gerçek-zamanlı)
sudo journalctl -u deprem-backend.service -f

# İçerişi sistem metrikleri
free -h                    # Memory
df -h /                    # Disk
top -bn1 | head -20       # CPU

# Database connections
psql -U postgres -d depremapp_db -c "SELECT count(*) FROM pg_stat_activity;"

# Redis memory
redis-cli INFO memory
```

---

## 🎯 Test Edildikten Sonra

1. **Lokal Frontend Entegrasyonu**: OAuth endpoint'ini frontend'den çağır
2. **Mobile Testing**: React Native/Expo'da test et
3. **Load Testing**: Concurrent istek gönder
4. **SSL Kuruluşu**: Let's Encrypt (opsiyonel ama production için gerekli)

---

## 📞 Hızlı Referans

| İhtiyaç | Komut |
|---------|-------|
| VPS'ye bağlan | `ssh root@46.4.123.77` |
| Backend log'ları | `sudo journalctl -u deprem-backend.service -f` |
| Backend düzelt | `sudo systemctl restart deprem-backend.service` |
| Health check | `curl http://46.4.123.77:8086/health` |
| Config gör | `cat /opt/deprem-appp/.env` |
| Database tablolar | `psql -U postgres -d depremapp_db -c "\dt"` |

---

**🚀 Deployment'ı başlat ve başarı!** ✅

Herhangi bir sorun olursa, VPS'de SSH'den gelen hata mesajını paylaş, çözerim!
