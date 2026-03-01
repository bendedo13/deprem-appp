# 🤖 AI Developer Bot Kurulumu

## 1. Dosyaların Yüklenmesi
Sunucuda dosyalarınızın güncel olduğundan emin olun:
```bash
cd /opt/deprem-appp
git pull origin main
```

## 2. Gereksinimlerin Kurulması
`requirements_bot.txt` dosyasının `scripts/` klasöründe olduğundan emin olun.

```bash
cd /opt/deprem-appp/scripts
pip install -r requirements_bot.txt
```

## 3. Ortam Değişkenleri (.env)
Botun çalışması için ana proje dizinindeki `.env` dosyasında `TELEGRAM_BOT_TOKEN` ve `ANTHROPIC_API_KEY` tanımlı olmalıdır.

`/opt/deprem-appp/.env` dosyasına şu satırları ekleyin:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## 4. Servis Kurulumu (Systemd)
Eğer servis bulunamadı hatası alıyorsanız, servis dosyasını oluşturmanız gerekir:

`/etc/systemd/system/ai-developer-bot.service`:
```ini
[Unit]
Description=AI Developer Telegram Bot
After=network.target

[Service]
User=root
WorkingDirectory=/opt/deprem-appp/scripts
ExecStart=/usr/bin/python3 /opt/deprem-appp/scripts/ai_developer_bot.py
Restart=always
EnvironmentFile=/opt/deprem-appp/.env

[Install]
WantedBy=multi-user.target
```

Komutlar:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-developer-bot
sudo systemctl start ai-developer-bot
```
