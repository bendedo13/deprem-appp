#!/bin/bash

# QuakeSense Mobile - Production Build Script
# This script prepares and builds the mobile app for production

set -e  # Exit on error

echo "=========================================="
echo "QuakeSense Mobile - Production Build"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Environment Check
echo -e "${YELLOW}Step 1: Checking Environment...${NC}"
echo ""

# Check Node version
NODE_VERSION=$(node -v)
echo "Node version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm -v)
echo "npm version: $NPM_VERSION"

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}EAS CLI not found!${NC}"
    echo "Installing EAS CLI..."
    npm install -g eas-cli
fi

EAS_VERSION=$(eas --version)
echo "EAS CLI version: $EAS_VERSION"

echo -e "${GREEN}✓ Environment check complete!${NC}"
echo ""
echo "=========================================="
echo ""

# Step 2: Clean Install
echo -e "${YELLOW}Step 2: Clean Install Dependencies...${NC}"
echo ""

# Remove old dependencies
echo "Removing old node_modules and lock file..."
rm -rf node_modules package-lock.json

# Install fresh dependencies
echo "Installing dependencies..."
npm install --legacy-peer-deps

echo -e "${GREEN}✓ Dependencies installed!${NC}"
echo ""
echo "=========================================="
echo ""

# Step 3: Run Expo Doctor
echo -e "${YELLOW}Step 3: Running Expo Doctor...${NC}"
echo ""

npx expo-doctor || echo "Expo doctor found some issues, but continuing..."

echo ""
echo "=========================================="
echo ""

# Step 4: Validate Config
echo -e "${YELLOW}Step 4: Validating Expo Config...${NC}"
echo ""

npx expo config --json > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Expo config is valid!${NC}"
else
    echo -e "${RED}✗ Expo config validation failed!${NC}"
    echo "Running: npx expo config"
    npx expo config
    exit 1
fi

echo ""
echo "=========================================="
echo ""

# Step 5: Check EAS Login
echo -e "${YELLOW}Step 5: Checking EAS Login...${NC}"
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

# Step 6: Build
echo -e "${YELLOW}Step 6: Starting EAS Build...${NC}"
echo ""
echo "This will take 10-20 minutes..."
echo ""

eas build --platform android --profile production --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=========================================="
    echo "✓ Build Completed Successfully!"
    echo "==========================================${NC}"
    echo ""
    echo "Download your APK from:"
    echo "https://expo.dev"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================="
    echo "✗ Build Failed!"
    echo "==========================================${NC}"
    echo ""
    echo "Check the error messages above."
    echo "Common fixes:"
    echo "1. Run: npm run clean"
    echo "2. Check: npx expo config"
    echo "3. Run: npx expo-doctor"
    echo ""
    exit 1
fi
