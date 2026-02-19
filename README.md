# 🌍 Deprem App — Türkiye'nin En Hızlı Deprem Platformu

[![Python](https://img.shields.io/badge/Python-3.11-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

> Gerçek zamanlı deprem takibi, AI destekli risk analizi, kişiselleştirilmiş bildirimler.  
> AFAD + Kandilli + USGS + EMSC — 4 kaynaktan anlık veri, çökmeyen platform.

---

## 🚀 Hızlı Başlangıç (5 dakikada çalıştır)

```bash
# Repo'yu klonla
git clone https://github.com/kullanici/deprem-app.git
cd deprem-app

# Environment dosyasını hazırla
cp .env.example .env
# .env dosyasını düzenle

# Docker ile başlat (önce Docker Desktop kur)
docker-compose -f docker/docker-compose.dev.yml up -d

# Backend: http://localhost:8000
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/docs
```

---

## 📋 İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Özellikler](#özellikler)
- [Teknoloji Stack](#teknoloji-stack)
- [Mimari](#mimari)
- [Kurulum](#kurulum)
- [API Dokümantasyonu](#api-dokümantasyonu)
- [Deploy](#deploy)
- [Gelir Modeli](#gelir-modeli)

---

## 🎯 Proje Hakkında

Türkiye yılda 100.000+ deprem yaşıyor. AFAD ve Kandilli siteleri büyük depremlerde çöküyor.
Bu proje, çökmez, hızlı, kullanışlı bir alternatif sunuyor.

**Hedef Kullanıcılar:**
- Türkiye'deki 85M kullanıcı (deprem korkusu yaygın, 2023 travması taze)
- Türkiye'de yaşayan yabancılar
- Global deprem meraklıları
- Şirketler (B2B API)

---

## ✨ Özellikler

### 🔴 Anlık Takip
- Saniye içinde deprem bildirimi (AFAD kaynaktan kullanıcıya < 30s)
- WebSocket ile gerçek zamanlı liste güncelleme (refresh yok)
- 4 farklı kaynak — biri çöksede diğeri devrede
- Canlı sismik harita (büyüklüğe göre renk + animasyon)

### 🔔 Akıllı Bildirimler
- Kişiselleştirilmiş: "Sadece İstanbul, 4.0 üzeri bildir"
- Çoklu konum: "Ev + İşyeri + Ailem (Malatya)"
- "Ben İyiyim" butonu — deprem anında aileye tek tıkla WhatsApp/SMS
- Haftalık sismik özet e-posta

### 🏠 Risk Analizi
- Bina risk skoru: adres → yapım yılı + zemin türü + fay mesafesi
- Kişisel risk raporu (PDF indirilebilir)
- Fay hattı haritası üzerinde konum gösterimi
- DASK sigorta önerisi (affiliate entegrasyon)

### 🤖 AI Özellikleri (Claude API)
- Deprem analizi: "Bu deprem tehlikeli mi?" sorusuna anlık yanıt
- Sismik aktivite trend analizi
- Deprem hazırlık chatbot asistanı
- "Bu depremi hissettiniz mi?" tahmin sistemi

### 💰 Ek Özellikler
- Türkçe + İngilizce dil desteği
- PWA: web sitesini telefona kur (uygulama gibi çalışır)
- Dark/Light mod
- Offline mod: son 100 depremi göster (Service Worker)
- Deprem çantası kontrol listesi + yıllık hatırlatıcı
- Sosyal paylaşım: "Az önce deprem oldu" tweet/paylaşım butonu
- Artçı deprem tahmini görselleştirme

---

## 🛠️ Teknoloji Stack

### Backend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|---------|
| Python | 3.11 | Ana dil |
| FastAPI | 0.109 | Web framework |
| PostgreSQL | 16 | Ana veritabanı |
| TimescaleDB | latest | Zaman serisi veri (deprem geçmişi) |
| Redis | 7 | Cache + session + pub/sub |
| Celery | 5.3 | Background task (periyodik veri çekme) |
| SQLAlchemy | 2.0 | ORM |
| Pydantic | 2.5 | Validation |

### Frontend
| Teknoloji | Versiyon | Kullanım |
|-----------|----------|---------|
| React | 18.2 | UI framework |
| TypeScript | 5.3 | Tip güvenliği |
| Vite | 5.0 | Build tool |
| Tailwind CSS | 3.4 | Styling |
| Zustand | 4.4 | State management |
| React Query | 5.17 | Server state |
| Leaflet | 1.9 | Harita |
| Framer Motion | 11 | Animasyonlar |

### Android
| Teknoloji | Kullanım |
|-----------|---------|
| React Native 0.73 | Cross-platform mobil |
| Expo | Build + deploy kolaylığı |
| React Native Maps | Harita |
| Firebase | Push notification (FCM) |
| Google AdMob | Reklam geliri |

### Altyapı
| Teknoloji | Kullanım |
|-----------|---------|
| Docker | Containerization |
| Nginx | Reverse proxy |
| GitHub Actions | CI/CD |
| Hetzner VPS | Hosting |
| Prometheus + Grafana | Monitoring |
| Sentry | Hata takibi |

---

## 🏗️ Mimari

```
[Kullanıcı Tarayıcı / Android App]
        |
        ├─ HTTP/REST → [Nginx] → [FastAPI Backend]
        └─ WebSocket → [Nginx] → [FastAPI WebSocket]
                                        |
                    ┌──────────────────┴──────────────────┐
                    ↓                                       ↓
              [PostgreSQL]                           [Redis Cache]
              [TimescaleDB]                          [Session Store]
                    ↑                                       ↑
                    └──────────────────┬──────────────────┘
                                       |
                              [Celery Worker]
                                       |
              ┌──────────────┬─────────┴──────────┬──────────────┐
              ↓              ↓                     ↓              ↓
         [AFAD API]   [Kandilli API]         [USGS API]    [EMSC API]
```

### Veri Akışı (Deprem Bildirimi Süreci)
1. Celery worker her 30 saniyede AFAD API'yi kontrol eder
2. Yeni deprem bulunursa PostgreSQL'e kaydeder
3. Redis Pub/Sub kanalına mesaj yayınlar
4. WebSocket manager tüm bağlı istemcilere anlık gönderir
5. FCM/Web Push ile bildirim gönderilir (ayar yapan kullanıcılara)

---

## ⚙️ Kurulum

### Gereksinimler
- Docker Desktop 4.x
- Node.js 20+ (frontend geliştirme için)
- Python 3.11+ (backend geliştirme için)

### 1. Environment Hazırla
```bash
cp .env.example .env
```

`.env` dosyasını aç ve şunları doldur:
- `DATABASE_URL` — PostgreSQL bağlantı string
- `REDIS_URL` — Redis URL
- `FIREBASE_*` — Firebase console'dan al (push notification için)
- `ANTHROPIC_API_KEY` — claude.ai'dan al (AI özellikler için)
- `SECRET_KEY` — rastgele uzun string (JWT için)

### 2. Docker ile Başlat
```bash
# Development
docker-compose -f docker/docker-compose.dev.yml up -d

# Logları izle
docker-compose logs -f backend

# Servisler:
# Backend API:  http://localhost:8000
# API Docs:     http://localhost:8000/docs
# Frontend:     http://localhost:5173
# Redis:        localhost:6379
# PostgreSQL:   localhost:5432
```

### 3. Manuel Kurulum (Docker olmadan)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Veritabanını oluştur
alembic upgrade head

# Başlat
uvicorn app.main:app --reload --port 8000

# Celery worker (yeni terminal)
celery -A app.tasks worker --loglevel=info

# Celery beat (periyodik görevler için)
celery -A app.tasks beat --loglevel=info
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Dokümantasyonu

Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

### Temel Endpoint'ler

```bash
# Son depremler
GET /api/v1/earthquakes?limit=50&min_mag=2.0

# Gerçek zamanlı WebSocket
WS /ws/earthquakes

# Risk skoru hesapla
POST /api/v1/risk/score
{ "address": "İstanbul Kadıköy", "building_year": 1985 }

# Bildirim ayarları
POST /api/v1/notifications/settings
{ "fcm_token": "...", "min_magnitude": 4.0, "locations": [...] }

# AI Analiz
POST /api/v1/ai/analyze
{ "earthquake_id": "..." }
```

---

## 🚀 Deploy (Hetzner VPS)

```bash
# Sunucuya SSH bağlan
ssh root@sunucu-ip

# Repo'yu klonla
git clone https://github.com/kullanici/deprem-app.git
cd deprem-app

# .env ayarla
cp .env.example .env
nano .env

# Production Docker ile başlat
docker-compose -f docker/docker-compose.yml up -d

# SSL sertifikası (Let's Encrypt)
certbot --nginx -d depremapp.com -d www.depremapp.com
```

Detaylı deploy rehberi: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## 💰 Gelir Modeli

| Kaynak | Model | Tahmini Gelir |
|--------|-------|--------------|
| Google AdSense (Web) | CPM/CPC | 5-50K TL/ay* |
| AdMob (Android) | Banner + Interstitial | 3-30K TL/ay* |
| Premium Abonelik | ₺79/ay | Kullanıcı sayısına göre |
| DASK Sigorta Affiliate | Başarılı yönlendirme başı ₺200-500 | Yüksek potansiyel |
| B2B API | Kurumsal lisans ₺1-5K/ay | Hedef: 10+ şirket |

*Büyük deprem anında 10-50x artış beklenir

---

## 🤝 Katkı

Geliştirme yapmadan önce `.cursor/rules.md` dosyasını oku.

```bash
# Feature branch oluştur
git checkout -b feature/yeni-özellik

# Değişiklikleri commit et
git commit -m "feat: yeni özellik açıklaması"

# Pull request aç
```

---

## 📄 Lisans

MIT License — Detaylar için [LICENSE](LICENSE) dosyasına bak.

---

*Türkiye'nin en güvenilir deprem platformunu birlikte inşa ediyoruz.*
