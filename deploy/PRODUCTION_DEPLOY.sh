#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# DEPREM APP - PRODUCTION DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════
# Bu script tüm deployment sorunlarını çözer:
# - Git sync sorunları
# - Docker cache sorunları  
# - Database migration
# - Health check validation
# ═══════════════════════════════════════════════════════════════

set -e  # Hata durumunda dur

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  DEPREM APP - PRODUCTION DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Dizinler
PROJECT_DIR="/opt/deprem-appp"
DEPLOY_DIR="$PROJECT_DIR/deploy"

# ═══════════════════════════════════════════════════════════════
# STEP 1: GIT SYNC (FORCE)
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[1/8] Git sync yapılıyor (force)...${NC}"
cd "$PROJECT_DIR"

# Local değişiklikleri kaydet
git stash save "auto-stash-$(date +%Y%m%d-%H%M%S)" || true

# Remote'dan çek
git fetch origin main

# Local'i remote ile senkronize et (FORCE)
git reset --hard origin/main

# Temizlik
git clean -fd

echo -e "${GREEN}✓ Git sync tamamlandı${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 2: VERIFY CODE
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[2/8] Kod doğrulanıyor...${NC}"

# /api/v1/health endpoint'i var mı kontrol et
if grep -q "@app.get(\"/api/v1/health\"" "$PROJECT_DIR/backend/app/main.py"; then
    echo -e "${GREEN}✓ /api/v1/health endpoint kodu mevcut${NC}"
else
    echo -e "${RED}✗ /api/v1/health endpoint kodu bulunamadı!${NC}"
    echo "main.py içeriği:"
    grep "@app.get" "$PROJECT_DIR/backend/app/main.py"
    exit 1
fi

# init_db import'u yok mu kontrol et
if grep -q "from app.database import init_db" "$PROJECT_DIR/backend/app/main.py"; then
    echo -e "${RED}✗ init_db import'u hala var! DuplicateTableError riski!${NC}"
    exit 1
else
    echo -e "${GREEN}✓ init_db import'u yok (doğru)${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 3: DOCKER DOWN
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[3/8] Container'lar durduruluyor...${NC}"
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml down
echo -e "${GREEN}✓ Container'lar durduruldu${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 4: DOCKER BUILD (NO CACHE)
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[4/8] Docker image build ediliyor (--no-cache)...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache deprem_backend deprem_celery
echo -e "${GREEN}✓ Build tamamlandı${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 5: DOCKER UP
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[5/8] Container'lar başlatılıyor...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Container'lar başlatıldı${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 6: WAIT FOR HEALTHY
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[6/8] Container'ların hazır olması bekleniyor...${NC}"
sleep 15

# Container durumlarını kontrol et
echo "Container durumları:"
docker compose -f docker-compose.prod.yml ps
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 7: DATABASE MIGRATION
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[7/8] Database migration çalıştırılıyor...${NC}"
docker exec deprem_backend alembic upgrade head
echo -e "${GREEN}✓ Migration tamamlandı${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════
# STEP 8: HEALTH CHECK & VALIDATION
# ═══════════════════════════════════════════════════════════════
echo -e "${YELLOW}[8/8] Health check yapılıyor...${NC}"
sleep 3

# Test 1: /health
echo -n "Testing /health... "
HEALTH_RESPONSE=$(curl -s http://localhost:8001/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

# Test 2: /api/v1/health
echo -n "Testing /api/v1/health... "
API_HEALTH_RESPONSE=$(curl -s http://localhost:8001/api/v1/health)
if echo "$API_HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $API_HEALTH_RESPONSE"
    echo ""
    echo "Container içindeki kod kontrol ediliyor:"
    docker exec deprem_backend cat app/main.py | grep -A 2 "@app.get"
    exit 1
fi

# Test 3: /docs
echo -n "Testing /docs... "
DOCS_RESPONSE=$(curl -s http://localhost:8001/docs)
if echo "$DOCS_RESPONSE" | grep -q "swagger"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    exit 1
fi

# Test 4: Root
echo -n "Testing /... "
ROOT_RESPONSE=$(curl -s http://localhost:8001/)
if echo "$ROOT_RESPONSE" | grep -q "Deprem App API"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    exit 1
fi

echo ""

# ═══════════════════════════════════════════════════════════════
# SUCCESS SUMMARY
# ═══════════════════════════════════════════════════════════════
echo -e "${GREEN}"
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT BAŞARILI!"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${NC}"

echo -e "${BLUE}📊 Servis Bilgileri:${NC}"
echo "  Backend API: http://localhost:8001"
echo "  Frontend: http://localhost:8002"
echo "  API Docs: http://localhost:8001/docs"
echo ""

echo -e "${BLUE}🔍 Endpoint'ler:${NC}"
echo "  GET  /health           → ${GREEN}✓${NC}"
echo "  GET  /api/v1/health    → ${GREEN}✓${NC}"
echo "  GET  /docs             → ${GREEN}✓${NC}"
echo "  GET  /                 → ${GREEN}✓${NC}"
echo ""

echo -e "${BLUE}📝 Yararlı Komutlar:${NC}"
echo "  Logları izle:"
echo "    docker logs -f deprem_backend"
echo "    docker logs -f deprem_celery"
echo ""
echo "  Container durumu:"
echo "    docker ps"
echo ""
echo "  Yeniden başlat:"
echo "    docker compose -f $DEPLOY_DIR/docker-compose.prod.yml restart"
echo ""

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
