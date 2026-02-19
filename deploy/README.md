# Deploy — VPS Kurulum

Bu klasör VPS üzerinde Deprem App'i **mevcut web sitenizle çakışmadan** çalıştırmak için kullanılır.

## Hızlı Başlangıç (VPS'te)

```bash
cd /opt/deprem-app/deploy
cp .env.example .env
nano .env   # DB_PASSWORD ve diğer değerleri ayarlayın
docker-compose -f docker-compose.prod.yml up -d
```

Erişim: `http://VPS_IP:8001`

Detaylı rehber: [VPS_KURULUM.md](./VPS_KURULUM.md)
