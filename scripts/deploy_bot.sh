#!/bin/bash
# ════════════════════════════════════════════════════════
# Telegram Bot Deploy Script
# Bot'u VPS'e deploy eder ve systemd service olarak çalıştırır
# ════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/opt/deprem-appp"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
BOT_UTILS_DIR="$PROJECT_DIR/bot_utils"
SERVICE_NAME="telegram-bot"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}🤖 AI Developer Telegram Bot Deploy${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""

# 1. Python3 kontrolü
echo -e "${YELLOW}1️⃣ Python3 kontrol ediliyor...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 bulunamadı! Kuruluyor...${NC}"
    apt-get update && apt-get install -y python3 python3-pip
fi
echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"

# 2. Proje dizinine git
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Proje dizini bulunamadı: $PROJECT_DIR${NC}"
    echo "Önce projeyi clone edin:"
    echo "  git clone https://github.com/bendedo13/deprem-appp.git $PROJECT_DIR"
    exit 1
fi
cd "$PROJECT_DIR"

# 3. Git pull (hata olursa devam et)
echo -e "${YELLOW}2️⃣ Son değişiklikler çekiliyor...${NC}"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
git pull origin "$CURRENT_BRANCH" 2>/dev/null || echo -e "${YELLOW}⚠️ Git pull atlandı${NC}"

# 4. Python bağımlılıkları
echo -e "${YELLOW}3️⃣ Python bağımlılıkları yükleniyor...${NC}"
if [ -f "$SCRIPTS_DIR/requirements_bot.txt" ]; then
    pip3 install -r "$SCRIPTS_DIR/requirements_bot.txt" --quiet --break-system-packages 2>/dev/null || \
    pip3 install -r "$SCRIPTS_DIR/requirements_bot.txt" --quiet
    echo -e "${GREEN}✅ Bağımlılıklar yüklendi${NC}"
else
    echo -e "${RED}❌ requirements_bot.txt bulunamadı!${NC}"
    exit 1
fi

# 5. .env kontrolü
echo -e "${YELLOW}4️⃣ Environment variables kontrol ediliyor...${NC}"
if [ ! -f "$PROJECT_DIR/.env" ]; then
    if [ -f "$PROJECT_DIR/.env.example" ]; then
        cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
        echo -e "${YELLOW}⚠️ .env dosyası .env.example'dan oluşturuldu${NC}"
        echo -e "${YELLOW}   Lütfen .env dosyasını düzenleyin:${NC}"
        echo -e "${YELLOW}   nano $PROJECT_DIR/.env${NC}"
    else
        echo -e "${RED}❌ .env dosyası bulunamadı!${NC}"
        exit 1
    fi
fi

# .env dosyasını yükle ve kontrol et
set -a
source "$PROJECT_DIR/.env"
set +a

MISSING_VARS=0
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_BOT_TOKEN eksik!${NC}"
    MISSING_VARS=1
fi
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${RED}❌ ANTHROPIC_API_KEY eksik!${NC}"
    MISSING_VARS=1
fi

if [ "$MISSING_VARS" -eq 1 ]; then
    echo -e "${YELLOW}Düzenlemek için: nano $PROJECT_DIR/.env${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Environment variables OK${NC}"

# 6. Bot dosyalarını kontrol et
echo -e "${YELLOW}5️⃣ Bot dosyaları kontrol ediliyor...${NC}"
for FILE in "$SCRIPTS_DIR/ai_developer_bot.py" "$BOT_UTILS_DIR/task_reporter.py" "$BOT_UTILS_DIR/__init__.py"; do
    if [ -f "$FILE" ]; then
        echo -e "${GREEN}  ✅ $(basename $FILE)${NC}"
    else
        echo -e "${RED}  ❌ $(basename $FILE) bulunamadı!${NC}"
        exit 1
    fi
done

# 7. Python syntax kontrolü
echo -e "${YELLOW}6️⃣ Python syntax kontrolü...${NC}"
if python3 -c "import py_compile; py_compile.compile('$SCRIPTS_DIR/ai_developer_bot.py', doraise=True)" 2>/dev/null; then
    echo -e "${GREEN}✅ Syntax OK${NC}"
else
    echo -e "${RED}❌ Python syntax hatası!${NC}"
    python3 -c "import py_compile; py_compile.compile('$SCRIPTS_DIR/ai_developer_bot.py', doraise=True)"
    exit 1
fi

# 8. Systemd service oluştur
echo -e "${YELLOW}7️⃣ Systemd service oluşturuluyor...${NC}"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=AI Developer Telegram Bot
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$PROJECT_DIR/.env
ExecStart=/usr/bin/python3 $SCRIPTS_DIR/ai_developer_bot.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF
echo -e "${GREEN}✅ Service dosyası oluşturuldu${NC}"

# 9. Service yeniden yükle
echo -e "${YELLOW}8️⃣ Systemd daemon yeniden yükleniyor...${NC}"
systemctl daemon-reload

# 10. Eski service ve orphan process'leri durdur
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo -e "${YELLOW}⏸️ Mevcut service durduruluyor...${NC}"
    systemctl stop "$SERVICE_NAME"
fi

# Orphan bot process'lerini temizle (Conflict hatası önleme)
echo -e "${YELLOW}🧹 Orphan bot process'leri temizleniyor...${NC}"
pkill -f "ai_developer_bot.py" 2>/dev/null || true
sleep 2

# 11. Service enable + başlat
echo -e "${YELLOW}9️⃣ Service başlatılıyor...${NC}"
systemctl enable "$SERVICE_NAME" 2>/dev/null
systemctl start "$SERVICE_NAME"

# 12. Durum kontrolü
sleep 3

if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Bot başarıyla deploy edildi!${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo ""
    systemctl status "$SERVICE_NAME" --no-pager -l 2>/dev/null | head -15
    echo ""
    echo -e "${GREEN}📝 Komutlar:${NC}"
    echo "  Log izle:      journalctl -u $SERVICE_NAME -f"
    echo "  Yeniden başlat: systemctl restart $SERVICE_NAME"
    echo "  Durdur:         systemctl stop $SERVICE_NAME"
    echo "  Durum:          systemctl status $SERVICE_NAME"
    echo ""
    echo -e "${GREEN}🧪 Test:${NC}"
    echo "  Telegram'dan: Görev: depremapp - Test mesajı"
    echo ""
else
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Bot başlatılamadı!${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo ""
    journalctl -u "$SERVICE_NAME" -n 30 --no-pager
    exit 1
fi
