# 🤖 Telegram Bot - Kullanım Kılavuzu

## 📋 Genel Bakış

Bu Telegram bot'u, GitHub projelerinizde otomatik kod değişiklikleri yapmanıza, test etmenize ve deploy etmenize olanak sağlar. Bot, Claude AI kullanarak verdiğiniz görevleri yerine getirir ve detaylı raporlar sunar.

## 🎯 Desteklenen Projeler

Bot şu projelerinizle çalışacak şekilde yapılandırılmıştır:

1. **eyeoftr** - Eye of TR projesi
2. **faceseek** - FaceSeek projesi  
3. **depremapp** - Deprem App projesi
4. **astroloji** - Astroloji projesi

## 💬 Kullanım

### Görev Verme Formatı

```
Görev: [proje_adı] - [yapılacak değişiklik]
```

### Örnekler

```
Görev: depremapp - Ana sayfaya yeni buton ekle

Görev: eyeoftr - Login sayfasının tasarımını iyileştir

Görev: faceseek - API endpoint'ine rate limiting ekle

Görev: astroloji - Burç yorumları için cache sistemi ekle
```

## 🔄 Bot'un Yaptığı İşlemler

Bot bir görev aldığında şu adımları otomatik olarak gerçekleştirir:

### 1. 🔍 Analiz
- Proje dosyalarını tarar
- Mevcut kod yapısını analiz eder

### 2. 🧠 Kodlama
- Claude AI ile kod değişikliklerini oluşturur
- Best practice'lere uygun kod yazar
- Türkçe yorum satırları ekler

### 3. 💾 Git İşlemleri
- Değişiklikleri commit eder
- GitHub'a push eder
- Commit hash'ini kaydeder

### 4. 🧪 Test
- Proje testlerini çalıştırır
- Health check yapar
- Sonuçları raporlar

### 5. 🚀 Deploy
- Production deploy script'ini çalıştırır
- Deploy durumunu raporlar

### 6. 📊 Raporlama
- Detaylı rapor oluşturur
- Telegram'a gönderir

## 📊 Rapor İçeriği

Bot her görevden sonra size şu bilgileri içeren detaylı bir rapor gönderir:

```
🤖 AL NE YAPTI - DETAYLI RAPOR

📌 Görev: [Görev açıklaması]
⏱️ Süre: Xdk Ys
🎯 Durum: ✅ BAŞARILI / ❌ BAŞARISIZ

📂 Değişen Dosyalar: (N)
  ✓ dosya/yolu.py
    📝 Bu dosyada şu değişiklikleri yaptım:
        - Değişiklik 1
        - Değişiklik 2
    📍 Satır: 45-67

🧪 Test Sonuçları:
  ✅ npm test (Tüm testler geçti)
  ✅ Health Check (HTTP 200)
  ✅ Docker Services (3 services)

🚀 Deploy:
  ✅ Git Commit: abc12345
  ✅ Branch: main
  ✅ Push: Başarılı
  ✅ Production Deploy: Başarılı

🔗 GitHub: [commit linki]
```

## ⚙️ Kurulum

### 1. Gereksinimler

```bash
cd /opt/deprem-appp/scripts
pip install -r requirements_bot.txt
```

### 2. Environment Variables

`.env` dosyasına şu değişkenleri ekleyin:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. Bot'u Başlatma

#### Manuel Başlatma
```bash
cd /opt/deprem-appp/scripts
python ai_developer_bot.py
```

#### Systemd Service (Önerilen)

`/etc/systemd/system/telegram-bot.service` dosyası oluşturun:

```ini
[Unit]
Description=AI Developer Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/deprem-appp/scripts
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
ExecStart=/usr/bin/python3 /opt/deprem-appp/scripts/ai_developer_bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Service'i başlatın:

```bash
sudo systemctl daemon-reload
sudo systemctl enable telegram-bot
sudo systemctl start telegram-bot
sudo systemctl status telegram-bot
```

## 🔧 Proje Yapılandırması

Her proje için yapılandırma `ai_developer_bot.py` dosyasında tanımlıdır:

```python
PROJECT_CONFIGS = {
    "depremapp": {
        "path": Path("/opt/deprem-appp"),
        "github": "https://github.com/bendedo13/deprem-appp",
        "deploy_script": "deploy/PRODUCTION_DEPLOY.sh",
        "test_commands": ["docker-compose ps"],
        "health_check": "http://localhost:8001/health"
    },
    # ... diğer projeler
}
```

### Yeni Proje Ekleme

Yeni bir proje eklemek için `PROJECT_CONFIGS` dictionary'sine yeni bir entry ekleyin:

```python
"yeni_proje": {
    "path": Path("/opt/yeni_proje"),
    "github": "https://github.com/kullanici/yeni_proje",
    "deploy_script": "deploy.sh",
    "test_commands": ["npm test", "npm run lint"],
    "health_check": "http://localhost:3000"
}
```

## 🐛 Hata Ayıklama

### Log'ları Kontrol Etme

```bash
# Systemd service log'ları
sudo journalctl -u telegram-bot -f

# Manuel çalıştırma ile debug
cd /opt/deprem-appp/scripts
python ai_developer_bot.py
```

### Yaygın Sorunlar

#### Bot yanıt vermiyor
- TELEGRAM_BOT_TOKEN'ın doğru olduğundan emin olun
- Bot'un çalıştığını kontrol edin: `systemctl status telegram-bot`

#### Claude API hatası
- ANTHROPIC_API_KEY'in doğru olduğundan emin olun
- API limitlerini kontrol edin

#### Deploy başarısız
- Deploy script'inin executable olduğundan emin olun
- Script path'inin doğru olduğunu kontrol edin

## 📝 İpuçları

1. **Açık ve net görevler verin**: "Ana sayfaya buton ekle" yerine "Ana sayfaya 'İletişim' butonu ekle, mavi renkte olsun"

2. **Küçük görevler tercih edin**: Büyük değişiklikler yerine küçük, test edilebilir görevler verin

3. **Test sonuçlarını kontrol edin**: Bot'un gönderdiği rapordaki test sonuçlarını mutlaka inceleyin

4. **Deploy öncesi kontrol**: Kritik değişiklikler için önce test ortamında deneyin

## 🔐 Güvenlik

- Bot token'larınızı asla paylaşmayın
- `.env` dosyasını git'e eklemeyin
- Production sunucuda bot'u root yerine ayrı bir user ile çalıştırın
- API key'lerinizi düzenli olarak rotate edin

## 📞 Destek

Sorun yaşarsanız:
1. Log'ları kontrol edin
2. Bot'u yeniden başlatın
3. Environment variable'ları kontrol edin
4. GitHub issue açın

## 🎉 Başarılı Kullanım Örneği

```
Siz: Görev: depremapp - Ana sayfaya son depremler listesi ekle

Bot: 🤖 Görev Alındı
     📂 Proje: depremapp
     📝 Görev: Ana sayfaya son depremler listesi ekle
     🔍 Analiz ediliyor...

Bot: 🧠 Claude ile kodlanıyor...

Bot: 💾 Git işlemleri yapılıyor...

Bot: 🧪 Testler çalıştırılıyor...

Bot: 🚀 Deploy başlatılıyor...

Bot: 🤖 AL NE YAPTI - DETAYLI RAPOR
     
     📌 Görev: DEPREMAPP - Ana sayfaya son depremler listesi ekle
     ⏱️ Süre: 2dk 34s
     🎯 Durum: ✅ BAŞARILI
     
     📂 Değişen Dosyalar: (3)
       ✓ frontend/src/pages/Home.tsx
         📝 Ana sayfaya son depremler listesi komponenti eklendi
         📍 Satır: 45-89
       
       ✓ frontend/src/components/EarthquakeList.tsx
         📝 Yeni EarthquakeList komponenti oluşturuldu
         
       ✓ frontend/src/api/earthquakes.ts
         📝 Son depremler için API endpoint eklendi
     
     🧪 Test Sonuçları:
       ✅ docker-compose ps (3 services running)
       ✅ Health Check (HTTP 200)
     
     🚀 Deploy:
       ✅ Git Commit: 7f325314
       ✅ Branch: main
       ✅ Push: Başarılı
       ✅ Production Deploy: Başarılı
     
     🔗 GitHub: https://github.com/bendedo13/deprem-appp/commit/7f325314
```
