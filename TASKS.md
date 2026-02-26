# DEPREM APP - GÖREV LİSTESİ

##  GÖREV ALMA KURALLARI
Sen kıdemli bir full-stack yazılım uzmanısın.
Bu bir hayat kurtarma uygulaması. Her hata tehlikeli.

Görev aldığında sırayla uygula:
1. Görevi anla, güvenlik etkisini değerlendir
2. Etkilenecek dosyaları belirle
3. Değişikliği yap
4. Testleri çalıştır  %100 başarılı olana kadar düzelt
5. HTTP 200 + tüm APIler çalışıyor olana kadar deploy etme
6. Deploy sonrası 30 saniye bekle, tekrar doğrula

BU UYGULAMADA HATA HAYAT KAYBEDİLMESİNE YOL AÇABİLİR. TEST ZORUNLU.

##  AKTİF GÖREVLER

### P0 - KRİTİK

#### GÖREV-001: Enkaz SOS Sistemi
Açıklama: Ses komutu  AI metin çevirisi  AFAD + güvenilir kişilere iletim
Test Adımları:
1. SOS modu aktif et
2. "Enkaz altındayım, giriş katında" söyle
3. AI metnin doğru çevrildiğini doğrula
4. TEST modunda bildirim gittiğini doğrula (gerçek AFAD'a değil)
5. Güvenilir kişiye SMS/çağrı gittiğini doğrula
KRİTİK: Gerçek AFAD API'sine test isteği ATMA.

#### GÖREV-002: Deprem API Güvenilirlik
Test:
- AFAD: curl "https://deprem.afad.gov.tr/apiv2/event/filter?start=2026-01-01&minmag=1&limit=1"
- USGS: curl "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&minmagnitude=1"
- EMSC: curl "https://www.seismicportal.eu/fdsnws/event/1/query?limit=1&format=json"
Beklenen: Hepsi 200 döndürmeli

#### GÖREV-003: Yanlış Alarm Önleme
Açıklama: Telefon düşürme, otobüs, koşu alarm tetiklememeli
Algoritma:
- Titreşim eşik değeri aşıldı VE
- Son 60 saniyede yakında deprem kaydı var
- İkisi birden sağlanırsa alarm ver

### P1 - YÜKSEK ÖNCELİK

#### GÖREV-004: Push Bildirim
Açıklama: M4.0+ depremde Firebase FCM ile push bildirim
Test: Test bildirimi gönder, alındığını doğrula

#### GÖREV-005: Güvenilir Kişi Yönetimi
Açıklama: Kullanıcı 1-5 kişi ekleyebilmeli, SOS'ta bunlara ulaşılmalı
Güvenlik: Telefon numaraları şifreli saklanmalı

#### GÖREV-006: Offline Mod
Açıklama: İnternet kesilince son bilinen deprem verileri gösterilmeli
Çözüm: Service Worker ile son 24 saat veri cache

#### GÖREV-007: Bina Risk Raporu
Açıklama: Adres gir  bölgenin deprem riski göster
API: AFAD deprem bölge haritası ücretsiz

### P2 - NORMAL

#### GÖREV-008: Türkçe Arayüz
Açıklama: Tüm hata mesajları ve butonlar Türkçe olmalı

#### GÖREV-009: Deprem Geçmişi Grafiği
Açıklama: Son 30 günün deprem aktivitesi grafik olarak gösterilmeli

#### GÖREV-010: KVKK Sayfaları
Açıklama: Gizlilik politikası ve kullanım şartları
Zorunlu: Ses kaydı ve konum verisi için açık onay metni

##  GÖREV TAMAMLAMA FORMU
GÖREV: [ad]
DURUM: TAMAMLANDI
DEGISEN DOSYALAR: [liste]
TEST SONUCU:
  - Frontend HTTP: [kod]
  - Backend HTTP: [kod]
  - AFAD API: [calisiyor/hata]
  - SOS Test: [calisiyor/hata]
COMMIT: [hash]
GUVENLIK ETKISI: [varsa belirt]

##  GÜNLÜK KONTROL
docker-compose ps
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:8085
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:8086/health
docker logs deprem-backend --tail 20 2>&1 | grep -i error
