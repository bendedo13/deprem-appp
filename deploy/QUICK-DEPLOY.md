# 🚀 Quick Deployment Guide

## Tek Komutla VPS Setup (İlk Kez)

```bash
# VPS'ye SSH ile bağlan
ssh root@46.4.123.77

# Bu komutu kopyala/yapıştır:
cd /opt/deprem-appp && \
chmod +x deploy/vps-deployment.sh && \
sudo cp deploy/deprem-auto-deploy.service /etc/systemd/system/ && \
sudo cp deploy/deprem-auto-deploy.timer /etc/systemd/system/ && \
sudo systemctl daemon-reload && \
sudo systemctl enable deprem-auto-deploy.timer && \
sudo systemctl start deprem-auto-deploy.timer && \
echo "✅ Auto-deployment enabled!"
```

---

## Deployment Durumunu Kontrol Et

```bash
# Timer'ı kontrol et
sudo systemctl status deprem-auto-deploy.timer

# Log'ları gerçek zamanlı izle
sudo journalctl -u deprem-auto-deploy.service -f
```

---

## Manuel Deployment Yap

```bash
# Hemen deployment çalıştır
sudo systemctl start deprem-auto-deploy.service

# Statusü izle
sudo journalctl -u deprem-auto-deploy.service -f
```

---

## Kontrol Listesi (Her Deployment Sonrası)

```bash
# ✅ Alembic version 006 olmalı
docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT * FROM alembic_version;"

# ✅ Emergency contacts tabloda 3 yeni kolon var
docker exec deprem_db psql -U deprem_user -d deprem_db -c "\d emergency_contacts" | grep -E "relation|methods|priority"

# ✅ Users tabloda 5 yeni kolon var
docker exec deprem_db psql -U deprem_user -d deprem_db -c "\d users" | grep -E "name|phone|avatar|plan|join_date"

# ✅ Backend sağlıklı
curl http://localhost:8001/health

# ✅ API çalışıyor
curl -X POST http://localhost:8001/api/v1/users/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test123456"}'
```

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| Deployment başarısız | `tail -50 /var/log/deprem-deployment.log` |
| Database bağlantı hatası | `docker-compose -f deploy/docker-compose.prod.yml restart db` |
| Migration hatası | `docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT * FROM alembic_version;"` |
| Services kapalı | `docker-compose -f deploy/docker-compose.prod.yml up -d` |

---

## Yapılacaklar Sırası

1. **Lokal**: Code yazıp commit/push et
2. **Otomatik**: 5 dakika içinde VPS'de deployment çalışır
3. **Kontrol**: Logları izle ve statusü doğrula
4. **Test**: Health check ve API test çalıştır

Hepsi bu kadar! 🎉
