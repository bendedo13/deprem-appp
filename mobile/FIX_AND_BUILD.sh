#!/bin/bash

# QuakeSense Mobile - Complete Fix & Build Script
# This script fixes all issues and builds production APK

set -e  # Exit on error

echo "=========================================="
echo "QuakeSense - Complete Fix & Build"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Git Sync
echo -e "${YELLOW}Step 1: Syncing with GitHub...${NC}"
echo ""

# Discard local changes
git reset --hard HEAD

# Pull latest
git pull origin main

# Verify files exist
if [ ! -f "babel.config.js" ]; then
    echo -e "${RED}✗ babel.config.js not found after git pull!${NC}"
    exit 1
fi

if [ ! -f "metro.config.js" ]; then
    echo -e "${RED}✗ metro.config.js not found after git pull!${NC}"
    exit 1
fi

if [ ! -f ".npmrc" ]; then
    echo -e "${RED}✗ .npmrc not found after git pull!${NC}"
    exit 1
fi

if [ ! -f ".nvmrc" ]; then
    echo -e "${RED}✗ .nvmrc not found after git pull!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Git sync complete!${NC}"
echo ""

# Verify AdMob is removed
if grep -q "google-mobile-ads" package.json; then
    echo -e "${RED}✗ AdMob still in package.json!${NC}"
    exit 1
fi

if grep -q "google-mobile-ads" app.json; then
    echo -e "${RED}✗ AdMob plugin still in app.json!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AdMob removed successfully!${NC}"
echo ""
echo "=========================================="
echo ""

# Step 2: Node Version Check
echo -e "${YELLOW}Step 2: Checking Node Version...${NC}"
echo ""

NODE_VERSION=$(node -v)
echo "Current Node version: $NODE_VERSION"

# Extract major version
NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -ne 18 ]; then
    echo -e "${YELLOW}⚠ Node version should be 18.x for stability${NC}"
    echo "Current: $NODE_VERSION"
    echo ""
    
    # Check if nvm is available
    if command -v nvm &> /dev/null; then
        echo "Switching to Node 18 using nvm..."
        nvm install 18.19.1
        nvm use 18.19.1
        NODE_VERSION=$(node -v)
        echo "Switched to: $NODE_VERSION"
    else
        echo -e "${YELLOW}⚠ nvm not found. Continuing with Node $NODE_VERSION${NC}"
        echo "If build fails, install Node 18.19.1 manually"
    fi
fi

NPM_VERSION=$(npm -v)
echo "npm version: $NPM_VERSION"

echo -e "${GREEN}✓ Node version check complete!${NC}"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${YELLOW}Installing EAS CLI...${NC}"
    npm install -g eas-cli
fi

EAS_VERSION=$(eas --version)
echo "EAS CLI version: $EAS_VERSION"

echo ""
echo "=========================================="
echo ""

# Step 3: Complete Clean
echo -e "${YELLOW}Step 3: Complete Clean...${NC}"
echo ""

# Remove all caches
echo "Removing node_modules..."
rm -rf node_modules

echo "Removing package-lock.json..."
rm -rf package-lock.json

echo "Removing .expo cache..."
rm -rf .expo

echo "Removing dist..."
rm -rf dist

echo "Removing android/ios if exists..."
rm -rf android ios

echo "Cleaning npm cache..."
npm cache clean --force

echo -e "${GREEN}✓ Clean complete!${NC}"
echo ""
echo "=========================================="
echo ""

# Step 4: Fresh Install
echo -e "${YELLOW}Step 4: Fresh Install...${NC}"
echo ""

npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ npm install failed!${NC}"
    exit 1
fi

# Run dedupe to optimize dependency tree
echo "Running npm dedupe..."
npm dedupe

echo -e "${GREEN}✓ Dependencies installed!${NC}"
echo ""
echo "=========================================="
echo ""

# Step 5: Validate Configuration
echo -e "${YELLOW}Step 5: Validating Configuration...${NC}"
echo ""

# Test expo config
echo "Testing: npx expo config --json"
npx expo config --json > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Expo config is valid!${NC}"
else
    echo -e "${RED}✗ Expo config validation failed!${NC}"
    echo "Running: npx expo config"
    npx expo config
    exit 1
fi

# Run expo doctor
echo ""
echo "Running: npx expo-doctor"
npx expo-doctor || echo -e "${YELLOW}⚠ Expo doctor found some warnings (non-critical)${NC}"

echo ""
echo -e "${GREEN}✓ Configuration validated!${NC}"
echo ""
echo "=========================================="
echo ""

# Step 6: Test Prebuild
echo -e "${YELLOW}Step 6: Testing Prebuild...${NC}"
echo ""

echo "Testing: npx expo prebuild --no-install --platform android --clean"
npx expo prebuild --no-install --platform android --clean

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prebuild successful!${NC}"
else
    echo -e "${RED}✗ Prebuild failed!${NC}"
    exit 1
fi

# Clean prebuild artifacts
echo "Cleaning prebuild artifacts..."
rm -rf android ios

echo ""
echo "=========================================="
echo ""

# Step 7: Check EAS Login
echo -e "${YELLOW}Step 7: Checking EAS Login...${NC}"
echo ""

if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in to EAS. Please login:${NC}"
    eas login
else
    EAS_USER=$(eas whoami)
    echo -e "${GREEN}✓ Logged in as: $EAS_USER${NC}"
fi

echo ""
echo "=========================================="
echo ""

# Step 8: EAS Build
echo -e "${YELLOW}Step 8: Starting EAS Build...${NC}"
echo ""
echo -e "${BLUE}This will take 10-20 minutes...${NC}"
echo ""

eas build --platform android --profile production --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓✓✓ BUILD COMPLETED SUCCESSFULLY! ✓✓✓"
    echo "==========================================${NC}"
    echo ""
    echo "Download your APK from:"
    echo "https://expo.dev"
    echo ""
    echo "Next steps:"
    echo "1. Download APK from EAS dashboard"
    echo "2. Install on Android device"
    echo "3. Test S.O.S voice recorder"
    echo "4. Test GPS location"
    echo "5. Test Firebase notifications"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "✗✗✗ BUILD FAILED! ✗✗✗"
    echo "==========================================${NC}"
    echo ""
    echo "Check the error messages above."
    echo ""
    echo "Common fixes:"
    echo "1. Run this script again: bash FIX_AND_BUILD.sh"
    echo "2. Check: npx expo config"
    echo "3. Check: npx expo-doctor"
    echo "4. Clear EAS cache: eas build:clear-cache"
    echo ""
    exit 1
fi
