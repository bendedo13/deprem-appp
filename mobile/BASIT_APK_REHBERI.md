# 📱 Deprem App - Basit APK Yapma Rehberi (Terminal)

Diğer uygulamanızda (astroloji) yaptığınız gibi terminal'den APK yapacağız.

## 🎯 Tek Komut ile APK

```bash
cd mobile
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

APK burada: `mobile/android/app/build/outputs/apk/release/app-release.apk`

## 📋 Adım Adım (İlk Kez)

### 1. Gerekli Programlar

- ✅ Node.js (zaten var)
- ✅ Java JDK 17 (Android Studio ile gelir)
- ✅ Android SDK (Android Studio ile gelir)

**Android Studio yoksa:**
https://developer.android.com/studio

### 2. Environment Variables (İlk Kez)

Windows PowerShell'de (Admin olarak):

```powershell
# ANDROID_HOME ayarla
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", "C:\Users\win10\AppData\Local\Android\Sdk", "User")

# PATH'e ekle
$path = [System.Environment]::GetEnvironmentVariable("PATH", "User")
[System.Environment]::SetEnvironmentVariable("PATH", "$path;C:\Users\win10\AppData\Local\Android\Sdk\platform-tools", "User")
```

PowerShell'i kapatıp tekrar açın.

### 3. APK Build

```bash
cd C:\Users\win10\Desktop\DEPREMAPP\mobile
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

### 4. APK'yı Bul

```
C:\Users\win10\Desktop\DEPREMAPP\mobile\android\app\build\outputs\apk\release\app-release.apk
```

## 🚀 Otomatik Script (Kolay Yol)

Hazırladığım script'i çalıştırın:

```bash
cd mobile
BUILD_APK_TERMINAL.bat
```

Bu script tüm adımları otomatik yapar.

## 🔧 İlk Build Sonrası

Sonraki build'ler için sadece:

```bash
cd mobile/android
gradlew.bat assembleRelease
```

APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`

## ⚠️ Olası Sorunlar ve Çözümler

### Sorun 1: "ANDROID_HOME not set"

**Çözüm:**
```powershell
$env:ANDROID_HOME = "C:\Users\win10\AppData\Local\Android\Sdk"
```

Kalıcı yapmak için System Properties > Environment Variables'a ekleyin.

### Sorun 2: "Java not found"

**Çözüm:**
Java JDK 17 indirin: https://adoptium.net/

Sonra:
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x"
```

### Sorun 3: "SDK location not found"

**Çözüm:**
`mobile/android/local.properties` dosyası oluşturun:

```properties
sdk.dir=C:\\Users\\win10\\AppData\\Local\\Android\\Sdk
```

### Sorun 4: "gradlew.bat not found"

**Çözüm:**
Önce prebuild yapın:
```bash
npx expo prebuild --platform android
```

### Sorun 5: Build çok yavaş / takılıyor

**Çözüm:**
`mobile/android/gradle.properties` dosyasına ekleyin:

```properties
org.gradle.jvmargs=-Xmx4096m
org.gradle.daemon=true
org.gradle.parallel=true
```

## 📊 Build Süresi

- İlk build: 10-20 dakika (tüm bağımlılıkları indirir)
- Sonraki build'ler: 2-5 dakika (cache kullanır)

## 🎯 Hızlı Referans

### İlk Build
```bash
cd mobile
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```

### Sonraki Build'ler
```bash
cd mobile/android
gradlew.bat assembleRelease
```

### APK Konumu
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

### APK'yı Kopyala
```bash
copy android\app\build\outputs\apk\release\app-release.apk deprem-app.apk
```

## 📱 APK'yı Test Et

1. APK'yı Android telefonunuza gönderin (WhatsApp, email, USB)
2. Telefonda "Bilinmeyen kaynaklardan yükleme" iznini verin
3. APK'yı açın ve yükleyin
4. Uygulamayı test edin

## 💡 İpuçları

1. **İlk build uzun sürer** - Normal, sabırlı olun
2. **Gradle cache** - Sonraki build'ler çok daha hızlı
3. **Clean build** - Sorun olursa: `gradlew.bat clean`
4. **Prebuild tekrar** - Kod değişirse prebuild tekrar yapın

## 🔄 Kod Değişikliği Sonrası

Eğer React Native kodunda değişiklik yaptıysanız:

```bash
cd mobile
npx expo prebuild --platform android --clean
cd android
gradlew.bat assembleRelease
```

## 📦 APK Boyutu

- Debug: ~80-100 MB
- Release: ~50-70 MB

## ✅ Başarı Kontrolü

Build başarılı oldu mu?

```bash
dir android\app\build\outputs\apk\release\app-release.apk
```

Dosya varsa başarılı! 🎉

---

**Şimdi başlayalım! 🚀**

```bash
cd mobile
BUILD_APK_TERMINAL.bat
```

veya manuel:

```bash
cd mobile
npm install
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```
