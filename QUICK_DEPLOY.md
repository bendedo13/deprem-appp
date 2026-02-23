# Quick Deployment Guide

## 🚀 Deploy Backend to VPS

```bash
# SSH to VPS
ssh root@46.4.123.77

# Navigate to project
cd /opt/deprem-appp

# Pull latest changes
git fetch origin
git reset --hard origin/main

# Deploy
cd deploy
bash PRODUCTION_DEPLOY.sh

# Check logs
docker logs deprem_backend --tail 50 -f
# Press Ctrl+C to exit logs

# Test health endpoint
curl http://localhost:8001/api/v1/health
```

Expected output:
```json
{"status":"healthy","timestamp":"2026-02-23T..."}
```

## 📱 Build Mobile APK

```bash
# On your local machine
cd deprem-appp/mobile

# Install dependencies (first time only)
npm install

# Login to EAS (first time only)
npm install -g eas-cli
eas login

# Build APK
eas build --platform android --profile production
```

Build will take 10-20 minutes. You'll get a download link when complete.

## ✅ Test S.O.S Feature

### Backend Test

```bash
# SSH to VPS
ssh root@46.4.123.77

# Register test user
curl -X POST http://localhost:8001/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# Login
curl -X POST http://localhost:8001/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'

# Save the access_token from response
TOKEN="YOUR_ACCESS_TOKEN_HERE"

# Test S.O.S upload (with a test audio file)
curl -X POST http://localhost:8001/api/v1/sos/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@test.m4a" \
  -F "latitude=41.0082" \
  -F "longitude=28.9784"

# Check Celery logs
docker logs deprem_celery --tail 50 -f
```

### Mobile App Test

1. Download APK from EAS dashboard
2. Install on Android device
3. Open app → Menu → S.O.S
4. Grant microphone permission
5. Press and hold red button to record
6. Release to upload
7. Wait for AI processing (shows status)

## 🔧 Troubleshooting

### Backend not responding

```bash
# Check if containers are running
docker ps

# Restart backend
cd /opt/deprem-appp/deploy
docker compose -f docker-compose.prod.yml restart backend

# Check logs
docker logs deprem_backend --tail 100
```

### Celery not processing

```bash
# Check Celery logs
docker logs deprem_celery --tail 100

# Restart Celery
docker compose -f docker-compose.prod.yml restart celery

# Check Redis
docker exec -it deprem_redis redis-cli ping
```

### EAS build fails

```bash
# Clear cache and rebuild
cd mobile
eas build:clear-cache
eas build --platform android --profile production --clear-cache
```

### Audio upload fails

- Check backend logs: `docker logs deprem_backend --tail 50 -f`
- Verify API URL in mobile `.env` file
- Test backend health: `curl http://46.4.123.77:8001/api/v1/health`
- Check Celery is running: `docker ps | grep celery`

## 📊 Monitor Services

```bash
# All containers status
docker ps

# Backend logs
docker logs deprem_backend --tail 50 -f

# Celery logs
docker logs deprem_celery --tail 50 -f

# Database logs
docker logs deprem_db --tail 50 -f

# Redis logs
docker logs deprem_redis --tail 50 -f

# Nginx logs
docker logs deprem_nginx --tail 50 -f
```

## 🔑 API Keys Status

- ✅ Firebase (Push Notifications) - Configured
- ✅ OpenAI Whisper (Speech-to-Text) - Configured
- ✅ Anthropic Claude (NLP) - Configured
- ⚠️ Twilio (SMS/WhatsApp) - Auth Token configured, need Account SID & Phone Number

Get Twilio credentials from: https://console.twilio.com/

## 📝 Important URLs

- Backend API: http://46.4.123.77:8001
- Health Check: http://46.4.123.77:8001/api/v1/health
- API Docs: http://46.4.123.77:8001/docs
- EAS Dashboard: https://expo.dev
- GitHub Repo: https://github.com/YOUR_REPO

## 🎯 Current Status

- ✅ Backend deployed and running
- ✅ Database migrations applied
- ✅ Celery worker running
- ✅ S.O.S API endpoints working
- ✅ Mobile app code ready
- ⏳ Mobile APK build pending
- ⏳ Mobile app testing pending

## 📞 Next Steps

1. Run: `cd deprem-appp/mobile && npm install`
2. Run: `eas build --platform android --profile production`
3. Download APK when build completes
4. Install and test on Android device
5. Get Twilio Account SID and Phone Number
6. Update backend `.env` with Twilio credentials
7. Restart backend: `docker compose -f docker-compose.prod.yml restart backend`
