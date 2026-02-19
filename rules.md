# 🤖 AI KURALLARI - DEPREM APP
> Bu dosya tüm yapay zeka araçları için (Claude, Cursor, Copilot vb.) zorunlu kuralları içerir.
> Her kod üretiminden önce bu dosyayı oku. Hiçbir kuralı atlama.

---

## 📌 PROJE ÖZETİ (30 saniyede anla)

**Deprem App** — Türkiye ve global odaklı gerçek zamanlı deprem takip platformu.
- **Web:** FastAPI backend + React frontend (VPS/Hetzner üzerinde)
- **Mobil:** Android (React Native / Flutter - ayrı repo)
- **Veri:** AFAD + Kandilli + USGS + EMSC (çoklu kaynak, yedekli)
- **Gelir:** AdMob (Android), Google AdSense (Web), Premium abonelik, DASK affiliate
- **Hedef:** Türkiye'nin #1 deprem platformu — hız, güvenilirlik, UX

**Stack:**
| Katman | Teknoloji |
|--------|-----------|
| Backend API | Python 3.11 + FastAPI |
| Gerçek Zamanlı | WebSocket (FastAPI WebSocket) |
| Veritabanı | PostgreSQL 16 + TimescaleDB |
| Cache | Redis 7 |
| Task Queue | Celery + Redis Broker |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| Harita | Leaflet.js + React-Leaflet |
| Bildirim | Firebase FCM (push) + Web Push API |
| Android | React Native 0.73 + Expo |
| Deploy | Docker + Docker Compose + Nginx |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |

---

## 🏗️ DOSYA MİMARİSİ

```
deprem-app/
├── backend/                    # FastAPI uygulaması
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Tüm ayarlar (env'den okur)
│   │   ├── database.py        # PostgreSQL + TimescaleDB bağlantısı
│   │   ├── models/            # SQLAlchemy ORM modelleri
│   │   │   ├── earthquake.py
│   │   │   ├── user.py
│   │   │   └── notification.py
│   │   ├── schemas/           # Pydantic şemaları
│   │   │   ├── earthquake.py
│   │   │   └── user.py
│   │   ├── api/               # API endpoint'leri
│   │   │   ├── v1/
│   │   │   │   ├── earthquakes.py   # Deprem endpointleri
│   │   │   │   ├── users.py         # Kullanıcı yönetimi
│   │   │   │   ├── notifications.py # Bildirim yönetimi
│   │   │   │   ├── analytics.py     # Analytics endpointleri
│   │   │   │   └── risk.py          # Risk analizi
│   │   │   └── websocket.py   # WS bağlantı yöneticisi
│   │   ├── services/          # İş mantığı
│   │   │   ├── earthquake_fetcher.py  # API veri çekici
│   │   │   ├── notifier.py           # Push bildirim gönderici
│   │   │   ├── risk_calculator.py    # Risk skoru hesaplama
│   │   │   ├── ai_analyzer.py        # Claude API entegrasyonu
│   │   │   └── cache_manager.py      # Redis işlemleri
│   │   ├── tasks/             # Celery görevleri
│   │   │   ├── fetch_earthquakes.py  # Periyodik veri çekme
│   │   │   └── send_notifications.py
│   │   └── utils/
│   │       ├── geo.py         # Coğrafi hesaplamalar
│   │       └── helpers.py
│   ├── tests/
│   ├── alembic/               # DB migration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                  # React web uygulaması
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx    # Ana landing page (dönüşüm odaklı)
│   │   │   ├── Dashboard.tsx      # Canlı deprem dashboard
│   │   │   ├── MapView.tsx        # Harita sayfası
│   │   │   ├── RiskReport.tsx     # Kişisel risk raporu
│   │   │   └── Premium.tsx        # Premium satış sayfası
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── earthquake/        # Deprem bileşenleri
│   │   │   ├── map/               # Harita bileşenleri
│   │   │   ├── ads/               # Reklam bileşenleri (AdSense)
│   │   │   ├── notifications/
│   │   │   └── ui/                # Temel UI bileşenleri
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts    # WS hook
│   │   │   ├── useEarthquakes.ts
│   │   │   └── useNotifications.ts
│   │   ├── store/                 # Zustand state management
│   │   ├── services/              # API çağrıları
│   │   ├── types/                 # TypeScript tipleri
│   │   └── styles/
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   └── sw.js                  # Service Worker
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── android/                   # React Native Android
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── services/
│   │   │   └── admob.ts       # AdMob entegrasyonu
│   │   └── navigation/
│   └── android/               # Native Android dosyaları
│
├── docs/
│   ├── API.md                 # API dokümantasyonu
│   ├── DEPLOYMENT.md          # Deploy rehberi
│   └── ARCHITECTURE.md        # Mimari kararlar
│
├── docker/
│   ├── docker-compose.yml     # Production
│   ├── docker-compose.dev.yml # Development
│   └── nginx/
│       └── nginx.conf
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD pipeline
│
├── .cursor/
│   └── rules.md               # Bu dosya
├── .env.example
└── README.md
```

---

## ⚡ TEMEL KURALLAR (Bunları asla ihlal etme)

### 1. KOD KALİTESİ
- Her fonksiyon için **docstring** yaz (Türkçe veya İngilizce, tutarlı ol)
- **Type hints** kullan — Python ve TypeScript'te tip belirt, `any` kullanma
- Fonksiyon max **50 satır** olsun, uzunsa böl
- Magic number kullanma, sabitleri `config.py` veya `constants.ts`'e taşı
- Her yeni özellik için **test yaz** — `tests/` klasörüne

### 2. GÜVENLİK
- **API key / secret** asla koda yazma → sadece `.env` dosyasından
- SQL sorgu oluştururken **parameterized query** kullan, f-string ile SQL = yasak
- Kullanıcı inputu daima **validate** et (Pydantic backend, Zod frontend)
- CORS ayarlarını production'da kısıtla
- Rate limiting uygula (FastAPI `slowapi`)

### 3. PERFORMANS
- DB sorgusu yazarken **index** kullan, N+1 query yasak
- Sık erişilen veri Redis'e cache'le (TTL: deprem listesi = 30s, risk skoru = 1h)
- Frontend'de **lazy loading** kullan (React.lazy + Suspense)
- Görsel optimizasyon: WebP format, lazy load
- WebSocket bağlantısı koptuğunda **auto-reconnect** ekle (exponential backoff)

### 4. HATA YÖNETİMİ
- Try/catch her async işlemde zorunlu
- API çağrılarında **fallback kaynak** kullan: AFAD → Kandilli → USGS → EMSC
- Kullanıcıya anlamlı hata mesajı göster (teknik detay değil)
- Backend'de tüm hatalar `logger.error()` ile logla
- Production'da **Sentry** entegre et

### 5. VERİ AKIŞI
- Deprem verisi her zaman şu sıraya göre çekilir:
  1. Redis cache kontrol et
  2. Cache yoksa → AFAD API
  3. AFAD çökmüşse → Kandilli API
  4. Kandilli yoksa → USGS API
  5. Hepsi yoksa → EMSC API
  6. Sonucu Redis'e cache'le

---

## 🚫 YASAKLAR

- `print()` ile debug yapma → `logging` kullan
- `time.sleep()` kullanma → `asyncio.sleep()` kullan  
- Frontend'de inline style kullanma → Tailwind class
- `console.log()` production'a gitmesin → ESLint kuralı ekle
- Gereksiz dependency ekleme → önce built-in çözüm ara
- `import *` kullanma → explicit import
- `git push --force` yasak
- `.env` dosyasını commit etme

---

## 📦 ÖNEMLİ BAĞIMLILIKLAR

### Backend (Python)
```
fastapi==0.109.0          # Web framework
uvicorn[standard]==0.27.0 # ASGI server
sqlalchemy==2.0.25        # ORM
alembic==1.13.1           # DB migration
asyncpg==0.29.0           # Async PostgreSQL driver
redis[asyncio]==5.0.1     # Redis client
celery==5.3.6             # Task queue
httpx==0.26.0             # Async HTTP client (API çağrıları)
pydantic==2.5.3           # Validation
pydantic-settings==2.1.0  # Config yönetimi
pywebpush==2.0.0          # Web Push bildirimleri
firebase-admin==6.4.0     # FCM push bildirimleri
anthropic==0.18.0         # Claude AI entegrasyonu
slowapi==0.1.9            # Rate limiting
prometheus-fastapi-instrumentator==6.1.0
sentry-sdk==1.40.6
geopy==2.4.1              # Coğrafi hesaplamalar
```

### Frontend (Node.js)
```
react: 18.2.0
react-dom: 18.2.0
typescript: 5.3.3
vite: 5.0.10
tailwindcss: 3.4.1
zustand: 4.4.7            # State management (Redux yerine, daha basit)
react-leaflet: 4.2.1      # Harita
leaflet: 1.9.4
axios: 1.6.5              # HTTP client
react-query: 5.17.0       # Server state
framer-motion: 11.0.3     # Animasyonlar
react-hot-toast: 2.4.1    # Toast bildirimleri
date-fns: 3.2.0           # Tarih işlemleri
```

---

## 🎯 ÖZELLİK LİSTESİ (Tümü implement edilecek)

### Faz 1 - Core (MVP)
- [ ] Gerçek zamanlı deprem listesi (WebSocket)
- [ ] Canlı harita (Leaflet)
- [ ] Çoklu kaynak API (AFAD + Kandilli + USGS)
- [ ] Push bildirimleri (FCM)
- [ ] Landing page
- [ ] AdSense / AdMob altyapısı

### Faz 2 - Kullanıcı Özellikleri
- [ ] Kullanıcı kaydı / girişi (JWT)
- [ ] Kişiselleştirilmiş bildirim ayarları
- [ ] "Ben İyiyim" butonu (deprem anında aile bildirimi)
- [ ] Deprem çantası kontrol listesi
- [ ] Haftalık sismik özet e-posta

### Faz 3 - Premium & Gelir
- [ ] Bina risk skoru hesaplama
- [ ] DASK sigorta affiliate entegrasyonu
- [ ] Premium abonelik (Stripe)
- [ ] Kişisel risk raporu PDF
- [ ] Yapı denetim firmaları marketplace

### Faz 4 - AI Özellikleri
- [ ] Claude API ile deprem analizi
- [ ] "Bu depremi hissettiniz mi?" tahmin sistemi
- [ ] Sismik aktivite trend analizi
- [ ] Chatbot: deprem hazırlık asistanı

### Faz 5 - B2B
- [ ] Kurumsal API (SaaS)
- [ ] Dashboard white-label
- [ ] Webhook entegrasyonu

---

## 💰 REKLAM ALTYAPISI

### AdSense (Web)
- `frontend/src/components/ads/AdSense.tsx` → merkezi bileşen
- Yerleşimler: header banner, liste arasında (her 5 depremde 1), sidebar
- **Premium kullanıcıya reklam gösterme** → `useAuth()` ile kontrol
- Reklam bileşeni her zaman fallback içersin (reklam yüklenemezse boş alan)

### AdMob (Android)
- `android/src/services/admob.ts` → merkezi yönetim
- Banner: alt fixed banner
- Interstitial: uygulama açılışında (günde max 2)
- Rewarded: premium özellik kilidi açmak için
- **GDPR/KVKK:** kullanıcı onayı al, `consentManager.ts` kullan

---

## 🔑 ENV DEĞİŞKENLERİ (.env.example'dan kopyala)

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/deprem_db
REDIS_URL=redis://localhost:6379/0

# API Keys
AFAD_API_URL=https://deprem.afad.gov.tr/apiv2
USGS_API_URL=https://earthquake.usgs.gov/earthquakes/feed/v1.0
EMSC_API_URL=https://www.seismicportal.eu/fdsnws/event/1
KANDILLI_API_URL=https://api.orhanaydogdu.com.tr

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Anthropic (AI features)
ANTHROPIC_API_KEY=

# AdSense
GOOGLE_ADSENSE_ID=

# Sentry
SENTRY_DSN=

# JWT
SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://depremapp.com,http://localhost:3000
```

---

## 📝 GIT KURALLARI

Commit mesajı formatı (Conventional Commits):
```
feat: yeni özellik ekle
fix: hata düzelt
refactor: kodu yeniden düzenle
docs: dokümantasyon güncelle
test: test ekle
chore: bağımlılık güncelle
```

Branch stratejisi:
- `main` → production
- `develop` → geliştirme
- `feature/özellik-adı` → yeni özellik
- `fix/hata-adı` → hata düzeltme

---

## 🧪 TEST YAZMA KURALLARI

```python
# Her test fonksiyonu şu pattern'i izle:
# test_[birim]_[senaryo]_[beklenen_sonuç]
async def test_earthquake_fetcher_afad_down_fallback_to_kandilli():
    ...
```

Coverage hedefi: minimum %70

---

## ⚡ PERFORMANCE HEDEFLERİ

| Metrik | Hedef |
|--------|-------|
| Landing page LCP | < 2.5s |
| API response time | < 100ms (cache hit) |
| WebSocket latency | < 500ms |
| Deprem bildirimi | < 30s (kaynaktan kullanıcıya) |
| Uptime | %99.9 |

---

*Son güncelleme: 2026 | Versiyon: 1.0*
*Bu dosyayı değiştirmek için önce takım onayı gerekir*
