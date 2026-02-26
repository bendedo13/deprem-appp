# 📱 Deprem App - APK Build Rehberi

Bu rehber, Deprem App mobil uygulamasını APK'ye dönüştürmek için adım adım talimatlar içerir.

## 🔧 Ön Gereksinimler

1. **Node.js** (v18 veya üzeri)
2. **npm** veya **yarn**
3. **Expo CLI** (`npm install -g expo-cli`)
4. **EAS CLI** (`npm install -g eas-cli`)
5. **Expo hesabı** (https://expo.dev)

## 📋 Adım 1: Proje Yapılandırması

### 1.1 API URL'ini Güncelle

`mobile/app.json` dosyasını açın ve API URL'ini VPS IP'nize göre ayarlayın:

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://46.4.123.77:8001"
    }
  }
}
```

### 1.2 Firebase Yapılandırması

`mobile/google-services.json` dosyasının mevcut olduğundan emin olun. Yoksa Firebase Console'dan indirin.

## 📋 Adım 2: EAS Build Yapılandırması

### 2.1 EAS CLI'ye Giriş Yapın

```bash
cd mobile
eas login
```

Expo hesabınızla giriş yapın.

### 2.2 EAS Build Yapılandırması Oluşturun

```bash
eas build:configure
```

Bu komut `eas.json` dosyasını otomatik oluşturacaktır.

### 2.3 `eas.json` Dosyasını Düzenleyin

Oluşturulan `mobile/eas.json` dosyasını şu şekilde güncelleyin:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## 📋 Adım 3: APK Build

### 3.1 Production Build (Önerilen)

```bash
cd mobile
eas build --platform android --profile production
```

### 3.2 Preview Build (Test için)

```bash
cd mobile
eas build --platform android --profile preview
```

### 3.3 Build Sürecini İzleyin

- Build süreci 10-20 dakika sürebilir
- Build durumunu https://expo.dev/accounts/[username]/projects/deprem-app/builds adresinden takip edebilirsiniz
- Build tamamlandığında APK indirme linki verilecektir

## 📋 Adım 4: APK'yı İndirin ve Test Edin

### 4.1 APK'yı İndirin

Build tamamlandığında terminal'de verilen linke tıklayın veya Expo Dashboard'dan indirin.

### 4.2 Android Cihaza Yükleyin

1. APK dosyasını Android cihazınıza aktarın
2. "Bilinmeyen kaynaklardan yükleme" iznini verin
3. APK'yı açın ve yükleyin

### 4.3 Test Edin

- Uygulamayı açın
- Kayıt olun / Giriş yapın
- Tüm özellikleri test edin:
  - Deprem listesi
  - Bildirim ayarları
  - Acil kişiler
  - Ben İyiyim butonu
  - Sesli S.O.S

## 🔍 Sorun Giderme

### Build Hatası: "Google Services file not found"

```bash
# Firebase google-services.json dosyasını ekleyin
cp /path/to/google-services.json mobile/google-services.json
```

### Build Hatası: "Invalid credentials"

```bash
# EAS'tan çıkış yapın ve tekrar giriş yapın
eas logout
eas login
```

### APK çok büyük (>100MB)

`app.json` dosyasında gereksiz asset'leri kaldırın veya optimize edin.

## 📱 APK Dağıtımı

### Google Play Store'a Yükleme

1. Google Play Console'a gidin
2. Yeni uygulama oluşturun
3. APK'yı yükleyin
4. Store listing bilgilerini doldurun
5. İncelemeye gönderin

### Direkt Dağıtım (Beta Test)

APK'yı direkt olarak kullanıcılara dağıtabilirsiniz:
- Google Drive
- Dropbox
- Firebase App Distribution
- TestFlight (iOS için)

## 🎯 Hızlı Komutlar

```bash
# Tüm bağımlılıkları yükle
cd mobile && npm install

# EAS'a giriş yap
eas login

# Production APK build
eas build --platform android --profile production

# Build durumunu kontrol et
eas build:list

# APK'yı indir (build ID ile)
eas build:download --id [BUILD_ID]
```

## 📝 Notlar

- İlk build 10-20 dakika sürebilir
- Sonraki build'ler daha hızlı olacaktır (cache sayesinde)
- Production build için signing key otomatik oluşturulur
- Signing key'i güvenli bir yerde saklayın (Expo otomatik saklar)

## 🆘 Yardım

Sorun yaşarsanız:
- Expo Docs: https://docs.expo.dev/build/setup/
- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Expo Discord: https://chat.expo.dev/
