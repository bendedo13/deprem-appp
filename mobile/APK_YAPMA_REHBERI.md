# 📱 Deprem App - APK Yapma Rehberi (Türkçe)

Astroloji uygulamanızda yaptığınız gibi, Deprem App'i de APK'ye dönüştüreceğiz.

## 🚀 Hızlı Başlangıç (3 Adım)

### Adım 1: Hazırlık

```bash
cd mobile
npm install
```

### Adım 2: EAS'a Giriş

```bash
eas login
```

Expo hesabınızla giriş yapın (astroloji uygulamasında kullandığınız hesap).

### Adım 3: APK Build

```bash
eas build --platform android --profile production
```

Bu kadar! Build 10-20 dakika sürecek, sonunda APK indirme linki verilecek.

## 📋 Detaylı Adımlar

### 1. Proje Klasörüne Gidin

```bash
cd C:\Users\win10\Desktop\deprem-appp\mobile
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. EAS CLI Kurulumu (İlk Kez)

Eğer daha önce kurmadıysanız:

```bash
npm install -g eas-cli
```

### 4. EAS'a Giriş Yapın

```bash
eas login
```

Email ve şifrenizi girin (Expo hesabınız).

### 5. EAS Build Yapılandırması

İlk kez build yapıyorsanız:

```bash
eas build:configure
```

Bu komut `eas.json` dosyasını oluşturacak.

### 6. APK Build Başlatın

**Production Build (Önerilen):**
```bash
eas build --platform android --profile production
```

**Preview Build (Test için):**
```bash
eas build --platform android --profile preview
```

### 7. Build Sürecini İzleyin

Terminal'de build linki gösterilecek:
```
🔗 Build URL: https://expo.dev/accounts/[username]/projects/quakesense/builds/[build-id]
```

Bu linke tıklayarak build durumunu takip edebilirsiniz.

### 8. APK'yı İndirin

Build tamamlandığında:
- Terminal'de indirme linki gösterilecek
- Veya Expo Dashboard'dan indirebilirsiniz: https://expo.dev

### 9. APK'yı Test Edin

1. APK'yı Android telefonunuza gönderin
2. "Bilinmeyen kaynaklardan yükleme" iznini verin
3. APK'yı yükleyin ve test edin

## 🎯 Tek Komut ile Build

Eğer her şey hazırsa, tek komut yeterli:

```bash
cd mobile && eas build --platform android --profile production
```

## 🔍 Build Profilleri

### Production (Canlı Kullanım)
```bash
eas build --platform android --profile production
```
- Google Play Store'a yüklenebilir
- Optimize edilmiş
- Signing key otomatik oluşturulur

### Preview (Test)
```bash
eas build --platform android --profile preview
```
- Hızlı test için
- Internal distribution

### Development (Geliştirme)
```bash
eas build --platform android --profile development
```
- Development client ile çalışır
- Hot reload destekler

## 📱 APK Boyutu

İlk build ~50-80 MB olacaktır. Bu normal.

## ⏱️ Build Süresi

- İlk build: 15-20 dakika
- Sonraki build'ler: 5-10 dakika (cache sayesinde)

## 🆘 Sorun Giderme

### "Not logged in" Hatası

```bash
eas logout
eas login
```

### "Google Services file not found" Hatası

`google-services.json` dosyasının `mobile/` klasöründe olduğundan emin olun.

### Build Başarısız Oldu

```bash
# Logları kontrol edin
eas build:list
eas build:view [BUILD_ID]
```

## 📊 Build Durumunu Kontrol

```bash
# Tüm build'leri listele
eas build:list

# Belirli bir build'i görüntüle
eas build:view [BUILD_ID]

# APK'yı indir
eas build:download --id [BUILD_ID]
```

## 🎉 Başarılı Build Sonrası

1. ✅ APK indirildi
2. ✅ Android cihaza yüklendi
3. ✅ Uygulama çalışıyor
4. ✅ API bağlantısı test edildi
5. ✅ Tüm özellikler çalışıyor

## 📝 Önemli Notlar

- **API URL**: `app.json` dosyasında zaten ayarlı (http://46.4.123.77:8001)
- **Firebase**: `google-services.json` dosyası mevcut
- **Signing Key**: Expo otomatik oluşturur ve saklar
- **Updates**: OTA update için `eas update` kullanabilirsiniz

## 🔗 Faydalı Linkler

- Expo Dashboard: https://expo.dev
- Build Docs: https://docs.expo.dev/build/introduction/
- EAS CLI Docs: https://docs.expo.dev/eas/cli/

## 💡 İpuçları

1. Build sırasında bilgisayarınızı kapatabilirsiniz (build Expo sunucularında yapılır)
2. Build tamamlandığında email alırsınız
3. Aynı anda birden fazla build başlatabilirsiniz
4. Build history Expo Dashboard'da saklanır

---

**Hazırsanız, şimdi başlayalım! 🚀**

```bash
cd mobile
eas login
eas build --platform android --profile production
```
