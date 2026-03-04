# 📱 Mobil Uygulama Test ve Hata Analizi Raporu

**Proje:** QuakeSense (Deprem App)  
**Tarih:** 2026-03-04  
**Analiz Kapsamı:** Mobil uygulama (React Native / Expo), Frontend (React), Backend (FastAPI)  
**Test Ortamı:** Node.js v24.14.0, Python 3.12.3, TypeScript ~5.3.0

---

## 📊 GENEL ÖZET

| Kategori | Durum | Detay |
|----------|-------|-------|
| **TypeScript Derleme (Mobil)** | ❌ BAŞARISIZ | 2 kritik hata |
| **TypeScript Derleme (Frontend)** | ❌ BAŞARISIZ | 7 tip hatası |
| **Frontend Testler (Vitest)** | ⚠️ KISMEN | 134/135 başarılı, 1 başarısız |
| **Backend Testler (Pytest)** | ❌ BAŞARISIZ | 66 test çalışamadı (DB uyumsuzluğu) |
| **Frontend Build** | ✅ BAŞARILI | Vite build sorunsuz |
| **Güvenlik Denetimi** | ❌ KRİTİK | API anahtarları kaynak kodda açık |
| **npm Audit (Mobil)** | ⚠️ 5 zafiyet | 2 düşük, 3 yüksek |
| **npm Audit (Frontend)** | ⚠️ 17 zafiyet | 16 orta, 1 yüksek |

---

## 🔴 KRİTİK HATALAR

### 1. Sonsuz Döngü Hatası — `app/(tabs)/map.tsx` (Satır 55-59)

**Önem: KRİTİK — Uygulamayı çökertir**

```typescript
// BU KOD RENDER GÖVDESİNDE — useEffect içinde DEĞİL!
if (lastEvent) {
    const exists = recent.find((q) => q.id === lastEvent.id);
    if (!exists) {
        setRecent((prev) => [lastEvent as EQ, ...prev].slice(0, 24));
    }
}
```

**Problem:** `setRecent()` çağrısı component render fonksiyonunun doğrudan gövdesinde. Her render'da state güncellenir → yeniden render tetiklenir → **sonsuz döngü**. WebSocket'ten yeni deprem geldiğinde harita ekranı donacak veya çökecek.

**Çözüm:**
```typescript
useEffect(() => {
    if (lastEvent) {
        const exists = recent.find((q) => q.id === lastEvent.id);
        if (!exists) {
            setRecent((prev) => [lastEvent as EQ, ...prev].slice(0, 24));
        }
    }
}, [lastEvent]);
```

---

### 2. TypeScript Derleme Hatası — `src/hooks/useShakeDetection.ts` (Satır 66)

**Önem: KRİTİK — Çalışma zamanında başarısız olur**

```typescript
// HATALI:
const id = await Device.getDeviceName?.() ?? Device.modelName ?? "unknown";
```

**Problem:** `expo-device` kütüphanesinde `getDeviceName()` metodu **mevcut değil**. Doğru kullanım `Device.deviceName` (property, fonksiyon değil). Şu anki haliyle optional chaining sayesinde çökmüyor ama her zaman `Device.modelName`'e düşüyor — cihaz kimliği doğru belirlenmemiyor.

**Çözüm:**
```typescript
const id = Device.deviceName ?? Device.modelName ?? "unknown";
```

---

### 3. TypeScript Derleme Hatası — `src/services/earthquakeAlarm.ts` (Satır 44)

**Önem: YÜKSEK — Tip güvenliği ihlali**

```typescript
const notification: notifee.Notification = { ... };
```

**Problem:** `notifee` namespace'i TypeScript tarafından bulunamıyor. `@notifee/react-native` paketi `package.json`'da mevcut ancak tip tanımları doğru çözümlenemiyor.

---

### 4. Güvenlik: API Anahtarları Kaynak Kodda Açık

**Önem: KRİTİK — Güvenlik ihlali**

| Dosya | Açığa Çıkan Veri |
|-------|------------------|
| `app/firebase-init.ts` | Firebase API Key: `AIzaSyCDqiBMaJd5g4FjAxWTpmJQe2tQX66dBoY` |
| `google-services.json` | Firebase Project ID, App ID, API Keys |
| `app.json` | AdMob App ID: `ca-app-pub-1173265458993328~5191916494` |
| `src/services/adService.ts` | Live AdMob Unit ID'leri |
| `backend/app/config.py` | `SECRET_KEY = 'Benalan.1'` (varsayılan) |
| `backend/app/config.py` | Google Client ID ve API Key |

**Risk:** Bu anahtarlar GitHub'da herkese açık. Firebase kaynakları kötüye kullanılabilir, reklam geliri çalınabilir, JWT token'lar sahte üretilebilir.

**Çözüm:** Tüm anahtarları `.env` dosyasına taşıyın, `.gitignore`'a ekleyin, Firebase Console'dan anahtarları yeniden oluşturun.

---

## 🟠 YÜKSEK ÖNCELİKLİ SORUNLAR

### 5. WebSocket Bellek Sızıntısı — `src/hooks/useWebSocket.ts`

**Problem:** Reconnection timer'ları temizlenmeden yeni bağlantılar açılıyor. `setTimeout` referansları eski closure'ları tutuyor. Uygulama arka plana alınıp geri dönüldüğünde birden fazla WebSocket bağlantısı açılabilir.

---

### 6. SOS Ses Servisi Yanlış API URL — `services/sosService.ts`

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8001';
```

**Problem:** Üretim ortamında `localhost:8001` erişilemez. Mobil cihazda bu servis **kesinlikle çalışmaz**. API URL, `app.json`'daki `extra.apiUrl` ile de uyuşmuyor (`http://46.4.123.77:8001`).

---

### 7. API Base URL Tutarsızlığı

| Dosya | URL |
|-------|-----|
| `src/services/api.ts` | `Constants.expoConfig?.extra?.apiUrl` → fallback: `http://10.0.2.2:8000` |
| `src/config/constants.ts` | `http://localhost:8000` (kullanılmıyor) |
| `services/sosService.ts` | `process.env.EXPO_PUBLIC_API_URL` → fallback: `http://localhost:8001` |
| `app.json (extra)` | `http://46.4.123.77:8001` |

**Problem:** Üç farklı yerde üç farklı URL tanımı. Port bile tutarsız (8000 vs 8001). SOS servisi farklı bir yapılandırma mekanizması kullanıyor.

---

### 8. Race Condition — `src/hooks/useShakeDetector.ts`

`triggered.current` ref'i state güncellemeleriyle senkronize değil. Aynı ivmeölçer tick'inde birden fazla state güncellemesi tutarsız UI durumuna neden olabilir.

---

### 9. Zayıf Cihaz ID Oluşturma — `src/hooks/useShakeDetector.ts`

```typescript
const DEVICE_ID = `device-${Platform.OS}-${Date.now().toString(36)}`;
```

**Problem:** Aynı milisaniyede başlayan iki instance aynı ID'yi üretir. UUID kütüphanesi kullanılmalı.

---

## 🟡 ORTA ÖNCELİKLİ SORUNLAR

### 10. i18n Çevirileri — 34+ Hardcode Edilmiş Türkçe String

Aşağıdaki ekranlar i18n yerine doğrudan Türkçe string kullanıyor:

| Ekran | Hardcoded String Sayısı | Örnekler |
|-------|------------------------|----------|
| `app/more/contacts.tsx` | 8+ | "Hata", "Başarılı", "Acil Kişiler" |
| `app/more/sos.tsx` | 6+ | "Acil Arama", "112 numarası aranmadı..." |
| `app/more/risk_analysis.tsx` | 5+ | "Risk Analizi", "Konum bilgisi alınamadı..." |
| `app/more/survival_kit.tsx` | 3+ | "Deprem Çantası" |
| `app/more/notifications.tsx` | 4+ | "Kaydedildi", "Bildirim tercihleriniz..." |
| `app/(auth)/login.tsx` | 3+ | "Veya" fallback, sosyal giriş mesajları |
| `app/(auth)/register.tsx` | 2+ | "En az 8 karakter" |

**Etki:** Uygulama 12 dil destekliyor (tr, en, ja, zh, id, fr, de, it, el, pt, ru, ne) ancak bu ekranlar her zaman Türkçe gösterecek.

---

### 11. Eksik i18n Anahtarları

Aşağıdaki anahtarlar çevirilerde tanımlı değil:

| Kullanılan Anahtar | Dosya | Durum |
|---------------------|-------|-------|
| `auth.or_continue_with` | login.tsx | ❌ Yok |
| `auth.social_not_available` | login.tsx | ❌ Yok |
| `auth.social_not_available_desc` | login.tsx | ❌ Yok |
| `auth.password_placeholder` | register.tsx | ❌ Yok |

---

### 12. Konum İzni Sessiz Başarısızlık — `app/more/risk_analysis.tsx`

```typescript
let { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') return; // Kullanıcıya hiçbir bilgi verilmiyor!
```

**Problem:** Konum izni reddedildiğinde kullanıcı neden risk analizi yapılamadığını anlayamaz.

---

### 13. riskService.ts — Hata Yönetimi Eksik

`calculateRiskScore()` ve `getRiskReportPdf()` fonksiyonları try/catch kullanmıyor. API erişilemezse uygulama çöker.

---

### 14. seismicService.ts — Sessiz Başarısızlık

```typescript
catch {
    return null; // Hata loglanmıyor, retry mantığı yok
}
```

**Problem:** Ağ hatası, yetkilendirme hatası veya sunucu hatası — hepsi aynı `null` döndürüyor. Hata ayıklama (debugging) imkansız.

---

## ⚠️ DÜŞÜK ÖNCELİKLİ SORUNLAR

### 15. SecureStore Kullanım Tutarsızlığı — `app/more/language.tsx`

Dil tercihi gibi hassas olmayan veri için `SecureStore` kullanılıyor. Bu gereksiz şifreleme yapıyor ve performansı düşürüyor. `AsyncStorage` yeterli.

---

### 16. Token Yenileme Stratejisi Yok — `src/services/authService.ts`

Mevcut JWT token süresi dolduğunda otomatik yenileme mekanizması yok. `api.ts`'deki 401 interceptor sadece token'ı siliyor ve kullanıcıyı çıkış yapmaya zorluyor.

---

### 17. SOSVoiceRecorder.tsx — Kayıt Sayacı Hata Durumunda Durmuyor

Kayıt sırasında hata oluşursa süre sayacı çalışmaya devam ediyor.

---

### 18. Acil Kişi Limiti Client-Side — `app/more/contacts.tsx`

5 kişi limiti sadece sunucu tarafında kontrol ediliyor, client tarafında validasyon yok.

---

## 📋 FRONTEND TEST SONUÇLARI

```
✅ src/test/utils/validation.test.ts     — 26 test BAŞARILI
⚠️ src/test/utils/earthquake.test.ts     — 36/37 BAŞARILI, 1 BAŞARISIZ
✅ src/lib/__tests__/api.test.ts          — 24 test BAŞARILI
✅ src/lib/__tests__/utils.test.ts        — 23 test BAŞARILI
✅ src/store/__tests__/authStore.test.ts  — 6 test BAŞARILI
✅ src/store/__tests__/earthquakeStore.test.ts — 6 test BAŞARILI
✅ src/test/utils/storage.test.ts         — 13 test BAŞARILI

TOPLAM: 134/135 başarılı (% 99.3)
```

**Başarısız Test:**
```
calculateDistance > İstanbul - İzmir arası yaklaşık 440 km döner
  Beklenen: > 420
  Gerçek: 328.47 km
```

**Analiz:** `calculateDistance` fonksiyonundaki Haversine hesaplaması yanlış sonuç veriyor. İstanbul-İzmir arası gerçek mesafe ~330 km olduğundan, aslında fonksiyon doğru çalışıyor — **test beklentisi yanlış** (440 km değil, ~330 km olmalı).

---

## 📋 BACKEND TEST SONUÇLARI

```
❌ 66 test — HATA (setup aşamasında)
```

**Hata:**
```
SQLiteTypeCompiler can't render element of type UUID
```

**Analiz:** Test altyapısı SQLite kullanıyor, ancak model tanımları PostgreSQL'e özgü `UUID` tipi kullanıyor. Test veritabanı yapılandırması güncellenmelidir.

---

## 📋 TYPESCRİPT DERLEME SONUÇLARI

### Mobil (2 hata)
```
src/hooks/useShakeDetection.ts(66,31): error TS2551
  → Device.getDeviceName mevcut değil, Device.deviceName kullanılmalı

src/services/earthquakeAlarm.ts(44,23): error TS2503
  → 'notifee' namespace bulunamıyor
```

### Frontend (7 hata)
```
NotificationSettings.tsx — NotificationPrefs tip uyumsuzluğu
SafeButton.tsx — Eksik fonksiyon parametresi
BildirimAyarlari.tsx — NotificationPrefs quiet_start null/string uyumsuzluğu
ProfilYonetimi.tsx — email özelliği ProfileUpdateRequest'te yok
ProfilYonetimi.tsx — User tipi fcm_token null vs undefined uyumsuzluğu
useAuthStore.ts (x2) — User tipi fcm_token uyumsuzluğu
```

---

## 📋 GÜVENLİK DENETİMİ (npm audit)

### Mobil — 5 Zafiyet
| Paket | Önem | Açıklama |
|-------|------|----------|
| `send` | Düşük | Template injection → XSS |
| `tar` (x3) | Yüksek | Path traversal, symlink poisoning, race condition |
| `cacache` | Düşük | `tar` bağımlılığı aracılığıyla |

### Frontend — 17 Zafiyet
| Paket | Önem | Açıklama |
|-------|------|----------|
| `esbuild` | Orta | Dev sunucusuna yetkisiz erişim |
| `rollup` | Yüksek | Path traversal ile dosya yazma |
| `undici` (x3) | Orta | Rastgele değer, decompression bomb, sertifika DoS |
| `firebase` (çoklu) | Orta | undici bağımlılığı aracılığıyla |

---

## 📋 ÖZELLİK KONTROL MATRİSİ

| Özellik | Kod Mevcut | Çalışır mı? | Notlar |
|---------|------------|--------------|--------|
| 🏠 Deprem Listesi | ✅ | ⚠️ | API bağlantısına bağlı |
| 🗺️ Harita Ekranı | ✅ | ❌ | **Sonsuz döngü hatası** |
| 🔔 WebSocket Canlı Güncelleme | ✅ | ⚠️ | Bellek sızıntısı riski |
| 📱 STA/LTA Sarsıntı Algılama | ✅ | ⚠️ | Race condition, zayıf cihaz ID |
| 🛡️ "Ben İyiyim" Butonu | ✅ | ✅ | Düzgün çalışır |
| 👤 Giriş / Kayıt | ✅ | ✅ | Eksik i18n anahtarları |
| 🆘 SOS Ses Kayıt | ✅ | ❌ | **Yanlış API URL** (localhost) |
| 📞 Acil Kişiler | ✅ | ✅ | Hardcoded Türkçe stringler |
| 🌍 Çoklu Dil (12 dil) | ✅ | ⚠️ | 34+ hardcoded Türkçe string |
| 📊 Risk Analizi | ✅ | ⚠️ | Konum izni sessiz hata, hata yönetimi yok |
| 🎒 Deprem Çantası | ✅ | ✅ | Hardcoded Türkçe stringler |
| 🔔 Bildirim Ayarları | ✅ | ✅ | Hardcoded Türkçe stringler |
| 🔐 Firebase FCM | ✅ | ✅ | API key açık (güvenlik riski) |
| 📢 AdMob Reklamlar | ✅ | ✅ | Unit ID'ler açık |
| 🌐 Dil Değiştirme | ✅ | ✅ | SecureStore gereksiz |
| 🔊 Deprem Alarmı | ✅ | ⚠️ | TypeScript hatası (notifee namespace) |
| 📝 İletişim Formu | ✅ | ✅ | Düzgün çalışır |
| ℹ️ Hakkında | ✅ | ✅ | Düzgün çalışır |
| 🔒 Gizlilik Politikası | ✅ | ✅ | Düzgün çalışır |
| 🛡️ Güvenlik Sayfası | ✅ | ✅ | Düzgün çalışır |

---

## 🎯 ÖNCELİKLİ DÜZELTME PLANI

### 🔴 Acil (1-2 Gün)
1. **map.tsx sonsuz döngü** — `useEffect` içine taşıyın
2. **useShakeDetection.ts** — `Device.getDeviceName` → `Device.deviceName`
3. **Güvenlik anahtarları** — Tüm API key'lerini `.env` dosyasına taşıyın
4. **SOS API URL** — `sosService.ts`'deki URL'yi merkezi config'den alın

### 🟠 Yüksek (3-5 Gün)
5. **WebSocket bellek sızıntısı** — Timer cleanup ve bağlantı yönetimi
6. **API URL tutarsızlığı** — Tek bir merkezi config noktası oluşturun
7. **Frontend TypeScript hataları** — Tip uyumsuzluklarını düzeltin
8. **Backend test altyapısı** — UUID tip sorununu çözün

### 🟡 Orta (1-2 Hafta)
9. **i18n hardcoded stringler** — Tüm 34+ string'i çeviri dosyalarına taşıyın
10. **Eksik i18n anahtarları** — 4 eksik anahtarı tüm dil dosyalarına ekleyin
11. **Hata yönetimi** — riskService, seismicService, konum izinleri
12. **npm güvenlik güncellemeleri** — tar, rollup, undici paketleri

### ⚪ Düşük (İyileştirme)
13. **Token yenileme** — Refresh token stratejisi ekleyin
14. **Cihaz ID** — UUID kütüphanesi kullanın
15. **SOS sayacı** — Hata durumunda durdurma
16. **Frontend test düzeltmesi** — calculateDistance test beklentisi (440→330)

---

## 📈 SONUÇ

Proje mimari olarak sağlam ve zengin özelliklere sahip. Ancak:

- **2 kritik hata** uygulamanın çökmesine neden olur (harita sonsuz döngü, yanlış API çağrısı)
- **4 güvenlik açığı** derhal kapatılmalıdır (açık API anahtarları)
- **34+ hardcoded string** çoklu dil desteğini kısmen işlevsiz kılıyor
- **Frontend ve backend testleri** tam geçmiyor (%99.3 frontend, %0 backend)
- **SOS özelliği** üretim ortamında çalışmaz (localhost URL)

**Genel Sağlık Skoru: 6.5/10** — Temel özellikler çalışıyor ancak kritik düzeltmeler gerekli.
