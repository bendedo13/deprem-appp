#!/bin/bash
# ════════════════════════════════════════════════════════
# AI Developer Bot v5 — Deploy Script
# /opt/ai-developer-bot/bot.py olarak deploy eder
# Systemd service: ai-developer-bot.service
# ════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_DIR="/opt/deprem-appp"
BOT_DIR="/opt/ai-developer-bot"
BOT_FILE="$BOT_DIR/bot.py"
BOT_UTILS_DIR="$BOT_DIR/bot_utils"
SERVICE_NAME="ai-developer-bot"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"
ENV_FILE="$REPO_DIR/.env"

echo -e "${CYAN}════════════════════════════════════════${NC}"
echo -e "${CYAN}🤖 AI Developer Bot v5 Deploy${NC}"
echo -e "${CYAN}════════════════════════════════════════${NC}"
echo ""

# 1. Root kontrolü
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Bu script root olarak çalıştırılmalıdır: sudo bash $0${NC}"
    exit 1
fi

# 2. Python3 kontrolü
echo -e "${YELLOW}[1/8] Python3 kontrol ediliyor...${NC}"
if ! command -v python3 &>/dev/null; then
    echo -e "${RED}❌ Python3 bulunamadı! Kuruluyor...${NC}"
    apt-get update && apt-get install -y python3 python3-pip
fi
echo -e "${GREEN}✅ Python3: $(python3 --version)${NC}"

# 3. Repo güncellemesi
echo -e "${YELLOW}[2/8] Repo güncelleniyor...${NC}"
if [ ! -d "$REPO_DIR" ]; then
    echo -e "${RED}❌ Repo bulunamadı: $REPO_DIR${NC}"
    echo "Önce repo'yu clone edin:"
    echo "  git clone https://github.com/bendedo13/deprem-appp.git $REPO_DIR"
    exit 1
fi
cd "$REPO_DIR"
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
git pull origin "$CURRENT_BRANCH" 2>/dev/null || echo -e "${YELLOW}⚠️ Git pull atlandı (yerel değişiklikler var olabilir)${NC}"
echo -e "${GREEN}✅ Repo güncellendi (branch: $CURRENT_BRANCH)${NC}"

# 4. Bot dizini oluştur
echo -e "${YELLOW}[3/8] Bot dizini hazırlanıyor: $BOT_DIR${NC}"
mkdir -p "$BOT_DIR"
mkdir -p "$BOT_UTILS_DIR"

# 5. Bot dosyalarını kopyala
echo -e "${YELLOW}[4/8] Bot dosyaları kopyalanıyor...${NC}"
cp "$REPO_DIR/scripts/ai_developer_bot.py"  "$BOT_FILE"
cp "$REPO_DIR/bot_utils/task_reporter.py"    "$BOT_UTILS_DIR/task_reporter.py"
cp "$REPO_DIR/bot_utils/__init__.py"         "$BOT_UTILS_DIR/__init__.py"
# bot_utils paketini bot dizinine de bağla (import yolu için)
touch "$BOT_DIR/__init__.py" 2>/dev/null || true
echo -e "${GREEN}✅ Dosyalar kopyalandı${NC}"
echo "  → $BOT_FILE"
echo "  → $BOT_UTILS_DIR/task_reporter.py"

# 6. Python bağımlılıkları
echo -e "${YELLOW}[5/8] Python bağımlılıkları yükleniyor...${NC}"
pip3 install \
    "python-telegram-bot>=20.8,<22" \
    "anthropic>=0.40.0" \
    "python-dotenv>=1.0.1" \
    "httpx>=0.27.0" \
    --quiet --break-system-packages 2>/dev/null || \
pip3 install \
    "python-telegram-bot>=20.8,<22" \
    "anthropic>=0.40.0" \
    "python-dotenv>=1.0.1" \
    "httpx>=0.27.0" \
    --quiet
echo -e "${GREEN}✅ Bağımlılıklar yüklendi${NC}"

# 7. .env kontrolü
echo -e "${YELLOW}[6/8] Environment variables kontrol ediliyor...${NC}"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$REPO_DIR/.env.example" ]; then
        cp "$REPO_DIR/.env.example" "$ENV_FILE"
        echo -e "${YELLOW}⚠️ .env oluşturuldu — lütfen düzenleyin:${NC}"
        echo -e "${YELLOW}   nano $ENV_FILE${NC}"
    else
        echo -e "${RED}❌ .env dosyası bulunamadı!${NC}"
        exit 1
    fi
fi

set -a; source "$ENV_FILE"; set +a

MISSING=0
[ -z "$TELEGRAM_BOT_TOKEN" ] && echo -e "${RED}❌ TELEGRAM_BOT_TOKEN eksik!${NC}" && MISSING=1
[ -z "$ANTHROPIC_API_KEY" ]  && echo -e "${YELLOW}⚠️ ANTHROPIC_API_KEY eksik (AI özellikleri devre dışı)${NC}"

if [ "$MISSING" -eq 1 ]; then
    echo -e "${YELLOW}Düzenlemek için: nano $ENV_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Environment variables OK${NC}"

# 8. Python syntax kontrolü
echo -e "${YELLOW}[7/8] Python syntax kontrol ediliyor...${NC}"
python3 -c "import py_compile; py_compile.compile('$BOT_FILE', doraise=True)"
echo -e "${GREEN}✅ Syntax OK${NC}"

# 9. Systemd service oluştur
echo -e "${YELLOW}[8/8] Systemd service güncelleniyor...${NC}"

# Eski service durdur ve kalan process'leri temizle
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
sleep 3
# Stale python3 bot process'leri zorla kapat (sadece /opt/ai-developer-bot/bot.py)
_STALE=$(ps aux 2>/dev/null | grep "[p]ython3.*$BOT_FILE" | awk '{print $2}' || true)
for _PID in $_STALE; do
    if [ "$_PID" -gt 0 ] 2>/dev/null; then
        echo -e "${YELLOW}⚠️ Eski bot process kapatılıyor: PID $_PID${NC}"
        kill "$_PID" 2>/dev/null || true
    fi
done
# PID kilit dosyasını sil
rm -f /tmp/ai-developer-bot.pid

# VPS IP'yi .env'den al (yoksa detect et)
VPS_IP=$(grep "^VPS_IP=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'")
if [ -z "$VPS_IP" ]; then
    VPS_IP=$(hostname -I | awk '{print $1}')
    if grep -q "^VPS_IP=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s/^VPS_IP=.*/VPS_IP=$VPS_IP/" "$ENV_FILE"
    else
        echo "VPS_IP=$VPS_IP" >> "$ENV_FILE"
    fi
fi

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=AI Developer Telegram Bot v5
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$BOT_DIR
EnvironmentFile=$ENV_FILE
Environment="PYTHONPATH=$BOT_DIR"
ExecStart=/usr/bin/python3 $BOT_FILE
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start "$SERVICE_NAME"
sleep 4

# Sonuç
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo ""
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ AI Developer Bot v5 başarıyla deploy edildi!${NC}"
    echo -e "${GREEN}════════════════════════════════════════${NC}"
    echo ""
    systemctl status "$SERVICE_NAME" --no-pager -l | head -20
    echo ""
    echo -e "${CYAN}📝 Yararlı komutlar:${NC}"
    echo "  Log izle:        journalctl -u $SERVICE_NAME -f"
    echo "  Yeniden başlat:  systemctl restart $SERVICE_NAME"
    echo "  Durdur:          systemctl stop $SERVICE_NAME"
    echo "  Durum:           systemctl status $SERVICE_NAME"
    echo ""
    echo -e "${CYAN}💬 Telegram'dan test:${NC}"
    echo "  Görev: depremapp - Test mesajı"
else
    echo ""
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Bot başlatılamadı!${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}"
    echo ""
    echo "Son loglar:"
    journalctl -u "$SERVICE_NAME" -n 40 --no-pager
    exit 1
fi
