#!/bin/bash

# Telegram Bot Güncellemelerini Deploy Et
# Bu script tüm değişiklikleri commit edip GitHub'a push eder

set -e

echo "🚀 Telegram Bot Güncellemeleri Deploy Ediliyor..."

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Git durumunu kontrol et
echo -e "${YELLOW}📊 Git durumu kontrol ediliyor...${NC}"
git status

# 2. Değişiklikleri ekle
echo -e "${YELLOW}📦 Değişiklikler ekleniyor...${NC}"

# Bot dosyaları
git add scripts/ai_developer_bot.py
git add scripts/deploy_bot.sh
git add scripts/test_bot.sh
git add scripts/TELEGRAM_BOT_KULLANIM.md

# Bot utils
git add bot_utils/

# Dokümantasyon
git add TELEGRAM_BOT_GUNCELLEME.md
git add TELEGRAM_BOT_HIZLI_BASLANGIC.md
git add DEPLOY_TELEGRAM_BOT.sh

echo -e "${GREEN}✅ Dosyalar eklendi${NC}"

# 3. Commit
echo -e "${YELLOW}💾 Commit yapılıyor...${NC}"

COMMIT_MSG="🤖 Telegram Bot Güncelleme - Detaylı Raporlama Sistemi

✨ Yeni Özellikler:
- TaskReporter entegrasyonu ile detaylı Türkçe raporlar
- 4 proje desteği (eyeoftr, faceseek, depremapp, astroloji)
- Otomatik test çalıştırma ve raporlama
- Health check sistemi
- Gelişmiş hata yönetimi ve raporlama

📝 Değişiklikler:
- scripts/ai_developer_bot.py: TaskReporter entegrasyonu, proje configs
- scripts/deploy_bot.sh: VPS deploy otomasyonu
- scripts/test_bot.sh: Bot test script'i
- scripts/TELEGRAM_BOT_KULLANIM.md: Detaylı kullanım kılavuzu
- bot_utils/: TaskReporter modülü
- TELEGRAM_BOT_GUNCELLEME.md: Tüm değişikliklerin özeti
- TELEGRAM_BOT_HIZLI_BASLANGIC.md: Hızlı başlangıç rehberi

🎯 Sorun Giderme:
- 'Al Ne Yaptı' bölümü artık detaylı açıklamalar içeriyor
- Claude'a Türkçe açıklama yapması için özel prompt
- Her dosya değişikliği için açıklama ve satır numaraları
- Test sonuçları ve deploy durumu raporlanıyor

📚 Dokümantasyon:
- Kullanım örnekleri
- Deploy komutları
- Sorun giderme rehberi
- VPS kurulum adımları"

git commit -m "$COMMIT_MSG"

echo -e "${GREEN}✅ Commit tamamlandı${NC}"

# 4. Push
echo -e "${YELLOW}☁️ GitHub'a push ediliyor...${NC}"
git push origin main

echo -e "${GREEN}✅ Push başarılı!${NC}"

# 5. Özet
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Deploy Tamamlandı!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Sonraki Adımlar:${NC}"
echo ""
echo "1️⃣ VPS'e bağlan:"
echo "   ssh root@your-vps-ip"
echo ""
echo "2️⃣ Güncellemeleri çek:"
echo "   cd /opt/deprem-appp"
echo "   git pull origin main"
echo ""
echo "3️⃣ Bot'u deploy et:"
echo "   cd scripts"
echo "   chmod +x deploy_bot.sh test_bot.sh"
echo "   ./deploy_bot.sh"
echo ""
echo "4️⃣ Test et:"
echo "   ./test_bot.sh"
echo ""
echo "5️⃣ Telegram'dan test mesajı gönder:"
echo "   Görev: depremapp - Test mesajı"
echo ""
echo -e "${GREEN}📚 Dokümantasyon:${NC}"
echo "   - TELEGRAM_BOT_HIZLI_BASLANGIC.md (Hızlı başlangıç)"
echo "   - scripts/TELEGRAM_BOT_KULLANIM.md (Detaylı kullanım)"
echo "   - TELEGRAM_BOT_GUNCELLEME.md (Tüm değişiklikler)"
echo ""
