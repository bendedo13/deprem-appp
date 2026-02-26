# 📱 Deprem App - Terminal ile APK Yapma Rehberi

React Native CLI kullanarak terminal'den APK build edeceğiz.

## ⚠️ ÖNEMLİ NOT

Bu proje Expo ile yapılmış. Terminal'den APK yapmak için iki seçenek var:

### Seçenek 1: Expo Prebuild (Önerilen - Daha Kolay)

Expo'nun native klasörlerini oluşturur ama Expo özelliklerini korur.

### Seçenek 2: Expo Eject (Tam Native)

Tamamen native React Native projesine dönüştürür.

## 🚀 Seçenek 1: Expo Prebuild ile APK (Önerilen)

### Adım 1: Prebuild Yap

```bash
cd mobile
npx expo prebuild --platform android
```

Bu komut `android/` klasörünü oluşturacak.

### Adım 2: Gradle Build

```bash
cd android
./gradlew assembleRelease
```

Windows'ta:
```bash
cd android
gradlew.bat assembleRelease
```

### Adım 3: APK'yı Bul

APK burada olacak:
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 🔧 Seçenek 2: Manuel Build (Adım Adım)

### Gereksinimler

1. **Node.js** (v18+)
2. **Java JDK** (v17)
3. **Android Studio** veya **Android SDK**
4. **Gradle**

### Adım 1: Android SDK Kurulumu

Android Studio'yu indirin ve kurun:
https://developer.android.com/studio

Veya sadece command line tools:
https://developer.android.com/studio#command-tools

### Adım 2: Environment Variables

Windows'ta PowerShell'de:
```powershell
# ANDROID_HOME ayarla
$env:ANDROID_HOME = "C:\Users\win10\AppData\Local\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$env:PATH += ";$env:ANDROID_HOME\tools"
```

Kalıcı yapmak için System Environment Variables'a ekleyin.

### Adım 3: Java JDK Kurulumu

JDK 17 indirin:
https://adoptium.net/

Environment variable:
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x"
```

### Adım 4: Prebuild

```bash
cd mobile
npx expo prebuild --platform android
```

### Adım 5: Signing Key Oluştur

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore deprem-app.keystore -alias deprem-app-key -keyalg RSA -keysize 2048 -validity 10000
```

Şifre girin (örn: `deprem123456`) ve bilgileri doldurun.

### Adım 6: Gradle Properties

`mobile/android/gradle.properties` dosyasına ekleyin:

```properties
MYAPP_UPLOAD_STORE_FILE=deprem-app.keystore
MYAPP_UPLOAD_KEY_ALIAS=deprem-app-key
MYAPP_UPLOAD_STORE_PASSWORD=deprem123456
MYAPP_UPLOAD_KEY_PASSWORD=deprem123456
```

### Adım 7: Build Config

`mobile/android/app/build.gradle` dosyasını düzenleyin:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Adım 8: APK Build

```bash
cd mobile/android
./gradlew assembleRelease
```

Windows'ta:
```bash
cd mobile/android
gradlew.bat assembleRelease
```

### Adım 9: APK'yı Bul

```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 🎯 Hızlı Komutlar (Tüm Adımlar)

```bash
# 1. Prebuild
cd mobile
npx expo prebuild --platform android

# 2. Signing key oluştur (ilk kez)
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore deprem-app.keystore -alias deprem-app-key -keyalg RSA -keysize 2048 -validity 10000

# 3. Build
cd ..
gradlew.bat assembleRelease

# 4. APK'yı kopyala
copy app\build\outputs\apk\release\app-release.apk ..\..\deprem-app.apk
```

## 🔍 Sorun Giderme

### "ANDROID_HOME not set" Hatası

```powershell
$env:ANDROID_HOME = "C:\Users\win10\AppData\Local\Android\Sdk"
```

### "Java not found" Hatası

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x"
```

### "gradlew: command not found" Hatası

Windows'ta:
```bash
gradlew.bat assembleRelease
```

### Build Başarısız - Memory Hatası

`mobile/android/gradle.properties` dosyasına ekleyin:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

### "SDK location not found" Hatası

`mobile/android/local.properties` dosyası oluşturun:
```properties
sdk.dir=C:\\Users\\win10\\AppData\\Local\\Android\\Sdk
```

## 📊 APK Boyutu

- Debug APK: ~80-100 MB
- Release APK: ~50-70 MB (minify ile)

## 🔄 Sonraki Build'ler

İlk build'den sonra sadece:

```bash
cd mobile/android
gradlew.bat assembleRelease
```

## 📱 APK'yı Test Et

1. APK'yı Android cihaza gönderin
2. "Bilinmeyen kaynaklardan yükleme" iznini verin
3. APK'yı yükleyin
4. Uygulamayı açın ve test edin

## 💡 İpuçları

1. İlk build 10-15 dakika sürebilir
2. Gradle cache oluşunca sonraki build'ler daha hızlı olur
3. Signing key'i güvenli bir yerde saklayın
4. Her build için aynı key'i kullanın (update için gerekli)

## 🆘 Alternatif: Expo Development Build

Eğer native build sorun çıkarırsa:

```bash
cd mobile
npx expo install expo-dev-client
npx expo run:android
```

Bu development build oluşturur ve emulator/device'da çalıştırır.

---

**Hazırsanız, başlayalım! 🚀**

```bash
cd mobile
npx expo prebuild --platform android
cd android
gradlew.bat assembleRelease
```
