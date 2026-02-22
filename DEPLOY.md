# 🚀 DEPLOYMENT GUIDE - DEPREM APP

> VPS deployment rehberi - Tüm servisler, komutlar ve troubleshooting

---

## 📋 MEVCUT DEPLOYMENT YAPISI

### Sunucu Bilgileri
- **Platform**: Ubuntu VPS
- **Lokasyon**: `/opt/deprem-appp`
- **Python Version**: 3.10
- **Deployment Method**: Manuel (systemd servisleri YOK, Docker Compose YOK)

### Servisler
```
/opt/deprem-appp/
├── backend/          # FastAPI backend (manuel çalıştırılıyor)
│   ├── venv/        # Python virtual environment
│   ├── app/         # Uygulama kodu
│   ├── alembic/     # Database migrations
│   └── requirements.txt
├── frontend/        # React frontend
│   ├── node_modules/
│   ├── src/
│   └── dist/        # Build çıktısı
└── mobile/          # React Native (VPS'te değil, sadece build)
```

### Aktif Servisler
- **PostgreSQL**: Sistem servisi (port 5432)
- **Redis**: Sistem servisi (port 6379)
- **Nginx**: Web server (frontend + reverse proxy)
- **Backend**: Manuel uvicorn (port 8000)
- **Celery**: Manuel celery worker

---

## 🔧 İLK KURULUM (Yeni VPS için)

### 1. Sistem Gereksinimleri
```bash
# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Gerekli paketler
sudo apt install -y python3.10 python3.10-venv python3-pip \
    postgresql postgresql-contrib redis-server nginx git curl

# Node.js 18.x kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. PostgreSQL Kurulumu ve Yapılandırma
```bash
# PostgreSQL başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Database oluştur
sudo -u postgres psql << EOF
CREATE DATABASE deprem_db;
CREATE USER deprem_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE deprem_db TO deprem_user;
\q
EOF

# TimescaleDB extension (opsiyonel)
sudo -u postgres psql -d deprem_db << EOF
CREATE EXTENSION IF NOT EXISTS timescaledb;
EOF
```

### 3. Redis Kurulumu
```bash
# Redis başlat
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test et
redis-cli ping  # PONG dönmeli
```

### 4. Proje Klonlama
```bash
# Proje dizini oluştur
sudo mkdir -p /opt/deprem-appp
cd /opt/deprem-appp

# GitHub'dan klonla
git clone https://github.com/your-username/deprem-app.git .

# Veya mevcut projeyi güncelle
git pull origin main
```

### 5. Backend Kurulumu
```bash
cd /opt/deprem-appp/backend

# Virtual environment oluştur
python3.10 -m venv venv
source venv/bin/activate

# Bağımlılıkları yükle
pip install --upgrade pip
pip install -r requirements.txt

# .env dosyası oluştur
cp .env.example .env
nano .env  # Değişkenleri düzenle
```

### 6. Frontend Kurulumu
```bash
cd /opt/deprem-appp/frontend

# Bağımlılıkları yükle
npm install

# Production build
npm run build

# Build çıktısı: dist/ klasörü
```

### 7. Nginx Yapılandırması
```bash
# Nginx config oluştur
sudo nano /etc/nginx/sites-available/deprem-app
```

Nginx config içeriği:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend (React)
    location / {
        root /opt/deprem-appp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Config'i aktifleştir
sudo ln -s /etc/nginx/sites-available/deprem-app /etc/nginx/sites-enabled/
sudo nginx -t  # Test et
sudo systemctl reload nginx
```

---

## 🚀 DEPLOYMENT KOMUTLARI

### Standart Deployment (Git Pull + Restart)

```bash
#!/bin/bash
# deploy.sh - Otomatik deployment scripti

set -e  # Hata durumunda dur

echo "🚀 Deployment başlıyor..."

# 1. Proje dizinine git
cd /opt/deprem-appp

# 2. Git pull
echo "📥 Git pull..."
git pull origin main

# 3. Backend deployment
echo "🔧 Backend güncelleniyor..."
cd backend
source venv/bin/activate

# Bağımlılıkları güncelle (gerekirse)
pip install -r requirements.txt

# Database migration
export PYTHONPATH=/opt/deprem-appp/backend:$PYTHONPATH
alembic upgrade head

# Backend'i yeniden başlat (screen veya tmux kullanıyorsan)
pkill -f "uvicorn app.main:app" || true
sleep 2
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /var/log/deprem-backend.log 2>&1 &

# 4. Celery worker'ı yeniden başlat
pkill -f "celery -A app.tasks worker" || true
sleep 2
nohup celery -A app.tasks worker --loglevel=info > /var/log/celery-worker.log 2>&1 &

# 5. Frontend deployment
echo "🎨 Frontend build alınıyor..."
cd ../frontend
npm install
npm run build

# 6. Nginx reload
echo "🔄 Nginx reload..."
sudo systemctl reload nginx

echo "✅ Deployment tamamlandı!"
echo "📊 Logları kontrol et:"
echo "  - Backend: tail -f /var/log/deprem-backend.log"
echo "  - Celery: tail -f /var/log/celery-worker.log"
```

Scripti çalıştırılabilir yap:
```bash
chmod +x /opt/deprem-appp/deploy.sh
```

### Manuel Deployment Adımları

#### Backend Güncelleme
```bash
cd /opt/deprem-appp/backend
source venv/bin/activate

# Git pull
git pull origin main

# Bağımlılıkları güncelle
pip install -r requirements.txt

# Migration
export PYTHONPATH=/opt/deprem-appp/backend:$PYTHONPATH
alembic upgrade head

# Backend'i durdur
pkill -f "uvicorn app.main:app"

# Backend'i başlat
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /var/log/deprem-backend.log 2>&1 &
```

#### Celery Worker Güncelleme
```bash
cd /opt/deprem-appp/backend
source venv/bin/activate

# Worker'ı durdur
pkill -f "celery -A app.tasks worker"

# Worker'ı başlat
nohup celery -A app.tasks worker --loglevel=info > /var/log/celery-worker.log 2>&1 &
```

#### Frontend Güncelleme
```bash
cd /opt/deprem-appp/frontend

# Git pull
git pull origin main

# Build
npm install
npm run build

# Nginx reload
sudo systemctl reload nginx
```

---

## 🔍 TROUBLESHOOTING

### PostgreSQL Bağlantı Hatası
```
ConnectionRefusedError: [Errno 111] Connection refused (port 5432)
```

**Çözüm:**
```bash
# PostgreSQL çalışıyor mu?
sudo systemctl status postgresql

# Çalışmıyorsa başlat
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Port dinliyor mu?
sudo netstat -tlnp | grep 5432

# PostgreSQL loglarını kontrol et
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# .env dosyasındaki DATABASE_URL'i kontrol et
cat /opt/deprem-appp/backend/.env | grep DATABASE_URL
# Doğru format: postgresql+asyncpg://deprem_user:password@localhost:5432/deprem_db
```

### Alembic Migration Hatası
```
ModuleNotFoundError: No module named 'app'
```

**Çözüm:**
```bash
cd /opt/deprem-appp/backend
source venv/bin/activate

# PYTHONPATH'i ayarla
export PYTHONPATH=/opt/deprem-appp/backend:$PYTHONPATH

# Migration çalıştır
alembic upgrade head

# Kalıcı olarak .bashrc'ye ekle
echo 'export PYTHONPATH=/opt/deprem-appp/backend:$PYTHONPATH' >> ~/.bashrc
```

### Backend Çalışmıyor
```bash
# Process çalışıyor mu?
ps aux | grep uvicorn

# Port kullanımda mı?
sudo netstat -tlnp | grep 8000

# Logları kontrol et
tail -f /var/log/deprem-backend.log

# Manuel başlat (test için)
cd /opt/deprem-appp/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Celery Worker Çalışmıyor
```bash
# Process çalışıyor mu?
ps aux | grep celery

# Redis çalışıyor mu?
redis-cli ping

# Logları kontrol et
tail -f /var/log/celery-worker.log

# Manuel başlat (test için)
cd /opt/deprem-appp/backend
source venv/bin/activate
celery -A app.tasks worker --loglevel=debug
```

### Nginx 502 Bad Gateway
```bash
# Backend çalışıyor mu?
curl http://localhost:8000/api/health

# Nginx config test
sudo nginx -t

# Nginx logları
sudo tail -f /var/log/nginx/error.log

# Nginx yeniden başlat
sudo systemctl restart nginx
```

---

## 📊 SERVİS YÖNETİMİ

### Servisleri Kontrol Et
```bash
# PostgreSQL
sudo systemctl status postgresql

# Redis
sudo systemctl status redis-server

# Nginx
sudo systemctl status nginx

# Backend (manuel)
ps aux | grep uvicorn

# Celery (manuel)
ps aux | grep celery
```

### Logları İzle
```bash
# Backend
tail -f /var/log/deprem-backend.log

# Celery
tail -f /var/log/celery-worker.log

# Nginx access
sudo tail -f /var/log/nginx/access.log

# Nginx error
sudo tail -f /var/log/nginx/error.log

# PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### Tüm Servisleri Yeniden Başlat
```bash
#!/bin/bash
# restart-all.sh

echo "🔄 Tüm servisler yeniden başlatılıyor..."

# PostgreSQL
sudo systemctl restart postgresql

# Redis
sudo systemctl restart redis-server

# Backend
pkill -f "uvicorn app.main:app"
cd /opt/deprem-appp/backend
source venv/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /var/log/deprem-backend.log 2>&1 &

# Celery
pkill -f "celery -A app.tasks worker"
nohup celery -A app.tasks worker --loglevel=info > /var/log/celery-worker.log 2>&1 &

# Nginx
sudo systemctl restart nginx

echo "✅ Tüm servisler yeniden başlatıldı!"
```

---

## 🔐 GÜVENLİK

### Firewall (UFW)
```bash
# UFW aktifleştir
sudo ufw enable

# Gerekli portları aç
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Durumu kontrol et
sudo ufw status
```

### SSL/TLS (Let's Encrypt)
```bash
# Certbot kur
sudo apt install certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Otomatik yenileme test et
sudo certbot renew --dry-run
```

### .env Dosyası Güvenliği
```bash
# .env dosyasını sadece owner okuyabilsin
chmod 600 /opt/deprem-appp/backend/.env

# Git'e eklenmediğinden emin ol
cat /opt/deprem-appp/.gitignore | grep .env
```

---

## 📱 MOBILE APP DEPLOYMENT

### Android Build (EAS)
```bash
# Local'de (Windows)
cd mobile

# Değişiklikleri çek
git pull origin main

# Bağımlılıkları güncelle
npm install

# EAS build
eas build --platform android --profile preview

# Build tamamlandığında APK indir
# https://expo.dev/accounts/[username]/projects/quakesense/builds
```

### VPS'te Build (Alternatif)
```bash
# VPS'te
cd /opt/deprem-appp/mobile

# Git pull
git pull origin main

# Build
npm install
eas build --platform android --profile preview --non-interactive
```

---

## 🔄 SYSTEMD SERVİSLERİ (ÖNERİLEN)

Şu anda manuel çalıştırıyorsun. Systemd servisleri oluşturarak otomatik başlatma sağlayabilirsin:

### Backend Servisi
```bash
sudo nano /etc/systemd/system/deprem-backend.service
```

İçerik:
```ini
[Unit]
Description=Deprem App Backend (FastAPI)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/deprem-appp/backend
Environment="PYTHONPATH=/opt/deprem-appp/backend"
ExecStart=/opt/deprem-appp/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Celery Worker Servisi
```bash
sudo nano /etc/systemd/system/celery-worker.service
```

İçerik:
```ini
[Unit]
Description=Celery Worker for Deprem App
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/deprem-appp/backend
Environment="PYTHONPATH=/opt/deprem-appp/backend"
ExecStart=/opt/deprem-appp/backend/venv/bin/celery -A app.tasks worker --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Servisleri Aktifleştir
```bash
# Servisleri reload et
sudo systemctl daemon-reload

# Servisleri başlat
sudo systemctl start deprem-backend
sudo systemctl start celery-worker

# Otomatik başlatmayı aktifleştir
sudo systemctl enable deprem-backend
sudo systemctl enable celery-worker

# Durumu kontrol et
sudo systemctl status deprem-backend
sudo systemctl status celery-worker
```

### Systemd ile Deployment
```bash
# Artık bu komutları kullanabilirsin:
sudo systemctl restart deprem-backend
sudo systemctl restart celery-worker
sudo systemctl status deprem-backend
sudo systemctl status celery-worker

# Loglar
sudo journalctl -u deprem-backend -f
sudo journalctl -u celery-worker -f
```

---

## 📝 ENVIRONMENT VARIABLES

### Backend .env
```bash
# /opt/deprem-appp/backend/.env

# Database
DATABASE_URL=postgresql+asyncpg://deprem_user:your_password@localhost:5432/deprem_db

# Redis
REDIS_URL=redis://localhost:6379/0

# API Keys
AFAD_API_URL=https://deprem.afad.gov.tr/apiv2
USGS_API_URL=https://earthquake.usgs.gov/earthquakes/feed/v1.0
KANDILLI_API_URL=https://api.orhanaydogdu.com.tr

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# Anthropic (AI features)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (Whisper for S.O.S)
OPENAI_API_KEY=sk-...

# JWT
SECRET_KEY=your-super-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000

# Sentry
SENTRY_DSN=https://...@sentry.io/...

# S.O.S Audio Storage
SOS_AUDIO_STORAGE_PATH=/opt/deprem-appp/backend/sos_audio
SOS_AUDIO_BASE_URL=https://your-domain.com/sos_audio
```

---

## 🎯 HIZLI REFERANS

### Günlük Deployment
```bash
cd /opt/deprem-appp
git pull origin main
/opt/deprem-appp/deploy.sh
```

### Acil Restart
```bash
# Backend
pkill -f uvicorn && cd /opt/deprem-appp/backend && source venv/bin/activate && nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > /var/log/deprem-backend.log 2>&1 &

# Celery
pkill -f celery && cd /opt/deprem-appp/backend && source venv/bin/activate && nohup celery -A app.tasks worker --loglevel=info > /var/log/celery-worker.log 2>&1 &
```

### Health Check
```bash
# Backend API
curl http://localhost:8000/api/health

# PostgreSQL
psql -U deprem_user -d deprem_db -c "SELECT 1;"

# Redis
redis-cli ping

# Nginx
curl http://localhost
```

---

**Son Güncelleme**: 2026-02-22  
**Versiyon**: 1.0  
**Sorumlu**: DevOps Team
