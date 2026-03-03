# Windows PowerShell: VPS'ye Dosya Göndermek İçin

# Bu script'i NOT DEFTERI'nde aç ve Windows PowerShell'de çalıştır
# Veya direkt copy-paste yapabilirsin (her komut ayrı çalışır)

# ═══════════════════════════════════════════════════════════════
# ADIM 1: SSH Key'i Ayarla (Eğer key-based auth kullanıyorsan)
# ═══════════════════════════════════════════════════════════════

# Eğer password kullanıyorsan, aşağıdaki 2 adım'ı atla

# Private key'in PATH'i buraya ekle:
$SSH_KEY_PATH = "C:\Users\$env:USERNAME\.ssh\id_rsa"

# ═══════════════════════════════════════════════════════════════
# ADIM 2: VPS Bilgileri
# ═══════════════════════════════════════════════════════════════

$VPS_IP = "46.4.123.77"
$VPS_USER = "root"
$VPS_REMOTE_PATH = "/opt/deprem-appp"

# Local project directory
$LOCAL_PROJECT_DIR = "C:\Users\$env:USERNAME\Desktop\DEPREMAPP\deprem-appp"

# ═══════════════════════════════════════════════════════════════
# ADIM 3: Deployment Script'ini VPS'ye Gönder
# ═══════════════════════════════════════════════════════════════

<#
Windows'ta SCP kullanmak için:
1. OpenSSH (Windows 10/11'de built-in) varsa kullan
2. Yoksa (Windows 7/8 ise) Git Bash veya PuTTY'nin pscp.exe'sini kullan
#>

# Yöntem 1: OpenSSH (Windows 10/11)
# PowerShell'de  aşağıdaki komutları çalıştır:

# OTOMATIK_FIX.sh dosyasını gönder
scp -i $SSH_KEY_PATH `
  "$LOCAL_PROJECT_DIR\deploy\OTOMATIK_FIX.sh" `
  "${VPS_USER}@${VPS_IP}:${VPS_REMOTE_PATH}/deploy/"

# Veya password kullanıyorsan (PowerShell'de doğrudan SCP password gönderemez!)
# Git Bash veya PuTTY pscp.exe kullan:


# ═══════════════════════════════════════════════════════════════
# Alternatif: PuTTY pscp.exe Kullan (Windows 7/8)
# ═══════════════════════════════════════════════════════════════

# PuTTY indir: https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html
# C:\Program Files\PuTTY\pscp.exe ayarla

<#
$PSCP_PATH = "C:\Program Files\PuTTY\pscp.exe"

# Dosya gönder (password prompt açılacak)
& $PSCP_PATH -P 22 `
  "$LOCAL_PROJECT_DIR\deploy\OTOMATIK_FIX.sh" `
  "${VPS_USER}@${VPS_IP}:${VPS_REMOTE_PATH}/deploy/"

& $PSCP_PATH -P 22 `
  "$LOCAL_PROJECT_DIR\.env" `
  "${VPS_USER}@${VPS_IP}:${VPS_REMOTE_PATH}/"
#>

# ═══════════════════════════════════════════════════════════════
# Alternative: Git Bash Kullan
# ═══════════════════════════════════════════════════════════════

<#
# Git Bash'ı indir: https://gitforwindows.org/
# Aşağıdaki komutu Git Bash'te çalıştır:

scp -r "C:\Users\$env:USERNAME\Desktop\DEPREMAPP\deprem-appp\deploy\OTOMATIK_FIX.sh" root@46.4.123.77:/opt/deprem-appp/deploy/
scp "C:\Users\$env:USERNAME\Desktop\DEPREMAPP\deprem-appp\.env" root@46.4.123.77:/opt/deprem-appp/
#>

# ═══════════════════════════════════════════════════════════════
# ADIM 4: VPS'ye SSH ile Bağlan ve Deploy'u Çalıştır
# ═══════════════════════════════════════════════════════════════

# PowerShell'de:
ssh root@46.4.123.77

# Veya OpenSSH'ye key ile:
ssh -i $SSH_KEY_PATH "${VPS_USER}@${VPS_IP}"

# VPS'de girdikten sonra:
<#
cd /opt/deprem-appp/deploy
chmod +x OTOMATIK_FIX.sh
./OTOMATIK_FIX.sh
#>

# ═══════════════════════════════════════════════════════════════
# VPS'DEN DOSYA İNDİRMEK İÇİN
# ═══════════════════════════════════════════════════════════════

# Eğer VPS'den dosya indirmek istersen:

$DOWNLOAD_DIR = "$LOCAL_PROJECT_DIR\vps_backups"

# İndir dizin oluştur
New-Item -ItemType Directory -Path $DOWNLOAD_DIR -Force | Out-Null

# Dosyaları indir (OpenSSH ile)
scp -i $SSH_KEY_PATH `
  "${VPS_USER}@${VPS_IP}:/opt/deprem-appp/.env" `
  "$DOWNLOAD_DIR\.env"

# ═══════════════════════════════════════════════════════════════
# EN KOLAY YÖL: Windows'ta Docker Desktop Kullan (Alternatif)
# ═══════════════════════════════════════════════════════════════

<#
Windows'ta Docker Desktop yüklüyse:

1. Git Bash'ı başlat
2. WSL 2 ile Docker kullan
3. Aynı docker-compose komutlarını Windows'ta çalıştırfıkabilirsin

Komutlar aynı:
docker compose -f deploy\docker-compose.prod.yml up -d
#>

# ═══════════════════════════════════════════════════════════════
# PowerShell Fonksiyon: Basit SSH Komut Çalıştırma
# ═══════════════════════════════════════════════════════════════

function Invoke-VpsCommand {
    param (
        [string]$Command
    )
    
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        # PowerShell 7+
        ssh -i $SSH_KEY_PATH "${VPS_USER}@${VPS_IP}" $Command
    }
    else {
        # PowerShell 5 (Windows 10/11)
        # Manual olarak çalıştırmalı veya putty plink.exe kullan
        Write-Host "PowerShell version $($PSVersionTable.PSVersion.Major) detected"
        Write-Host "SSH command manual olarak çalıştırılmalıdır"
    }
}

# Kullanım örneği:
# Invoke-VpsCommand "docker ps"
# Invoke-VpsCommand "docker logs -f deprem_backend"

# ═══════════════════════════════════════════════════════════════
# HIZLI REFERANS
# ═══════════════════════════════════════════════════════════════

<#
1. DOSYA GÖNDERMEK (Windows'tan VPS'ye):
   scp -i C:\path\to\key "C:\local\file.txt" root@46.4.123.77:/remote/path/

2. DOSYA İNDİRMEK (VPS'den Windows'a):
   scp -i C:\path\to\key root@46.4.123.77:/remote/file.txt "C:\local\"

3. TÜÜM DİZİN GÖNDERMEK:
   scp -i C:\path\to\key -r "C:\local\dir\" root@46.4.123.77:/remote/path/

4. SSH KOMUTU ÇALIŞTIRIMAK:
   ssh -i C:\path\to\key root@46.4.123.77 "command here"

5. INTERAKTI SSH (shell açmak):
   ssh -i C:\path\to\key root@46.4.123.77
#>

# ═══════════════════════════════════════════════════════════════
# PROBLEM GIDERME
# ═══════════════════════════════════════════════════════════════

# "SSH key not found" hatası:
# - C:\Users\<username>\.ssh\id_rsa dosyasının var olup olmadığını kontrol et
# - Veya "ssh-keygen -t rsa -N """" komutu ile yeni key oluştur

# "Permission denied" hatası:
# - Dosyanın chmod'u kontrol et: ssh ... "chmod 600 dosya.txt"
# - PuTTY ile key format dönüştür (PuTTY PEM format'a dönüştürmesi gerekebilir)

# "Connection refused" hatası:
# - VPS 46.4.123.77 IP adresini kontrol et
# - SSH port'u açık mı? (normalde 22)
# - Firewall engel üretmekte mi?

Write-Host "═════════════════════════════════════════════════════════════════"
Write-Host "✅ VPS Deployment Windows Utilities - Ready!"
Write-Host "═════════════════════════════════════════════════════════════════"
