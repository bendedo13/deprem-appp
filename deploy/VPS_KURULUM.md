# VPS Kurulum Rehberi — Deprem App

Bu rehber, VPS'teki **mevcut web sitenizle çakışmadan** Deprem App'in kurulmasını anlatır.

---

## 1. Mevcut Site ile Çakışmayı Önleme

| Bileşen | Mevcut site | Deprem App |
|--------|-------------|------------|
| Port | 80, 443 | 8001 (veya subdomain) |
| Container prefix | - | `deprem_` |
| Volume prefix | - | `deprem_postgres_data`, `deprem_redis_data` |
| Network | - | `deprem_net` (izole) |

Deprem App kendi ağ ve portunda çalışır; mevcut site etkilenmez.

---

## 2. Ön Hazırlık (VPS'e SSH ile bağlanın)

```bash
# SSH ile bağlan (şifre veya SSH key ile)
ssh root@46.4.123.77

# Gerekli araçlar
apt update && apt install -y git docker.io docker-compose nginx

# Git yoksa
apt install -y git
```

---

## 3. Projeyi VPS'e Kopyalama

**GitHub'a push ettikten sonra** VPS'te:

```bash
cd /opt
git clone https://github.com/KULLANICI_ADINIZ/deprem-app.git
cd deprem-app
```

Veya henüz GitHub'a push etmediyseniz `scp` ile:

```bash
# Kendi bilgisayarınızdan (Windows PowerShell veya Git Bash)
scp -r C:\Users\win10\Desktop\DEPREMAPP root@46.4.123.77:/opt/deprem-app
```

---

## 4. Environment ve Şifreler

```bash
cd /opt/deprem-app
cp .env.example .env
nano .env
```

`.env` içinde en az şunları ayarlayın:

```env
DB_PASSWORD=güçlü_bir_şifre_buraya
SECRET_KEY=uzun_rastgele_32_karakter
REDIS_URL=redis://deprem_redis:6379/0
```

Deploy klasöründe `DB_PASSWORD` kullanılır. `deploy/.env` oluşturabilirsiniz:

```bash
cd /opt/deprem-app/deploy
echo "DB_PASSWORD=GüçlüŞifre123" > .env
```

---

## 5. Docker ile Çalıştırma

```bash
cd /opt/deprem-app/deploy
docker-compose -f docker-compose.prod.yml up -d
```

Backend sadece iç ağda 8000 portunda dinler. Dış erişim için Nginx gerekir.

---

## 6. Nginx ile Dış Erişim (Mevcut Site Çakışmasın)

**Seçenek A — Port 8001 üzerinden:**

Mevcut Nginx config dosyanıza (`/etc/nginx/sites-available/default` veya sitenizin config'i) şu block'u ekleyin:

```nginx
upstream deprem_backend {
    server 127.0.0.1:8000;
}
server {
    listen 8001;
    server_name _;
    location / {
        proxy_pass http://deprem_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /ws/ {
        proxy_pass http://deprem_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Seçenek B — Docker host portu ile doğrudan expose:**

`docker-compose.prod.yml` içinde `deprem_backend` servisine ekleyin:

```yaml
ports:
  - "8001:8000"
```

Böylece `http://46.4.123.77:8001` üzerinden erişilebilir. Güvenlik duvarında 8001 portunu açın:

```bash
ufw allow 8001
ufw reload
```

---

## 7. Docker Compose'da Port Expose (Basit yol)

`deploy/docker-compose.prod.yml` içindeki `deprem_backend` servisine `ports: - "8001:8000"` eklenirse, Nginx olmadan da `http://46.4.123.77:8001` üzerinden erişilebilir. Bunu ekleyeceğim.

---

## 8. Kontrol

```bash
curl http://localhost:8001/health
# veya
curl http://46.4.123.77:8001/health
```

Başarılı yanıt: `{"status":"ok","version":"1.0.0"}`

---

## 9. GitHub'a Proje Yükleme (Kendi Bilgisayarınızda)

1. GitHub'da yeni repo oluşturun: https://github.com/new  
   - İsim: `deprem-app`  
   - Public  
   - README veya .gitignore eklemeyin (yerel projede zaten var)

2. Yerel projede:

```bash
cd C:\Users\win10\Desktop\DEPREMAPP
git init
git add .
git commit -m "feat: Deprem App - shake detection, clustering, FCM alarm"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/deprem-app.git
git push -u origin main
```

**ÖNEMLİ:** `.env` dosyasını asla commit etmeyin. `.gitignore` içinde `.env` olduğundan emin olun.

---

## 10. Güvenlik Önerileri

1. **Root şifresini değiştirin** (paylaştıysanız mutlaka).
2. **SSH key** kullanın, şifre ile girişi kapatın.
3. **Firewall:** Sadece 80, 443, 8001 (gerekirse), 22 portlarını açın.
4. **DB şifresi:** `.env` içindeki `DB_PASSWORD` güçlü ve benzersiz olsun.
