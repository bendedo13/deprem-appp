#!/bin/bash

REPORT_FILE="/opt/deprem-appp/deploy/test_report_$(date +%Y%m%d_%H%M%S).txt"
FRONTEND_DIR="/opt/deprem-appp/deploy/frontend"
BACKEND_DIR="/opt/deprem-appp/deploy/backend"
BASE_URL="http://localhost"
API_URL="http://localhost:8000"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

log() {
    echo -e "$1" | tee -a "$REPORT_FILE"
}

check() {
    local desc="$1"
    local result="$2"
    if [ "$result" == "OK" ]; then
        log "${GREEN}[PASS]${NC} $desc"
        ((PASS++))
    elif [ "$result" == "WARN" ]; then
        log "${YELLOW}[WARN]${NC} $desc"
        ((WARN++))
    else
        log "${RED}[FAIL]${NC} $desc → $result"
        ((FAIL++))
    fi
}

log ""
log "========================================================"
log "   DEPREM UYGULAMASI - TAM SİSTEM TEST RAPORU"
log "   Tarih: $(date '+%d/%m/%Y %H:%M:%S')"
log "========================================================"
log ""

# ─────────────────────────────────────────────
log "${BLUE}[1] DOCKER KONTEYNER DURUM TESTLERİ${NC}"
log "────────────────────────────────────────"

CONTAINERS=$(docker ps --format "{{.Names}}" 2>/dev/null)
if [ -z "$CONTAINERS" ]; then
    check "Docker daemon erişimi" "Docker erişilemiyor"
else
    check "Docker daemon erişimi" "OK"
fi

for svc in frontend backend db redis nginx; do
    STATUS=$(docker ps --filter "name=$svc" --format "{{.Status}}" 2>/dev/null | head -1)
    if echo "$STATUS" | grep -q "Up"; then
        check "Konteyner: $svc ($STATUS)" "OK"
    elif [ -z "$STATUS" ]; then
        check "Konteyner: $svc" "Konteyner bulunamadı"
    else
        check "Konteyner: $svc ($STATUS)" "Çalışmıyor"
    fi
done

log ""
log "${BLUE}[2] AĞ VE PORT TESTLERİ${NC}"
log "────────────────────────────────────────"

declare -A PORTS=(
    ["Frontend:3000"]="3000"
    ["Backend API:8000"]="8000"
    ["PostgreSQL:5432"]="5432"
    ["Redis:6379"]="6379"
    ["Nginx:80"]="80"
    ["Nginx HTTPS:443"]="443"
)

for name in "${!PORTS[@]}"; do
    PORT="${PORTS[$name]}"
    if timeout 3 bash -c "echo >/dev/tcp/localhost/$PORT" 2>/dev/null; then
        check "Port $PORT açık ($name)" "OK"
    else
        check "Port $PORT ($name)" "Kapalı veya erişilemiyor"
    fi
done

log ""
log "${BLUE}[3] BACKEND API TESTLERİ${NC}"
log "────────────────────────────────────────"

check_api() {
    local desc="$1"
    local url="$2"
    local expected_code="$3"
    local extra_check="$4"

    RESPONSE=$(curl -s -o /tmp/api_resp.json -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" 2>/dev/null)
    BODY=$(cat /tmp/api_resp.json 2>/dev/null)

    if [ "$RESPONSE" == "$expected_code" ]; then
        if [ -n "$extra_check" ]; then
            if echo "$BODY" | grep -q "$extra_check"; then
                check "$desc [HTTP $RESPONSE, içerik OK]" "OK"
            else
                check "$desc [HTTP $RESPONSE, içerik eksik: $extra_check]" "WARN"
            fi
        else
            check "$desc [HTTP $RESPONSE]" "OK"
        fi
    else
        check "$desc [Beklenen: $expected_code, Gelen: $RESPONSE]" "HTTP $RESPONSE hatası"
    fi
}

check_api "GET /health" "$API_URL/health" "200" "status"
check_api "GET /api/v1/earthquakes" "$API_URL/api/v1/earthquakes" "200" ""
check_api "GET /api/v1/earthquakes?limit=5" "$API_URL/api/v1/earthquakes?limit=5" "200" ""
check_api "GET /api/v1/earthquakes/latest" "$API_URL/api/v1/earthquakes/latest" "200" ""
check_api "GET /api/v1/stats" "$API_URL/api/v1/stats" "200" ""
check_api "GET /api/v1/alerts" "$API_URL/api/v1/alerts" "200" ""
check_api "GET /docs (Swagger)" "$API_URL/docs" "200" "swagger"
check_api "GET /redoc" "$API_URL/redoc" "200" ""
check_api "GET geçersiz endpoint 404" "$API_URL/api/v1/gecersiz_endpoint_xyz" "404" ""

log ""
log "${BLUE}[4] BACKEND VERİ DOĞRULAMA TESTLERİ${NC}"
log "────────────────────────────────────────"

EQ_RESPONSE=$(curl -s --connect-timeout 5 --max-time 10 "$API_URL/api/v1/earthquakes?limit=1" 2>/dev/null)

if [ -n "$EQ_RESPONSE" ]; then
    for field in "magnitude" "location" "depth" "timestamp" "latitude" "longitude"; do
        if echo "$EQ_RESPONSE" | grep -q "\"$field\""; then
            check "Deprem verisi '$field' alanı mevcut" "OK"
        else
            check "Deprem verisi '$field' alanı eksik" "WARN"
        fi
    done

    MAG=$(echo "$EQ_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); items=d.get('data',d) if isinstance(d,dict) else d; print(items[0].get('magnitude','N/A') if items else 'BOŞ')" 2>/dev/null)
    check "Magnitude değeri okunabilir: $MAG" "OK"
else
    check "Deprem verisi alınamadı" "API yanıt vermiyor"
fi

log ""
log "${BLUE}[5] VERİTABANI TESTLERİ${NC}"
log "────────────────────────────────────────"

DB_CONTAINER=$(docker ps --filter "name=db" --format "{{.Names}}" 2>/dev/null | head -1)
if [ -n "$DB_CONTAINER" ]; then
    DB_CONN=$(docker exec "$DB_CONTAINER" pg_isready 2>/dev/null)
    if echo "$DB_CONN" | grep -q "accepting"; then
        check "PostgreSQL bağlantısı" "OK"
    else
        check "PostgreSQL bağlantısı" "Bağlantı reddedildi"
    fi

    TABLE_LIST=$(docker exec "$DB_CONTAINER" psql -U postgres -c "\dt" 2>/dev/null)
    if [ -n "$TABLE_LIST" ]; then
        check "Veritabanı tabloları listelendi" "OK"
        for table in "earthquakes" "alerts" "users"; do
            if echo "$TABLE_LIST" | grep -q "$table"; then
                check "Tablo mevcut: $table" "OK"
            else
                check "Tablo eksik: $table" "WARN"
            fi
        done
    else
        check "Tablo listesi alınamadı" "WARN"
    fi

    ROW_COUNT=$(docker exec "$DB_CONTAINER" psql -U postgres -c "SELECT COUNT(*) FROM earthquakes;" 2>/dev/null | grep -E "^\s+[0-9]" | tr -d ' ')
    if [ -n "$ROW_COUNT" ]; then
        check "Deprem kayıt sayısı: $ROW_COUNT" "OK"
    else
        check "Deprem kayıt sayısı alınamadı" "WARN"
    fi
else
    check "Veritabanı konteyneri" "Bulunamadı"
fi

log ""
log "${BLUE}[6] REDIS TESTLERİ${NC}"
log "────────────────────────────────────────"

REDIS_CONTAINER=$(docker ps --filter "name=redis" --format "{{.Names}}" 2>/dev/null | head -1)
if [ -n "$REDIS_CONTAINER" ]; then
    REDIS_PING=$(docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null)
    if [ "$REDIS_PING" == "PONG" ]; then
        check "Redis PING → PONG" "OK"
    else
        check "Redis PING başarısız: $REDIS_PING" "Redis yanıt vermiyor"
    fi

    REDIS_INFO=$(docker exec "$REDIS_CONTAINER" redis-cli info server 2>/dev/null | grep "redis_version")
    check "Redis versiyon: $REDIS_INFO" "OK"

    REDIS_MEM=$(docker exec "$REDIS_CONTAINER" redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r')
    check "Redis bellek kullanımı: $REDIS_MEM" "OK"
else
    check "Redis konteyneri" "Bulunamadı"
fi

log ""
log "${BLUE}[7] FRONTEND TESTLERİ${NC}"
log "────────────────────────────────────────"

FE_RESPONSE=$(curl -s -o /tmp/fe_resp.html -w "%{http_code}" --connect-timeout 5 --max-time 10 "$BASE_URL" 2>/dev/null)
if [ "$FE_RESPONSE" == "200" ]; then
    check "Frontend ana sayfa HTTP 200" "OK"
    FE_BODY=$(cat /tmp/fe_resp.html)
    for keyword in "react" "root" "bundle" "app" "deprem" "earthquake"; do
        if echo "$FE_BODY" | grep -iq "$keyword"; then
            check "Frontend içerik '$keyword' bulundu" "OK"
            break
        fi
    done
else
    check "Frontend ana sayfa [HTTP $FE_RESPONSE]" "Erişilemiyor"
fi

for path in "/map" "/list" "/alerts" "/stats" "/about"; do
    ROUTE_RESP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 8 "$BASE_URL$path" 2>/dev/null)
    if [ "$ROUTE_RESP" == "200" ]; then
        check "Frontend route $path" "OK"
    else
        check "Frontend route $path [HTTP $ROUTE_RESP]" "WARN"
    fi
done

log ""
log "${BLUE}[8] NGINX / PROXY TESTLERİ${NC}"
log "────────────────────────────────────────"

NGINX_CONTAINER=$(docker ps --filter "name=nginx" --format "{{.Names}}" 2>/dev/null | head -1)
if [ -n "$NGINX_CONTAINER" ]; then
    NGINX_TEST=$(docker exec "$NGINX_CONTAINER" nginx -t 2>&1)
    if echo "$NGINX_TEST" | grep -q "successful"; then
        check "Nginx konfigürasyonu geçerli" "OK"
    else
        check "Nginx konfigürasyonu hatalı" "$NGINX_TEST"
    fi
else
    check "Nginx konteyneri" "WARN"
fi

PROXY_RESP=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$BASE_URL/api/v1/earthquakes" 2>/dev/null)
if [ "$PROXY_RESP" == "200" ]; then
    check "Nginx → Backend proxy yönlendirmesi" "OK"
else
    check "Nginx → Backend proxy [HTTP $PROXY_RESP]" "WARN"
fi

log ""
log "${BLUE}[9] PERFORMANS TESTLERİ${NC}"
log "────────────────────────────────────────"

API_TIME=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 5 --max-time 15 "$API_URL/api/v1/earthquakes" 2>/dev/null)
if [ -n "$API_TIME" ]; then
    API_MS=$(echo "$API_TIME * 1000" | bc 2>/dev/null | cut -d. -f1)
    if [ "${API_MS:-9999}" -lt 500 ]; then
        check "API yanıt süresi: ${API_MS}ms (< 500ms)" "OK"
    elif [ "${API_MS:-9999}" -lt 2000 ]; then
        check "API yanıt süresi: ${API_MS}ms (yavaş)" "WARN"
    else
        check "API yanıt süresi: ${API_MS}ms (çok yavaş)" "Performans sorunu"
    fi
fi

FE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --connect-timeout 5 --max-time 15 "$BASE_URL" 2>/dev/null)
if [ -n "$FE_TIME" ]; then
    FE_MS=$(echo "$FE_TIME * 1000" | bc 2>/dev/null | cut -d. -f1)
    if [ "${FE_MS:-9999}" -lt 1000 ]; then
        check "Frontend yanıt süresi: ${FE_MS}ms (< 1s)" "OK"
    else
        check "Frontend yanıt süresi: ${FE_MS}ms (yavaş)" "WARN"
    fi
fi

log ""
log "${BLUE}[10] KAYNAK KULLANIMI${NC}"
log "────────────────────────────────────────"

DOCKER_STATS=$(docker stats --no-stream --format "{{.Name}}\tCPU:{{.CPUPerc}}\tMEM:{{.MemUsage}}" 2>/dev/null)
if [ -n "$DOCKER_STATS" ]; then
    while IFS= read -r line; do
        log "  📊 $line"
    done <<< "$DOCKER_STATS"
    check "Docker kaynak istatistikleri alındı" "OK"
else
    check "Docker istatistikleri" "WARN"
fi

log ""
log "${BLUE}[11] LOG HATA TARAMASI${NC}"
log "────────────────────────────────────────"

for svc in frontend backend; do
    CONTAINER=$(docker ps --filter "name=$svc" --format "{{.Names}}" 2>/dev/null | head -1)
    if [ -n "$CONTAINER" ]; then
        ERROR_COUNT=$(docker logs --tail=100 "$CONTAINER"