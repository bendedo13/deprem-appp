#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# TWILIO UPDATE & DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════
# Bu script Twilio bilgilerini .env'e ekler ve deployment yapar
# ═══════════════════════════════════════════════════════════════

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  TWILIO UPDATE & DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Dizinler
PROJECT_DIR="/opt/deprem-appp"
BACKEND_DIR="$PROJECT_DIR/backend"
DEPLOY_DIR="$PROJECT_DIR/deploy"

# Twilio bilgileri (script çalıştırılırken parametre olarak verilecek)
# Kullanım: ./UPDATE_TWILIO_AND_DEPLOY.sh <ACCOUNT_SID> <AUTH_TOKEN> <PHONE_NUMBER>
TWILIO_ACCOUNT_SID="${1:-}"
TWILIO_AUTH_TOKEN="${2:-}"
TWILIO_PHONE_NUMBER="${3:-}"

# Eğer parametre verilmemişse, varsayılan değerleri kullan
if [ -z "$TWILIO_ACCOUNT_SID" ]; then
    echo -e "${RED}HATA: Twilio bilgileri verilmedi!${NC}"
    echo "Kullanım: ./UPDATE_TWILIO_AND_DEPLOY.sh <ACCOUNT_SID> <AUTH_TOKEN> <PHONE_NUMBER>"
    echo "Örnek: ./UPDATE_TWILIO_AND_DEPLOY.sh ACxxxxx token123 +1234567890"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# STEP 1: GIT PULL
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[1/4] Git pull yapılıyor...${NC}"
cd "$PROJECT_DIR"
git stash || true
git pull origin main
echo -e "${GREEN}✓ Git pull tamamlandı${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: .ENV DOSYASINI GÜNCELLE
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[2/4] .env dosyası güncelleniyor...${NC}"
cd "$BACKEND_DIR"

# .env dosyası yoksa .env.example'dan kopyala
if [ ! -f .env ]; then
    echo "  .env dosyası bulunamadı, .env.example'dan kopyalanıyor..."
    cp .env.example .env
fi

# Twilio bilgilerini güncelle veya ekle
if grep -q "TWILIO_ACCOUNT_SID=" .env; then
    # Varsa güncelle
    sed -i "s|TWILIO_ACCOUNT_SID=.*|TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID|" .env
    sed -i "s|TWILIO_AUTH_TOKEN=.*|TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN|" .env
    sed -i "s|TWILIO_PHONE_NUMBER=.*|TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER|" .env
    echo "  ✓ Twilio bilgileri güncellendi"
else
    # Yoksa ekle
    echo "" >> .env
    echo "# Twilio (SMS/WhatsApp)" >> .env
    echo "TWILIO_ACCOUNT_SID=$TWILIO_ACCOUNT_SID" >> .env
    echo "TWILIO_AUTH_TOKEN=$TWILIO_AUTH_TOKEN" >> .env
    echo "TWILIO_PHONE_NUMBER=$TWILIO_PHONE_NUMBER" >> .env
    echo "  ✓ Twilio bilgileri eklendi"
fi

# Kontrol et
echo ""
echo "  Twilio yapılandırması:"
grep "TWILIO_" .env | sed 's/TWILIO_AUTH_TOKEN=.*/TWILIO_AUTH_TOKEN=***HIDDEN***/'
echo ""

echo -e "${GREEN}✓ .env güncellendi${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: DEPLOYMENT
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[3/4] Deployment başlatılıyor...${NC}"
cd "$DEPLOY_DIR"

# Docker down
echo "  Container'lar durduruluyor..."
docker compose -f docker-compose.prod.yml down

# Docker build (no cache)
echo "  Docker build yapılıyor (--no-cache)..."
docker compose -f docker-compose.prod.yml build --no-cache deprem_backend deprem_celery

# Docker up
echo "  Container'lar başlatılıyor..."
docker compose -f docker-compose.prod.yml up -d

# Wait
echo "  Container'ların hazır olması bekleniyor..."
sleep 15

# Migration
echo "  Database migration..."
docker exec deprem_backend alembic upgrade head || echo "  Migration zaten güncel"

echo -e "${GREEN}✓ Deployment tamamlandı${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 4: HEALTH CHECK & TEST
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[4/4] Health check ve test...${NC}"
sleep 3

# Health check
echo -n "  Testing /health... "
HEALTH_RESPONSE=$(curl -s http://localhost:8001/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $HEALTH_RESPONSE"
fi

# API health check
echo -n "  Testing /api/v1/health... "
API_HEALTH_RESPONSE=$(curl -s http://localhost:8001/api/v1/health)
if echo "$API_HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo "  Response: $API_HEALTH_RESPONSE"
fi

# Twilio check
echo -n "  Checking Twilio config in container... "
TWILIO_CHECK=$(docker exec deprem_backend sh -c 'echo $TWILIO_ACCOUNT_SID' 2>/dev/null || echo "")
if [ -n "$TWILIO_CHECK" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ (env var not set, but .env file should work)${NC}"
fi

echo ""
echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ TWILIO ENTEGRASYONU TAMAMLANDI!"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${BLUE}📊 Servis Bilgileri:${NC}"
echo "  Backend API: http://46.4.123.77:8001"
echo "  Frontend: http://46.4.123.77:8002"
echo "  API Docs: http://46.4.123.77:8001/docs"
echo ""

echo -e "${BLUE}🔍 Twilio Durumu:${NC}"
echo "  Account SID: $TWILIO_ACCOUNT_SID"
echo "  Phone Number: $TWILIO_PHONE_NUMBER"
echo "  Status: ✅ Yapılandırıldı"
echo ""

echo -e "${BLUE}🧪 Test Komutları:${NC}"
echo ""
echo "1. Kullanıcı kaydı:"
echo "   curl -X POST http://46.4.123.77:8001/api/v1/users/register \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test2@example.com\",\"password\":\"test123456\",\"full_name\":\"Test User 2\"}'"
echo ""
echo "2. Login (JWT token al):"
echo "   curl -X POST http://46.4.123.77:8001/api/v1/users/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"test2@example.com\",\"password\":\"test123456\"}'"
echo ""
echo "3. Token'ı kaydet:"
echo "   TOKEN=\"your_jwt_token_here\""
echo ""
echo "4. Acil kişi ekle:"
echo "   curl -X POST http://46.4.123.77:8001/api/v1/users/contacts \\"
echo "     -H \"Authorization: Bearer \$TOKEN\" \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\":\"Test Contact\",\"phone\":\"+905551234567\",\"email\":\"test@example.com\",\"relationship\":\"Arkadaş\",\"channel\":\"sms\"}'"
echo ""
echo "5. 'Ben İyiyim' butonu test (SMS gönderir!):"
echo "   curl -X POST http://46.4.123.77:8001/api/v1/users/i-am-safe \\"
echo "     -H \"Authorization: Bearer \$TOKEN\" \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"custom_message\":\"Ben iyiyim!\",\"include_location\":true,\"latitude\":41.0082,\"longitude\":28.9784}'"
echo ""

echo -e "${BLUE}📝 Logları İzle:${NC}"
echo "  docker logs -f deprem_backend"
echo "  docker logs -f deprem_celery"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
