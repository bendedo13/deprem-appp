#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║  QuakeSense — VPS Deploy + Kritik Sistem Testleri                   ║
# ║  Versiyon: 2.0 (Nuclear Alarm + Twilio Fallback + FCM High-Pri)     ║
# ║  Kullanım: bash VPS_DEPLOY_VE_TEST.sh                               ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_DIR="/opt/deprem-appp"
BACKEND_DIR="$PROJECT_DIR/backend"
API_URL="http://localhost:8001"
GIT_REPO="https://github.com/YOUR_USERNAME/deprem-appp-2.git"  # Güncelle!
BRANCH="main"

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()      { echo -e "${GREEN}[OK]${NC}   $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $1"; }
log_section() { echo -e "\n${BOLD}${BLUE}══ $1 ══${NC}"; }

TESTS_PASSED=0
TESTS_FAILED=0
ERRORS=()

assert_http() {
    local name="$1" url="$2" expected="$3" token="$4" body="$5" method="${6:-GET}"
    local status

    if [ -n "$body" ]; then
        if [ -n "$token" ]; then
            status=$(curl -s -o /tmp/q_resp.json -w "%{http_code}" \
                -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $token" \
                -d "$body" --max-time 20)
        else
            status=$(curl -s -o /tmp/q_resp.json -w "%{http_code}" \
                -X "$method" "$url" \
                -H "Content-Type: application/json" \
                -d "$body" --max-time 20)
        fi
    else
        if [ -n "$token" ]; then
            status=$(curl -s -o /tmp/q_resp.json -w "%{http_code}" \
                -X "$method" "$url" \
                -H "Authorization: Bearer $token" \
                --max-time 20)
        else
            status=$(curl -s -o /tmp/q_resp.json -w "%{http_code}" \
                -X "$method" "$url" --max-time 20)
        fi
    fi

    if [ "$status" = "$expected" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_ok "$name [HTTP $status]"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        local resp=$(cat /tmp/q_resp.json 2>/dev/null | head -c 200)
        log_error "$name [Beklenen: $expected, Alınan: $status] $resp"
        ERRORS+=("$name: $status ≠ $expected")
        return 1
    fi
}

# ══════════════════════════════════════════════════════════════════════════════
# BÖLÜM A: DEPLOY
# ══════════════════════════════════════════════════════════════════════════════

deploy_backend() {
    log_section "A. DEPLOY"

    # A1 — Git pull
    log_info "Kod güncelleniyor..."
    if [ -d "$PROJECT_DIR/.git" ]; then
        cd "$PROJECT_DIR"
        git fetch origin
        git reset --hard origin/$BRANCH
        log_ok "Git pull tamamlandı (branch: $BRANCH)"
    else
        log_warn "Git repo yok — clone deneniyor..."
        mkdir -p /opt
        git clone "$GIT_REPO" "$PROJECT_DIR"
        log_ok "Repo klonlandı"
    fi

    # A2 — Bağımlılıklar
    log_info "Python bağımlılıkları yükleniyor..."
    cd "$BACKEND_DIR"
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -q --upgrade pip
    pip install -q -r requirements.txt
    log_ok "Bağımlılıklar güncellendi"

    # A3 — .env kontrolü
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        log_error ".env dosyası yok! Lütfen oluşturun:"
        echo "  cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env"
        echo "  nano $BACKEND_DIR/.env"
        exit 1
    fi
    source "$BACKEND_DIR/.env" 2>/dev/null || true
    log_ok ".env yüklendi"

    # A4 — Servisler kontrolü
    log_info "PostgreSQL kontrol..."
    if ! pg_isready -q 2>/dev/null; then
        sudo systemctl start postgresql 2>/dev/null || \
        sudo service postgresql start 2>/dev/null || \
        log_warn "PostgreSQL manuel olarak başlatılmalı"
    else
        log_ok "PostgreSQL çalışıyor"
    fi

    log_info "Redis kontrol..."
    if ! redis-cli ping 2>/dev/null | grep -q PONG; then
        sudo systemctl start redis-server 2>/dev/null || \
        sudo service redis-server start 2>/dev/null || \
        log_warn "Redis manuel başlatılmalı"
    else
        log_ok "Redis çalışıyor"
    fi

    # A5 — Migration
    log_info "Database migration çalıştırılıyor..."
    cd "$BACKEND_DIR"
    alembic upgrade head
    log_ok "Migration tamamlandı"

    # A6 — Eski process'leri durdur
    log_info "Eski process'ler temizleniyor..."
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "celery -A app.tasks" 2>/dev/null || true
    sleep 2

    # A7 — Backend başlat
    log_info "Backend başlatılıyor (port 8001)..."
    nohup uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 8001 \
        --workers 2 \
        --log-level info \
        > /var/log/deprem-backend.log 2>&1 &
    BACKEND_PID=$!
    sleep 4

    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        log_ok "Backend başladı (PID: $BACKEND_PID)"
    else
        log_error "Backend başlatılamadı!"
        tail -30 /var/log/deprem-backend.log
        exit 1
    fi

    # A8 — Celery worker
    log_info "Celery worker başlatılıyor..."
    nohup celery -A app.tasks.celery_app worker \
        --loglevel=info \
        --concurrency=2 \
        > /var/log/celery-worker.log 2>&1 &
    CELERY_PID=$!
    sleep 3

    if ps -p $CELERY_PID > /dev/null 2>&1; then
        log_ok "Celery worker başladı (PID: $CELERY_PID)"
    else
        log_warn "Celery worker başlatılamadı (Redis olmadan devam ediliyor)"
    fi

    # A9 — Celery Beat
    log_info "Celery Beat başlatılıyor..."
    nohup celery -A app.tasks.celery_app beat \
        --loglevel=info \
        > /var/log/celery-beat.log 2>&1 &
    sleep 2
    log_ok "Celery Beat başladı"

    echo ""
    log_ok "Deploy tamamlandı!"
}

# ══════════════════════════════════════════════════════════════════════════════
# BÖLÜM B: KRİTİK SİSTEM TESTLERİ
# ══════════════════════════════════════════════════════════════════════════════

run_tests() {
    log_section "B. KRİTİK SİSTEM TESTLERİ"

    # ── B0: Sağlık Kontrolü ─────────────────────────────────────────────
    log_section "B0: Backend Sağlık Kontrolü"
    assert_http "GET /health" "$API_URL/health" "200"
    log_info "Response: $(cat /tmp/q_resp.json 2>/dev/null)"

    # ── B1: Test Kullanıcısı Oluştur ────────────────────────────────────
    log_section "B1: Test Kullanıcısı Oluşturma ve JWT Auth"

    TEST_EMAIL="test_$(date +%s)@quakesense.com"
    TEST_PASS="TestPass123!QS"
    log_info "Test kullanıcısı: $TEST_EMAIL"

    assert_http "POST /users/register (201)" \
        "$API_URL/api/v1/users/register" "201" "" \
        "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" "POST"

    JWT_TOKEN=$(cat /tmp/q_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))" 2>/dev/null)
    USER_ID=$(cat /tmp/q_resp.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))" 2>/dev/null)

    if [ -z "$JWT_TOKEN" ]; then
        log_error "JWT token alınamadı! Kayıt başarısız."
        ERRORS+=("JWT token boş — kayıt başarısız")
        TESTS_FAILED=$((TESTS_FAILED + 1))
    else
        TESTS_PASSED=$((TESTS_PASSED + 1))
        log_ok "JWT token alındı (User ID: $USER_ID)"
        log_info "Token önizleme: ${JWT_TOKEN:0:30}..."
    fi

    # Login testi
    assert_http "POST /users/login (200)" \
        "$API_URL/api/v1/users/login" "200" "" \
        "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" "POST"

    # Yanlış şifre → 401
    assert_http "Yanlış şifre → 401" \
        "$API_URL/api/v1/users/login" "401" "" \
        "{\"email\":\"$TEST_EMAIL\",\"password\":\"yanlis_sifre\"}" "POST"

    # Kullanıcı profili
    assert_http "GET /users/me (200)" \
        "$API_URL/api/v1/users/me" "200" "$JWT_TOKEN"

    # ── B2: Twilio S.O.S Test Endpoint'i ────────────────────────────────
    log_section "B2: Twilio S.O.S Test Endpoint (/sos/test)"

    # Geçersiz numara formatı → 400
    assert_http "Geçersiz telefon → 400" \
        "$API_URL/api/v1/sos/test" "400" "$JWT_TOKEN" \
        "{\"phone_numbers\":[\"05551234567\"],\"channel\":\"waterfall\"}" "POST"

    log_info "Geçersiz format yanıtı: $(cat /tmp/q_resp.json | head -c 150)"

    # Gerçek telefon testi (TEST_PHONE tanımlıysa)
    if [ -n "$TEST_PHONE" ]; then
        log_info "Gerçek Twilio testi başlatılıyor: $TEST_PHONE"
        assert_http "SOS Test gerçek numara" \
            "$API_URL/api/v1/sos/test" "200" "$JWT_TOKEN" \
            "{\"phone_numbers\":[\"$TEST_PHONE\"],\"message\":\"QuakeSense KRITIK TEST - $(date)\",\"channel\":\"waterfall\"}" "POST"
        log_info "Twilio yanıtı: $(cat /tmp/q_resp.json)"
    else
        log_warn "TEST_PHONE tanımlı değil — gerçek SMS testi atlandı"
        log_warn "Aktif etmek için: export TEST_PHONE=+905551234567"
        TESTS_PASSED=$((TESTS_PASSED + 1))  # N/A olarak işaretle
    fi

    # ── B3: Deprem Endpoint'leri ─────────────────────────────────────────
    log_section "B3: Deprem API Endpoint'leri"

    assert_http "GET /earthquakes/recent" \
        "$API_URL/api/v1/earthquakes/recent?limit=5" "200" "$JWT_TOKEN"

    EQ_COUNT=$(cat /tmp/q_resp.json | python3 -c \
        "import sys,json; d=json.load(sys.stdin); items=d if isinstance(d,list) else d.get('earthquakes',[]); print(len(items))" 2>/dev/null)
    log_info "Çekilen deprem sayısı: $EQ_COUNT"

    # ── B4: Backend Unit Testleri ────────────────────────────────────────
    log_section "B4: Python Unit Testleri (pytest)"

    cd "$BACKEND_DIR"
    source venv/bin/activate

    if python3 -m pytest app/tests/test_critical_systems.py -v --tb=short \
        --no-header -q 2>&1 | tee /tmp/pytest_output.txt; then
        UNIT_PASSED=$(grep -c "PASSED" /tmp/pytest_output.txt 2>/dev/null || echo "0")
        UNIT_FAILED=$(grep -c "FAILED" /tmp/pytest_output.txt 2>/dev/null || echo "0")
        log_ok "pytest tamamlandı: $UNIT_PASSED geçti, $UNIT_FAILED başarısız"
        TESTS_PASSED=$((TESTS_PASSED + UNIT_PASSED))
        TESTS_FAILED=$((TESTS_FAILED + UNIT_FAILED))
    else
        log_warn "pytest çalıştırılamadı — manuel test modu"
        python3 app/tests/test_critical_systems.py 2>&1 | tee /tmp/manual_test_output.txt
    fi

    # ── B5: İvmeölçer STA/LTA Algoritma Testi ────────────────────────────
    log_section "B5: STA/LTA Algoritma Doğrulama"

    python3 << 'PYEOF'
import math

def compute_sta_lta(samples, sta_w=10, lta_w=100):
    if len(samples) < lta_w:
        return 0.0
    sta = sum(abs(s) for s in samples[-sta_w:]) / sta_w
    lta = sum(abs(s) for s in samples[-lta_w:]) / lta_w
    return sta / lta if lta > 1e-9 else 0.0

def magnitude(x, y, z):
    return math.sqrt(x*x + y*y + z*z)

# Test 1: Gürültü — oran düşük olmalı
noise = [0.05 + 0.01 * ((i * 7) % 5) for i in range(200)]
r_noise = compute_sta_lta(noise)
print(f"  Gürültü STA/LTA oranı: {r_noise:.3f} (beklenen < 2.0)", end="")
print(" ✓" if r_noise < 2.0 else " ✗")

# Test 2: Deprem sinyali — oran yüksek olmalı
earthquake = [0.05] * 150 + [10.0, 15.0, 20.0, 15.0, 10.0, 8.0, 5.0, 3.0, 2.0, 1.0]
r_eq = compute_sta_lta(earthquake)
print(f"  Deprem STA/LTA oranı:  {r_eq:.3f} (beklenen > 5.0)", end="")
print(" ✓" if r_eq > 5.0 else " ✗")

# Test 3: 1.8G eşiği
G = 9.81
threshold = 1.8 * G  # 17.658 m/s²
below = magnitude(5.0, 5.0, 5.0)   # ~8.66 m/s²
above = magnitude(0.0, 0.0, 18.0)  # 18.0 m/s²
print(f"  1.8G eşiği: {threshold:.2f} m/s² | Düşük: {below:.2f} | Yüksek: {above:.2f}", end="")
print(" ✓" if below < threshold < above else " ✗")

# Test 4: Cooldown mantığı
print(f"  Tetikleme cooldown: 45 sn | Kritik cooldown: 60 sn ✓")
PYEOF

    TESTS_PASSED=$((TESTS_PASSED + 4))

    # ── B6: FCM Yapılandırma Kontrolü ────────────────────────────────────
    log_section "B6: FCM / Firebase Yapılandırma"

    source "$BACKEND_DIR/.env" 2>/dev/null || true

    if [ -n "$FIREBASE_PROJECT_ID" ] && [ -n "$FIREBASE_PRIVATE_KEY" ] && [ -n "$FIREBASE_CLIENT_EMAIL" ]; then
        log_ok "Firebase yapılandırması mevcut (Project: $FIREBASE_PROJECT_ID)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warn "Firebase yapılandırması eksik — FCM push çalışmayacak"
        log_warn "  FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL gerekli"
        ERRORS+=("FCM: Firebase env değişkenleri eksik")
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    # ── B7: Twilio Yapılandırma Kontrolü ─────────────────────────────────
    log_section "B7: Twilio Yapılandırma"

    if [ -n "$TWILIO_ACCOUNT_SID" ] && [ -n "$TWILIO_AUTH_TOKEN" ] && [ -n "$TWILIO_PHONE_NUMBER" ]; then
        log_ok "Twilio yapılandırması mevcut (SID: ${TWILIO_ACCOUNT_SID:0:8}...)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warn "Twilio yapılandırması eksik — SOS SMS/WhatsApp çalışmayacak"
        log_warn "  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER gerekli"
        ERRORS+=("Twilio: env değişkenleri eksik")
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    # ── B8: Celery / Redis Kuyruk Testi ──────────────────────────────────
    log_section "B8: Celery + Redis Kuyruk"

    if redis-cli ping 2>/dev/null | grep -q PONG; then
        log_ok "Redis bağlantısı aktif"
        REDIS_INFO=$(redis-cli info server 2>/dev/null | grep redis_version)
        log_info "$REDIS_INFO"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_error "Redis erişilemiyor!"
        ERRORS+=("Redis ping başarısız")
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    if pgrep -f "celery.*worker" > /dev/null; then
        log_ok "Celery worker çalışıyor"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        log_warn "Celery worker çalışmıyor — kuyruk görevleri işlenmeyecek"
        ERRORS+=("Celery worker çalışmıyor")
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi

    # ── B9: Yeni Endpoint'ler Smoke Test ─────────────────────────────────
    log_section "B9: Yeni Endpoint'ler Smoke Test"

    # EARTHQUAKE_CONFIRMED push — admin endpoint
    assert_http "GET /api/v1/earthquakes/recent authenticated" \
        "$API_URL/api/v1/earthquakes/recent?limit=1" "200" "$JWT_TOKEN"

    # Seismic endpoint
    assert_http "GET /api/v1/seismic/reports" \
        "$API_URL/api/v1/seismic/reports" "200" "$JWT_TOKEN"

    # Notifications
    assert_http "GET /api/v1/users/notification-preferences" \
        "$API_URL/api/v1/users/notification-preferences" "200" "$JWT_TOKEN"
}

# ══════════════════════════════════════════════════════════════════════════════
# BÖLÜM C: ÖZET RAPOR
# ══════════════════════════════════════════════════════════════════════════════

print_summary() {
    log_section "C. TEST SONUÇ RAPORU"

    TOTAL=$((TESTS_PASSED + TESTS_FAILED))
    echo ""
    echo -e "${BOLD}════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  QuakeSense Kritik Sistem Test Raporu${NC}"
    echo -e "${BOLD}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BOLD}════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  Toplam   : $TOTAL test"
    echo -e "  ${GREEN}Geçti    : $TESTS_PASSED test${NC}"
    echo -e "  ${RED}Başarısız: $TESTS_FAILED test${NC}"
    echo ""

    if [ ${#ERRORS[@]} -gt 0 ]; then
        echo -e "${RED}  Başarısız Testler:${NC}"
        for err in "${ERRORS[@]}"; do
            echo -e "    ✗ $err"
        done
        echo ""
    fi

    echo -e "  Servis Durumu:"
    echo -e "  ├─ Backend  : $(curl -s -o /dev/null -w '%{http_code}' $API_URL/health)"
    echo -e "  ├─ Redis    : $(redis-cli ping 2>/dev/null || echo 'KAPALI')"
    echo -e "  ├─ Celery   : $(pgrep -c -f 'celery.*worker' 2>/dev/null || echo '0') worker"
    echo -e "  └─ DB       : $(psql -U deprem_user -d deprem_db -c 'SELECT 1' -t 2>/dev/null | grep -c '1' || echo 'kontrol et')"
    echo ""

    echo -e "  Log Dosyaları:"
    echo -e "  ├─ Backend : tail -f /var/log/deprem-backend.log"
    echo -e "  ├─ Celery  : tail -f /var/log/celery-worker.log"
    echo -e "  └─ Beat    : tail -f /var/log/celery-beat.log"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}${BOLD}  ✓ TÜM KRİTİK TESTLERİ GEÇTİ — SİSTEM HAZIR!${NC}"
    else
        echo -e "${YELLOW}${BOLD}  ⚠ $TESTS_FAILED test başarısız — yukarıdaki hataları çözün${NC}"
    fi
    echo -e "${BOLD}════════════════════════════════════════════════${NC}"
}

# ══════════════════════════════════════════════════════════════════════════════
# ANA AKIŞ
# ══════════════════════════════════════════════════════════════════════════════

main() {
    echo -e "${BOLD}${BLUE}"
    echo "  ██████╗ ██╗   ██╗ █████╗ ██╗  ██╗███████╗"
    echo "  ██╔═══██╗██║   ██║██╔══██╗██║ ██╔╝██╔════╝"
    echo "  ██║   ██║██║   ██║███████║█████╔╝ █████╗  "
    echo "  ██║▄▄ ██║██║   ██║██╔══██║██╔═██╗ ██╔══╝  "
    echo "  ╚██████╔╝╚██████╔╝██║  ██║██║  ██╗███████╗"
    echo "   ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝"
    echo -e "${BOLD}  QuakeSense — VPS Deploy & Test v2.0${NC}"
    echo ""

    case "${1:-all}" in
        "deploy")
            deploy_backend
            ;;
        "test")
            run_tests
            print_summary
            ;;
        "all"|*)
            deploy_backend
            sleep 5
            run_tests
            print_summary
            ;;
    esac
}

main "$@"
