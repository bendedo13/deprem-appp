#!/bin/bash
# Quick Fix Script - VPS'te hızlı düzeltme için

set -e

echo "🔧 Quick Fix - Deprem App"
echo "=========================="

cd /opt/deprem-appp

# 1. Git pull
echo "📥 Git pull..."
git stash || true
git pull origin main

# 2. Container'ları yeniden başlat
echo "🔄 Container'lar yeniden başlatılıyor..."
cd /opt/deprem-appp/deploy
docker compose -f docker-compose.prod.yml restart

# 3. Bekle
echo "⏳ Container'ların başlaması bekleniyor..."
sleep 10

# 4. Health check
echo "🏥 Health check..."
curl -s http://localhost:8001/health || curl -s http://localhost:8001/api/v1/health

echo ""
echo "✅ Quick fix tamamlandı!"
echo ""
echo "Loglar:"
echo "  docker logs -f deprem_backend"
echo "  docker logs -f deprem_celery"
