#!/bin/bash

echo "=== Deprem App Health Check ==="
echo ""

echo "[1] Docker container durumu:"
docker ps -a --filter "name=deprem" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "[2] Son container logları (son 50 satır):"
docker logs $(docker ps -aq --filter "name=deprem" | head -1) --tail=50 2>&1
echo ""

echo "[3] Docker compose servisleri:"
cd /opt/deprem-appp/deploy && docker compose ps 2>/dev/null || docker-compose ps 2>/dev/null
echo ""

echo "[4] Port durumu:"
ss -tlnp | grep -E ':(3000|8000|80|443)' 2>/dev/null || netstat -tlnp | grep -E ':(3000|8000|80|443)' 2>/dev/null
echo ""

echo "[5] Frontend erişim testi:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000 2>/dev/null || echo "Frontend erişilemiyor"
echo ""

echo "[6] Backend erişim testi:"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8000/health 2>/dev/null || echo "Backend /health erişilemiyor"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8000/ 2>/dev/null || echo "Backend / erişilemiyor"
echo ""

echo "[7] Sistem kaynakları:"
free -h
echo ""
df -h / 2>/dev/null
echo ""

echo "[8] Son sistem hataları:"
journalctl -n 20 --no-pager 2>/dev/null | grep -i "error\|fail\|deprem" || echo "journalctl erişilemiyor"
echo ""

echo "=== Health Check Tamamlandı ==="