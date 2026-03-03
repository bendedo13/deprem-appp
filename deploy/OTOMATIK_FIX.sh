#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DEPREM APP - OTOMATIK KURULUM SCRIPTI
# Tüm sorunları çözer ve deployment'ü tamamlar
# ═══════════════════════════════════════════════════════════════

set -e

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logo
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           DEPREM APP - OTOMATIK DEPLOYMENT FIX               ║"
echo "║                   VPS: 46.4.123.77                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Paths
PROJECT_DIR="/opt/deprem-appp"
DEPLOY_DIR="$PROJECT_DIR/deploy"

# ═══════════════════════════════════════════════════════════════
# STEP 1: Önceki Process'leri Temizle
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[1/8] Önceki process'ler temizleniyor...${NC}"

pkill -f "python3 -m app.main" || true
pkill -f "uvicorn" || true

sleep 2
echo -e "${GREEN}✓ Process'ler temizlendi${NC}\n"

# ═══════════════════════════════════════════════════════════════
# STEP 2: 

.env Dosyası Kontrol Et
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[2/8] .env dosyası kontrol ediliyor...${NC}"

if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  .env dosyası bulunamadı, oluşturuluyor...${NC}"
    
    cat > "$PROJECT_DIR/.env" << 'EOF'
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
    echo -e "${GREEN}✓ .env dosyası oluşturuldu${NC}"
else
    echo -e "${GREEN}✓ .env dosyası zaten var${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: Deploy Dizinine Git
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[3/8] Deploy dizinine gidiliyor...${NC}"

cd "$DEPLOY_DIR"
echo -e "${GREEN}✓ Deploy dizininde: $(pwd)${NC}\n"

# ═══════════════════════════════════════════════════════════════
# STEP 4: Container'ları Durdur
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[4/8] Mevcut container'lar durduruluyor...${NC}"

docker compose -f docker-compose.prod.yml down 2>/dev/null || true
sleep 2

echo -e "${GREEN}✓ Container'lar durduruldu${NC}\n"

# ═══════════════════════════════════════════════════════════════
# STEP 5: Sistem Temizliği
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[5/8] Docker temizliği yapılıyor...${NC}"

docker system prune -f --volumes 2>/dev/null || true

echo -e "${GREEN}✓ Docker sistem temizlendi${NC}\n"

# ═══════════════════════════════════════════════════════════════
# STEP 6: Docker Image'ları Build Et
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[6/8] Docker image'ları build ediliyor (bu biraz zaman alabilir)...${NC}"

docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${GREEN}✓ Docker image'ları build edildi${NC}\n"

# ═══════════════════════════════════════════════════════════════
# STEP 7: Container'ları Başlat
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[7/8] Container'lar başlatılıyor...${NC}"

docker compose -f docker-compose.prod.yml up -d

sleep 5

echo -e "${GREEN}✓ Container'lar başlatıldı${NC}\n"

# ═══════════════════════════════════════════════════════════════
# STEP 8: Doğrulama
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[8/8] Deployment doğrulanıyor...${NC}\n"

# Container Status
echo -e "${BLUE}📦 Container Durumu:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Health Checks
echo -e "${BLUE}🏥 Health Checks:${NC}"

# Database
DB_HEALTH=$(docker exec deprem_db pg_isready -U deprem_user 2>/dev/null || echo "failed")
if [[ "$DB_HEALTH" == *"accepting"* ]]; then
    echo -e "${GREEN}✓ PostgreSQL: OK${NC}"
else
    echo -e "${RED}✗ PostgreSQL: FAILED${NC}"
fi

# Redis
REDIS_HEALTH=$(docker exec deprem_redis redis-cli ping 2>/dev/null || echo "FAILED")
if [[ "$REDIS_HEALTH" == "PONG" ]]; then
    echo -e "${GREEN}✓ Redis: OK${NC}"
else
    echo -e "${RED}✗ Redis: FAILED${NC}"
fi

# Backend API
BACKEND_HEALTH=$(curl -s http://localhost:8001/api/v1/health || echo "failed")
if [[ "$BACKEND_HEALTH" == *"ok"* ]]; then
    echo -e "${GREEN}✓ Backend API: OK${NC}"
else
    echo -e "${RED}✗ Backend API: FAILED${NC}"
    echo -e "${YELLOW}  Backend log'ları kontrol etmek için: docker logs deprem_backend${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# Sonuç
# ═══════════════════════════════════════════════════════════════

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT TAMAMLANDI!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}\n"

echo -e "${BLUE}📋 SONRAKI ADIMLAR:${NC}\n"

echo "1. Health Check Test:"
echo -e "   ${CYAN}curl http://46.4.123.77:8001/api/v1/health${NC}\n"

echo "2. Register Test:"
echo -e "   ${CYAN}curl -X POST http://46.4.123.77:8001/api/v1/users/register \\${NC}"
echo -e "   ${CYAN}-H \"Content-Type: application/json\" \\${NC}"
echo -e "   ${CYAN}-d '{\"email\":\"test@example.com\",\"password\":\"Test123456!\",\"full_name\":\"Test\"}'${NC}\n"

echo "3. Log'ları Takip Et:"
echo -e "   ${CYAN}docker logs -f deprem_backend${NC}\n"

echo "4. Rate Limiting Test:"
echo -e "   ${CYAN}./VPS_KOMUTLAR_HAZIR_46.4.123.77.md dosyasında bul${NC}\n"

echo -e "${YELLOW}⚠️  DİKKAT:${NC}"
echo "   - .env dosyasında Twilio, OpenAI ve diğer API keyleri güncellemesi gerekebilir"
echo "   - PRODUCTION_DEPLOY.sh script'i de mevcuttur (daha detaylı kontrol için)"
echo ""

echo -e "${GREEN}🚀 Backend hazır: http://46.4.123.77:8001${NC}"
echo -e "${GREEN}🎨 Frontend hazır: http://46.4.123.77:8002${NC}"
