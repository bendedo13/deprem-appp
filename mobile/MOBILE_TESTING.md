# 📱 Deprem App Mobile - Test Rehberi

Mobil uygulamanın test kurulumu, çalıştırılması ve yeni testlerin yazılması hakkında kapsamlı rehber.

---

## 🚀 Hızlı Başlangıç

### Testleri Çalıştırma

```bash
# Tüm testleri çalıştır
npm test

# Watch modda çalıştır (dosyalar değiştiğinde otomatik yeniden çalışır)
npm run test:watch

# Coverage raporu oluştur
npm run test:coverage

# Debug modda çalıştır
npm run test:debug
```

---

## 📦 Test Kurulumu

### Kurulu Bağımlılıklar

- **Jest 30.2.0** - Test framework
- **ts-jest 29.4.6** - TypeScript desteği
- **@testing-library/react-native 13.3.3** - Component testing
- **@testing-library/jest-native 5.4.3** - Jest matchers

### Konfigürasyon Dosyaları

- `jest.config.js` - Jest konfigürasyonu
- `jest.setup.js` - Tüm testler için global setup

---

## ✅ Mevcut Testler

### Authentication Service Tests (7 tests ✅)

**Dosya**: `src/services/__tests__/authService.test.ts`

Kapsamlı testler:
- ✅ `hasToken()` - Token varlığını kontrol et
- ✅ `register()` - Yeni kullanıcı kaydı
- ✅ `login()` - Kullanıcı girişi
- ✅ `logout()` - Oturumu kapat
- ✅ `getMe()` - Mevcut profili getir
- ✅ `iAmSafe()` - "Ben İyiyim" bildirimi gönder
- ✅ `updateProfile()` - Profili güncelle

**Test Özeti**:
- Başarılı işlemleri test etme
- Hata işlemeyi test etme
- SecureStore ile token yönetimini test etme
- API çağrılarını mock etme

### Earthquake Alarm Service Tests (7 tests ✅)

**Dosya**: `src/services/__tests__/earthquakeAlarm.test.ts`

Kapsamlı testler:
- ✅ `ensureEarthquakeChannel()` - Bildirim kanalı oluştur
- ✅ `showEarthquakeAlarm()` - Tam ekran alarm göster
- ✅ Bildirim gövdesinde detaylar
- ✅ Eksik veriler için varsayılan değerler
- ✅ Hata işleme
- ✅ Ses kontrolü entegrasyonu

**Test Özeti**:
- Notifee mock'u ile bildirim testleri
- Tam ekran intent işlevselliği
- Dinamik bildirim oluşturma

---

## 🧪 Test Yazma Rehberi

### Test Dosyası Konumu

Testler service dosyasının yanında `__tests__` dizinine yazılmalıdır:

```
src/
├── services/
│   ├── api.ts
│   ├── authService.ts
│   └── __tests__/
│       ├── api.test.ts
│       └── authService.test.ts
```

### Test Şablonu

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { functionToTest } from '../functionFile';
import { dependency } from '../dependencyFile';

jest.mock('../dependencyFile');

describe('Service Name', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Method Name', () => {
    it('should do something when conditions are met', async () => {
      // Setup
      (dependency.method as jest.Mock).mockResolvedValue(expectedValue);

      // Action
      const result = await functionToTest(param);

      // Assert
      expect(result).toEqual(expectedValue);
      expect(dependency.method).toHaveBeenCalledWith(param);
    });

    it('should handle errors gracefully', async () => {
      // Setup
      (dependency.method as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      // Assert
      await expect(functionToTest(param)).rejects.toThrow('Test error');
    });
  });
});
```

---

## 🎯 Mock Kurulumu

### Firebase Messaging Mock

```typescript
jest.mock('@react-native-firebase/messaging', () => ({
  messaging: jest.fn(() => ({
    getToken: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    setBackgroundMessageHandler: jest.fn(),
  })),
}));
```

### Notifee Mock

```typescript
jest.mock('@notifee/react-native', () => ({
  createChannel: jest.fn(),
  displayNotification: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
  },
}));
```

### SecureStore Mock

```typescript
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
```

### Axios Mock

```typescript
jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;
```

---

## 📊 Test Coverage

### Mevcut Coverage

Testleri çalıştırırken coverage raporu oluşturmak için:

```bash
npm run test:coverage
```

Bu komut `coverage/` dizininde HTML raporu oluşturur:
- `coverage/index.html` - Coverage özeti

### Coverage Eşikleri

Global eşikler (`jest.config.js`):
- Branches: 30%
- Functions: 30%
- Lines: 30%
- Statements: 30%

---

## 🔍 Common Testing Patterns

### API Çağrılarını Test Etme

```typescript
it('should fetch data from API', async () => {
  const mockData = { id: 1, name: 'Test' };
  (api.get as jest.Mock).mockResolvedValue({ data: mockData });

  const result = await getDataFromAPI();

  expect(result).toEqual(mockData);
  expect(api.get).toHaveBeenCalledWith('/endpoint');
});
```

### Token Yönetimini Test Etme

```typescript
it('should save token to storage', async () => {
  (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

  await saveToken('test-token');

  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
    'token_key',
    'test-token'
  );
});
```

### Hata İşlemini Test Etme

```typescript
it('should handle network errors', async () => {
  (api.get as jest.Mock).mockRejectedValue(
    new Error('Network error')
  );

  await expect(fetchData()).rejects.toThrow('Network error');
});
```

---

## 🚀 Expo Server Çalıştırma (Web için)

**Not**: Mevcut ortamda Expo API'lerine erişim sınırlı olduğu için web tarayıcısında test yapmanız gerekebilir:

```bash
# Localhost modda Expo başlat
npm start -- --localhost

# Veya offline modda
npm start -- --offline

# EAS ile Android build et
npm run android

# EAS ile iOS build et
npm run ios
```

---

## 🔧 Troubleshooting

### Sorun: "Cannot find module" Hatası

**Çözüm**:
```bash
# Bağımlılıkları yeniden yükle
npm install

# Node modules'i temizle
npm run clean
```

### Sorun: Mock Çalışmıyor

**Çözüm**:
- `jest.clearAllMocks()` öğesini `beforeEach`'te çağrılığından emin ol
- Mock dosyası import'tan önce geldiğini doğrula
- TypeScript tip hatalarını `unknown` cast'i ile çöz

### Sorun: Test Timeout

**Çözüm**:
```typescript
it('test name', async () => {
  // test
}, 10000); // 10 saniye timeout
```

---

## 📚 Kaynaklar

- [Jest Dokümantasyonu](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library)
- [ts-jest Rehberi](https://kulshekhar.github.io/ts-jest/docs/getting-started)
- [Expo Router Testing](https://docs.expo.dev/guides/testing/)

---

## 🎓 Best Practices

1. **Test Adlandırması**
   - Açık ve tanımlayıcı isimler kullan
   - "should..." ile başla

2. **Setup/Teardown**
   - Her test öncesinde `jest.clearAllMocks()` çağır
   - Test verisini `beforeEach`'te hazırla

3. **Assertions**
   - Bir test bir şeyi test etmeli
   - Birden fazla assertion kullan ama işaretli ol
   - Custom matcher'ları tercih et

4. **Mocking**
   - Bağımlılıkları test dosyasının en başında mock et
   - Gerçek implementasyonları test etmeyi sakla
   - Mock'ları her test öncesinde temizle

5. **Async Testing**
   - async/await kullan
   - Promise'leri return et
   - `jest.useFakeTimers()` ile zamanı kontrol et

---

## ✨ Sonraki Adımlar

- [ ] Integration testleri ekle
- [ ] E2E testleri (Detox) kur
- [ ] Coverage'ı %70+'na çıkar
- [ ] CI/CD pipeline'a testleri ekle
- [ ] Performance testleri yaz

---

**Son Güncelleme**: 2026-02-25
**Versiyon**: 1.0.0
**Status**: ✅ Test Setup Tamamlandı
