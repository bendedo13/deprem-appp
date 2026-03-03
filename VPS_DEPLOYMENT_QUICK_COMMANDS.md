# VPS Deployment - Hızlı Komutlar

Bu dosya VPS'de sırayla çalıştırılması gereken komutları içerir.

---

## 🔴 EMERGENCY - Backend Hızlı Başlatma (2 dakika)

```bash
# 1. SSH ile VPS'ye bağlan
ssh root@YOUR_VPS_IP

# 2. Analytics dizinine git
cd /opt/deprem-appp/backend

# 3. HEMEN backend'i başlat
python3 -m app.main

# Bu sonuç vermeli:
# INFO:     Uvicorn running on http://0.0.0.0:8086
# INFO:     Application startup complete
```

---

## 📋 Tam Deployment - Adım Adım (15 dakika)

### ADIM 1: Başlangıç Kontrolleri (2 dakika)

```bash
# SSH ile bağlan
ssh root@YOUR_VPS_IP

# Status kontrol et
echo "PostgreSQL:"
psql -U postgres -d depremapp_db -c "SELECT version();" 2>/dev/null || echo "PostgreSQL yok!"

echo "Redis:"
redis-cli ping

echo "Python:"
python3 --version

echo "Dizin yapısı:"
ls -la /opt/deprem-appp/ | head -20
```

**Beklenen çıktılar**:
- PostgreSQL 12+
- PONG (Redis)
- Python 3.10+
- backend, frontend, deploy klasörleri

---

### ADIM 2: Bağımlılıkları Yükle (3 dakika)

```bash
# Backend dizinine git
cd /opt/deprem-appp/backend

# Pip'i güncelle (kök uyarılarını engelle)
pip3 install --upgrade pip --quiet

# Tüm paketleri yükle
echo "Yükleniyor... (2-3 dakika)"
pip3 install -r requirements.txt --quiet

echo "✓ Paketler yüklendi"

# Kontrol et
python3 -c "import google.auth; print('✓ Google Auth')"
python3 -c "import fastapi; print('✓ FastAPI')"
python3 -c "import redis.asyncio; print('✓ Redis')"
```

---

### ADIM 3: .env Dosyasını Oluştur (1 dakika)

```bash
# VPS'nin root'una git
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

### ADIM 4: Database Migrasyonları (1 dakika)

```bash
cd /opt/deprem-appp/backend

# Migration durumunu kontrol et
echo "Migration status:"
python3 -m alembic current

# Tüm migrasyonları çalıştır
echo "Migrasyonlar çalıştırılıyor..."
python3 -m alembic upgrade head

# Kontrol et - tablolar var mı?
psql -U postgres -d depremapp_db -c "\dt" | head -20
```

---

### ADIM 5: Systemd Servisini Kur (2 dakika)

```bash
# Servis dosyası oluştur
sudo tee /etc/systemd/system/deprem-backend.service > /dev/null << 'EOF'
[Unit]
Description=DEPREM APP Backend
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

# Systend'i yenile
sudo systemctl daemon-reload
sudo systemctl enable deprem-backend.service

echo "✓ Systemd servis kuruldu"
```

---

### ADIM 6: Backend'i Başlat ve Test Et (3 dakika)

```bash
# Backend'i başlat
sudo systemctl start deprem-backend.service

# Status kontrol et
sudo systemctl status deprem-backend.service
# Görmen lazım: "active (running)"

# 1 saniye bekle backend hazırlanması için
sleep 1

# Health check
echo "Health Check:"
curl -s http://localhost:8086/health | head -c 100
echo ""

# Register test
echo ""
echo "Register Test:"
curl -s -X POST http://localhost:8086/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-'$(date +%s)'@example.com",
    "password": "TestPass123!"
  }' | grep -o '"access_token":"[^"]*"' | cut -c1-30
echo "..."

# OAuth test
echo ""
echo "OAuth Test:"
curl -s -X POST http://localhost:8086/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}' | grep -o '"detail":"[^"]*"'
echo ""

echo "✓ Backend çalışıyor!"
```

---

### ADIM 7: Nginx Reverse Proxy (3 dakika) [OPSİYONEL]

```bash
# Nginx konfigurasyonunu oluştur
sudo tee /etc/nginx/sites-available/deprem-api > /dev/null << 'EOF'
upstream deprem_backend {
    server 127.0.0.1:8086;
}

server {
    listen 80;
    server_name api.depremapp.com;  # Kendi domainin ile değiştir
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

# Nginx'i yapılandır
sudo ln -s /etc/nginx/sites-available/deprem-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "✓ Nginx yapılandırıldı"
```

---

### ADIM 8: SSL/TLS (OPSİYONEL - Üretim için gerekli)

```bash
# Let's Encrypt ile SSL al
sudo apt-get install certbot python3-certbot-nginx -y

# Sertifika iste
sudo certbot certonly --nginx \
  -d api.depremapp.com \
  -d www.api.depremapp.com

# Nginx'i HTTPS ile güncelle
sudo certbot --nginx -d api.depremapp.com
```

---

## 🧪 Tam Test Senaryosu (5 dakika)

```bash
# Test 1: Health Check
echo "Test 1: Health Check"
curl -s http://localhost:8086/health | jq .

# Test 2: Register
echo ""
echo "Test 2: Register"
EMAIL="user-$(date +%s)@example.com"
RESULT=$(curl -s -X POST http://localhost:8086/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL'","password":"Test123!"}')
TOKEN=$(echo $RESULT | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."

# Test 3: Login
echo ""
echo "Test 3: Login"
curl -s -X POST http://localhost:8086/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$EMAIL'","password":"Test123!"}' | grep -o '"user":{"id":[^}]*}'

# Test 4: Rate Limiting (5 başarısız)
echo ""
echo "Test 4: Rate Limiting"
for i in {1..6}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8086/api/v1/users/login \
    -H "Content-Type: application/json" \
    -d '{"email":"'$EMAIL'","password":"wrong"}')
    
  if [ "$CODE" = "401" ]; then
    echo "  Deneme $i: 401 (Unauthorized)"
  elif [ "$CODE" = "429" ]; then
    echo "  Deneme $i: 429 (Too Many Requests) ✓ RATE LIMITED"
    break
  fi
done

# Test 5: OAuth
echo ""
echo "Test 5: Google OAuth"
curl -s -X POST http://localhost:8086/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid_token","device_type":"web"}' | grep -o '"detail":"[^"]*"'

echo ""
echo "✓ Tüm testler tamamlandı"
```

---

## 📊 Monitoring & Troubleshooting

### Log'ları İzle (Gerçek-zamanlı)

```bash
# Backend logs
sudo journalctl -u deprem-backend.service -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### Redis Monitoring

```bash
# Redis'e bağlan
redis-cli

# Rate limit keys'ini göster
> KEYS auth_failed:*

# Spesifik user'ın limitini kontrol et
> GET "auth_failed:user@example.com"

# TTL'yi kontrol et (kaç saniye kaldığını göster)
> TTL "auth_failed:user@example.com"

# Manuel olarak temizle
> DEL "auth_failed:user@example.com"

# Çık
> EXIT
```

### Sorun Giderme

```bash
# Backend çalışıyor mu?
sudo systemctl status deprem-backend.service

# Port 8086 açık mı?
netstat -tlnp | grep 8086

# PostgreSQL çalışıyor mu?
psql -U postgres -c "SELECT 1"

# Redis çalışıyor mu?
redis-cli PING

# Python modülleri yüklü mü?
python3 -m pip list | grep -E "google-auth|fastapi|redis"
```

---

## 🔄 Restart & Reload Komutları

```bash
# Backend'i restart et
sudo systemctl restart deprem-backend.service

# Backend'i stop et
sudo systemctl stop deprem-backend.service

# Backend'i start et
sudo systemctl start deprem-backend.service

# Log'ları temizle
sudo journalctl -u deprem-backend.service --vacuum-time=7d

# Nginx'i reload et (kesintisiz)
sudo systemctl reload nginx

# Nginx'i restart et
sudo systemctl restart nginx
```

---

## 📦 Bilgisayardan VPS'ye Dosya Aktarma (Windows PowerShell)

```powershell
# Lokal → VPS (Upload)
scp -r "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\*" `
    root@YOUR_VPS_IP:/opt/deprem-appp/backend/

# VPS → Lokal (Download)
scp -r root@YOUR_VPS_IP:/opt/deprem-appp/backend/* `
    "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\"
```

---

## 🚀 Docker ile Deployment (Alternatif)

```bash
# Backend Docker image'ını build et
cd /opt/deprem-appp/backend
docker build -t deprem-backend:latest .

# Container'ı çalıştır
docker run -d \
  --name deprem-backend \
  -p 8086:8086 \
  -e DATABASE_URL="postgresql+asyncpg://postgres:password@postgres:5432/depremapp_db" \
  -e REDIS_URL="redis://redis:6379/0" \
  -e GOOGLE_CLIENT_ID="775124568904-..." \
  -e GOOGLE_API_KEY="AIzaSyCDqiBMa..." \
  -e SECRET_KEY="Benalan.1" \
  deprem-backend:latest

# Container'ı kontrol et
docker ps
docker logs deprem-backend -f
```

---

## ✅ Final Checklist

Deployment tamamlandı mı?

- [ ] PostgreSQL, Redis çalışıyor
- [ ] Dependencies yüklendi
- [ ] .env dosyası oluşturuldu
- [ ] Database migrations çalıştırıldı
- [ ] Systemd servis kuruldu
- [ ] Backend başlatıldı (`active (running)`)
- [ ] Health check çalıştı (200 OK)
- [ ] Register test geçti (201 Created)
- [ ] Login test geçti (200 OK)
- [ ] Rate limiting test geçti (429 after 5)
- [ ] OAuth endpoint çalıştı
- [ ] Nginx yapılandırıldı (opsiyonel)
- [ ] SSL sertifikası yüklendi (üretim için)

---

🎉 **Deployment tamamlandı! VPS production'da çalışıyor!**

---

**Kısayollar**:
- Backend logs: `sudo journalctl -u deprem-backend.service -f`
- Backend restart: `sudo systemctl restart deprem-backend.service`
- Health check: `curl http://localhost:8086/health`
- Test: Yukarıdaki Test Senaryosu'nu çalıştır
