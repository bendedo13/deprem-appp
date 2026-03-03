#!/bin/bash
set -euo pipefail

# ============================================================
# QuakeSense — Production Deploy Script
# VPS: Ubuntu 22.04
# Kullanım: bash deploy_production.sh
# ============================================================

REPO_DIR="/opt/deprem-appp"
DEPLOY_DIR="$REPO_DIR/deploy"
FRONTEND_DIR="$REPO_DIR/frontend"
BRANCH="main"
DOMAIN="deprem.quakesense.com"

echo "========================================"
echo "  QuakeSense Production Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================"

# 1. Kontroller
echo "[1/8] Ortam kontrolleri..."
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo "HATA: $DEPLOY_DIR/.env dosyası bulunamadı!"
    echo "Önce .env dosyasını oluşturun:"
    echo "  cp $DEPLOY_DIR/.env.production.example $DEPLOY_DIR/.env"
    echo "  nano $DEPLOY_DIR/.env"
    exit 1
fi

# .env'den yükle
source "$DEPLOY_DIR/.env"

if [ -z "${SECRET_KEY:-}" ] || [ "$SECRET_KEY" = "CHANGE-THIS" ]; then
    echo "HATA: SECRET_KEY ayarlanmamış veya varsayılan değerde!"
    echo "Güçlü bir key oluşturun: openssl rand -hex 32"
    exit 1
fi

if [ -z "${DB_PASSWORD:-}" ]; then
    echo "HATA: DB_PASSWORD ayarlanmamış!"
    exit 1
fi

# 2. Git pull
echo "[2/8] Git pull..."
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# 3. Backend migration
echo "[3/8] Database migration..."
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml up -d deprem_db deprem_redis
echo "Veritabanının hazır olması bekleniyor..."
sleep 10
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head 2>/dev/null || true

# 4. Build & deploy
echo "[4/8] Docker build & deploy..."
docker compose -f docker-compose.prod.yml up -d --build

# 5. Health check
echo "[5/8] Health check..."
sleep 15
for i in 1 2 3 4 5; do
    HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 5 http://127.0.0.1:8001/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "Backend: OK (HTTP 200)"
        break
    fi
    echo "Bekleniyor... ($i/5)"
    sleep 5
done

FRONTEND_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --connect-timeout 5 http://127.0.0.1:8002/ 2>/dev/null || echo "000")
echo "Frontend: HTTP $FRONTEND_CODE"

# 6. Nginx config
echo "[6/8] Nginx konfigürasyonu..."
if [ ! -f "/etc/nginx/sites-available/quakesense" ]; then
    cp "$DEPLOY_DIR/nginx-production.conf" /etc/nginx/sites-available/quakesense
    ln -sf /etc/nginx/sites-available/quakesense /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    echo "Nginx: Konfigürasyon uygulandı"
else
    cp "$DEPLOY_DIR/nginx-production.conf" /etc/nginx/sites-available/quakesense
    nginx -t && systemctl reload nginx
    echo "Nginx: Güncellendi"
fi

# 7. SSL (Certbot)
echo "[7/8] SSL sertifikası..."
if ! certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "SSL sertifikası bulunamadı. Oluşturmak için:"
    echo "  certbot --nginx -d $DOMAIN"
else
    echo "SSL: Mevcut"
fi

# 8. Durum raporu
echo "[8/8] Final durum..."
echo ""
echo "========================================"
echo "  DEPLOY TAMAMLANDI"
echo "========================================"
docker compose -f docker-compose.prod.yml ps
echo ""
echo "Backend:  http://127.0.0.1:8001/health"
echo "Frontend: http://127.0.0.1:8002/"
echo "Public:   https://$DOMAIN"
echo "========================================"
