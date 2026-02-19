# 🚀 Deploy Rehberi — Hetzner VPS

## 1. VPS Hazırlığı

```bash
# Hetzner Console'dan CX21 (2 vCPU, 4GB RAM) seç
# İşletim sistemi: Ubuntu 22.04

# İlk bağlantı
ssh root@SERVER_IP

# Sistem güncelle
apt update && apt upgrade -y

# Gerekli araçlar
apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx ufw git

# Docker'ı başlat
systemctl enable docker && systemctl start docker
```

## 2. Firewall Ayarları

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 3. Uygulamayı Deploy Et

```bash
# Repo klonla
git clone https://github.com/KULLANICI/deprem-app.git /opt/deprem-app
cd /opt/deprem-app

# Environment dosyasını hazırla
cp .env.example .env
nano .env  # Tüm değerleri doldur

# Production Docker başlat
docker-compose -f docker/docker-compose.yml up -d

# Migration
docker exec deprem_backend alembic upgrade head

# Logları kontrol et
docker-compose logs -f
```

## 4. Nginx + SSL

```nginx
# /etc/nginx/sites-available/depremapp.com
server {
    server_name depremapp.com www.depremapp.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;  # 24 saat WS canlı tut
    }
}
```

```bash
# SSL sertifikası al
certbot --nginx -d depremapp.com -d www.depremapp.com

# Nginx başlat
systemctl enable nginx && systemctl start nginx
```

## 5. CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: root
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/deprem-app
            git pull
            docker-compose -f docker/docker-compose.yml up -d --build
```

## 6. Monitoring

```bash
# Prometheus + Grafana
docker run -d -p 9090:9090 prom/prometheus
docker run -d -p 3000:3000 grafana/grafana

# Basit uptime monitoring (UptimeRobot — ücretsiz)
# https://uptimerobot.com → Monitor → depremapp.com
```

## Sunucu Gereksinimleri

| Plan | CPU | RAM | Aylık Maliyet | Kapasite |
|------|-----|-----|--------------|---------|
| CX21 | 2 vCPU | 4 GB | ~€5.77 | 10K kullanıcı |
| CX31 | 2 vCPU | 8 GB | ~€11.09 | 50K kullanıcı |
| CX41 | 4 vCPU | 16 GB | ~€21.85 | 200K kullanıcı |

Başlangıç için CX21 yeterli. Büyük depremde trafik spike'ında anında CX41'e ölçekle.
