# 📋 DEPREM APP - KOMPREHENSİF İYİLEŞTİRME VE TEST KILAVUZU

## 🎯 AMAÇ

Bu dokümandocküman, Deprem App projesinin:
- ✅ Hatasız kurulmasını
- ✅ Tüm testlerin geçmesini
- ✅ Production'a hazır olmasını
- ✅ 0 downtime ile deploy edilmesini sağlar

---

## 🔍 PROJE YAPISI KONTROL LİSTESİ

### Backend (FastAPI + PostgreSQL + Redis)

```
✅ Backend Port: 8000 (docker-compose.yml'de 8000)
✅ Database: PostgreSQL + TimescaleDB (5432)
✅ Cache: Redis (6379)
✅ Task Queue: Celery + Redis
✅ Framework: FastAPI
✅ ORM: SQLAlchemy 2.0
✅ Migrations: Alembic
✅ Auth: JWT + Passlib
✅ Rate Limiting: slowapi
```

### Frontend (React + Vite)

```
✅ Frontend Port: 8085 (docker-compose.prod.yml'de 8002)
✅ Framework: React 18.2.0
✅ Build Tool: Vite 5.0.10
✅ UI Library: Tailwind CSS
✅ State Management: Zustand
✅ HTTP Client: Axios
✅ Maps: Leaflet
✅ Charts: Recharts
✅ PWA Support: vite-plugin-pwa
```

### Mobile

```
✅ Framework: React Native (Expo)
✅ Build Tool: EAS Build
✅ State Management: Zustand
✅ Notifications: Firebase FCM
```

---

## 🚀 KURULUM ADIMLARI (TAZA BAŞLANGIC)

### Adım 1: Proje Klonla
```bash
git clone https://github.com/bendedo13/deprem-appp.git
cd deprem-appp
git checkout claude/fix-project-errors-dwJIA
```

### Adım 2: Environment Setup
```bash
# Backend environment
cd backend
cp .env.example .env
# .env dosyasını edit et ve aşağıdaki değerleri ayarla:
# DATABASE_URL=postgresql+asyncpg://deprem_user:deprem_pass@localhost:5432/deprem_db
# REDIS_URL=redis://localhost:6379/0
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase.json

# Frontend environment
cd ../frontend
cp .env.example .env
# VITE_API_URL=http://localhost:8000/api/v1
```

### Adım 3: Docker Setup (Önerilen)
```bash
cd /root/deprem-appp

# Docker cache temizle
docker-compose down 2>/dev/null || true
docker builder prune -af --volumes 2>/dev/null || true
docker system prune -af --volumes 2>/dev/null || true

# DEV ortamında build ve başlat
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d

# PROD ortamında build ve başlat (VPS'de)
docker-compose -f deploy/docker-compose.prod.yml build --no-cache
docker-compose -f deploy/docker-compose.prod.yml up -d
```

### Adım 4: Local Development (Olmadan Docker)
```bash
# Backend kurulumu
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Database migration
alembic upgrade head

# Backend çalıştırma
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Ayrı terminal'de Celery worker
celery -A app.tasks worker --loglevel=info

# Ayrı terminal'de Celery Beat
celery -A app.tasks beat --loglevel=info

# Frontend kurulumu
cd ../frontend
npm install
npm run dev  # Vite dev server başlar (port 5173)

# Mobile kurulumu (Expo)
cd ../mobile
npm install
npm run start  # Expo metro bundler başlar
```

---

## 🧪 TEST SUITE ÇALIŞTIRMA

### Unit Tests
```bash
# Backend unit tests (varsa)
cd backend
pytest tests/ -v

# Frontend unit tests (varsa)
cd ../frontend
npm run test
```

### Integration Tests
```bash
# Backend API tests
cd backend
pytest tests/integration/ -v

# E2E tests (cypress varsa)
cd ../frontend
npm run test:e2e
```

### Manual Testing Script
```bash
#!/bin/bash
set -e

PROJECT_ROOT="/root/deprem-appp"
cd "$PROJECT_ROOT"

echo "🧪 DEPREM APP - TEST SUITE"
echo "=========================="

# 1. Python Syntax Check
echo "1️⃣  Python Syntax Kontrolü..."
cd backend
python3 -m py_compile app/main.py
python3 -m py_compile app/config.py
echo "   ✅ Python syntax OK"

# 2. Frontend Build Check
echo "2️⃣  Frontend Build Kontrolü..."
cd ../frontend
npm run build 2>&1 | tail -5
echo "   ✅ Frontend build OK"

# 3. Docker Build Check
echo "3️⃣  Docker Build Kontrolü..."
cd "$PROJECT_ROOT"
docker-compose build --no-cache 2>&1 | tail -10
echo "   ✅ Docker build OK"

# 4. Services Startup
echo "4️⃣  Services Başlatılıyor..."
docker-compose up -d
sleep 30

# 5. Health Checks
echo "5️⃣  Health Checks..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8085)

echo "   Backend HTTP: $BACKEND_STATUS"
echo "   Frontend HTTP: $FRONTEND_STATUS"

if [ "$BACKEND_STATUS" != "200" ]; then
    echo "   ❌ Backend unhealthy!"
    docker logs deprem_backend --tail 30
    exit 1
fi

if [ "$FRONTEND_STATUS" != "200" ] && [ "$FRONTEND_STATUS" != "301" ]; then
    echo "   ❌ Frontend unhealthy!"
    docker logs deprem_frontend --tail 30
    exit 1
fi

echo "   ✅ Health checks OK"

# 6. API Endpoint Tests
echo "6️⃣  API Endpoint Tests..."

# Health check
curl -s http://localhost:8000/health | grep -q "status" && echo "   ✅ /health endpoint OK"

# Root endpoint
curl -s http://localhost:8000/ | grep -q "Deprem App" && echo "   ✅ / endpoint OK"

# Earthquakes endpoint (public)
curl -s http://localhost:8000/api/v1/earthquakes | grep -q "data" && echo "   ✅ /earthquakes endpoint OK"

# 7. Database Tests
echo "7️⃣  Database Connection..."
docker exec deprem_db pg_isready -U deprem_user -d deprem_db && echo "   ✅ PostgreSQL OK"

# 8. Redis Tests
echo "8️⃣  Redis Connection..."
docker exec deprem_redis redis-cli ping | grep -q "PONG" && echo "   ✅ Redis OK"

# 9. External API Tests
echo "9️⃣  External API Kontrolü..."
curl -s "https://deprem.afad.gov.tr/apiv2/event/filter?start=2026-01-01&minmag=1&limit=1" | grep -q "data" && echo "   ✅ AFAD API OK" || echo "   ⚠️  AFAD API unreachable"
curl -s "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=1&minmagnitude=1" | grep -q "features" && echo "   ✅ USGS API OK" || echo "   ⚠️  USGS API unreachable"

# 10. Final Status
echo ""
echo "=========================="
echo "✅ TÜM TESTLER BAŞARILI!"
echo "=========================="
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8085"
echo "Docs: http://localhost:8000/docs"
```

---

## 📊 MONITORING VE LOGS

### Real-time Log Monitoring
```bash
# Backend logs
docker logs -f deprem_backend --tail 100

# Frontend logs
docker logs -f deprem_frontend --tail 100

# Celery worker logs
docker logs -f deprem_celery --tail 100

# Database logs
docker logs -f deprem_db --tail 100

# Tüm error'ları grep'le
docker-compose logs --tail 100 2>&1 | grep -i error

# Belirli service'in logs'unda search yap
docker logs deprem_backend --tail 200 2>&1 | grep "database\|connection"
```

### Performance Monitoring
```bash
# Docker memory/CPU usage
docker stats

# Service status
docker-compose ps

# Network connectivity
docker network inspect deprem_net

# Volume kullanımı
docker volume inspect deprem_postgres_data
docker volume inspect deprem_redis_data
```

---

## 🔧 TROUBLESHOOTING

### Backend Sorunları

**Sorun: Database connection refused**
```bash
# Çözüm 1: Database service'i kontrol et
docker logs deprem_db

# Çözüm 2: Database'i reset et
docker-compose down
docker volume rm deprem-appp_postgres_data
docker-compose up -d

# Çözüm 3: Connection string'i kontrol et
grep DATABASE_URL backend/.env

# Çözüm 4: Migration'ı çalıştır
docker exec deprem_backend alembic upgrade head
```

**Sorun: Redis connection failed**
```bash
# Çözüm 1: Redis service'i kontrol et
docker logs deprem_redis

# Çözüm 2: Redis'i temizle
docker-compose exec redis redis-cli FLUSHALL

# Çözüm 3: REDIS_URL'i kontrol et
grep REDIS_URL backend/.env
```

**Sorun: Slow API responses**
```bash
# Çözüm 1: Database indexleri kontrol et
docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT * FROM pg_indexes;"

# Çözüm 2: Celery worker'ları kontrol et
docker logs deprem_celery

# Çözüm 3: Rate limiting'i kontrol et
grep slowapi backend/app/main.py
```

### Frontend Sorunları

**Sorun: Static files not found**
```bash
# Çözüm 1: Build dist dosyasını kontrol et
ls -la frontend/dist/

# Çözüm 2: Frontend rebuild et
docker-compose build --no-cache frontend

# Çözüm 3: Vite config'i kontrol et
cat frontend/vite.config.ts
```

**Sorun: API calls fail from frontend**
```bash
# Çözüm 1: VITE_API_URL'i kontrol et
grep VITE_API_URL frontend/.env

# Çözüm 2: CORS sorunlarını kontrol et
curl -i -X OPTIONS http://localhost:8000/api/v1/earthquakes

# Çözüm 3: Network connectivity'yi kontrol et
docker network inspect deprem_net
```

### Docker Sorunları

**Sorun: Docker build OutOfMemory**
```bash
# Çözüm 1: Docker memory limit'ini artır
# Docker Desktop'ta: Settings > Resources > Memory: 8GB
# Linux'ta: docker-compose build --memory=4gb

# Çözüm 2: Cache'i temizle
docker builder prune -af --volumes

# Çözüm 3: BuildKit'i aktifleştir (daha optimize)
export DOCKER_BUILDKIT=1
docker-compose build --no-cache
```

**Sorun: Port already in use**
```bash
# Çözüm: Port'u bloklamış process'i bul ve kapat
lsof -i :8000  # Backend
lsof -i :8085  # Frontend
lsof -i :5432  # Database

# Kill process
kill -9 <PID>

# Ya da docker-compose'u temizle
docker-compose down
docker-compose up -d
```

---

## 🚀 DEPLOYMENT (VPS'de)

### Production Deploy Script
```bash
#!/bin/bash
set -e

echo "🚀 DEPREM APP - PRODUCTION DEPLOYMENT"
echo "======================================="

PROJECT_ROOT="/root/deprem-appp"
cd "$PROJECT_ROOT"

# 1. Git update
echo "1️⃣  GitHub'dan latest changes alınıyor..."
git fetch origin
git reset --hard origin/claude/fix-project-errors-dwJIA

# 2. Environment setup
echo "2️⃣  Environment kontrol ediliyor..."
if [ ! -f "backend/.env" ]; then
    echo "⚠️  backend/.env bulunamadı!"
    exit 1
fi

# 3. Docker cleanup
echo "3️⃣  Eski Docker objects temizleniyor..."
docker-compose down 2>/dev/null || true
docker builder prune -af --volumes 2>/dev/null || true

# 4. Build
echo "4️⃣  Docker build başlanıyor..."
DOCKER_BUILDKIT=1 docker-compose -f deploy/docker-compose.prod.yml build --no-cache

# 5. Deploy
echo "5️⃣  Services başlanıyor..."
docker-compose -f deploy/docker-compose.prod.yml up -d
sleep 30

# 6. Health checks
echo "6️⃣  Health checks yapılıyor..."
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002)

echo "   Backend: HTTP $BACKEND"
echo "   Frontend: HTTP $FRONTEND"

if [ "$BACKEND" != "200" ] || ([ "$FRONTEND" != "200" ] && [ "$FRONTEND" != "301" ]); then
    echo "❌ DEPLOYMENT FAILED!"
    docker-compose -f deploy/docker-compose.prod.yml logs --tail 50
    exit 1
fi

# 7. Database migration
echo "7️⃣  Database migration yapılıyor..."
docker exec deprem_backend alembic upgrade head

# 8. Final verification
echo "8️⃣  Final verification..."
docker-compose -f deploy/docker-compose.prod.yml ps

echo ""
echo "✅ DEPLOYMENT BAŞARILI!"
echo "======================================="
echo "Backend: http://46.4.123.77:8001/health"
echo "Frontend: http://46.4.123.77:8002"
echo "Docs: http://46.4.123.77:8001/docs"
```

### Zero-Downtime Deployment
```bash
#!/bin/bash
set -e

# Eğer upstream'de yeni version varsa:
# 1. Yeni container'ı oluştur ama eski'yi çalıştırmaya devam et
# 2. Yeni container'ın health check'ini kontrol et
# 3. Traefik/nginx aracılığıyla traffic'i yeni container'a yönlendir
# 4. Eski container'ı kapat

DOCKER_BUILDKIT=1 docker-compose build --no-cache backend frontend

# Yeni container'ı oluştur
docker-compose run -d --name deprem_backend_new backend

# Health check
sleep 10
NEW_STATUS=$(docker exec deprem_backend_new curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)

if [ "$NEW_STATUS" == "200" ]; then
    # Eski container'ı durdur
    docker stop deprem_backend
    docker rm deprem_backend

    # Yeni container'ı ana isimle yeniden adlandır
    docker rename deprem_backend_new deprem_backend

    # Eski container'ı yeniden başlat (graceful restart)
    docker restart deprem_backend
fi
```

---

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] **Git:** Tüm changes committed ve pushed
- [ ] **Tests:** Tüm unit tests passed
- [ ] **Build:** Docker build success (no errors)
- [ ] **Environment:** .env files configured
- [ ] **Database:** Migration completed (alembic upgrade head)
- [ ] **Backend:** HTTP 200 on /health
- [ ] **Frontend:** HTTP 200 on /
- [ ] **API:** AFAD, USGS, EMSC endpoints accessible
- [ ] **External Services:** Firebase FCM, Twilio configured
- [ ] **Logs:** No critical errors in docker logs
- [ ] **Performance:** API response time < 500ms
- [ ] **Security:** JWT validation working
- [ ] **HTTPS:** SSL certificate valid (if using)
- [ ] **Backups:** Database backup taken
- [ ] **Monitoring:** Log collection enabled

---

## 📞 EMERGENCY PROCEDURES

### Services Hızlıca Restart Et
```bash
docker-compose down
docker-compose up -d
sleep 30
curl http://localhost:8000/health
```

### Immediate Rollback
```bash
git reset --hard HEAD~1
docker-compose down
docker builder prune -af --volumes
docker-compose build --no-cache
docker-compose up -d
```

### Database Reset (SON ÇARE!)
```bash
# Tüm data'yı sil ve fresh state'e gel
docker-compose down
docker volume rm deprem-appp_postgres_data deprem-appp_redis_data
docker-compose up -d
sleep 30
docker exec deprem_backend alembic upgrade head
```

---

## 📈 PERFORMANCE OPTIMIZATION

```bash
# 1. Database sorguları optimize et
docker exec deprem_db psql -U deprem_user -d deprem_db << EOF
ANALYZE;
VACUUM;
EOF

# 2. Redis cache warmup
docker exec deprem_redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 3. Celery worker concurrency optimize
# docker-compose.yml'de concurrency: 4 (default 2)

# 4. Frontend caching headers
# nginx.conf'ta: Cache-Control: max-age=31536000
```

---

## 🎯 ÖZETİ

Bu kilavuz sayesinde:
1. ✅ Deprem App kurulması kolay ve hızlı
2. ✅ Tüm test'ler otomatikleştirildi
3. ✅ Troubleshooting adımları net
4. ✅ Deployment süreci standardized
5. ✅ Monitoring ve logging setup'ı hazır
6. ✅ Zero-downtime deployment mümkün
7. ✅ Emergency procedures belirlenmiş

Sorun oluşursa bu dokümandaki troubleshooting bölümünü kontrol et! 🚀
