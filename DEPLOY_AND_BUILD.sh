#!/bin/bash

# Deprem App - Complete Deployment & Build Script
# This script deploys backend to VPS and builds mobile APK with EAS

set -e  # Exit on error

echo "=========================================="
echo "Deprem App - Deployment & Build"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# VPS Configuration
VPS_HOST="46.4.123.77"
VPS_USER="root"
VPS_PATH="/opt/deprem-appp"

# Step 1: Deploy Backend to VPS
echo -e "${YELLOW}Step 1: Deploying Backend to VPS...${NC}"
echo ""

ssh ${VPS_USER}@${VPS_HOST} << 'ENDSSH'
cd /opt/deprem-appp

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/main

# Deploy backend
cd deploy
echo "Deploying backend with Docker..."
bash PRODUCTION_DEPLOY.sh

# Wait for services to start
echo "Waiting for services to start..."
sleep 10

# Check health
echo "Checking backend health..."
curl -f http://localhost:8001/api/v1/health || echo "Health check failed!"

# Check Celery
echo "Checking Celery worker..."
docker logs deprem_celery --tail 10

echo "Backend deployment complete!"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend deployed successfully!${NC}"
else
    echo -e "${RED}✗ Backend deployment failed!${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo ""

# Step 2: Install Mobile Dependencies
echo -e "${YELLOW}Step 2: Installing Mobile Dependencies...${NC}"
echo ""

cd mobile

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
else
    echo "Dependencies already installed. Skipping..."
fi

echo -e "${GREEN}✓ Dependencies ready!${NC}"
echo ""
echo "=========================================="
echo ""

# Step 3: Build APK with EAS
echo -e "${YELLOW}Step 3: Building APK with EAS...${NC}"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}EAS CLI not found!${NC}"
    echo "Installing EAS CLI globally..."
    npm install -g eas-cli
fi

# Check if logged in to EAS
echo "Checking EAS login status..."
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to EAS. Please login:${NC}"
    eas login
fi

# Build APK
echo ""
echo "Starting EAS build for Android..."
echo "This may take 10-20 minutes..."
echo ""

eas build --platform android --profile production

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ APK build completed successfully!${NC}"
    echo ""
    echo "Download your APK from the link provided above."
    echo "Or check: https://expo.dev"
else
    echo -e "${RED}✗ APK build failed!${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Deployment & Build Complete!${NC}"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Download APK from EAS dashboard"
echo "2. Install on Android device"
echo "3. Test S.O.S voice recorder"
echo ""
echo "Backend URL: http://46.4.123.77:8001"
echo "Health Check: http://46.4.123.77:8001/api/v1/health"
echo ""
