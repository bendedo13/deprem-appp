#!/bin/bash

echo "=== DEPREM APP FIX KONTROL ==="
echo ""

# Renk kodlari
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check() {
  local desc="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo -e "${GREEN}[OK]${NC} $desc"
    ((PASS++))
  else
    echo -e "${RED}[FAIL]${NC} $desc"
    ((FAIL++))
  fi
}

warn() {
  local desc="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    echo -e "${GREEN}[OK]${NC} $desc"
    ((PASS++))
  else
    echo -e "${YELLOW}[WARN]${NC} $desc"
  fi
}

echo "--- Docker Kontrol ---"
check "Docker servisi calisiyor" "systemctl is-active --quiet docker"
check "Docker Compose mevcut" "command -v docker-compose || docker compose version"

echo ""
echo "--- Container Kontrol ---"
check "Frontend container ayakta" "docker ps | grep -q 'deprem.*frontend\|frontend.*deprem'"
check "Backend container ayakta" "docker ps | grep -q 'deprem.*backend\|backend.*deprem'"
warn "Nginx container ayakta" "docker ps | grep -q 'nginx'"
warn "Redis container ayakta" "docker ps | grep -q 'redis'"

echo ""
echo "--- Port Kontrol ---"
check "Port 80 dinleniyor" "ss -tlnp | grep -q ':80 '"
warn "Port 443 dinleniyor" "ss -tlnp | grep -q ':443 '"
check "Port 8000 dinleniyor (backend)" "ss -tlnp | grep -q ':8000 '"
warn "Port 3000 dinleniyor (frontend-dev)" "ss -tlnp | grep -q ':3000 '"

echo ""
echo "--- API Kontrol ---"
check "Backend health endpoint" "curl -sf http://localhost:8000/health"
check "Backend /api/earthquakes endpoint" "curl -sf http://localhost:8000/api/earthquakes"
warn "Frontend HTTP erisim" "curl -sf http://localhost:80"

echo ""
echo "--- Dosya Kontrol ---"
check "docker-compose.yml mevcut" "test -f /opt/deprem-appp/deploy/docker-compose.yml"
check ".env dosyasi mevcut" "test -f /opt/deprem-appp/deploy/.env"
warn "nginx.conf mevcut" "test -f /opt/deprem-appp/deploy/nginx.conf"
check "Backend main.py mevcut" "test -f /opt/deprem-appp/deploy/backend/main.py"
check "Frontend package.json mevcut" "test -f /opt/deprem-appp/deploy/frontend/package.json"

echo ""
echo "--- Log Kontrol (Son Hatalar) ---"
BACKEND_ERRORS=$(docker logs $(docker ps -qf "name=backend") 2>&1 | grep -i "error\|exception\|traceback" | tail -5)
if [ -z "$BACKEND_ERRORS" ]; then
  echo -e "${GREEN}[OK]${NC} Backend loglarinda hata yok"
  ((PASS++))
else
  echo -e "${YELLOW}[WARN]${NC} Backend log hatalari:"
  echo "$BACKEND_ERRORS"
fi

FRONTEND_ERRORS=$(docker logs $(docker ps -qf "name=frontend") 2>&1 | grep -i "error\|failed" | tail -5)
if [ -z "$FRONTEND_ERRORS" ]; then
  echo -e "${GREEN}[OK]${NC} Frontend loglarinda hata yok"
  ((PASS++))
else
  echo -e "${YELLOW}[WARN]${NC} Frontend log hatalari:"
  echo "$FRONTEND_ERRORS"
fi

echo ""
echo "--- Kaynak Kullanim ---"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null || echo "Docker stats alinamiyor"

echo ""
echo "=============================="
echo -e "Toplam: ${GREEN}$PASS BASARILI${NC} / ${RED}$FAIL BASARISIZ${NC}"
echo "=============================="

if [ $FAIL -gt 0 ]; then
  echo ""
  echo -e "${RED}Bazi kritik kontroller basarisiz! Asagidaki komutu calistir:${NC}"
  echo "  cd /opt/deprem-appp/deploy && docker-compose up -d --build"
  exit 1
else
  echo ""
  echo -e "${GREEN}Tum kritik kontroller basarili!${NC}"
  exit 0
fi