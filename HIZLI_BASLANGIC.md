# ⚡ Deprem App - Hızlı Başlangıç

## 🎯 ŞİMDİ NE YAPMALIYIM?

### 1️⃣ Backend'i Deploy Et (5 dakika)

VPS'e bağlan:
```bash
ssh root@46.4.123.77
```

Şu komutları çalıştır:
```bash
cd /opt/deprem-appp
git pull origin main
docker exec deprem_backend alembic upgrade head
docker-compose -f deploy/docker-compose.prod.yml restart backend
```

### 2️⃣ Test Et (2 dakika)

```bash
curl http://46.4.123.77:8001/api/v1/health
```

Sonuç: `{"status":"ok"}` görmelisin.

### 3️⃣ APK Yap (20 dakika)

```bash
cd mobile
eas login
eas build --platform android --profile production
```

Build tamamlanınca APK indirme linki gelecek.

## 📝 Detaylı Rehberler

- **Backend Deployment**: `DEPLOYMENT_SUMMARY.md`
- **APK Build (Türkçe)**: `mobile/APK_YAPMA_REHBERI.md`
- **APK Build (English)**: `mobile/BUILD_APK.md`
- **Test Script**: `TEST_AFTER_DEPLOY.sh`

## 🔧 Yapılan Düzeltmeler

✅ Database migration sorunu çözüldü
✅ Login endpoint düzeltildi (`full_name` → `name`)
✅ ImSafeRequest schema'ya latitude/longitude eklendi
✅ APK build rehberleri oluşturuldu

## 🚀 Tek Komut ile Deploy

VPS'te:
```bash
cd /opt/deprem-appp && \
git pull origin main && \
docker exec deprem_backend alembic upgrade head && \
docker-compose -f deploy/docker-compose.prod.yml restart backend && \
docker logs -f deprem_backend
```

## 📱 Tek Komut ile APK

Local'de:
```bash
cd mobile && eas build --platform android --profile production
```

## ✅ Başarı Kontrolü

Backend çalışıyor mu?
```bash
curl http://46.4.123.77:8001/api/v1/health
```

Login çalışıyor mu?
```bash
curl -X POST http://46.4.123.77:8001/api/v1/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"test123456"}'
```

## 🆘 Sorun mu Var?

1. Backend logları:
```bash
docker logs deprem_backend | tail -50
```

2. Database kontrol:
```bash
docker exec deprem_db psql -U deprem_user -d deprem_db -c "\d users"
```

3. Migration kontrol:
```bash
docker exec deprem_backend alembic current
```

---

**Hazırsın! Başla! 🚀**
