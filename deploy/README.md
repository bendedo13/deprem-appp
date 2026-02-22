# Deprem App Deployment

Production deployment için Docker Compose kullanılır.

## Hızlı Başlangıç

```bash
# VPS'te
cd /opt/deprem-appp/deploy
chmod +x deploy.sh
./deploy.sh
```

## Manuel Deployment

```bash
cd /opt/deprem-appp/deploy

# Container'ları başlat
docker compose -f docker-compose.prod.yml up -d

# Logları izle
docker compose -f docker-compose.prod.yml logs -f

# Container'ları durdur
docker compose -f docker-compose.prod.yml down
```

## Servisler

- **deprem_db**: PostgreSQL + TimescaleDB (port: internal 5432)
- **deprem_redis**: Redis (port: internal 6379)
- **deprem_backend**: FastAPI backend (port: 8001)
- **deprem_celery**: Celery worker
- **deprem_frontend**: React frontend (port: 8002)

## Environment Variables

`.env` dosyası oluştur:

```bash
DB_PASSWORD=your_secure_password_here
```

## Troubleshooting

### Backend çalışmıyor
```bash
docker logs deprem_backend
docker exec -it deprem_backend bash
```

### Database bağlantı hatası
```bash
docker exec -it deprem_db psql -U deprem_user -d deprem_db
```

### Migration hatası
```bash
docker exec deprem_backend alembic upgrade head
```

### Tüm servisleri yeniden başlat
```bash
docker compose -f docker-compose.prod.yml restart
```

### Container'ları temizle ve yeniden başlat
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```
