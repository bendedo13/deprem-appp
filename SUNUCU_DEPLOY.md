# 🚀 Sunucuya Deploy Etme Rehberi

**Tek komutla deploy** için aşağıdaki adımları sırayla takip edin.

---

## 📋 Gereksinimler

- Ubuntu 22.04 VPS (root erişimi)
- Docker ve Docker Compose
- Git

---

## 1️⃣ Sunucuya Bağlan

```bash
ssh root@SUNUCU_IP_ADRESIN
```

---

## 2️⃣ İlk Kurulum (sadece bir kez)

```bash
# Docker kur
apt update && apt install -y docker.io docker-compose-plugin git curl

# Docker'ı başlat
systemctl start docker
systemctl enable docker

# Projeyi klonla
cd /opt
git clone https://github.com/bendedo13/deprem-appp.git deprem-appp
cd deprem-appp
```

---

## 3️⃣ Ortam Değişkenlerini Ayarla

```bash
cd /opt/deprem-appp/deploy

# .env dosyasını oluştur
cp .env.example .env

# Düzenle (SERVER_IP, DB_PASSWORD, SECRET_KEY'i değiştir)
nano .env
```

`.env` içeriği (bu 3 değeri mutlaka doldurun):

```env
SERVER_IP=46.4.123.77          # ← Sunucu IP adresin
DB_PASSWORD=GüçlüŞifre123!     # ← Benzersiz bir şifre
SECRET_KEY=abc123xyz...        # ← En az 32 karakter rastgele string
```

Secret Key üretmek için:
```bash
openssl rand -hex 32
```

---

## 4️⃣ Deploy Et

```bash
cd /opt/deprem-appp/deploy
chmod +x deploy.sh
./deploy.sh
```

Bu script otomatik olarak şunları yapar:
- Git'ten son kodu çeker
- Docker image'larını build eder
- Container'ları başlatır
- Veritabanı migration'larını çalıştırır
- Health check yapar

---

## 5️⃣ Kontrol Et

```bash
# Servis durumları
docker compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml ps

# Backend sağlık kontrolü
curl http://localhost:8001/health
# Beklenen: {"status":"ok","version":"1.0.0"}

# Tarayıcıda aç
# Backend API:  http://SUNUCU_IP:8001
# Frontend:     http://SUNUCU_IP:8002
# API Docs:     http://SUNUCU_IP:8001/docs
# Admin Panel:  http://SUNUCU_IP:8002/admin
```

---

## 🔄 Güncelleme (Sonraki Deploylar)

Her yeni güncelleme için sadece bu komutu çalıştır:

```bash
cd /opt/deprem-appp/deploy && ./deploy.sh
```

---

## 📊 Log Takibi

```bash
# Tüm loglar (canlı)
docker compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml logs -f

# Sadece backend
docker logs -f deprem_backend

# Sadece database
docker logs -f deprem_db
```

---

## 🛑 Durdurma / Yeniden Başlatma

```bash
# Durdur
docker compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml down

# Yeniden başlat
docker compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml restart

# Sadece backend'i yeniden başlat
docker restart deprem_backend
```

---

## 🔥 Güvenlik Duvarı (UFW)

```bash
ufw allow 22/tcp    # SSH
ufw allow 8001/tcp  # Backend API
ufw allow 8002/tcp  # Frontend
ufw --force enable
```

---

## 🧑‍💼 Admin Paneli

Deploy tamamlandıktan sonra admin paneline giriş yapın:

- **URL:** `http://SUNUCU_IP:8002/admin`
- **Giriş bilgileri:** Alembic migration (`008_seed_admin_user.py`) tarafından otomatik oluşturulur.
  Farklı bilgiler ayarlamak için migration çalıştırmadan önce şunları düzenleyin:
  ```bash
  # Kendi e-posta ve şifrenizle admin oluşturun:
  docker exec deprem_backend python scripts/create_admin.py
  ```

---

## ❓ Sık Karşılaşılan Sorunlar

### `.env dosyası bulunamadı` hatası
```bash
cd /opt/deprem-appp/deploy
cp .env.example .env
nano .env  # SERVER_IP ve şifreleri gir
```

### Container başlamıyor
```bash
docker logs deprem_backend    # Hata mesajını gör
docker logs deprem_db         # DB hatası var mı?
```

### Port 8001/8002 erişilemiyor
```bash
ufw allow 8001/tcp
ufw allow 8002/tcp
ufw reload
```

### Migration hatası
```bash
docker exec deprem_backend alembic upgrade head
```
