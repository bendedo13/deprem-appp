# Mobile App Build & Deployment Guide

## Prerequisites

1. **Node.js & npm** installed
2. **EAS CLI** installed globally: `npm install -g eas-cli`
3. **Expo account** created at https://expo.dev
4. **EAS account** logged in: `eas login`

## Step 1: Install Dependencies

```bash
cd mobile
npm install
```

## Step 2: Configure Environment

The `.env` file is already created with:
```
EXPO_PUBLIC_API_URL=http://46.4.123.77:8001
```

## Step 3: Test Locally (Optional)

```bash
# Start development server
npm start

# Run on Android device/emulator
npm run android
```

**Note**: Audio recording requires a physical device (not emulator).

## Step 4: Build APK with EAS

### First Time Setup

```bash
cd mobile

# Login to EAS
eas login

# Configure EAS project
eas build:configure
```

### Build Production APK

```bash
# Build for Android
eas build --platform android --profile production

# Or build for both platforms
eas build --platform all --profile production
```

### Build Options

- **Production**: Optimized, signed APK for Google Play Store
- **Preview**: Development build for testing
- **Development**: Debug build with hot reload

```bash
# Preview build (for testing)
eas build --platform android --profile preview

# Development build
eas build --platform android --profile development
```

## Step 5: Download & Install APK

1. After build completes, EAS will provide a download link
2. Download the APK file
3. Transfer to Android device
4. Enable "Install from Unknown Sources" in device settings
5. Install the APK

## Step 6: Test S.O.S Voice Recorder

1. Open the app
2. Go to Menu → S.O.S
3. Grant microphone permission when prompted
4. Press and hold the red button to record
5. Release to upload and process
6. Check backend logs for processing status

## Backend Deployment

Before testing the mobile app, ensure backend is deployed:

```bash
# SSH to VPS
ssh root@46.4.123.77

# Navigate to project
cd /opt/deprem-appp/deploy

# Deploy backend
bash PRODUCTION_DEPLOY.sh

# Check logs
docker logs deprem_backend --tail 50 -f
docker logs deprem_celery --tail 50 -f
```

## Troubleshooting

### Build Fails

```bash
# Clear EAS cache
eas build:clear-cache

# Rebuild
eas build --platform android --profile production --clear-cache
```

### Dependencies Not Installed

```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
```

### Firebase Issues

- Ensure `google-services.json` exists in `mobile/` directory
- Check Firebase configuration in `firebase-init.ts`

### Audio Recording Not Working

- Test on physical device (emulator doesn't support audio)
- Grant microphone permission in app settings
- Check Android permissions in `app.json`

### API Connection Issues

- Verify backend is running: `curl http://46.4.123.77:8001/api/v1/health`
- Check `.env` file has correct API URL
- Ensure VPS firewall allows port 8001

## EAS Build Status

Check build status at: https://expo.dev/accounts/YOUR_ACCOUNT/projects/quakesense/builds

## Google Play Store Submission (Optional)

1. Build production APK with EAS
2. Create Google Play Console account
3. Upload APK to Google Play Console
4. Fill in app details, screenshots, description
5. Submit for review

## App Signing

EAS automatically handles app signing. To use your own keystore:

```bash
# Generate keystore
eas credentials

# Configure in eas.json
```

## Continuous Deployment

Set up GitHub Actions for automatic builds:

```yaml
# .github/workflows/eas-build.yml
name: EAS Build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd mobile && eas build --platform android --non-interactive
```

## Next Steps

1. ✅ Install dependencies: `cd mobile && npm install`
2. ✅ Configure `.env` file (already done)
3. ⏳ Deploy backend: `ssh root@46.4.123.77 "cd /opt/deprem-appp/deploy && bash PRODUCTION_DEPLOY.sh"`
4. ⏳ Build APK: `cd mobile && eas build --platform android --profile production`
5. ⏳ Test on device

## Support

- EAS Documentation: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/
- GitHub Issues: https://github.com/YOUR_REPO/issues
