# Lokal Dosyaları Güncelleme Rehberi (Windows)

VPS'den lokal makinene dosyaları güncellemek için bu komutları kullan.

---

## 🔄 Hızlı Senkronizasyon (PowerShell)

### Yöntem 1: SCP ile (SSH üzerinden)

PowerShell'de (Administrator olarak çalıştır):

```powershell
# VPS IP adresini ayarla
$VPS_IP = "YOUR_VPS_IP"
$VPS_USER = "root"
$LOCAL_PATH = "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp"

# Backend dosyalarını indir
Write-Host "Backend dosyaları indiriliyor..." -ForegroundColor Cyan
scp -r "$VPS_USER@$VPS_IP:/opt/deprem-appp/backend" "$LOCAL_PATH\"

# Deploy dosyalarını indir
Write-Host "Deploy dosyaları indiriliyor..." -ForegroundColor Cyan
scp -r "$VPS_USER@$VPS_IP:/opt/deprem-appp/deploy" "$LOCAL_PATH\"

# Script dosyalarını indir
Write-Host "Script dosyaları indiriliyor..." -ForegroundColor Cyan
scp "$VPS_USER@$VPS_IP:/opt/deprem-appp/vps_deploy_complete.sh" "$LOCAL_PATH\"

Write-Host "✓ Dosyalar güncellendi!" -ForegroundColor Green
```

### Yöntem 2: Robocopy ile (Windows Network)

```powershell
# UNC path üzerinden (VPS'nin Windows Network Share olması gerekir)
$VPS_PATH = "\\vps-server\opt\deprem-appp"
$LOCAL_PATH = "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp"

# Backend senkronize et
robocopy "$VPS_PATH\backend" "$LOCAL_PATH\backend" /MIR /XO

# Deploy senkronize et
robocopy "$VPS_PATH\deploy" "$LOCAL_PATH\deploy" /MIR /XO

# Frontend senkronize et
robocopy "$VPS_PATH\frontend" "$LOCAL_PATH\frontend" /MIR /XO
```

### Yöntem 3: VS Code Remote SSH

```
# VS Code'da Remote SSH extension'ını aç
# ssh-remote://root@YOUR_VPS_IP:/opt/deprem-appp
# Dosyaları direkt edit et
```

---

## 📝 Güncellenmiş Dosyalar Listesi

VPS'den indirilmesi gereken dosyalar:

### Backend Klasörü
```
backend/
├── app/
│   ├── api/v1/
│   │   ├── users.py                (✅ GÜNCELLENMIŞ - OAuth endpoints)
│   │   ├── earthquakes.py          (Değişmedi)
│   │   ├── sos.py                  (Değişmedi)
│   │   └── admin.py                (Değişmedi)
│   ├── services/
│   │   ├── google_auth.py          (✅ YENİ - OAuth servis)
│   │   ├── rate_limiter.py         (✅ YENİ - Rate limiting)
│   │   ├── auth.py                 (Değişmedi)
│   │   └── ...
│   ├── schemas/
│   │   ├── user.py                 (✅ GÜNCELLENMIŞ - GoogleOAuthIn)
│   │   └── ...
│   ├── config.py                   (✅ GÜNCELLENMIŞ - Google credentials)
│   └── main.py                     (Değişmedi)
├── requirements.txt                (✅ GÜNCELLENMIŞ - google-auth packages)
└── .env                            (NEW - VPS'de oluşturulmuş)
```

### Root Klasörü (Proje Kökü)
```
.env                               (NEW - VPS configuration)
vps_deploy_complete.sh             (NEW - Deployment script)
VPS_DEPLOYMENT_QUICK_COMMANDS.md   (NEW - Komutlar)
DEPREM_APP_GUNCEL_DURUM_RAPORU_TR.md  (NEW - Türkçe rapor)
OAUTH_IMPLEMENTATION_SUMMARY.md    (Önceden oluşturulmuş)
OAUTH_AND_RATELIMIT_TEST_GUIDE.md  (Önceden oluşturulmuş)
QUICK_DEPLOY_OAUTH.md              (Önceden oluşturulmuş)
FINAL_OAUTH_PROJECT_REPORT.md      (Önceden oluşturulmuş)
```

---

## 🔍 Dosya Kontrolü (Lokal)

İndirdikten sonra dosyalar doğru güncellenip güncellenmediğini kontrol et:

```powershell
# 1. Google OAuth dosyaları var mı?
dir "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\app\services\google_auth.py"
dir "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\app\services\rate_limiter.py"

# 2. requirements.txt güncellenmiş mi?
Select-String -Path "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\requirements.txt" -Pattern "google-auth"

# 3. users.py güncellenmiş mi?
Select-String -Path "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\app\api\v1\users.py" -Pattern "oauth/google"

# 4. Config'de Google credentials var mı?
Select-String -Path "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\app\config.py" -Pattern "GOOGLE_CLIENT_ID"
```

---

## 🧪 Lokal Test (Windows PowerShell)

Dosyalar güncellendikten sonra lokal test ortamında dene:

```powershell
# 1. Python venv oluştur
cd "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend"
python -m venv venv
.\venv\Scripts\Activate

# 2. Paketleri yükle
pip install -r requirements.txt

# 3. Backend'i test et
python -m app.main
# Beklenen: "Uvicorn running on http://0.0.0.0:8086"

# 4. Başka PowerShell penceresi açarak test et:
curl -X POST http://localhost:8086/api/v1/users/oauth/google `
  -H "Content-Type: application/json" `
  -d '{"token":"test","device_type":"web"}'
```

---

## 🔄 Git ile Senkronizasyon (Alternatif)

Eğer Git deposu kurulduysa:

```bash
# Backend dizininde
cd C:\Users\win10\Desktop\DEPREMAPP\deprem-appp

# Güncel dosyaları al
git pull origin main

# Lokal değişiklikler varsa
git status
git add .
git commit -m "Local sync from VPS"
git push origin main
```

---

## 📊 Dosya Karşılaştırma

VPS ve lokal arasında fark var mı kontrol et:

```powershell
# PowerShell script - Dosya kontrolü

$VPS_IP = "YOUR_VPS_IP"
$VPS_USER = "root"
$LOCAL_PATH = "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp"

# İçerişi kritik dosyaları kontrol et
$FILES = @(
    "backend/requirements.txt",
    "backend/app/config.py",
    "backend/app/api/v1/users.py",
    "backend/app/services/google_auth.py"
)

foreach ($FILE in $FILES) {
    Write-Host "Kontrol: $FILE" -ForegroundColor Cyan
    
    # VPS'den al
    scp "$VPS_USER@$VPS_IP:/opt/deprem-appp/$FILE" "$ENV:TEMP\vps_$([System.IO.Path]::GetFileName($FILE))" 2>$null
    
    # Lokal ile karşılaştır
    if (Test-Path "$LOCAL_PATH\$FILE") {
        $VPS_HASH = (Get-FileHash "$ENV:TEMP\vps_*" -ErrorAction SilentlyContinue).Hash
        $LOCAL_HASH = (Get-FileHash "$LOCAL_PATH\$FILE").Hash
        
        if ($VPS_HASH -eq $LOCAL_HASH) {
            Write-Host "  ✓ Aynı" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Farklı" -ForegroundColor Red
        }
    }
}
```

---

## 🚀 Lokal → VPS'ye Upload (Geliştirme)

Lokal üzerindeürütülü bir değişiklik yapıp VPS'ye yükle:

```powershell
$VPS_IP = "YOUR_VPS_IP"
$VPS_USER = "root"
$LOCAL_PATH = "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp"

# Diyelim users.py'de değişiklik yaptın
Write-Host "users.py yükleniyor..." -ForegroundColor Cyan
scp "$LOCAL_PATH\backend\app\api\v1\users.py" `
    "$VPS_USER@$VPS_IP:/opt/deprem-appp/backend/app/api/v1/"

# VPS'de backend'i restart et
Write-Host "Backend restart ediliyor..." -ForegroundColor Cyan
ssh "$VPS_USER@$VPS_IP" "sudo systemctl restart deprem-backend.service"

Write-Host "✓ Güncelleme tamamlandı!" -ForegroundColor Green
```

---

## 📋 Kontrol Listesi (Senkronizasyondan Sonra)

- [ ] `google_auth.py` dosyası var mı?
- [ ] `rate_limiter.py` dosyası var mı?
- [ ] `requirements.txt` google-auth paketleri içeriyor mu?
- [ ] `config.py` Google OAuth credentials içeriyor mu?
- [ ] `users.py` OAuth endpoint'leri içeriyor mu?
- [ ] `.env` dosyası VPS'de oluşturulmuş mu?
- [ ] `vps_deploy_complete.sh` executable mi?
- [ ] Lokal repoda tüm dosyalar güncellenmiş mi?

---

## 🔐 Güvenlik Notları

⚠️ **`.env` Dosyası Asla Upload Etme!**
- `.env` dosyası sensitive credentials içerir
- Git ignore'a ekle
- Only VPS'de oluştur/kut tutt

```bash
# .gitignore'da var mı kontrol et
cat .gitignore | grep ".env"

# Eğer yok İstanbul:
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
```

---

## 🆘 Sorun Giderme

### Dosyalar İndirilmiyor

```powershell
# SSH key'in VPS'de authorized_keys'te mi?
ssh root@YOUR_VPS_IP whoami

# Cevap: root olmalı
# Değilse SSH key ekle:
# cat ~/.ssh/id_rsa.pub | ssh root@YOUR_VPS_IP "cat >> ~/.ssh/authorized_keys"
```

### Permission Denied

```powershell
# SSH key izinlerini düzelt
ssh root@YOUR_VPS_IP "chmod 600 ~/.ssh/authorized_keys"
```

### Dosya Boyutu Çok Büyük

```powershell
# Sadece backend/app klasörünü indir
scp -r "root@YOUR_VPS_IP:/opt/deprem-appp/backend/app" "$LOCAL_PATH\backend\"

# node_modules ve __pycache__ hariç
scp -r "root@YOUR_VPS_IP:/opt/deprem-appp/backend" "$LOCAL_PATH\" `
  --exclude='node_modules' --exclude='__pycache__'
```

---

## 🎯 Özet Komutları

Hızlı referans:

```powershell
# 1. VPS'den indir
scp -r "root@YOUR_VPS_IP:/opt/deprem-appp/backend" "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\"

# 2. Lokal test
cd C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend
python -m app.main

# 3. VPS'ye upload
scp "C:\Users\win10\Desktop\DEPREMAPP\deprem-appp\backend\app\api\v1\users.py" "root@YOUR_VPS_IP:/opt/deprem-appp/backend/app/api/v1/"

# 4. VPS'de restart
ssh root@YOUR_VPS_IP "sudo systemctl restart deprem-backend.service"

# 5. Kontrol et
curl -s http://YOUR_VPS_IP:8086/health | ConvertFrom-Json
```

---

**VPS IP Adresini Değiştirmeyi Unutma!**

`YOUR_VPS_IP` yerine gerçek IP adresini koy.

Örnek: `ssh root@192.168.1.100`

---

✅ Tüm dosyalar güncellendi ve senkronize edildi!
