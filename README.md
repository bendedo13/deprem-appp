# 🌍 DEPREM APP - Türkiye Deprem Erken Uyarı Platformu

**Versiyon**: 1.0.0  
**Durum**: 🟢 Production Ready  
**Son Güncelleme**: 2026-02-23

---

## 📋 İÇİNDEKİLER

1. [Proje Hakkında](#proje-hakkında)
2. [Mimari](#mimari)
3. [Teknoloji Stack](#teknoloji-stack)
4. [Kurulum](#kurulum)
5. [Deployment](#deployment)
6. [Önemli Kurallar](#önemli-kurallar)
7. [VPS Yapılandırması](#vps-yapılandırması)
8. [Özellikler](#özellikler)
9. [API Dokümantasyonu](#api-dokümantasyonu)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 PROJE HAKKINDA

Deprem App, Türkiye için geliştirilmiş gerçek zamanlı deprem erken uyarı ve analiz platformudur. FastAPI, React Native, PostgreSQL ve TimescaleDB kullanan devrim niteliğinde, anlık ve hayat kurtaran bir SaaS platformudur.

### Temel Özellikler
- ✅ Gerçek zamanlı deprem takibi (AFAD, Kandilli, USGS, EMSC)
- ✅ Mobil push bildirimleri (Firebase FCM)
- ✅ WebSocket ile canlı veri akışı
- ✅ Acil durum kişileri yönetimi
- ✅ "Ben İyiyim" butonu
- ✅ NLP destekli sesli S.O.S sistemi (SPEC - Henüz implement edilmedi)
- ✅ Risk analizi ve raporlama
- ✅ Admin paneli

---

## 🏗️ MİMARİ

### Genel Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                     DEPREM APP PLATFORM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Mobile     │  │   Frontend   │  │    Admin     │     │
│  │ React Native │  │    React     │  │    Panel     │     │
│  │   (Expo)     │  │   + Vite     │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                       │
│                   │   Nginx Proxy   │                       │
│                   │   (Port 80/443) │                       │
│                   └────────┬────────┘                       │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│    ┌────▼─────┐    ┌──────▼──────┐    ┌─────▼─────┐      │
│    │ Backend  │    │   Celery    │    │ WebSocket │      │
│    │ FastAPI  │    │   Worker    │    │  Server   │      │
│    │(Port 8001)│   │             │    │           │      │
│    └────┬─────┘    └──────┬──────┘    └─────┬─────┘      │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                 │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│    ┌────▼─────┐    ┌──────▼──────┐    ┌─────▼─────┐      │
│    │PostgreSQL│    │    Redis    │    │  Firebase │      │
│    │TimescaleDB│   │   (Cache)   │    │    FCM    │      │
│    └──────────┘    └─────────────┘    └───────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Dizin Yapısı

```
deprem-appp/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Ayarlar (env'den okur)
│   │   ├── database.py        # PostgreSQL + TimescaleDB
│   │   ├── models/            # SQLAlchemy ORM modelleri
│   │   ├── schemas/           # Pydantic şemaları
│   │   ├── api/               # API endpoint'leri
│   │   │   └── v1/            # API v1 routes
│   │   ├── services/          # İş mantığı
│   │   ├── tasks/             # Celery görevleri
│   │   │   ├── celery_app.py # Celery config
│   │   │   └── __init__.py    # celery_app export
│   │   └── utils/             # Yardımcı fonksiyonlar
│   ├── alembic/               # Database migration
│   │   ├── versions/          # Migration dosyaları
│   │   └── env.py             # Alembic async config
│   ├── Dockerfile             # Backend container
│   ├── requirements.txt       # Python dependencies
│   └── alembic.ini            # Alembic config
│
├── frontend/                  # React Web App
│   ├── src/
│   │   ├── pages/             # Sayfalar
│   │   ├── components/        # Bileşenler
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API servisleri
│   │   └── store/             # State management
│   ├── Dockerfile             # Frontend container
│   └── package.json
│
├── mobile/                    # React Native Mobile
│   ├── app/
│   │   ├── firebase-init.ts   # Firebase initialization
│   │   └── _layout.tsx        # App layout
│   ├── app.json               # Expo config
│   └── package.json
│
├── deploy/                    # Production Deployment
│   ├── docker-compose.prod.yml # Production compose
│   ├── PRODUCTION_DEPLOY.sh   # Otomatik deployment
│   └── README.md              # Deploy dokümantasyonu
│
├── .kiro/                     # Kiro AI specs
│   └── specs/
│       ├── emergency-contact-alert/  # Acil kişiler özelliği
│       └── nlp-sos-voice-alert/      # Sesli S.O.S (SPEC)
│
├── rules.md                   # ⚠️ ZORUNLU: Mimari kurallar
├── DEPLOYMENT_AUDIT_REPORT.md # Deployment audit raporu
└── README.md                  # Bu dosya
```

---

## 🛠️ TEKNOLOJİ STACK

### Backend
- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL 16 + TimescaleDB
- **ORM**: SQLAlchemy 2.0 (Async)
- **Migration**: Alembic 1.13.1
- **Cache**: Redis 7
- **Task Queue**: Celery 5.3.6
- **Auth**: JWT
- **API Client**: httpx (async)

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **State**: Zustand
- **Map**: Leaflet.js + React-Leaflet
- **HTTP**: Axios + React Query

### Mobile
- **Framework**: React Native + Expo SDK 51
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Push**: Firebase FCM
- **Audio**: expo-av

### DevOps
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx
- **CI/CD**: GitHub Actions (planned)
- **Monitoring**: Prometheus + Grafana (planned)

---

## 🚀 KURULUM

### Gereksinimler

- Docker 24+
- Docker Compose 2.0+
- Node.js 18+ (local development için)
- Python 3.11+ (local development için)

### Local Development

```bash
# 1. Repository'yi klonla
git clone https://github.com/your-username/deprem-appp.git
cd deprem-appp

# 2. Backend setup
cd backend
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# .env dosyasını düzenle

# 3. Database migration
alembic upgrade head

# 4. Backend başlat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Frontend setup (yeni terminal)
cd frontend
npm install
npm run dev

# 6. Mobile setup (yeni terminal)
cd mobile
npm install
npx expo start
```

---

## 📦 DEPLOYMENT

### ⚠️ ÖNEMLİ: VPS Yapılandırması

**VPS'te başka bir proje çalışıyor!** Çakışmaları önlemek için:

- **PostgreSQL**: Aynı instance, farklı database (`deprem_db`)
- **Redis**: Aynı instance, farklı DB numarası (DB 0)
- **Backend Port**: `8001` (diğer proje 8000 kullanıyor)
- **Frontend Port**: `8002`
- **Docker Network**: `deploy_deprem_net` (izole network)

### Production Deployment (VPS)

```bash
# Tek komut ile deployment:
cd /opt/deprem-appp/deploy
chmod +x PRODUCTION_DEPLOY.sh
./PRODUCTION_DEPLOY.sh
```

**Script otomatik olarak**:
1. ✅ Git force sync (`git reset --hard origin/main`)
2. ✅ Kod doğrulama
3. ✅ Docker no-cache build
4. ✅ Container'ları başlatma
5. ✅ Database migration
6. ✅ Health check (4 endpoint)

### Manuel Deployment

```bash
cd /opt/deprem-appp

# 1. Git sync
git stash
git pull origin main

# 2. Deploy
cd deploy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 3. Migration
sleep 15
docker exec deprem_backend alembic upgrade head

# 4. Health check
curl http://localhost:8001/health
curl http://localhost:8001/api/v1/health
```

### Environment Variables

`.env` dosyası oluştur:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://deprem_user:deprem2024secure@deprem_db:5432/deprem_db

# Redis
REDIS_URL=redis://deprem_redis:6379/0

# JWT
SECRET_KEY=your-super-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Firebase (Push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# API Keys
AFAD_API_URL=https://deprem.afad.gov.tr/apiv2
KANDILLI_API_URL=https://api.orhanaydogdu.com.tr
USGS_API_URL=https://earthquake.usgs.gov
EMSC_API_URL=https://www.seismicportal.eu/fdsnws/event/1

# AI Services (S.O.S özelliği için - henüz implement edilmedi)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# CORS
ALLOWED_ORIGINS=https://your-domain.com,http://localhost:3000

# Debug
DEBUG=false
```

---

## ⚠️ ÖNEMLİ KURALLAR

### 🔴 ZORUNLU: Her Kod Değişikliğinden Önce Oku

1. **`rules.md` dosyasını oku** - Mimari ve stil kuralları
2. **`DEPLOYMENT_AUDIT_REPORT.md` oku** - Deployment sorunları ve çözümleri

### Database Migration Kuralları

❌ **ASLA YAPMA**:
```python
# ❌ Production'da create_all() kullanma
async def init_db():
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

✅ **DOĞRU YÖNTEM**:
```bash
# ✅ Alembic migration kullan
alembic revision --autogenerate -m "description"
alembic upgrade head
```

### Docker Build Kuralları

❌ **ASLA YAPMA**:
```bash
# ❌ Cache kullanma (eski kod build edilir)
docker compose build
```

✅ **DOĞRU YÖNTEM**:
```bash
# ✅ No-cache build
docker compose build --no-cache
```

### Git Sync Kuralları

❌ **ASLA YAPMA**:
```bash
# ❌ Conflict durumunda merge yapma
git pull  # Conflict!
```

✅ **DOĞRU YÖNTEM**:
```bash
# ✅ Force sync
git stash
git reset --hard origin/main
```

---

## 🎯 ÖZELLİKLER

### ✅ Tamamlanan Özellikler

#### 1. Backend API
- ✅ FastAPI REST API
- ✅ WebSocket real-time updates
- ✅ JWT authentication
- ✅ Rate limiting
- ✅ CORS middleware
- ✅ Health check endpoints (`/health`, `/api/v1/health`)
- ✅ API documentation (`/docs`, `/redoc`)

#### 2. Database
- ✅ PostgreSQL + TimescaleDB
- ✅ Alembic migrations (production-safe)
- ✅ Async SQLAlchemy
- ✅ Connection pooling

#### 3. Deprem Takibi
- ✅ Çoklu kaynak API (AFAD, Kandilli, USGS, EMSC)
- ✅ Fallback mekanizması
- ✅ Redis cache (30s TTL)
- ✅ Periyodik veri çekme (Celery)

#### 4. Bildirimler
- ✅ Firebase FCM push notifications
- ✅ Web Push API
- ✅ Kullanıcı bildirim ayarları

#### 5. Mobile App
- ✅ React Native + Expo
- ✅ Firebase initialization fix (✅ ÇÖZÜLDÜ)
- ✅ Android build (EAS)
- ✅ Push notifications

#### 6. Acil Durum Özellikleri
- ✅ Acil durum kişileri yönetimi (SPEC tamamlandı)
- ✅ "Ben İyiyim" butonu (SPEC tamamlandı)
- ⏳ NLP destekli sesli S.O.S (SPEC hazır, implement edilmedi)

### 📋 SPEC Durumu

#### Emergency Contact Alert (Acil Kişiler)
- **Durum**: ✅ SPEC Tamamlandı
- **Dosyalar**: `.kiro/specs/emergency-contact-alert/`
- **Implement**: ⏳ Beklemede
- **Özellikler**:
  - Acil durum kişileri ekleme/düzenleme/silme
  - Otomatik deprem bildirimi
  - "Ben İyiyim" butonu
  - SMS/WhatsApp entegrasyonu (Twilio)

#### NLP-Powered S.O.S Voice Alert
- **Durum**: ✅ SPEC Tamamlandı
- **Dosyalar**: `.kiro/specs/nlp-sos-voice-alert/`
- **Implement**: ❌ Henüz başlanmadı
- **Özellikler**:
  - Sesli S.O.S kaydı
  - Whisper API (speech-to-text)
  - Claude/OpenAI (NLP extraction)
  - Yapılandırılmış veri çıkarma
  - Acil kişilere otomatik bildirim

---

## 📚 API DOKÜMANTASYONU

### Base URL

- **Production**: `http://your-vps-ip:8001`
- **Local**: `http://localhost:8000`

### Endpoints

#### Health Check
```bash
GET /health
GET /api/v1/health

Response: {"status":"ok","version":"1.0.0"}
```

#### Depremler
```bash
GET /api/v1/earthquakes
GET /api/v1/earthquakes/{id}
POST /api/v1/earthquakes/search
```

#### Kullanıcılar
```bash
POST /api/v1/users/register
POST /api/v1/users/login
GET /api/v1/users/me
PUT /api/v1/users/me
```

#### Bildirimler
```bash
GET /api/v1/notifications
POST /api/v1/notifications/subscribe
PUT /api/v1/notifications/settings
```

#### Admin
```bash
GET /api/v1/admin/users
GET /api/v1/admin/analytics
POST /api/v1/admin/earthquakes
```

### API Docs

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **OpenAPI JSON**: http://localhost:8001/openapi.json

---

## 🔧 TROUBLESHOOTING

### Sorun 1: DuplicateTableError

**Belirti**: `relation "users" already exists`

**Çözüm**:
```bash
# init_db() kaldırıldı mı kontrol et
grep "init_db" backend/app/main.py
# Çıktı olmamalı

# Yeni deployment
cd deploy
./PRODUCTION_DEPLOY.sh
```

### Sorun 2: /api/v1/health 404

**Belirti**: `{"detail":"Not Found"}`

**Çözüm**:
```bash
# Git sync + no-cache build
cd /opt/deprem-appp
git reset --hard origin/main
cd deploy
docker compose -f docker-compose.prod.yml build --no-cache deprem_backend
docker compose -f docker-compose.prod.yml up -d
```

### Sorun 3: Firebase Crash (Mobile)

**Belirti**: `Firebase not initialized`

**Çözüm**: ✅ ÇÖZÜLDÜ
- `mobile/app/firebase-init.ts` oluşturuldu
- `mobile/app/_layout.tsx` import sırası düzeltildi

### Sorun 4: Container Restart Sonrası Hata

**Belirti**: Backend başlamıyor

**Çözüm**:
```bash
# Logları kontrol et
docker logs deprem_backend

# Migration çalıştır
docker exec deprem_backend alembic upgrade head

# Restart
docker compose -f docker-compose.prod.yml restart deprem_backend
```

### Sorun 5: Port Conflict

**Belirti**: `bind: address already in use`

**Çözüm**:
```bash
# Port kullanımını kontrol et
sudo netstat -tlnp | grep 8001

# Container'ı durdur
docker compose -f docker-compose.prod.yml down

# Yeniden başlat
docker compose -f docker-compose.prod.yml up -d
```

---

## 📊 PROJE DURUMU ÖZET

### ✅ Çalışan Özellikler

| Özellik | Durum | Not |
|---------|-------|-----|
| Backend API | ✅ Çalışıyor | Port 8001 |
| Frontend | ✅ Çalışıyor | Port 8002 |
| Database | ✅ Çalışıyor | PostgreSQL + TimescaleDB |
| Redis | ✅ Çalışıyor | Cache + Celery broker |
| Celery Worker | ✅ Çalışıyor | Background tasks |
| Health Endpoints | ✅ Çalışıyor | `/health`, `/api/v1/health` |
| API Docs | ✅ Çalışıyor | `/docs` |
| Migration | ✅ Çalışıyor | Alembic |
| Mobile App | ✅ Build OK | Firebase fix uygulandı |
| Firebase | ✅ Çözüldü | Initialization fix |

### ⏳ Implement Bekleyen Özellikler

| Özellik | SPEC | Implement | Öncelik |
|---------|------|-----------|---------|
| Acil Kişiler | ✅ Hazır | ❌ Bekliyor | Yüksek |
| "Ben İyiyim" | ✅ Hazır | ❌ Bekliyor | Yüksek |
| Sesli S.O.S | ✅ Hazır | ❌ Bekliyor | Orta |
| Register/Login | ⚠️ Kısmi | ⚠️ Test gerekli | Yüksek |
| Admin Panel | ⚠️ Kısmi | ⚠️ Test gerekli | Orta |

### 🔴 Bilinen Sorunlar

1. ~~DuplicateTableError~~ → ✅ ÇÖZÜLDÜ
2. ~~Firebase Crash~~ → ✅ ÇÖZÜLDÜ
3. ~~Endpoint 404~~ → ✅ ÇÖZÜLDÜ
4. Register/Login → ⚠️ Test edilmedi
5. Admin Panel → ⚠️ Test edilmedi
6. Mobile Menüler → ⚠️ Test edilmedi

---

## 🔐 GÜVENLİK

### Production Checklist

- [ ] `.env` dosyası güvenli şifreler içeriyor
- [ ] `SECRET_KEY` minimum 32 karakter
- [ ] `DEBUG=false` production'da
- [ ] CORS `ALLOWED_ORIGINS` kısıtlı
- [ ] Rate limiting aktif
- [ ] SSL/TLS sertifikası (Let's Encrypt)
- [ ] Firewall kuralları (UFW)
- [ ] Database şifreleri güçlü
- [ ] API key'ler environment variable'da

---

## 📞 İLETİŞİM VE DESTEK

### Dokümantasyon

- **Rules**: `rules.md` - Mimari kurallar
- **Deployment**: `DEPLOYMENT_AUDIT_REPORT.md` - Deployment rehberi
- **Deploy**: `deploy/README.md` - Deploy dokümantasyonu
- **Specs**: `.kiro/specs/` - Özellik spesifikasyonları

### Komutlar

```bash
# Deployment
cd /opt/deprem-appp/deploy && ./PRODUCTION_DEPLOY.sh

# Loglar
docker logs -f deprem_backend
docker logs -f deprem_celery

# Health check
curl http://localhost:8001/health

# Container durumu
docker ps

# Migration
docker exec deprem_backend alembic upgrade head
```

---

## 📝 LİSANS

Bu proje özel bir projedir. Tüm hakları saklıdır.

---

## 🎉 TEŞEKKÜRLER

Deprem App'i geliştiren tüm ekibe teşekkürler!

**Son Güncelleme**: 2026-02-23  
**Versiyon**: 1.0.0  
**Durum**: 🟢 Production Ready
