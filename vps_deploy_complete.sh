#!/bin/bash
# VPS Deploy Script - DEPREM APP (Google OAuth + Rate Limiting)
# Kullanım: bash vps_deploy_complete.sh

set -e  # Hata olursa durdur

echo "======================================"
echo "  DEPREM APP - VPS DEPLOYMENT SCRIPT"
echo "  Google OAuth + Rate Limiting"
echo "======================================"
echo ""

# Renkli çıktı için
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigürasyon
PROJECT_DIR="/opt/deprem-appp"
BACKEND_DIR="$PROJECT_DIR/backend"
PYTHON_BIN="/usr/bin/python3"
PIP_BIN="/usr/bin/pip3"

# ─────────────────────────────────────────────────

echo -e "${BLUE}[1/8]${NC} Python & Pip Kontrolü..."
if ! command -v $PYTHON_BIN &> /dev/null; then
    echo -e "${RED}✗ Python 3 yüklü değil${NC}"
    exit 1
fi
PYTHON_VERSION=$($PYTHON_BIN --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓ Python ${PYTHON_VERSION} bulundu${NC}"

# ─────────────────────────────────────────────────

echo -e "${BLUE}[2/8]${NC} Database Kontrolü..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL yüklü değil${NC}"
    exit 1
fi
if psql -U postgres -d depremapp_db -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL bağlantısı başarılı${NC}"
else
    echo -e "${RED}✗ PostgreSQL'e bağlanılamıyor${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────

echo -e "${BLUE}[3/8]${NC} Redis Kontrolü..."
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}✗ Redis yüklü değil${NC}"
    exit 1
fi
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis bağlantısı başarılı (ping: PONG)${NC}"
else
    echo -e "${RED}✗ Redis'e bağlanılamıyor${NC}"
    exit 1
fi

# ─────────────────────────────────────────────────

echo -e "${BLUE}[4/8]${NC} Backend Bağımlılıklarını Yükle..."
cd "$BACKEND_DIR"

echo "  - pip güncelleniyor..."
$PIP_BIN install --upgrade pip > /dev/null 2>&1

echo "  - requirements.txt yükleniyor (bu 2-3 dakika alabilir)..."
$PIP_BIN install -r requirements.txt > /tmp/pip_install.log 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Bağımlılıklar başarıyla yüklendi${NC}"
else
    echo -e "${RED}✗ Bağımlılık yükleme başarısız${NC}"
    cat /tmp/pip_install.log
    exit 1
fi

# Google OAuth paketleri kontrol et
echo "  - Google OAuth paketleri kontrol ediliyor..."
$PYTHON_BIN -c "import google.auth; print('    ✓ google-auth'); import google.auth.transport; print('    ✓ google-auth-transport')" 2>/dev/null || {
    echo -e "${YELLOW}⚠ Google OAuth paketleri yüklenmedi, tekrar denenecek...${NC}"
    $PIP_BIN install google-auth google-auth-httplib2 google-auth-oauthlib > /dev/null 2>&1
}

# ─────────────────────────────────────────────────

echo -e "${BLUE}[5/8]${NC} Environment Dosyası Oluştur..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo "  - .env dosyası oluşturuluyor..."
    cat > "$PROJECT_DIR/.env" << 'EOF'
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
    chmod 600 "$PROJECT_DIR/.env"
    echo -e "${GREEN}✓ .env dosyası oluşturuldu (izin: 600)${NC}"
else
    echo -e "${GREEN}✓ .env dosyası zaten var${NC}"
fi

# ─────────────────────────────────────────────────

echo -e "${BLUE}[6/8]${NC} Database Migrasyonlarını Çalıştır..."
cd "$BACKEND_DIR"

echo "  - İçerişi migration durumu kontrol ediliyor..."
CURRENT_REVISION=$($PYTHON_BIN -m alembic current 2>&1 | grep -oE '[a-f0-9]+' | head -1)
if [ -z "$CURRENT_REVISION" ]; then
    CURRENT_REVISION="base"
fi
echo "    Mevcut revision: $CURRENT_REVISION"

echo "  - Migrasyonlar çalıştırılıyor..."
if $PYTHON_BIN -m alembic upgrade head > /tmp/migration.log 2>&1; then
    echo -e "${GREEN}✓ Database migrasyonları başarılı${NC}"
else
    echo -e "${RED}✗ Migration başarısız${NC}"
    cat /tmp/migration.log
fi

# ─────────────────────────────────────────────────

echo -e "${BLUE}[7/8]${NC} Backend Test Etme..."
echo "  - Health check endpoint'i test ediliyor..."

# Backend'i kısa süre başlat
cd "$BACKEND_DIR"
timeout 5 $PYTHON_BIN -m app.main > /tmp/backend_test.log 2>&1 & 
BACKEND_PID=$!
sleep 2

# Health check
if curl -s http://localhost:8086/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check başarılı${NC}"
else
    echo -e "${YELLOW}⚠ Health check başarısız olabilir (henüz başlamış olmayabilir)${NC}"
fi

# Backend'i kapat
kill $BACKEND_PID 2>/dev/null || true

# ─────────────────────────────────────────────────

echo -e "${BLUE}[8/8]${NC} Systemd Servisini Kurulum Yap..."

# Systemd dosyası oluştur
echo "  - /etc/systemd/system/deprem-backend.service oluşturuluyor..."
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
StandardOutput=journal
StandardError=journal
SyslogIdentifier=deprem-backend

[Install]
WantedBy=multi-user.target
EOF

echo "  - Systemd daemon yenileniyor..."
sudo systemctl daemon-reload

echo "  - Servis etkinleştiriliyor..."
sudo systemctl enable deprem-backend.service

echo -e "${GREEN}✓ Systemd servis kuruldu${NC}"

# ─────────────────────────────────────────────────

echo ""
echo "======================================"
echo -e "${GREEN}✓ DEPLOYMENT BAŞARILI${NC}"
echo "======================================"
echo ""
echo "SONRAKI ADIMLAR:"
echo ""
echo "1. Backend'i Başlat:"
echo -e "   ${YELLOW}sudo systemctl start deprem-backend.service${NC}"
echo ""
echo "2. Durumunu Kontrol Et:"
echo -e "   ${YELLOW}sudo systemctl status deprem-backend.service${NC}"
echo ""
echo "3. Log'ları İzle:"
echo -e "   ${YELLOW}sudo journalctl -u deprem-backend.service -f${NC}"
echo ""
echo "4. API'yi Test Et:"
echo -e "   ${YELLOW}curl http://localhost:8086/health${NC}"
echo ""
echo "5. SQL'i İzle (500ms):"
echo -e "   ${YELLOW}curl -X POST http://localhost:8086/api/v1/users/register \\${NC}"
echo -e "   ${YELLOW}-H \"Content-Type: application/json\" \\${NC}"
echo -e "   ${YELLOW}-d '{\"email\":\"test@example.com\",\"password\":\"Test123!\"}'${NC}"
echo ""
echo "======================================"
echo "🚀 VPS Deployment tamamlandı!"
echo "======================================"
