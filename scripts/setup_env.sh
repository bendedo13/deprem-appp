#!/bin/bash

# VPS'te .env Dosyası Oluşturma Script'i
# Bu script .env dosyasını otomatik olarak oluşturur

set -e

echo "🔐 .env Dosyası Oluşturuluyor..."

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/opt/deprem-appp"
ENV_FILE="$PROJECT_DIR/.env"

# Eğer .env zaten varsa yedekle
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️ Mevcut .env dosyası bulundu, yedekleniyor...${NC}"
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✅ Yedek oluşturuldu${NC}"
fi

# .env dosyasını oluştur
cat > "$ENV_FILE" << 'EOF'
# ════════════════════════════════════════════════════════════
# DEPREM APP — Environment Variables
# ════════════════════════════════════════════════════════════

# ── Uygulama ──────────────────────────────────────────────
DEBUG=false
SECRET_KEY=buraya-cok-uzun-ve-rastgele-bir-string-koy-min-32-karakter

# ── Veritabanı ────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://deprem_user:deprem_pass@localhost:5432/deprem_db
REDIS_URL=redis://localhost:6379/0

# ── CORS ──────────────────────────────────────────────────
ALLOWED_ORIGINS=https://depremapp.com,http://localhost:3000,http://localhost:5173

# ── Deprem API'leri ───────────────────────────────────────
AFAD_API_URL=https://deprem.afad.gov.tr/apiv2
KANDILLI_API_URL=https://api.orhanaydogdu.com.tr
USGS_API_URL=https://earthquake.usgs.gov
EMSC_API_URL=https://www.seismicportal.eu/fdsnws/event/1
FETCH_INTERVAL_SECONDS=30

# ── Firebase Push Notification ────────────────────────────
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# ── Anthropic Claude AI ───────────────────────────────────
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE

# ── Telegram Bot ──────────────────────────────────────────
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
TELEGRAM_CHAT_ID=YOUR_TELEGRAM_CHAT_ID_HERE

# ── Sentry (Hata Takibi) ──────────────────────────────────
SENTRY_DSN=

# ── E-posta ───────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=info@depremapp.com
SMTP_PASSWORD=

# ── Stripe (Premium Abonelik) ─────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PREMIUM_MONTHLY_PRICE_ID=

# ── Google AdSense ────────────────────────────────────────
GOOGLE_ADSENSE_ID=ca-pub-XXXXXXXXXXXXXXXX

# ── JWT ───────────────────────────────────────────────────
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
EOF

echo -e "${GREEN}✅ .env dosyası oluşturuldu: $ENV_FILE${NC}"

# Dosya izinlerini ayarla
chmod 600 "$ENV_FILE"
echo -e "${GREEN}✅ Dosya izinleri ayarlandı (600)${NC}"

# Kontrol et
echo ""
echo -e "${YELLOW}📋 .env Dosyası İçeriği:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
grep -E "^(ANTHROPIC_API_KEY|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)=" "$ENV_FILE" | sed 's/=.*/=***HIDDEN***/'
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🎉 .env dosyası hazır!${NC}"
