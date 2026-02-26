#!/bin/bash
# Deprem App - Database Migration Fix & Full Deployment
# Bu script database migration sorununu çözer ve uygulamayı deploy eder

set -e  # Hata durumunda dur

echo "═══════════════════════════════════════════════════════════════"
echo "🔧 DEPREM APP - DATABASE FIX & DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"

# VPS bilgileri
VPS_IP="46.4.123.77"
PROJECT_PATH="/opt/deprem-appp"

echo ""
echo "📋 Adım 1: Git Push"
echo "─────────────────────────────────────────────────────────────"
git add .
git commit -m "fix: User model field name issue (full_name -> name) and ImSafeRequest schema"
git push origin main

echo ""
echo "📋 Adım 2: VPS'e Bağlan ve Deploy Et"
echo "─────────────────────────────────────────────────────────────"
echo "Şimdi VPS'te şu komutları çalıştırın:"
echo ""
echo "ssh root@${VPS_IP}"
echo ""
echo "# Projeye git"
echo "cd ${PROJECT_PATH}"
echo ""
echo "# Git pull"
echo "git pull origin main"
echo ""
echo "# Database durumunu kontrol et"
echo "docker exec deprem_backend alembic current"
echo ""
echo "# Migration'ı tekrar çalıştır (idempotent)"
echo "docker exec deprem_backend alembic upgrade head"
echo ""
echo "# Database kolonlarını kontrol et"
echo "docker exec deprem_db psql -U deprem_user -d deprem_db -c \"\\d users\""
echo ""
echo "# Backend'i yeniden başlat"
echo "docker-compose -f deploy/docker-compose.prod.yml restart backend"
echo ""
echo "# Logları izle"
echo "docker logs -f deprem_backend"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Script hazır! Yukarıdaki komutları VPS'te çalıştırın."
echo "═══════════════════════════════════════════════════════════════"
