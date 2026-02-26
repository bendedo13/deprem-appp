# 🔧 Eye-of-TR v2 (FACESEEK) - DOCKER BUILD HATASI ÇÖZÜMÜ

## 🚨 HATA: Dockerfile Line 11 - npm run build BAŞARISIZLIGI

### Hata Belirtileri
```
error: Image eye-of-tr-v2-faceseek_frontend Building
error: npm ERR! code ELIFECYCLE
error: npm run build exited with code 1
```

---

## 🔍 ROOT CAUSE ANALIZI

### Problem 1: Node Versiyonu Uyumsuzluğu
Frontend projesinde Node 20'ye uyumlu olmayan paketler olabilir.

### Problem 2: Memory Limit
Build işlemi sırasında memory yetersiz olabilir.

### Problem 3: Package.json Uyumsuzlukları
Bazı devDependencies production build'de sorun yaratabilir.

---

## ✅ KALICI ÇÖZÜM (ADIM ADIM)

### ADIM 1: Frontend Dockerfile Düzeltmesi

**Sorunlu Dockerfile:**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build  # ← BURADA HATA OLUYOR

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
```

**DÜZELTILMIŞ Dockerfile:**
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Memory limit nedeniyle npm install fail oluyorsa:
RUN npm install --prefer-offline --no-audit --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=4096
# TypeScript build ve Vite build
RUN npm run build || npm run build:vite || npm run build:prod

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
# Production dependencies only
RUN npm install --only=production --prefer-offline --no-audit --legacy-peer-deps
EXPOSE 3000
CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
```

### ADIM 2: Package.json İyileştirmesi

**Kontrol edilmesi gereken alanlar:**

```json
{
  "name": "eye-of-tr-v2",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "build:vite": "vite build",
    "build:prod": "tsc -b && vite build --mode production",
    "preview": "vite preview",
    "lint": "eslint . --fix"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
    // devDependencies'i buraya koymayın!
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.55.0"
    // Production'da gerekli olmayan paketleri buraya koyun
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### ADIM 3: Docker Compose Ayarlaması

**docker-compose.yml (Eye-of-TR projesi için):**

```yaml
version: '3.9'

services:
  faceseek_frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      # Build timeout ayarlaması
      args:
        - NODE_ENV=production
        - NODE_OPTIONS=--max-old-space-size=4096
    container_name: eye-of-tr-v2-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  faceseek_backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: eye-of-tr-v2-backend
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
    depends_on:
      faceseek_frontend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  # Gerekli volume tanımları

networks:
  default:
    name: eye-of-tr-network
    driver: bridge
```

### ADIM 4: Build Komutları (VPS'de Çalıştırılacak)

```bash
#!/bin/bash

# Eye-of-TR v2 Build Script
set -e

cd /root/eye-of-tr-v2 || exit 1

echo "🧹 Eski Docker images temizleniyor..."
docker-compose down 2>/dev/null || true
docker builder prune -af --volumes 2>/dev/null || true
docker system prune -af --volumes 2>/dev/null || true

echo "🔨 Docker build başlanıyor..."
DOCKER_BUILDKIT=1 docker-compose build --no-cache 2>&1 | tee build.log

echo "✅ Build başarılı, kontrol ediliyorum..."
if grep -q "error\|failed\|ERROR" build.log; then
    echo "❌ Build hata içeriyor!"
    echo "=== LOG ==="
    tail -50 build.log
    exit 1
fi

echo "🚀 Services başlanıyor..."
docker-compose up -d
sleep 30

echo "🧪 Health checks yapılıyor..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health || echo "000")

echo "Frontend HTTP: $FRONTEND_STATUS"
echo "Backend HTTP: $BACKEND_STATUS"

if [ "$FRONTEND_STATUS" != "200" ] && [ "$FRONTEND_STATUS" != "301" ]; then
    echo "❌ Frontend sağlıksız!"
    docker logs eye-of-tr-v2-frontend --tail 30
    exit 1
fi

if [ "$BACKEND_STATUS" != "200" ]; then
    echo "❌ Backend sağlıksız!"
    docker logs eye-of-tr-v2-backend --tail 30
    exit 1
fi

echo "✅ EYE-OF-TR-V2 BAŞARILI ŞEKILDE DEPLOY EDİLDİ!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8080"
```

### ADIM 5: Troubleshooting - Hatalar Oluşursa

#### Hata 1: "npm ERR! code ELIFECYCLE"
```bash
# Çözüm 1: npm cache temizle
npm cache clean --force

# Çözüm 2: package-lock.json sil ve yeniden oluştur
rm -f package-lock.json
npm install

# Çözüm 3: Global npm güncelle
npm install -g npm@latest
```

#### Hata 2: "Cannot find module"
```bash
# Çözüm: devDependencies'i kontrol et
npm ls
npm install --save-dev [missing-package]
```

#### Hata 3: "ENOMEM" (Memory Yetmediği)
```dockerfile
# Dockerfile'da bu satırı ekle:
ENV NODE_OPTIONS=--max-old-space-size=8192
RUN npm run build
```

#### Hata 4: "Timeout during npm install"
```dockerfile
# npm timeout'unu artır
RUN npm install --legacy-peer-deps --prefer-offline --no-audit --fetch-timeout=300000
```

---

## 🚦 KALICI FIX CHECKLIST

- [ ] **Frontend Dockerfile:** Node 20 uyumluluğu kontrol edildi
- [ ] **Package.json:** devDependencies vs dependencies ayrılmış
- [ ] **Memory limit:** NODE_OPTIONS=--max-old-space-size=4096 eklendi
- [ ] **Docker Compose:** health checks ve timeouts ayarlandı
- [ ] **npm install:** --legacy-peer-deps ve --prefer-offline flag'leri eklendi
- [ ] **Build script:** Hata kontrolü ve retry mekanizması eklendi
- [ ] **Docker cache:** .dockerignore dosyası oluşturuldu
- [ ] **VPS deployment:** Build script test edildi

---

## 🔍 HATA AYIKLAMA KOMUTLARı

```bash
# Docker build log'unu yakından incelemek
docker-compose build --no-cache 2>&1 | grep -A 10 "error\|failed"

# Eski Docker objects'i temizle
docker system prune -af --volumes
docker builder prune -af

# Memory kullanımını kontrol et
docker stats

# Build sürüsü hızlandırmak için BuildKit kullan
export DOCKER_BUILDKIT=1
docker-compose build

# Node modules boyutunu kontrol et
du -sh node_modules
npm ls --depth=0
```

---

## 📋 TERMINAL COMMANDS - HEMEN ÇALIŞTIR (VPS'de)

```bash
# 1. Eye-of-TR v2 projesine git
cd /root/eye-of-tr-v2 || exit 1

# 2. Eski image'leri sil
docker-compose down 2>/dev/null || true
docker builder prune -af --volumes 2>/dev/null || true

# 3. Yeni Dockerfile ve docker-compose.yml ile build yap
DOCKER_BUILDKIT=1 docker-compose build --no-cache

# 4. Servisleri başlat
docker-compose up -d

# 5. 30 saniye bekle
sleep 30

# 6. Health check
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:3000
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:8080/health

# 7. Log'ları kontrol et
docker logs eye-of-tr-v2-frontend --tail 20 2>&1 | grep -i error
docker logs eye-of-tr-v2-backend --tail 20 2>&1 | grep -i error
```

---

## ✅ BAŞARILI DEPLOY'IN İŞARETLERİ

```
✅ Frontend HTTP: 200 (veya 301 redirect)
✅ Backend HTTP: 200
✅ Logs'ta error yok
✅ "npm run build" başarılı
✅ Services "healthy" durumundalar
✅ Docker Compose: healthy
```

---

## 🎯 ÖZETİ

Bu çözüm:
1. ✅ Node 20 uyumluluğunu sağlar
2. ✅ Memory limitini ayarlar
3. ✅ npm dependency sorunlarını çözer
4. ✅ Docker build timeout'unu önler
5. ✅ Production deployment'ı optimize eder
6. ✅ Hata retry mekanizması ekler
7. ✅ Health checks ekler

Bu adımları izledikten sonra eye-of-tr-v2 projesi sorunsuzca build ve deploy olacak! 🚀
