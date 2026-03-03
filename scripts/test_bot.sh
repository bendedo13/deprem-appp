#!/bin/bash

# Telegram Bot Test Script
# Bot'un çalışıp çalışmadığını test eder

set -e

echo "🧪 Telegram Bot Test Başlıyor..."

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/opt/deprem-appp"
SERVICE_NAME="telegram-bot"

# Test 1: Service durumu
echo -e "${YELLOW}1️⃣ Service durumu kontrol ediliyor...${NC}"
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✅ Service çalışıyor${NC}"
else
    echo -e "${RED}❌ Service çalışmıyor!${NC}"
    echo "Service'i başlatmak için: sudo systemctl start $SERVICE_NAME"
    exit 1
fi

# Test 2: Environment variables
echo -e "${YELLOW}2️⃣ Environment variables kontrol ediliyor...${NC}"
if [ -f "$PROJECT_DIR/.env" ]; then
    source "$PROJECT_DIR/.env"
    
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
        echo -e "${GREEN}✅ TELEGRAM_BOT_TOKEN tanımlı${NC}"
    else
        echo -e "${RED}❌ TELEGRAM_BOT_TOKEN eksik${NC}"
    fi
    
    if [ -n "$ANTHROPIC_API_KEY" ]; then
        echo -e "${GREEN}✅ ANTHROPIC_API_KEY tanımlı${NC}"
    else
        echo -e "${RED}❌ ANTHROPIC_API_KEY eksik${NC}"
    fi
else
    echo -e "${RED}❌ .env dosyası bulunamadı${NC}"
    exit 1
fi

# Test 3: Python bağımlılıkları
echo -e "${YELLOW}3️⃣ Python bağımlılıkları kontrol ediliyor...${NC}"

REQUIRED_PACKAGES=("telegram" "anthropic" "python-dotenv")
ALL_OK=true

for package in "${REQUIRED_PACKAGES[@]}"; do
    if python3 -c "import $package" 2>/dev/null; then
        echo -e "${GREEN}✅ $package yüklü${NC}"
    else
        echo -e "${RED}❌ $package eksik${NC}"
        ALL_OK=false
    fi
done

if [ "$ALL_OK" = false ]; then
    echo -e "${YELLOW}Eksik paketleri yüklemek için:${NC}"
    echo "cd $PROJECT_DIR/scripts && pip3 install -r requirements_bot.txt"
fi

# Test 4: Bot dosyası
echo -e "${YELLOW}4️⃣ Bot dosyası kontrol ediliyor...${NC}"
if [ -f "$PROJECT_DIR/scripts/ai_developer_bot.py" ]; then
    echo -e "${GREEN}✅ ai_developer_bot.py mevcut${NC}"
else
    echo -e "${RED}❌ ai_developer_bot.py bulunamadı${NC}"
    exit 1
fi

# Test 5: TaskReporter modülü
echo -e "${YELLOW}5️⃣ TaskReporter modülü kontrol ediliyor...${NC}"
if [ -f "$PROJECT_DIR/bot_utils/task_reporter.py" ]; then
    echo -e "${GREEN}✅ task_reporter.py mevcut${NC}"
else
    echo -e "${RED}❌ task_reporter.py bulunamadı${NC}"
    exit 1
fi

# Test 6: Proje dizinleri
echo -e "${YELLOW}6️⃣ Proje dizinleri kontrol ediliyor...${NC}"

PROJECTS=("deprem-appp")
for project in "${PROJECTS[@]}"; do
    if [ -d "/opt/$project" ]; then
        echo -e "${GREEN}✅ /opt/$project mevcut${NC}"
    else
        echo -e "${YELLOW}⚠️ /opt/$project bulunamadı${NC}"
    fi
done

# Test 7: Son log'ları göster
echo -e "${YELLOW}7️⃣ Son log kayıtları:${NC}"
echo ""
sudo journalctl -u "$SERVICE_NAME" -n 10 --no-pager
echo ""

# Test 8: Telegram API bağlantısı
echo -e "${YELLOW}8️⃣ Telegram API bağlantısı test ediliyor...${NC}"
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    RESPONSE=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe")
    
    if echo "$RESPONSE" | grep -q '"ok":true'; then
        BOT_USERNAME=$(echo "$RESPONSE" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✅ Telegram API bağlantısı başarılı${NC}"
        echo -e "${GREEN}   Bot kullanıcı adı: @$BOT_USERNAME${NC}"
    else
        echo -e "${RED}❌ Telegram API bağlantısı başarısız${NC}"
        echo "$RESPONSE"
    fi
fi

# Özet
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Test Tamamlandı!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📝 Kullanım:${NC}"
echo "Telegram'dan bot'a şu formatta mesaj gönderin:"
echo ""
echo "Görev: depremapp - Ana sayfaya buton ekle"
echo ""
echo -e "${YELLOW}📊 Log'ları izlemek için:${NC}"
echo "sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo -e "${YELLOW}🔄 Bot'u yeniden başlatmak için:${NC}"
echo "sudo systemctl restart $SERVICE_NAME"
echo ""
