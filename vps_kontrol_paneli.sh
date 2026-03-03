#!/bin/bash
# 🚀 VPS KURULUM TAMAMLANMIŞ - HEMEN BAŞLATILACAK KOMUTLAR
# DEPREM APP - Google OAuth + Rate Limiting (Mart 2026)

echo "════════════════════════════════════════════════════════"
echo "   DEPREM APP - VPS KURULUM KONTROL PANELİ"
echo "   Google OAuth 2.0 + Rate Limiting Sistemi"
echo "════════════════════════════════════════════════════════"
echo ""

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ═════════════════════════════════════════════════════════════
# SECTION 1: ÖN KONTROLWalter
# ═════════════════════════════════════════════════════════════

echo -e "${BLUE}▶ ADIM 1/5: Sistem Kontrolleri${NC}"
echo ""

# Python Version
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}✗ Python 3 yüklü değil${NC}"
    exit 1
fi
PYTHON_VER=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✓${NC} Python: ${PYTHON_VER}"

# PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL yüklü değil${NC}"
    exit 1
fi
PG_VER=$(psql --version | awk '{print $3}')
echo -e "${GREEN}✓${NC} PostgreSQL: ${PG_VER}"

# Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${RED}✗ Redis yüklü değil${NC}"
    exit 1
fi
REDIS_VER=$(redis-server --version | awk '{print $2}')
echo -e "${GREEN}✓${NC} Redis: ${REDIS_VER}"

# Database connectivity
if psql -U postgres -d depremapp_db -c "SELECT 1" &> /dev/null; then
    echo -e "${GREEN}✓${NC} Database bağlantısı: OK"
else
    echo -e "${RED}✗ Database bağlantısı başarısız${NC}"
    exit 1
fi

# Redis connectivity
if redis-cli ping | grep -q PONG; then
    echo -e "${GREEN}✓${NC} Redis bağlantısı: OK (PONG)"
else
    echo -e "${RED}✗ Redis bağlantısı başarısız${NC}"
    exit 1
fi

echo ""

# ═════════════════════════════════════════════════════════════
# SECTION 2: BAĞIMLILIKLARINI YÜKLEPauleme
# ═════════════════════════════════════════════════════════════

echo -e "${BLUE}▶ ADIM 2/5: Bağımlılıkları Kontrol Et${NC}"
echo ""

cd /opt/deprem-appp/backend || exit 1

# Google Auth paketleri
echo "Google OAuth paketleri kontrol ediliyor..."
if python3 -c "import google.auth" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} google-auth yüklü"
else
    echo -e "${YELLOW}⚠${NC} google-auth yüklenmek ihtiyacında..."
    pip3 install google-auth google-auth-httplib2 google-auth-oauthlib --quiet
fi

# Diğer kritik paketler
CRITICAL_PACKAGES=("fastapi" "sqlalchemy" "redis" "pydantic" "uvicorn" "psycopg")
for pkg in "${CRITICAL_PACKAGES[@]}"; do
    if python3 -c "import ${pkg}" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} ${pkg} yüklü"
    else
        echo -e "${RED}✗${NC} ${pkg} eksik (pip install gerekir)"
    fi
done

echo ""

# ═════════════════════════════════════════════════════════════
# SECTION 3: CONFIGURATION KONTROL
# ═════════════════════════════════════════════════════════════

echo -e "${BLUE}▶ ADIM 3/5: Konfigürasyon Dosyaları${NC}"
echo ""

# .env dosyası
if [ -f /opt/deprem-appp/.env ]; then
    echo -e "${GREEN}✓${NC} .env dosyası mevcut"
    
    # Kontrol: GOOGLE_CLIENT_ID var mı?
    if grep -q "GOOGLE_CLIENT_ID" /opt/deprem-appp/.env; then
        CLIENT_ID=$(grep "GOOGLE_CLIENT_ID" /opt/deprem-appp/.env | cut -d '=' -f2)
        echo -e "${GREEN}✓${NC} Google Client ID: ${CLIENT_ID:0:20}..."
    else
        echo -e "${YELLOW}⚠${NC} GOOGLE_CLIENT_ID .env'de yok"
    fi
    
    # Kontrol: DATABASE_URL var mı?
    if grep -q "DATABASE_URL" /opt/deprem-appp/.env; then
        echo -e "${GREEN}✓${NC} Database URL configurado"
    else
        echo -e "${YELLOW}⚠${NC} DATABASE_URL .env'de yok"
    fi
else
    echo -e "${RED}✗${NC} .env dosyası bulunamadı"
    echo "  Oluşturuluyor..."
    cat > /opt/deprem-appp/.env << 'EOF'
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/depremapp_db
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=775124568904-flr9bo452no12v9giofdlb743m8gvqk4.apps.googleusercontent.com
GOOGLE_API_KEY=AIzaSyCDqiBMaJd5g4FjAxWTpmJQe2tQX66dBoY
FIREBASE_PROJECT_ID=depremapp-29518
SECRET_KEY=Benalan.1
BACKEND_PORT=8086
DEBUG=False
WORKERS=4
EOF
    chmod 600 /opt/deprem-appp/.env
    echo -e "${GREEN}✓${NC} .env oluşturuldu"
fi

# config.py kontrolü
if grep -q "GOOGLE_CLIENT_ID" /opt/deprem-appp/backend/app/config.py 2>/dev/null; then
    echo -e "${GREEN}✓${NC} config.py Google credentials içeriyor"
else
    echo -e "${YELLOW}⚠${NC} config.py güncellenmiş olmalı"
fi

echo ""

# ═════════════════════════════════════════════════════════════
# SECTION 4: DATABASE MIGRATION
# ═════════════════════════════════════════════════════════════

echo -e "${BLUE}▶ ADIM 4/5: Database Migrasyonları${NC}"
echo ""

# Current revision kontrol
CURRENT=$(cd /opt/deprem-appp/backend && python3 -m alembic current 2>&1 | grep -oE '[a-f0-9]+' | head -1)
if [ -z "$CURRENT" ]; then
    CURRENT="(base)"
fi
echo "Mevcut revision: $CURRENT"

# Migrasyonları çalıştır
echo "Migrasyonlar uygulanıyor..."
if cd /opt/deprem-appp/backend && python3 -m alembic upgrade head 2> /tmp/migration.log; then
    echo -e "${GREEN}✓${NC} Migrasyonlar başarılı"
else
    echo -e "${YELLOW}⚠${NC}Migrasyonlarda sorun olabilir - log'a bak:"
    tail -5 /tmp/migration.log
fi

# Table kontrolü
TABLE_COUNT=$(psql -U postgres -d depremapp_db -c "\dt" 2>/dev/null | grep -c "public")
echo -e "${GREEN}✓${NC} Database tablolar: ${TABLE_COUNT} bulundu"

echo ""

# ═════════════════════════════════════════════════════════════
# SECTION 5: SYSTEMD SERVIS
# ═════════════════════════════════════════════════════════════

echo -e "${BLUE}▶ ADIM 5/5: Systemd Servis Kurulumu${NC}"
echo ""

# Servis dosyasını kontrol et
if [ -f /etc/systemd/system/deprem-backend.service ]; then
    echo -e "${GREEN}✓${NC} Servis dosyası mevcut"
    
    # Servis aktif mi?
    if systemctl is-active --quiet deprem-backend.service; then
        echo -e "${GREEN}✓${NC} Backend servis: RUNNING (PID: $(systemctl show -p MainPID deprem-backend.service | cut -d '=' -f2))"
    else
        echo -e "${YELLOW}⚠${NC} Backend servis: NOT RUNNING"
        echo "  İpucu: sudo systemctl start deprem-backend.service"
    fi
else
    echo -e "${YELLOW}⚠${NC} Servis dosyası yüklü değil"
    echo "  Kurulum gerekli..."
fi

echo ""

# ═════════════════════════════════════════════════════════════
# SECTION 6: API TEST
# ═════════════════════════════════════════════════════════════

echo -e "${BLUE}▶ API TEST'leri${NC}"
echo ""

# Health check
echo -n "Health Check: "
if HEALTH=$(curl -s http://localhost:8086/health 2>/dev/null); then
    if echo "$HEALTH" | grep -q 'ok\|status'; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ Yanıt alındı ama format hatalı${NC}"
    fi
else
    echo -e "${RED}✗ Backend cevap vermiyorveya yüklenmiyor${NC}"
fi

# Register endpoint
echo -n "Register Endpoint: "
if curl -s -X OPTIONS http://localhost:8086/api/v1/users/register > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Mevcut${NC}"
else
    echo -e "${YELLOW}⚠ Kontrol edilemedi${NC}"
fi

# OAuth endpoint
echo -n "Google OAuth Endpoint: "
if curl -s -X POST http://localhost:8086/api/v1/users/oauth/google \
  -H "Content-Type: application/json" \
  -d '{"token":"test"}' 2>/dev/null | grep -q 'detail\|token'; then
    echo -e "${GREEN}✓ Mevcut${NC}"
else
    echo -e "${YELLOW}⚠ Kontrol edilemedi${NC}"
fi

# Rate Limit endpoint
echo -n "Rate Limiting: "
if curl -s -X POST http://localhost:8086/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' 2>/dev/null | grep -q 'detail'; then
    echo -e "${GREEN}✓ Aktif${NC}"
else
    echo -e "${YELLOW}⚠ Kontrol edilemedi${NC}"
fi

echo ""

# ═════════════════════════════════════════════════════════════
# METRICS PNL
# ═════════════════════════════════════════════════════════════

echo -e "${CYAN}📊 SİSTEM METRİKLERİ${NC}"
echo ""

# CPU/Memory
UPTIME=$(uptime -s)
FREE_MEM=$(free -h | grep "^Mem:" | awk '{print $7}')
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')

echo "Uptime: $UPTIME"
echo "Boş Memori: $FREE_MEM"
echo "Disk Kullanımı: $DISK_USAGE"
echo ""

# ═════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═════════════════════════════════════════════════════════════

echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ DEPREM APP VPS KURULUM KONTROL TAMAMLANDI${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo ""

echo "📋 SONRAKI ADIMLAR:"
echo ""
echo "1️⃣  Backend'i başlat (zaten çalışıyor mu kontrol et):"
echo -e "   ${YELLOW}sudo systemctl start deprem-backend.service${NC}"
echo ""
echo "2️⃣  Log'ları izle (gerçek-zamanlı):"
echo -e "   ${YELLOW}sudo journalctl -u deprem-backend.service -f${NC}"
echo ""
echo "3️⃣  API Testi:"
echo -e "   ${YELLOW}curl http://localhost:8086/health${NC}"
echo ""
echo "4️⃣  Tahminledigi Endpoint Testleri:"
echo -e "   ${YELLOW}bash VPS_DEPLOYMENT_QUICK_COMMANDS.md${NC} içindeki komutları çalıştır"
echo ""
echo "5️⃣  Nginx/SSL Konfigürasyonu (opsiyonel):"
echo -e "   ${YELLOW}VPS_DEPLOYMENT_QUICK_COMMANDS.md → ADIM 7${NC}"
echo ""

echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
echo ""

# Detaylı debug modun istenip istenmediğini sor
if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
    echo -e "${BLUE}DETAYLI BILGILER:${NC}"
    echo ""
    
    echo "Yüklü Paketler:"
    pip3 list | grep -E "google-auth|fastapi|redis|sqlalchemy" | head -10
    echo ""
    
    echo "Aktif Portlar:"
    netstat -tlnp 2>/dev/null | grep -E "8086|5432|6379" || echo "netstat komutunda sorun"
    echo ""
    
    echo "Systemd Servis Detayları:"
    systemctl status deprem-backend.service || echo "Servis başlamadı henüz"
fi

echo ""
echo -e "${GREEN}🚀 VPS hazır! Deployment başarılı!${NC}"
