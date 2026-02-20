---
description: Deprem App VPS deploy (git push + SSH + docker compose)
---

# Deprem App Deploy Workflow

## Ön Koşullar
- VPS IP: `46.4.123.77`
- VPS'de repo: `/opt/deprem-app`
- VPS'de `docker compose` (V2 plugin) kurulu

---

## Adım 1 — Değişiklikleri Push Et (Yerel bilgisayardan)

PowerShell veya terminal'de:

```bash
cd C:\Users\win10\Desktop\DEPREMAPP
git add -A
git commit -m "feat: <kısa açıklama>"
git push origin main
```

---

## Adım 2 — VPS'e SSH ile Bağlan

```bash
ssh root@46.4.123.77
```

---

## Adım 3 — VPS'te Deploy Et

// turbo
```bash
cd /opt/deprem-app && git pull origin main && cd deploy && docker compose -f docker-compose.prod.yml up -d --build
```

---

## Adım 4 — Kontrol

```bash
docker compose -f /opt/deprem-app/deploy/docker-compose.prod.yml ps
curl http://localhost:8000/health
```

Beklenen yanıt: `{"status":"ok","version":"1.0.0"}`

---

## İlk Kurulum (Repo VPS'de yoksa)

```bash
git clone https://github.com/bendedo13/deprem-appp.git /opt/deprem-app
cd /opt/deprem-app
cp .env.example deploy/.env
nano deploy/.env   # DB_PASSWORD, SECRET_KEY vb. doldur
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Rollback (Son sürüme geri dön)

```bash
cd /opt/deprem-app
git log --oneline -5           # Commit listesi
git checkout <commit-hash>     # İstenen versiyona geç
cd deploy && docker compose -f docker-compose.prod.yml up -d --build
```

---

## Not

- `docker-compose` (tire, V1) kurulu değilse: `apt install docker-compose-v2`
- Migration otomatik çalışır (`migrate_db` servisi `alembic upgrade head` yapar)
