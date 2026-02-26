# DEPREM APP - AI YAZILIM UZMANI KURALLARI

##  PROJENİN AMACI
Deprem App, Türkiye için gelişmiş deprem erken uyarı ve hayat kurtarma platformudur.
BU BİR HAYAT KURTARMA UYGULAMASI. HATA TOLERANSI SIFIR.

Kritik Özellikler:
1. Enkaz SOS Sistemi  Sesli "enkaz altındayım" komutu  AI metin çevirisi  AFAD + güvenilir kişilere konum + mesaj iletimi
2. Gerçek Zamanlı Deprem Takibi  AFAD, Kandilli, USGS, EMSC
3. Telefon Sensörü Alarmı  Titreşim algılama  sesli/ışıklı uyarı
4. Twilio Bildirimleri  SMS + çağrı ile güvenilir kişilere ulaş

##  MİMARİ
- Frontend: React port 8085
- Backend: FastAPI port 8086
- Deploy: Docker Compose

##  ZORUNLU KURALLAR
1. Portlara dokunma: 8085, 8086 sabit
2. Enkaz SOS özelliğini bozma  hayat kurtarır
3. Deprem API entegrasyonlarını bozma  4 kaynak da çalışmalı
4. Twilio entegrasyonuna dokunma
5. KVKK uyumluluğunu koru  konum ve ses için kullanıcı onayı zorunlu
6. Yanlış alarm önleme algoritmasına dokunma

##  DEPLOY KURALI (EN ÖNEMLİ)
Her deploy'da ZORUNLU:
```bash
docker-compose down
docker builder prune -f
docker-compose build --no-cache
docker-compose up -d
sleep 30
curl http://localhost:8085  # 200 veya 307 olmalı
curl http://localhost:8086/health  # 200 olmalı
```
HTTP 200 gelmeden başarılı SAYMA.

##  DEPLOY ÖNCESİ ZORUNLU TESTLER
```bash
# Python syntax
cd /root/deprem-appp/backend && python3 -m py_compile main.py

# Deprem API kontrol
curl -s "https://deprem.afad.gov.tr/apiv2/event/filter?start=2026-01-01&minmag=4&limit=1"

# Docker build
docker-compose build --no-cache 2>&1 | tail -3

# HTTP kontrol
curl -s -o /dev/null -w "%{http_code}" http://localhost:8085
curl -s -o /dev/null -w "%{http_code}" http://localhost:8086/health
```
Tüm testler geçmeden commit ve push YAPMA.

##  GÜVENLİK KURALLARI
- Kullanıcı konumu şifrelenmiş iletilmeli
- Ses kaydı sadece SOS modunda aktif
- AFAD'a sahte bildirim gönderilmemeli  test modunda gerçek API'ye istek atma
- Güvenilir kişi listesi şifreli saklanmalı

##  ENKAZ SOS KURALLARI (EN KRİTİK)
- Ses tanıma offline da çalışmalı
- "enkaz", "yardım", "altındayım" kelimelerini mutlaka tanı
- SOS tetiklenince 3 kez dene, başarısız olursa SMS ile yedek gönder
- Son GPS konumu SOS mesajına eklenmeli
- AFAD bildirimi + güvenilir kişiler eş zamanlı uyarılmalı

##  DEPREM API KURALLARI
- Tüm 4 kaynak çalışmalı: AFAD, Kandilli, USGS, EMSC
- Bir kaynak çökerse diğerleri devam etmeli
- Deprem verisi 30 saniye cache'lenmeli
- M4.0+ depremler anında bildirim göndermeli

##  ÜCRETSİZ API LİSTESİ
- AFAD API  ücretsiz
- Kandilli Rasathanesi  ücretsiz
- USGS Earthquake API  ücretsiz
- EMSC  ücretsiz
- Nominatim  ücretsiz konum
- Firebase FCM  push bildirim ücretsiz tier
YASAK: Ücretli API (Twilio hariç, zaten entegre)
