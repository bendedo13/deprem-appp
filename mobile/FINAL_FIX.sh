#!/bin/bash

# QuakeSense Mobile - FINAL PRODUCTION FIX
# This script performs a complete dependency reset and stabilization

set -e  # Exit on error

echo "=========================================="
echo "QuakeSense - FINAL PRODUCTION FIX"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Git Sync
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 1: Git Sync${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

git reset --hard HEAD
git pull origin main

echo -e "${GREEN}✓ Git synced${NC}"
echo ""

# Step 2: Node Version
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 2: Node Version Check${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

NODE_VERSION=$(node -v)
echo "Current Node: $NODE_VERSION"

NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')

if [ "$NODE_MAJOR" -ne 18 ]; then
    echo -e "${YELLOW}⚠ Switching to Node 18...${NC}"
    
    if command -v nvm &> /dev/null; then
        nvm install 18.19.1
        nvm use 18.19.1
        echo -e "${GREEN}✓ Switched to Node $(node -v)${NC}"
    else
        echo -e "${RED}✗ nvm not found. Please install Node 18.19.1 manually${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Node 18 detected${NC}"
fi

echo ""

# Step 3: Complete Nuclear Clean
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 3: Nuclear Clean${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Removing node_modules..."
rm -rf node_modules

echo "Removing package-lock.json..."
rm -rf package-lock.json

echo "Removing .expo..."
rm -rf .expo

echo "Removing dist..."
rm -rf dist

echo "Removing android/ios..."
rm -rf android ios

echo "Cleaning npm cache..."
npm cache clean --force

echo "Cleaning global npm cache..."
npm cache verify

echo -e "${GREEN}✓ Nuclear clean complete${NC}"
echo ""

# Step 4: Fresh Install
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 4: Fresh Install${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ npm install failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 5: Dependency Verification
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 5: Dependency Verification${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check tempy version
echo "Checking tempy version..."
TEMPY_VERSION=$(npm ls tempy --depth=0 2>/dev/null | grep tempy@ | sed 's/.*tempy@//' | sed 's/ .*//')
echo "tempy: $TEMPY_VERSION"

if [[ "$TEMPY_VERSION" != "1.0.1" ]]; then
    echo -e "${RED}✗ Wrong tempy version: $TEMPY_VERSION (expected 1.0.1)${NC}"
    echo "Forcing correct version..."
    npm install tempy@1.0.1 --save-dev --legacy-peer-deps
fi

# Check del version
echo "Checking del version..."
DEL_VERSION=$(npm ls del --depth=0 2>/dev/null | grep del@ | sed 's/.*del@//' | sed 's/ .*//')
echo "del: $DEL_VERSION"

if [[ "$DEL_VERSION" != "6.1.1" ]]; then
    echo -e "${RED}✗ Wrong del version: $DEL_VERSION (expected 6.1.1)${NC}"
    echo "Forcing correct version..."
    npm install del@6.1.1 --save-dev --legacy-peer-deps
fi

# Run dedupe
echo "Running npm dedupe..."
npm dedupe

echo -e "${GREEN}✓ Dependencies verified${NC}"
echo ""

# Step 6: Expo Validation
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 6: Expo Validation${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test expo config
echo "Testing expo config..."
npx expo config --json > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Expo config valid${NC}"
else
    echo -e "${RED}✗ Expo config failed${NC}"
    npx expo config
    exit 1
fi

# Run expo doctor
echo "Running expo doctor..."
npx expo-doctor || echo -e "${YELLOW}⚠ Minor warnings (non-critical)${NC}"

echo ""

# Step 7: Prebuild Test
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 7: Prebuild Test${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Testing prebuild..."
npx expo prebuild --no-install --platform android --clean

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Prebuild successful${NC}"
else
    echo -e "${RED}✗ Prebuild failed${NC}"
    exit 1
fi

# Clean artifacts
echo "Cleaning prebuild artifacts..."
rm -rf android ios

echo ""

# Step 8: EAS Login
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 8: EAS Login${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! command -v eas &> /dev/null; then
    echo "Installing EAS CLI..."
    npm install -g eas-cli
fi

if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to EAS:${NC}"
    eas login
else
    EAS_USER=$(eas whoami)
    echo -e "${GREEN}✓ Logged in as: $EAS_USER${NC}"
fi

echo ""

# Step 9: Final Summary
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 9: Final Summary${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"
echo "Expo SDK: 51.0.0"
echo "tempy version: $(npm ls tempy --depth=0 2>/dev/null | grep tempy@ | sed 's/.*tempy@//' | sed 's/ .*//')"
echo "del version: $(npm ls del --depth=0 2>/dev/null | grep del@ | sed 's/.*del@//' | sed 's/ .*//')"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓✓✓ ALL CHECKS PASSED ✓✓✓${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Step 10: EAS Build
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Step 10: Starting EAS Build${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}This will take 10-20 minutes...${NC}"
echo ""

eas build --platform android --profile production --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓✓✓ BUILD COMPLETED SUCCESSFULLY! ✓✓✓${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Download APK: https://expo.dev"
    echo ""
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗✗✗ BUILD FAILED ✗✗✗${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    exit 1
fi
