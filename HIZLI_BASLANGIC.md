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

### 3️⃣ APK Yap (Terminal ile - 15 dakika)

**Otomatik (Kolay):**
```bash
cd mobile
BUILD_APK_TERMINAL.bat
```

**Manuel:**
```bash
cd mobile
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`

## 📝 Detaylı Rehberler

- **Backend Deployment**: `DEPLOYMENT_SUMMARY.md`
- **APK Build (Terminal - Basit)**: `mobile/BASIT_APK_REHBERI.md` ⭐
- **APK Build (Terminal - Detaylı)**: `mobile/APK_TERMINAL_REHBERI.md`
- **APK Build (EAS)**: `mobile/APK_YAPMA_REHBERI.md`
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

Local'de (Terminal):
```bash
cd mobile && BUILD_APK_TERMINAL.bat
```

veya manuel:
```bash
cd mobile && npm install && npx expo prebuild --platform android && cd android && gradlew.bat assembleRelease
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
