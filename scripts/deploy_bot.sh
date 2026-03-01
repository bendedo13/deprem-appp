#!/bin/bash

# Telegram Bot Deploy Script
# Bu script bot'u VPS'e deploy eder ve systemd service olarak çalıştırır

set -e

echo "🤖 Telegram Bot Deploy Başlıyor..."

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Değişkenler
PROJECT_DIR="/opt/deprem-appp"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
SERVICE_NAME="telegram-bot"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

# 1. Gerekli paketleri kontrol et
echo -e "${YELLOW}📦 Gerekli paketleri kontrol ediliyor...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 bulunamadı!${NC}"
    exit 1
fi

# 2. Proje dizinine git
cd "$PROJECT_DIR"

# 3. Git pull
echo -e "${YELLOW}📥 Son değişiklikler çekiliyor...${NC}"
git pull origin main

# 4. Python bağımlılıklarını yükle
echo -e "${YELLOW}📦 Python bağımlılıkları yükleniyor...${NC}"
cd "$SCRIPTS_DIR"

if [ ! -f "requirements_bot.txt" ]; then
    echo -e "${RED}❌ requirements_bot.txt bulunamadı!${NC}"
    exit 1
fi

pip3 install -r requirements_bot.txt --quiet

# 5. Environment variables kontrolü
echo -e "${YELLOW}🔐 Environment variables kontrol ediliyor...${NC}"

if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}❌ .env dosyası bulunamadı!${NC}"
    echo -e "${YELLOW}Lütfen .env dosyasını oluşturun ve şu değişkenleri ekleyin:${NC}"
    echo "TELEGRAM_BOT_TOKEN=your_token"
    echo "ANTHROPIC_API_KEY=your_key"
    exit 1
fi

# .env dosyasını yükle
source "$PROJECT_DIR/.env"

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_BOT_TOKEN tanımlı değil!${NC}"
    exit 1
fi

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY tanımlı değil!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables OK${NC}"

# 6. Systemd service dosyasını oluştur
echo -e "${YELLOW}⚙️ Systemd service oluşturuluyor...${NC}"

sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=AI Developer Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$SCRIPTS_DIR
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=/usr/bin/python3 $SCRIPTS_DIR/ai_developer_bot.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✅ Service dosyası oluşturuldu${NC}"

# 7. Service'i yeniden yükle
echo -e "${YELLOW}🔄 Systemd daemon yeniden yükleniyor...${NC}"
sudo systemctl daemon-reload

# 8. Eski service'i durdur (varsa)
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${YELLOW}⏸️ Mevcut service durduruluyor...${NC}"
    sudo systemctl stop "$SERVICE_NAME"
fi

# 9. Service'i enable et
echo -e "${YELLOW}✅ Service enable ediliyor...${NC}"
sudo systemctl enable "$SERVICE_NAME"

# 10. Service'i başlat
echo -e "${YELLOW}🚀 Service başlatılıyor...${NC}"
sudo systemctl start "$SERVICE_NAME"

# 11. Durum kontrolü
sleep 2

if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✅ Bot başarıyla başlatıldı!${NC}"
    echo ""
    echo -e "${GREEN}📊 Service Durumu:${NC}"
    sudo systemctl status "$SERVICE_NAME" --no-pager -l
    echo ""
    echo -e "${GREEN}📝 Log'ları görmek için:${NC}"
    echo "sudo journalctl -u $SERVICE_NAME -f"
    echo ""
    echo -e "${GREEN}🎉 Deploy tamamlandı!${NC}"
else
    echo -e "${RED}❌ Bot başlatılamadı!${NC}"
    echo ""
    echo -e "${YELLOW}Log'ları kontrol edin:${NC}"
    sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager
    exit 1
fi

# 12. Test mesajı
echo ""
echo -e "${YELLOW}🧪 Bot'u test etmek için Telegram'dan şu mesajı gönderin:${NC}"
echo ""
echo "Görev: depremapp - Test mesajı"
echo ""
