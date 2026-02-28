#!/bin/bash

echo "=== Deprem App Health Check ==="
echo ""

echo "[1] Docker container durumu:"
docker ps -a | grep deprem

echo ""
echo "[2] Container logları (son 50 satır):"
docker compose -f /opt/deprem-appp/deploy/docker-compose.yml logs --tail=50

echo ""
echo "[3] Port kontrol (3000 frontend):"
curl -s -o /dev/null -w "Frontend HTTP Status: %{http_code}\n" http://localhost:3000 || echo "Frontend erişilemiyor"

echo ""
echo "[4] Port kontrol (8000 backend):"
curl -s -o /dev/null -w "Backend HTTP Status: %{http_code}\n" http://localhost:8000/health || echo "Backend erişilemiyor"

echo ""
echo "[5] Backend API test:"
curl -s http://localhost:8000/ || echo "Backend API yanıt vermiyor"

echo ""
echo "[6] Disk kullanımı:"
df -h /opt

echo ""
echo "[7] Memory durumu:"
free -h

echo ""
echo "=== Health Check Tamamlandı ==="