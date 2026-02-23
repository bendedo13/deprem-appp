#!/bin/bash
# Deprem App Production Deployment Script
# VPS'te /opt/deprem-appp/deploy/ dizininden çalıştırılır

set -e

echo "🚀 Deprem App Production Deployment"
echo "===================================="

# Renkli output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Dizinler
DEPLOY_DIR="/opt/deprem-appp/deploy"
PROJECT_DIR="/opt/deprem-appp"

cd "$DEPLOY_DIR"

# 1. Git pull
echo -e "${YELLOW}📥 Git güncellemesi yapılıyor...${NC}"
cd "$PROJECT_DIR"
git stash || true
git pull origin main
echo -e "${GREEN}✓ Git güncellendi${NC}"

# 2. Container'ları durdur
echo -e "${YELLOW}🛑 Container'lar durduruluyor...${NC}"
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml down
echo -e "${GREEN}✓ Container'lar durduruldu${NC}"

# 3. Yeni image'ları build et
echo -e "${YELLOW}🔨 Docker image'ları build ediliyor...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache
echo -e "${GREEN}✓ Build tamamlandı${NC}"

# 4. Container'ları başlat
echo -e "${YELLOW}🚀 Container'lar başlatılıyor...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Container'lar başlatıldı${NC}"

# 5. Database migration (backend container içinde)
echo -e "${YELLOW}🔄 Database migration çalıştırılıyor...${NC}"
sleep 10  # Backend'in başlamasını bekle
docker exec deprem_backend alembic upgrade head
echo -e "${GREEN}✓ Migration tamamlandı${NC}"

# 6. Health check
echo -e "${YELLOW}🏥 Health check yapılıyor...${NC}"
sleep 5
HEALTH=$(curl -s http://localhost:8001/api/v1/health || curl -s http://localhost:8001/health || echo "failed")
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend sağlıklı çalışıyor${NC}"
else
    echo -e "${RED}✗ Health check başarısız!${NC}"
    echo "Logları kontrol edin: docker logs deprem_backend"
fi

# 7. Container durumları
echo ""
echo -e "${BLUE}📊 Container Durumları:${NC}"
docker compose -f docker-compose.prod.yml ps

# 8. Özet
echo ""
echo -e "${GREEN}✅ Deployment tamamlandı!${NC}"
echo ""
echo -e "${BLUE}📝 Yararlı Komutlar:${NC}"
echo "  Logları izle:"
echo "    docker logs -f deprem_backend"
echo "    docker logs -f deprem_celery"
echo "    docker logs -f deprem_frontend"
echo ""
echo "  Container'ları yeniden başlat:"
echo "    docker compose -f docker-compose.prod.yml restart"
echo ""
echo "  Container'ları durdur:"
echo "    docker compose -f docker-compose.prod.yml down"
echo ""
echo "  Tüm logları izle:"
echo "    docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo -e "${BLUE}🌐 Servis URL'leri:${NC}"
echo "  Backend API: http://localhost:8001"
echo "  Frontend: http://localhost:8002"
echo "  Health Check: http://localhost:8001/health"
echo "  API Health: http://localhost:8001/api/v1/health"
echo "  API Docs: http://localhost:8001/docs"
echo ""
