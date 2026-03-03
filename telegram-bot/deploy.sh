#!/bin/bash
# ═══════════════════════════════════════════════
# AI Developer Bot v5 — Deploy Script
# Tek komutla VPS'e kurulur ve systemd ile çalışır
# ═══════════════════════════════════════════════

set -e

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
BOT_DIR="/opt/ai-developer-bot"
SRC_DIR="/opt/deprem-appp/telegram-bot"
SVC="ai-developer-bot"

echo -e "${G}════════════════════════════════════════${N}"
echo -e "${G}🤖 AI Developer Bot v5 — Deploy${N}"
echo -e "${G}════════════════════════════════════════${N}"

# 1. Python
echo -e "${Y}[1/7] Python3...${N}"
command -v python3 &>/dev/null || { apt-get update && apt-get install -y python3 python3-pip; }
echo -e "${G}✅ $(python3 --version)${N}"

# 2. Bot dizini
echo -e "${Y}[2/7] Bot dizini hazırlanıyor...${N}"
mkdir -p "$BOT_DIR"
cp "$SRC_DIR/bot.py" "$BOT_DIR/bot.py"
cp "$SRC_DIR/requirements.txt" "$BOT_DIR/requirements.txt"

if [ ! -f "$BOT_DIR/.env" ]; then
    cp "$SRC_DIR/.env.example" "$BOT_DIR/.env"
    echo -e "${Y}⚠️ .env oluşturuldu — düzenle: nano $BOT_DIR/.env${N}"
fi

# 3. Bağımlılıklar
echo -e "${Y}[3/7] Python bağımlılıkları...${N}"
pip3 install -r "$BOT_DIR/requirements.txt" --quiet --break-system-packages 2>/dev/null || \
pip3 install -r "$BOT_DIR/requirements.txt" --quiet
echo -e "${G}✅ Paketler yüklendi${N}"

# 4. .env kontrol
echo -e "${Y}[4/7] Environment kontrol...${N}"
set -a; source "$BOT_DIR/.env"; set +a
[ -z "$TELEGRAM_BOT_TOKEN" ] && echo -e "${R}❌ TELEGRAM_BOT_TOKEN eksik!${N}" && exit 1
[ -z "$ANTHROPIC_API_KEY" ] && echo -e "${R}❌ ANTHROPIC_API_KEY eksik!${N}" && exit 1
echo -e "${G}✅ Credentials OK${N}"

# 5. Syntax
echo -e "${Y}[5/7] Syntax kontrolü...${N}"
python3 -c "import py_compile; py_compile.compile('$BOT_DIR/bot.py', doraise=True)" || exit 1
echo -e "${G}✅ Syntax OK${N}"

# 6. Systemd
echo -e "${Y}[6/7] Service oluşturuluyor...${N}"
cat > "/etc/systemd/system/$SVC.service" <<EOF
[Unit]
Description=AI Developer Telegram Bot v5
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$BOT_DIR
EnvironmentFile=$BOT_DIR/.env
ExecStart=/usr/bin/python3 -u $BOT_DIR/bot.py
Restart=always
RestartSec=10
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

# 7. Başlat
echo -e "${Y}[7/7] Service başlatılıyor...${N}"
systemctl daemon-reload
systemctl stop "$SVC" 2>/dev/null || true
# Eski telegram-bot service'ini de durdur
systemctl stop telegram-bot 2>/dev/null || true
systemctl disable telegram-bot 2>/dev/null || true
pkill -f "ai_developer_bot.py" 2>/dev/null || true
# Eski bot process'lerini temizle (systemd zaten durdurdu)
sleep 2

systemctl enable "$SVC"
systemctl start "$SVC"
sleep 3

if systemctl is-active --quiet "$SVC"; then
    echo ""
    echo -e "${G}════════════════════════════════════════${N}"
    echo -e "${G}✅ Bot v5 başarıyla deploy edildi!${N}"
    echo -e "${G}════════════════════════════════════════${N}"
    systemctl status "$SVC" --no-pager -l | head -15
    echo ""
    echo -e "${G}Komutlar:${N}"
    echo "  Log:     journalctl -u $SVC -f"
    echo "  Restart: systemctl restart $SVC"
    echo "  Stop:    systemctl stop $SVC"
    echo ""
    echo -e "${G}Test:${N}"
    echo "  Telegram'dan: /start"
else
    echo -e "${R}❌ Bot başlatılamadı!${N}"
    journalctl -u "$SVC" -n 30 --no-pager
    exit 1
fi
