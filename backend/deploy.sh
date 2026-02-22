#!/bin/bash
# Deprem App Backend Deployment Script
# VPS'te çalıştırılacak otomatik deployment scripti

set -e  # Hata durumunda dur

echo "🚀 Deprem App Backend Deployment Başlıyor..."

# Renkli output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Proje dizini
PROJECT_DIR="/opt/deprem-appp"
BACKEND_DIR="$PROJECT_DIR/backend"

# 1. PostgreSQL kontrolü
echo -e "${YELLOW}📊 PostgreSQL kontrol ediliyor...${NC}"
if ! systemctl is-active --quiet postgresql; then
    # Alternatif PostgreSQL servisleri dene
    if systemctl is-active --quiet postgresql@*; then
        echo -e "${GREEN}✓ PostgreSQL çalışıyor (alternatif servis)${NC}"
    else
        echo -e "${RED}✗ PostgreSQL çalışmıyor!${NC}"
        echo "PostgreSQL'i başlatmak için:"
        echo "  sudo systemctl start postgresql"
        echo "veya mevcut PostgreSQL servisini bulun:"
        echo "  systemctl list-units | grep postgres"
        exit 1
    fi
else
    echo -e "${GREEN}✓ PostgreSQL çalışıyor${NC}"
fi

# 2. Redis kontrolü
echo -e "${YELLOW}📊 Redis kontrol ediliyor...${NC}"
if ! systemctl is-active --quiet redis-server && ! systemctl is-active --quiet redis; then
    echo -e "${RED}✗ Redis çalışmıyor!${NC}"
    echo "Redis'i başlatmak için:"
    echo "  sudo systemctl start redis-server"
    exit 1
else
    echo -e "${GREEN}✓ Redis çalışıyor${NC}"
fi

# 3. Backend dizinine git
cd "$BACKEND_DIR"

# 4. Virtual environment aktifleştir
echo -e "${YELLOW}🐍 Virtual environment aktifleştiriliyor...${NC}"
if [ ! -d "venv" ]; then
    echo -e "${RED}✗ Virtual environment bulunamadı!${NC}"
    echo "Oluşturmak için: python3.10 -m venv venv"
    exit 1
fi
source venv/bin/activate
echo -e "${GREEN}✓ Virtual environment aktif${NC}"

# 5. Bağımlılıkları kontrol et
echo -e "${YELLOW}📦 Bağımlılıklar kontrol ediliyor...${NC}"
pip install -q -r requirements.txt
echo -e "${GREEN}✓ Bağımlılıklar güncel${NC}"

# 6. .env dosyası kontrolü
echo -e "${YELLOW}🔐 .env dosyası kontrol ediliyor...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env dosyası bulunamadı!${NC}"
    echo "Oluşturmak için: cp .env.example .env"
    exit 1
fi
echo -e "${GREEN}✓ .env dosyası mevcut${NC}"

# 7. Database bağlantısını test et
echo -e "${YELLOW}🔌 Database bağlantısı test ediliyor...${NC}"
export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"
python3 -c "
import asyncio
from app.database import async_engine
async def test():
    async with async_engine.connect() as conn:
        print('Database bağlantısı başarılı!')
asyncio.run(test())
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database bağlantısı başarılı${NC}"
else
    echo -e "${RED}✗ Database bağlantısı başarısız!${NC}"
    echo "DATABASE_URL'i kontrol edin: cat .env | grep DATABASE_URL"
    exit 1
fi

# 8. Migration çalıştır
echo -e "${YELLOW}🔄 Database migration çalıştırılıyor...${NC}"
alembic upgrade head
echo -e "${GREEN}✓ Migration tamamlandı${NC}"

# 9. Eski process'leri durdur
echo -e "${YELLOW}🛑 Eski process'ler durduruluyor...${NC}"
pkill -f "uvicorn app.main:app" || true
pkill -f "celery -A app.tasks" || true
sleep 2
echo -e "${GREEN}✓ Eski process'ler durduruldu${NC}"

# 10. Backend'i başlat
echo -e "${YELLOW}🚀 Backend başlatılıyor (port 8001)...${NC}"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 > /var/log/deprem-backend.log 2>&1 &
BACKEND_PID=$!
sleep 3

# Backend'in başladığını kontrol et
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend başlatıldı (PID: $BACKEND_PID)${NC}"
else
    echo -e "${RED}✗ Backend başlatılamadı!${NC}"
    echo "Log: tail -50 /var/log/deprem-backend.log"
    exit 1
fi

# 11. Celery worker'ı başlat
echo -e "${YELLOW}🚀 Celery worker başlatılıyor...${NC}"
nohup celery -A app.tasks.celery_app worker --loglevel=info > /var/log/celery-worker.log 2>&1 &
CELERY_PID=$!
sleep 3

# Celery'nin başladığını kontrol et
if ps -p $CELERY_PID > /dev/null; then
    echo -e "${GREEN}✓ Celery worker başlatıldı (PID: $CELERY_PID)${NC}"
else
    echo -e "${RED}✗ Celery worker başlatılamadı!${NC}"
    echo "Log: tail -50 /var/log/celery-worker.log"
    exit 1
fi

# 12. Health check
echo -e "${YELLOW}🏥 Health check yapılıyor...${NC}"
sleep 2
HEALTH_CHECK=$(curl -s http://localhost:8001/health || echo "failed")
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✓ Backend sağlıklı çalışıyor${NC}"
else
    echo -e "${RED}✗ Health check başarısız!${NC}"
    echo "Curl: curl http://localhost:8001/health"
    exit 1
fi

# 13. Özet
echo ""
echo -e "${GREEN}✅ Deployment başarıyla tamamlandı!${NC}"
echo ""
echo "📊 Servis Bilgileri:"
echo "  Backend PID: $BACKEND_PID"
echo "  Celery PID: $CELERY_PID"
echo "  Backend URL: http://localhost:8001"
echo ""
echo "📝 Loglar:"
echo "  Backend: tail -f /var/log/deprem-backend.log"
echo "  Celery: tail -f /var/log/celery-worker.log"
echo ""
echo "🔍 Process Kontrolü:"
echo "  ps aux | grep uvicorn"
echo "  ps aux | grep celery"
echo ""
