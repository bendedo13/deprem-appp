# VPS Otomatik Deployment Setup

Bu dokümenta, VPS'de otomatik deployment sisteminin kurulumu anlatılmaktadır.

## 📋 Gerekli Şartlar

- VPS'de SSH erişimi (root veya sudo yetkisi)
- Docker ve Docker Compose kurulu
- Git kurulu
- `/opt/deprem-appp` dizini mevcutBit not: Deployment script, otomatik olarak Git'ten pull yapıp, database'i reset eder ve migration'ları çalıştırır.

---

## 🚀 ADIM 1: Repository Kurulumu

```bash
# SSH ile VPS'ye bağlan
ssh root@46.4.123.77

# Repository'yi clone et (henüz yoksa)
cd /opt
git clone https://github.com/bendedo13/deprem-appp.git
cd deprem-appp

# Branch'i kontrol et (main olmalı)
git branch -v
```

---

## 📦 ADIM 2: Deployment Scripts Kurulumu

```bash
# Deployment script'ini çalıştırılabilir yap
chmod +x /opt/deprem-appp/deploy/vps-deployment.sh

# Systemd service dosyalarını kopyala
sudo cp /opt/deprem-appp/deploy/deprem-auto-deploy.service /etc/systemd/system/
sudo cp /opt/deprem-appp/deploy/deprem-auto-deploy.timer /etc/systemd/system/

# Systemd daemon'u reload et
sudo systemctl daemon-reload

# Status'ü kontrol et
sudo systemctl list-unit-files | grep deprem
```

---

## ⏰ ADIM 3: Otomatik Deployment'ı Etkinleştir

### Seçenek A: Systemd Timer (Önerilen)

```bash
# Timer'ı etkinleştir (her 5 dakikada check eder)
sudo systemctl enable deprem-auto-deploy.timer
sudo systemctl start deprem-auto-deploy.timer

# Status'ü kontrol et
sudo systemctl status deprem-auto-deploy.timer
sudo systemctl status deprem-auto-deploy.service

# Timer'ın ne zaman çalışacağını gör
sudo systemctl list-timers deprem-auto-deploy.timer

# Log'ları gör
sudo journalctl -u deprem-auto-deploy.service -f
```

### Seçenek B: Cron Job (Manuel)

Eğer Systemd kullanmak istemiyorsan, cron kullanabilirsin:

```bash
# Crontab'ı aç
sudo crontab -e

# Şu satırı ekle (her 5 dakikada çalışır)
*/5 * * * * /opt/deprem-appp/deploy/vps-deployment.sh main prod >> /var/log/deprem-cron.log 2>&1
```

---

## 🧪 ADIM 4: İlk Deployment Manuel Çalıştır

```bash
# Deployment script'ini manuel olarak çalıştır
sudo /opt/deprem-appp/deploy/vps-deployment.sh main prod

# Çıktıyı monitör et (böyle başarı görmelisin):
# ✅ Git pull completed
# ✅ Database cleanup completed
# ✅ Alembic version reset completed
# ✅ Migrations completed successfully
# ✅ Services restarted
# ✅ Health checks completed
# ✅ API tests completed
# ✅ DEPLOYMENT COMPLETED SUCCESSFULLY
```

### Eğer başarısız olursa:

```bash
# Log dosyasını kontrol et
tail -100 /var/log/deprem-deployment.log

# Docker container'ları kontrol et
docker-compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml ps

# Backend log'ları gör
docker logs deprem_backend --tail 50

# Database kontrol et
docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT * FROM alembic_version;"
```

---

## 📊 ADIM 5: Monitoring ve Maintenance

### Log Monitoring

```bash
# Systemd journal log'larını gör
sudo journalctl -u deprem-auto-deploy.service -n 50 --no-pager

# Son 100 satırı follow et
sudo journalctl -u deprem-auto-deploy.service -f

# Deployment log dosyasını gör
tail -50 /var/log/deprem-deployment.log
```

### Deployment Durumu Kontrol Et

```bash
# Son deployment'ın sonucunu gör
sudo systemctl status deprem-auto-deploy.service

# Timer'ın son çalışma zamanı
sudo systemctl list-timers deprem-auto-deploy.timer --all

# Tüm timer's
systemctl list-timers
```

### Manuel Deployment Çalıştır

```bash
# Otomatik deployment'ı beklemeden manuel olarak çalıştır
sudo systemctl start deprem-auto-deploy.service

# Status'ü gör
watch -n 1 'systemctl status deprem-auto-deploy.service'

# Logları izle
sudo journalctl -u deprem-auto-deploy.service -f
```

---

## 🔧 ADIM 6: Troubleshooting

### Database Connection Error

```bash
# Database status'ü kontrol et
docker-compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml ps

# Database'i restart et
docker-compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml restart db

# Database'e bağlan ve test et
docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT 1;"
```

### Migration Hatası

```bash
# Alembic history'yi kontrol et
docker-compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml run --rm backend alembic history

# Current version'ı gör
docker-compose -f /opt/deprem-appp/deploy/docker-compose.prod.yml run --rm backend alembic current

# Manual olarak version'u set et (acil durum)
docker exec deprem_db psql -U deprem_user -d deprem_db -c "UPDATE alembic_version SET version_num = '004' WHERE version_num != '004';"
```

### API Error

```bash
# Backend log'larını kontrol et
docker logs deprem_backend --tail 100 | grep -i error

# API health check
curl -v http://localhost:8001/health

# API endpoint test
curl -X POST http://localhost:8001/api/v1/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test123456"}'
```

---

## 🛑 ADIM 7: Deployment'ı Devre Dışı Bırakma

Eğer otomatik deployment'ı devre dışı bırakmak istersen:

```bash
# Systemd Timer'ı durdur
sudo systemctl stop deprem-auto-deploy.timer
sudo systemctl disable deprem-auto-deploy.timer

# Veya Cron job'ı kaldır
sudo crontab -e
# İlgili satırı sil
```

---

## 📝 Deployment Akışı

```
┌─────────────────────────────────────────────┐
│  5 dakikada bir timer tetiklenir            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  vps-deployment.sh çalışır                  │
└────────────────┬────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│Git Pull│  │DB Reset│  │Migrate │
└────────┘  └────────┘  └────────┘
    │            │            │
    └────────────┼────────────┘
                 │
                 ▼
         ┌─────────────────┐
         │ Services Restart│
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Health Checks   │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Tests & Verify  │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ Log & Report    │
         └─────────────────┘
```

---

## 💡 Tips

1. **Real-time Monitoring**: Deployment sırasında log'ları gerçek zamanlı izle
   ```bash
   sudo journalctl -u deprem-auto-deploy.service -f
   ```

2. **Quick Manual Deploy**: Git'te push yaptıktan sonra hemen deploy et
   ```bash
   sudo systemctl start deprem-auto-deploy.service
   ```

3. **Debugging**: Deployment başarısız olursa logları kontrol et
   ```bash
   tail -200 /var/log/deprem-deployment.log | grep -i error
   ```

4. **Database Backup**: Production'da backup almayı unutma
   ```bash
   docker exec deprem_db pg_dump -U deprem_user deprem_db > backup_$(date +%Y%m%d).sql
   ```

---

## 📧 Support

Sorun olursa:
- Log dosyasını kontrol et: `/var/log/deprem-deployment.log`
- Docker container'ları kontrol et: `docker ps`
- Database bağlantısını test et: `docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT 1;"`

Başarılar! 🚀
