# 🚀 Final Deployment Commands

## 📌 Tek Sayfa — VPS ve EAS Komutları (Kopyala-Yapıştır)

Aşağıdaki komutları sırayla kullanın; her seferinde aynı liste yeterli.

### VPS (Backend / Sunucu)

```bash
# 1. VPS'e bağlan
ssh root@VPS_IP_ADRESINIZ

# 2. Proje dizini
cd /opt/deprem-appp/deploy

# 3. Güncel kodu çek
cd /opt/deprem-appp && git pull origin main

# 4. Yeniden build ve başlat
cd /opt/deprem-appp/deploy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 5. Veritabanı migration (gerekirse)
docker exec deprem_backend alembic upgrade head

# 6. Log kontrol
docker logs -f deprem_backend
docker logs -f deprem_celery
docker ps -a
```

### EAS Build (Mobil APK)

```bash
# 1. Mobil proje dizini (yerelde)
cd deprem-appp-1/mobile
# veya: cd /path/to/deprem-appp-1/mobile

# 2. Bağımlılık uyumluluğu kontrol (Expo SDK ile uyum)
npx expo install --check

# 3. EAS giriş
eas whoami
# Gerekirse: eas login

# 4. Production APK build
eas build --platform android --profile production

# 5. Build listesi / indirme
eas build:list
eas build:view BUILD_ID
eas build:download --id BUILD_ID
```

### Hızlı Referans (Tek Satır Özet)

| Amaç | Komut |
|------|--------|
| VPS deploy | `ssh root@IP 'cd /opt/deprem-appp && git pull && cd deploy && docker compose -f docker-compose.prod.yml up -d --build'` |
| Migration | `docker exec deprem_backend alembic upgrade head` |
| **Admin şifre/rol güncelle** | `docker exec deprem_backend python -m app.db.init_admin` |
| Android APK | `cd mobile && eas build --platform android --profile production` |
| Build cache temizle | `eas build:clear-cache` sonra `eas build --platform android --profile production --clear-cache` |

### Admin girişi (Patron)

- **E-posta:** `bendedo13@gmail.com`
- **Şifre:** `Benalan.1`
- Mobilde giriş: Önce Firebase dener; "E-posta veya şifre hatalı" alırsan backend girişi otomatik denenir. Bu hesabı admin yapmak ve şifreyi sabitlemek için deploy sonrası VPS’te:  
  `docker exec deprem_backend python -m app.db.init_admin`  
  Böylece bu e-posta `is_admin=True` ve şifre `Benalan.1` olarak güncellenir. Sadece bu hesap menüde **Patron — Admin Panel** butonunu görür.

---

## ✅ Production-Ready Status

All issues have been fixed:
- ✅ react-native-google-mobile-ads removed (config plugin error)
- ✅ cli.appVersionSource added to eas.json
- ✅ Expo Go warning suppressed
- ✅ babel.config.js and metro.config.js created
- ✅ npm vulnerabilities fixed with overrides
- ✅ Node version locked to 20.18.0
- ✅ .npmrc configured for legacy-peer-deps
- ✅ Production build scripts created

## 📋 VPS Commands (Run in Order)

### 1. Pull Latest Changes

```bash
ssh root@46.4.123.77

cd /opt/deprem-appp/mobile
git pull origin main
```

### 2. Clean Install Dependencies

```bash
# Remove old dependencies
rm -rf node_modules package-lock.json

# Install fresh
npm install --legacy-peer-deps
```

### 3. Validate Configuration

```bash
# Check Expo config (should work now)
npx expo config --json

# Run Expo doctor
npx expo-doctor

# Check npm audit
npm audit
```

### 4. Build with EAS

```bash
# Make sure you're logged in
eas whoami

# If not logged in
eas login

# Start production build
eas build --platform android --profile production
```

## 🎯 Alternative: Automated Build Script

```bash
cd /opt/deprem-appp/mobile

# Make script executable
chmod +x PRODUCTION_BUILD.sh

# Run automated build
bash PRODUCTION_BUILD.sh
```

This script will:
1. Check environment (Node, npm, EAS CLI)
2. Clean install dependencies
3. Run expo-doctor
4. Validate config
5. Check EAS login
6. Start production build

## 🔧 If Build Still Fails

### Clear All Caches

```bash
cd /opt/deprem-appp/mobile

# Clear npm cache
npm cache clean --force

# Clear Expo cache
rm -rf .expo

# Clear EAS cache
eas build:clear-cache

# Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Try build again
eas build --platform android --profile production --clear-cache
```

### Check Node Version

```bash
# Check current version
node -v

# Should be 18.x or 20.x
# If not, install correct version:
nvm install 20.18.0
nvm use 20.18.0
```

### Validate Config Manually

```bash
# Check app.json syntax
cat app.json | jq .

# Check eas.json syntax
cat eas.json | jq .

# Check package.json syntax
cat package.json | jq .

# Test Expo config
npx expo config --json
```

## 📊 Build Monitoring

```bash
# List recent builds
eas build:list

# View specific build
eas build:view BUILD_ID

# View logs
eas build:view BUILD_ID --logs

# Cancel build
eas build:cancel BUILD_ID
```

## 📱 After Build Completes

1. Download APK from EAS dashboard: https://expo.dev
2. Transfer to Android device
3. Enable "Install from Unknown Sources"
4. Install APK
5. Test all features:
   - GPS location
   - S.O.S voice recorder
   - Firebase push notifications
   - Emergency contacts

## 🎉 Expected Build Output

```
✔ Build completed!

Build details:
https://expo.dev/accounts/YOUR_ACCOUNT/projects/quakesense/builds/BUILD_ID

APK download:
https://expo.dev/artifacts/BUILD_ARTIFACT_ID
```

## 📝 Configuration Summary

### package.json
- Node: 18.0.0 - 20.18.0
- npm: >= 9.0.0
- Overrides: glob, inflight, rimraf (security fixes)
- No react-native-google-mobile-ads

### eas.json
- cli.appVersionSource: remote
- Node: 20.18.0
- buildType: apk
- EAS_BUILD_NO_EXPO_GO_WARNING: true
- Cache enabled

### app.json
- Plugins: expo-sensors, expo-location, expo-av, expo-build-properties
- No react-native-google-mobile-ads plugin
- Android permissions: VIBRATE, INTERNET, LOCATION, RECORD_AUDIO

### New Files
- babel.config.js (Expo preset)
- metro.config.js (Expo default)
- .npmrc (legacy-peer-deps)
- PRODUCTION_BUILD.sh (automated script)
- PRODUCTION_BUILD.md (documentation)

## 🆘 Support

If you encounter any issues:

1. Check build logs: `eas build:view BUILD_ID --logs`
2. Run expo-doctor: `npx expo-doctor`
3. Validate config: `npx expo config --json`
4. Check GitHub issues: https://github.com/bendedo13/deprem-appp/issues

## ✨ Success Checklist

- [ ] `git pull origin main` successful
- [ ] `npm install --legacy-peer-deps` successful
- [ ] `npx expo config --json` works without errors
- [ ] `npx expo-doctor` passes (or minor warnings only)
- [ ] `eas whoami` shows logged in user
- [ ] `eas build --platform android --profile production` starts successfully
- [ ] Build completes without errors (10-20 minutes)
- [ ] APK downloads successfully
- [ ] App installs on device
- [ ] All features work correctly

## 🎯 Next Steps After Successful Build

1. Test app thoroughly on physical device
2. Get Twilio Account SID and Phone Number from https://console.twilio.com/
3. Update backend `.env` with Twilio credentials
4. Restart backend: `docker compose -f docker-compose.prod.yml restart backend`
5. Test S.O.S voice alert end-to-end
6. Submit to Google Play Store (optional)
