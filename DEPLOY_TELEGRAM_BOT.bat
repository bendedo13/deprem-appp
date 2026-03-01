@echo off
chcp 65001 >nul
echo.
echo 🚀 Telegram Bot Güncellemeleri Deploy Ediliyor...
echo.

REM Git durumunu kontrol et
echo 📊 Git durumu kontrol ediliyor...
git status
echo.

REM Değişiklikleri ekle
echo 📦 Değişiklikler ekleniyor...

git add scripts/ai_developer_bot.py
git add scripts/deploy_bot.sh
git add scripts/test_bot.sh
git add scripts/TELEGRAM_BOT_KULLANIM.md
git add bot_utils/
git add TELEGRAM_BOT_GUNCELLEME.md
git add TELEGRAM_BOT_HIZLI_BASLANGIC.md
git add DEPLOY_TELEGRAM_BOT.sh
git add DEPLOY_TELEGRAM_BOT.bat

echo ✅ Dosyalar eklendi
echo.

REM Commit
echo 💾 Commit yapılıyor...

git commit -m "🤖 Telegram Bot Güncelleme - Detaylı Raporlama Sistemi" -m "" -m "✨ Yeni Özellikler:" -m "- TaskReporter entegrasyonu ile detaylı Türkçe raporlar" -m "- 4 proje desteği (eyeoftr, faceseek, depremapp, astroloji)" -m "- Otomatik test çalıştırma ve raporlama" -m "- Health check sistemi" -m "- Gelişmiş hata yönetimi ve raporlama" -m "" -m "📝 Değişiklikler:" -m "- scripts/ai_developer_bot.py: TaskReporter entegrasyonu, proje configs" -m "- scripts/deploy_bot.sh: VPS deploy otomasyonu" -m "- scripts/test_bot.sh: Bot test script'i" -m "- scripts/TELEGRAM_BOT_KULLANIM.md: Detaylı kullanım kılavuzu" -m "- bot_utils/: TaskReporter modülü" -m "- TELEGRAM_BOT_GUNCELLEME.md: Tüm değişikliklerin özeti" -m "- TELEGRAM_BOT_HIZLI_BASLANGIC.md: Hızlı başlangıç rehberi" -m "" -m "🎯 Sorun Giderme:" -m "- 'Al Ne Yaptı' bölümü artık detaylı açıklamalar içeriyor" -m "- Claude'a Türkçe açıklama yapması için özel prompt" -m "- Her dosya değişikliği için açıklama ve satır numaraları" -m "- Test sonuçları ve deploy durumu raporlanıyor"

echo ✅ Commit tamamlandı
echo.

REM Push
echo ☁️ GitHub'a push ediliyor...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo ✅ Push başarılı!
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo 🎉 Deploy Tamamlandı!
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 📋 Sonraki Adımlar:
    echo.
    echo 1️⃣ VPS'e bağlan:
    echo    ssh root@your-vps-ip
    echo.
    echo 2️⃣ Güncellemeleri çek:
    echo    cd /opt/deprem-appp
    echo    git pull origin main
    echo.
    echo 3️⃣ Bot'u deploy et:
    echo    cd scripts
    echo    chmod +x deploy_bot.sh test_bot.sh
    echo    ./deploy_bot.sh
    echo.
    echo 4️⃣ Test et:
    echo    ./test_bot.sh
    echo.
    echo 5️⃣ Telegram'dan test mesajı gönder:
    echo    Görev: depremapp - Test mesajı
    echo.
    echo 📚 Dokümantasyon:
    echo    - TELEGRAM_BOT_HIZLI_BASLANGIC.md (Hızlı başlangıç)
    echo    - scripts/TELEGRAM_BOT_KULLANIM.md (Detaylı kullanım)
    echo    - TELEGRAM_BOT_GUNCELLEME.md (Tüm değişiklikler)
    echo.
) else (
    echo ❌ Push başarısız! Lütfen hataları kontrol edin.
    pause
    exit /b 1
)

pause
