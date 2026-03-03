#!/bin/bash
# AI Developer Bot v3 — Test Script

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/opt/deprem-appp"
SERVICE_NAME="telegram-bot"
PASS=0
FAIL=0

check() {
    if [ "$1" = "true" ]; then
        echo -e "${GREEN}✅ $2${NC}"
        PASS=$((PASS + 1))
    else
        echo -e "${RED}❌ $2${NC}"
        FAIL=$((FAIL + 1))
    fi
}

echo "🧪 AI Developer Bot v3 — Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Service durumu
echo -e "${YELLOW}Service durumu:${NC}"
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    check "true" "Service çalışıyor"
else
    check "false" "Service çalışmıyor — sudo systemctl start $SERVICE_NAME"
fi

# 2. Environment variables
echo -e "${YELLOW}Environment:${NC}"
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
    [ -n "$TELEGRAM_BOT_TOKEN" ] && check "true" "TELEGRAM_BOT_TOKEN" || check "false" "TELEGRAM_BOT_TOKEN eksik"
    [ -n "$ANTHROPIC_API_KEY" ] && check "true" "ANTHROPIC_API_KEY" || check "false" "ANTHROPIC_API_KEY eksik"
else
    check "false" ".env dosyası bulunamadı"
fi

# 3. Python bağımlılıkları
echo -e "${YELLOW}Python bağımlılıkları:${NC}"
for pkg in telegram anthropic dotenv httpx; do
    if python3 -c "import $pkg" 2>/dev/null; then
        check "true" "$pkg"
    else
        check "false" "$pkg eksik"
    fi
done

# 4. Bot dosyaları
echo -e "${YELLOW}Bot dosyaları:${NC}"
for f in "$PROJECT_DIR/scripts/ai_developer_bot.py" "$PROJECT_DIR/bot_utils/task_reporter.py"; do
    [ -f "$f" ] && check "true" "$(basename $f)" || check "false" "$(basename $f) bulunamadı"
done

# 5. Syntax kontrolü
echo -e "${YELLOW}Python syntax:${NC}"
if python3 -c "import py_compile; py_compile.compile('$PROJECT_DIR/scripts/ai_developer_bot.py', doraise=True)" 2>/dev/null; then
    check "true" "ai_developer_bot.py syntax OK"
else
    check "false" "ai_developer_bot.py syntax HATALI"
fi

# 6. Telegram API bağlantısı
echo -e "${YELLOW}Telegram API:${NC}"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    RESPONSE=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe" 2>/dev/null)
    if echo "$RESPONSE" | grep -q '"ok":true'; then
        BOT_USERNAME=$(echo "$RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        check "true" "Telegram API OK — @$BOT_USERNAME"
    else
        check "false" "Telegram API bağlantısı başarısız"
    fi
else
    check "false" "Token yok, API test edilemedi"
fi

# 7. Son loglar
echo ""
echo -e "${YELLOW}Son log kayıtları:${NC}"
journalctl -u "$SERVICE_NAME" -n 5 --no-pager 2>/dev/null || echo "(log okunamadı)"

# Özet
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
TOTAL=$((PASS + FAIL))
echo -e "Sonuç: ${GREEN}$PASS geçti${NC} / ${RED}$FAIL başarısız${NC} (toplam $TOTAL)"
echo ""
if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}✅ Tüm testler geçti!${NC}"
else
    echo -e "${YELLOW}⚠️ Bazı testler başarısız — yukarıdaki hataları düzeltin.${NC}"
fi
echo ""
