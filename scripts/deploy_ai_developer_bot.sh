#!/bin/bash
# ═══════════════════════════════════════════════════════════
# AI Developer Bot v6 — Deploy Script
# Kullanım: sudo bash scripts/deploy_ai_developer_bot.sh
# ═══════════════════════════════════════════════════════════
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

REPO_DIR="/opt/deprem-appp"
BOT_DIR="/opt/ai-developer-bot"
BOT_FILE="$BOT_DIR/bot.py"
BOT_UTILS_DIR="$BOT_DIR/bot_utils"
SERVICE="ai-developer-bot"
SERVICE_FILE="/etc/systemd/system/$SERVICE.service"
ENV_FILE="$REPO_DIR/.env"

log()  { echo -e "${CYAN}$*${NC}"; }
ok()   { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
die()  { echo -e "${RED}❌ $*${NC}"; exit 1; }

log "════════════════════════════════════════"
log "🤖 AI Developer Bot v6 — Deploy"
log "════════════════════════════════════════"

# ── 1. Root kontrolü ────────────────────────────────────────
[ "$EUID" -ne 0 ] && die "Root olarak çalıştırın: sudo bash $0"

# ── 2. Python3 ──────────────────────────────────────────────
log "[1/8] Python3 kontrol ediliyor…"
command -v python3 &>/dev/null || { apt-get update && apt-get install -y python3 python3-pip; }
ok "Python3: $(python3 --version)"

# ── 3. Repo ─────────────────────────────────────────────────
log "[2/8] Repo güncelleniyor…"
[ -d "$REPO_DIR" ] || die "Repo bulunamadı: $REPO_DIR\n  git clone https://github.com/bendedo13/deprem-appp.git $REPO_DIR"
cd "$REPO_DIR"
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
git pull origin "$BRANCH" 2>/dev/null || warn "Git pull atlandı."
ok "Repo hazır (branch: $BRANCH)"

# ── 4. Dizinler ─────────────────────────────────────────────
log "[3/8] Bot dizini hazırlanıyor: $BOT_DIR"
mkdir -p "$BOT_DIR" "$BOT_UTILS_DIR"

# ── 5. Dosyaları kopyala ────────────────────────────────────
log "[4/8] Bot dosyaları kopyalanıyor…"
cp "$REPO_DIR/scripts/ai_developer_bot.py"  "$BOT_FILE"
cp "$REPO_DIR/bot_utils/task_reporter.py"   "$BOT_UTILS_DIR/task_reporter.py"
cp "$REPO_DIR/bot_utils/__init__.py"        "$BOT_UTILS_DIR/__init__.py"
touch "$BOT_DIR/__init__.py"
ok "Dosyalar kopyalandı → $BOT_FILE"

# ── 6. Python bağımlılıkları ────────────────────────────────
log "[5/8] Python bağımlılıkları yükleniyor…"
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
ok "Bağımlılıklar yüklendi."

# ── 7. .env kontrolü ────────────────────────────────────────
log "[6/8] Environment variables kontrol ediliyor…"
if [ ! -f "$ENV_FILE" ]; then
    [ -f "$REPO_DIR/.env.example" ] \
        && cp "$REPO_DIR/.env.example" "$ENV_FILE" \
        || die ".env dosyası bulunamadı!"
    warn ".env oluşturuldu — düzenleyin: nano $ENV_FILE"
fi

set -a; source "$ENV_FILE"; set +a

[ -z "${TELEGRAM_BOT_TOKEN:-}" ] && die "TELEGRAM_BOT_TOKEN eksik! nano $ENV_FILE"
[ -z "${ANTHROPIC_API_KEY:-}" ]  && warn "ANTHROPIC_API_KEY eksik (AI özellikleri devre dışı)"
ok "Environment variables OK."

# ── 8. Syntax kontrolü ──────────────────────────────────────
log "[7/8] Python syntax kontrol ediliyor…"
python3 -c "import py_compile; py_compile.compile('$BOT_FILE', doraise=True)"
ok "Syntax OK."

# ── 9. Eski process'leri ve servisi temizle ─────────────────
log "[8/8] Servis güncelleniyor…"

# Çalışan servisi durdur
systemctl stop "$SERVICE" 2>/dev/null || true
sleep 2

# Kalan stale process'leri temizle (SIGTERM → SIGKILL)
_STALE=$(ps aux 2>/dev/null | grep "[p]ython3.*$BOT_FILE" | awk '{print $2}' || true)
for _PID in $_STALE; do
    [[ "$_PID" =~ ^[0-9]+$ ]] || continue
    warn "Eski bot process kapatılıyor: PID $_PID"
    kill -TERM "$_PID" 2>/dev/null || true
    sleep 2
    kill -0 "$_PID" 2>/dev/null && kill -9 "$_PID" 2>/dev/null || true
done

# PID kilit dosyasını sil
rm -f /tmp/ai-developer-bot.pid

# VPS IP
VPS_IP=$(grep "^VPS_IP=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'" || true)
if [ -z "$VPS_IP" ]; then
    VPS_IP=$(hostname -I | awk '{print $1}')
    grep -q "^VPS_IP=" "$ENV_FILE" 2>/dev/null \
        && sed -i "s/^VPS_IP=.*/VPS_IP=$VPS_IP/" "$ENV_FILE" \
        || echo "VPS_IP=$VPS_IP" >> "$ENV_FILE"
fi

# Systemd service dosyası
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=AI Developer Telegram Bot v6
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=$BOT_DIR
EnvironmentFile=$ENV_FILE
Environment="PYTHONPATH=$BOT_DIR"
ExecStart=/usr/bin/python3 $BOT_FILE
Restart=on-failure
RestartSec=15
StartLimitBurst=5
StartLimitIntervalSec=300
StandardOutput=journal
StandardError=journal
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE"
systemctl start "$SERVICE"
sleep 4

# ── Sonuç ───────────────────────────────────────────────────
if systemctl is-active --quiet "$SERVICE"; then
    echo ""
    ok "════════════════════════════════════════"
    ok "AI Developer Bot v6 başarıyla deploy edildi!"
    ok "════════════════════════════════════════"
    echo ""
    systemctl status "$SERVICE" --no-pager -l | head -20
    echo ""
    echo -e "${CYAN}📝 Yararlı komutlar:${NC}"
    echo "  Log izle:       journalctl -u $SERVICE -f"
    echo "  Yeniden başlat: systemctl restart $SERVICE"
    echo "  Durdur:         systemctl stop $SERVICE"
    echo "  Durum:          systemctl status $SERVICE"
    echo ""
    echo -e "${CYAN}💬 Test:${NC} Telegram'da 'Görev: depremapp - test' yaz"
else
    echo ""
    die "Bot başlatılamadı! Son loglar:"
    journalctl -u "$SERVICE" -n 50 --no-pager
fi
