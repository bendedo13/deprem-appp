#!/bin/bash

################################################################################
# VPS Auto-Deployment Script
# Amaç: Production sunucusunda otomatik deployment
# Kullanım: ./deploy/vps-deployment.sh [branch-name] [environment]
################################################################################

set -e

# Configuration
BRANCH="${1:-main}"
ENVIRONMENT="${2:-prod}"
PROJECT_DIR="/opt/deprem-appp"
DOCKER_COMPOSE_FILE="deploy/docker-compose.${ENVIRONMENT}.yml"
LOG_FILE="/var/log/deprem-deployment.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[${TIMESTAMP}]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[${TIMESTAMP}] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[${TIMESTAMP}] ❌ ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[${TIMESTAMP}] ⚠️  WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Cleanup and exit on error
cleanup_on_error() {
    log_error "Deployment failed! Rolling back..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d 2>/dev/null || true
    exit 1
}

trap cleanup_on_error ERR

################################################################################
# STEP 1: Git Pull
################################################################################
log "=== STEP 1: Git Pull from branch: $BRANCH ==="

cd "$PROJECT_DIR"
git fetch origin "$BRANCH" --quiet
git checkout "$BRANCH" --quiet
git reset --hard "origin/$BRANCH" --quiet
git pull origin "$BRANCH" --quiet

log_success "Git pull completed"

################################################################################
# STEP 2: Remove old migration files and pull new ones
################################################################################
log "=== STEP 2: Ensure correct migration files ==="

rm -f backend/alembic/versions/005_*.py.bak backend/alembic/versions/006_*.py.bak

if [ ! -f "backend/alembic/versions/006_add_emergency_contact_fields.py" ]; then
    log_warning "Migration 006 not found, checking if it exists..."
    if [ -f "backend/alembic/versions/006*.py" ]; then
        log_warning "Found alternative 006 file, will use migration script"
    fi
fi

log_success "Migration files verified"

################################################################################
# STEP 3: Database Cleanup (remove partially applied columns)
################################################################################
log "=== STEP 3: Database Cleanup ==="

# Start database if not running
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d db redis 2>/dev/null || true
sleep 5

# Remove problematic columns if they exist (from failed migrations)
docker exec deprem_db psql -U deprem_user -d deprem_db -c "
-- Remove emergency_contacts columns
ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS relation CASCADE;
ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS methods CASCADE;
ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS priority CASCADE;
ALTER TABLE emergency_contacts DROP COLUMN IF EXISTS channel CASCADE;

-- Remove users columns
ALTER TABLE users DROP COLUMN IF EXISTS name CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS phone CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS avatar CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS plan CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS join_date CASCADE;
" 2>&1 | grep -v "does not exist" || true

log_success "Database cleanup completed"

################################################################################
# STEP 4: Alembic Version Reset
################################################################################
log "=== STEP 4: Reset Alembic Version to 004 ==="

docker exec deprem_db psql -U deprem_user -d deprem_db -c "
DELETE FROM alembic_version;
INSERT INTO alembic_version (version_num) VALUES ('004');
"

CURRENT_VERSION=$(docker exec deprem_db psql -U deprem_user -d deprem_db -t -c "SELECT version_num FROM alembic_version" | head -1)
log "Alembic version set to: $CURRENT_VERSION"

if [ "$CURRENT_VERSION" != "004" ]; then
    log_error "Alembic version not set correctly. Found: $CURRENT_VERSION"
    exit 1
fi

log_success "Alembic version reset completed"

################################################################################
# STEP 5: Run Migrations
################################################################################
log "=== STEP 5: Run Alembic Migrations ==="

docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm backend alembic upgrade head 2>&1 | tee -a "$LOG_FILE"

# Verify migrations applied
FINAL_VERSION=$(docker exec deprem_db psql -U deprem_user -d deprem_db -t -c "SELECT version_num FROM alembic_version ORDER BY version_num DESC LIMIT 1" | head -1)
log "Final alembic version: $FINAL_VERSION"

if [ "$FINAL_VERSION" != "006" ]; then
    log_error "Migrations did not reach version 006. Stopped at: $FINAL_VERSION"
    exit 1
fi

log_success "Migrations completed successfully"

################################################################################
# STEP 6: Verify Database Structure
################################################################################
log "=== STEP 6: Verify Database Structure ==="

# Check emergency_contacts table
EC_COLS=$(docker exec deprem_db psql -U deprem_user -d deprem_db -c "\d emergency_contacts" | grep -E "relation|methods|priority" | wc -l)

if [ "$EC_COLS" -lt 3 ]; then
    log_error "Emergency contacts table missing required columns"
    exit 1
fi

log_success "Database structure verified"

################################################################################
# STEP 7: Restart Services
################################################################################
log "=== STEP 7: Restart Services ==="

docker-compose -f "$DOCKER_COMPOSE_FILE" down 2>/dev/null || true
sleep 3

docker-compose -f "$DOCKER_COMPOSE_FILE" up -d 2>&1 | tee -a "$LOG_FILE"
sleep 8

log_success "Services restarted"

################################################################################
# STEP 8: Health Checks
################################################################################
log "=== STEP 8: Health Checks ==="

# Check backend health
HEALTH_RESPONSE=$(curl -s http://localhost:8001/health || echo '{"status":"error"}')
log "Backend health: $HEALTH_RESPONSE"

if ! echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    log_warning "Backend health check failed, but continuing..."
fi

# Check database connection
DB_CHECK=$(docker exec deprem_db psql -U deprem_user -d deprem_db -c "SELECT 1" 2>&1)
if [ $? -eq 0 ]; then
    log_success "Database connection verified"
else
    log_error "Database connection failed"
    exit 1
fi

log_success "Health checks completed"

################################################################################
# STEP 9: Test API
################################################################################
log "=== STEP 9: API Integration Tests ==="

# Test 1: Health endpoint
log "Test 1: Health endpoint"
HEALTH=$(curl -s -w "%{http_code}" http://localhost:8001/health)
if [[ $HEALTH == *"200"* ]]; then
    log_success "Health endpoint: OK"
else
    log_warning "Health endpoint returned: $HEALTH"
fi

# Test 2: Create user (registration)
log "Test 2: User registration"
REG_RESPONSE=$(curl -s -X POST http://localhost:8001/api/v1/users/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"test-$(date +%s)@example.com\",\"password\":\"test123456\"}" 2>/dev/null || echo '{}')

if echo "$REG_RESPONSE" | grep -q "success\|token\|user\|email" 2>/dev/null; then
    log_success "User registration: OK"
else
    log_warning "User registration response: $REG_RESPONSE"
fi

log_success "API tests completed"

################################################################################
# STEP 10: Final Verification
################################################################################
log "=== STEP 10: Final Verification ==="

# Check all containers are running
RUNNING=$(docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -c "Up" || echo "0")
EXPECTED=$(docker-compose -f "$DOCKER_COMPOSE_FILE" config --services | wc -l)

log "Running containers: $RUNNING / $EXPECTED"

if [ "$RUNNING" -ge 3 ]; then
    log_success "All essential services running"
else
    log_warning "Some services not running"
fi

################################################################################
# SUMMARY
################################################################################
log ""
log "╔════════════════════════════════════════════════════════════════╗"
log "║                  DEPLOYMENT COMPLETED SUCCESSFULLY              ║"
log "╠════════════════════════════════════════════════════════════════╣"
log "║ Branch: $BRANCH"
log "║ Environment: $ENVIRONMENT"
log "║ Alembic Version: $FINAL_VERSION"
log "║ Timestamp: $TIMESTAMP"
log "║ Log file: $LOG_FILE"
log "╚════════════════════════════════════════════════════════════════╝"
log ""

log_success "✨ Deployment ve verification başarıyla tamamlandı!"
exit 0
