#!/bin/bash

echo "========================================="
echo "DEPREM APP - SİSTEM KONTROL RAPORU"
echo "========================================="
echo ""

echo "--- DOCKER CONTAINER DURUMLARI ---"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker erişim hatası"
echo ""

echo "--- BACKEND HEALTH CHECK ---"
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null)
echo "Backend /health HTTP Status: $BACKEND_RESPONSE"

BACKEND_BODY=$(curl -s http://localhost:8000/health 2>/dev/null)
echo "Backend /health Response Body: $BACKEND_BODY"
echo ""

echo "--- BACKEND ROOT ENDPOINT ---"
BACKEND_ROOT=$(curl -s http://localhost:8000/ 2>/dev/null)
echo "Backend / Response: $BACKEND_ROOT"
echo ""

echo "--- BACKEND API DOCS ---"
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs 2>/dev/null)
echo "Backend /docs HTTP Status: $DOCS_STATUS"
echo ""

echo "--- BACKEND DEPREM ENDPOINTLERİ ---"
EARTHQUAKES=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/earthquakes 2>/dev/null)
echo "GET /api/earthquakes HTTP Status: $EARTHQUAKES"

EARTHQUAKES_BODY=$(curl -s http://localhost:8000/api/earthquakes 2>/dev/null | head -c 500)
echo "GET /api/earthquakes Response (ilk 500 char): $EARTHQUAKES_BODY"
echo ""

echo "--- FRONTEND DURUM ---"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)
echo "Frontend HTTP Status: $FRONTEND_STATUS"
echo ""

echo "--- FIREBASE BAĞLANTI KONTROL ---"
echo "Firebase env değişkenleri backend container içinde:"
docker exec $(docker ps --filter "name=backend" --format "{{.Names}}" | head -1) env 2>/dev/null | grep -i "FIREBASE\|GOOGLE\|PROJECT" || echo "Backend container bulunamadı veya env okunamadı"
echo ""

echo "--- FIREBASE FRONTEND ENV ---"
if [ -f /opt/deprem-appp/deploy/frontend/.env ]; then
  echo "Frontend .env dosyası bulundu:"
  grep -i "FIREBASE\|REACT_APP" /opt/deprem-appp/deploy/frontend/.env | sed 's/=.*/=***GIZLI***/'
elif [ -f /opt/deprem-appp/deploy/.env ]; then
  echo "Root .env dosyası bulundu:"
  grep -i "FIREBASE\|REACT_APP" /opt/deprem-appp/deploy/.env | sed 's/=.*/=***GIZLI***/'
else
  echo ".env dosyası bulunamadı, kontrol edilen yerler: frontend/.env ve .env"
fi
echo ""

echo "--- FIREBASE BACKEND KONFIG DOSYASI ---"
if [ -f /opt/deprem-appp/deploy/backend/firebase_config.json ]; then
  echo "firebase_config.json MEVCUT"
  python3 -c "import json; d=json.load(open('/opt/deprem-appp/deploy/backend/firebase_config.json')); print('project_id:', d.get('project_id','YOK')); print('client_email:', d.get('client_email','YOK'))" 2>/dev/null
elif [ -f /opt/deprem-appp/deploy/backend/serviceAccountKey.json ]; then
  echo "serviceAccountKey.json MEVCUT"
  python3 -c "import json; d=json.load(open('/opt/deprem-appp/deploy/backend/serviceAccountKey.json')); print('project_id:', d.get('project_id','YOK')); print('client_email:', d.get('client_email','YOK'))" 2>/dev/null
else
  echo "Firebase servis hesabı JSON dosyası bulunamadı"
fi
echo ""

echo "--- BACKEND LOG (son 30 satır) ---"
BACKEND_CONTAINER=$(docker ps --filter "name=backend" --format "{{.Names}}" | head -1)
if [ -n "$BACKEND_CONTAINER" ]; then
  docker logs --tail=30 $BACKEND_CONTAINER 2>&1
else
  echo "Backend container çalışmıyor"
fi
echo ""

echo "--- FRONTEND LOG (son 20 satır) ---"
FRONTEND_CONTAINER=$(docker ps --filter "name=frontend" --format "{{.Names}}" | head -1)
if [ -n "$FRONTEND_CONTAINER" ]; then
  docker logs --tail=20 $FRONTEND_CONTAINER 2>&1
else
  echo "Frontend container çalışmıyor"
fi
echo ""

echo "--- NETWORK DURUMU ---"
docker network ls 2>/dev/null
echo ""

echo "--- PORT DURUMU ---"
ss -tlnp | grep -E "3000|8000|5432|6379" 2>/dev/null || netstat -tlnp 2>/dev/null | grep -E "3000|8000|5432|6379"
echo ""

echo "========================================="
echo "KONTROL TAMAMLANDI"
echo "========================================="