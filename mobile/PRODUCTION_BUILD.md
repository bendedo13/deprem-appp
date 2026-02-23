# QuakeSense Mobile - Production Build Guide

## ✅ Pre-Build Checklist

- [ ] Node.js 18-20 installed
- [ ] npm 9+ installed
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged in to EAS (`eas login`)
- [ ] `google-services.json` exists in mobile directory
- [ ] `.env` file configured with API URL

## 🚀 Quick Build (Automated)

```bash
cd mobile
bash PRODUCTION_BUILD.sh
```

This script will:
1. Check environment
2. Clean install dependencies
3. Run expo-doctor
4. Validate config
5. Check EAS login
6. Start production build

## 📋 Manual Build Steps

### 1. Clean Environment

```bash
cd mobile

# Remove old dependencies
rm -rf node_modules package-lock.json

# Install fresh
npm install --legacy-peer-deps
```

### 2. Validate Configuration

```bash
# Check Expo config
npx expo config --json

# Run Expo doctor
npx expo-doctor

# Check for issues
npm audit
```

### 3. Login to EAS

```bash
# Install EAS CLI (if not installed)
npm install -g eas-cli

# Login
eas login

# Verify
eas whoami
```

### 4. Build for Production

```bash
# Build APK
eas build --platform android --profile production

# Or build with no cache (if issues)
eas build --platform android --profile production --clear-cache
```

## 🔧 Troubleshooting

### Build Fails with "Unexpected token"

```bash
# Check Node version (must be 18-20)
node -v

# If wrong version, use nvm
nvm install 20.18.0
nvm use 20.18.0
```

### Config Plugin Errors

```bash
# Validate app.json
npx expo config --json

# Check for syntax errors
cat app.json | jq .
```

### Dependency Issues

```bash
# Clean install
npm run clean

# Or manually
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Check for conflicts
npm ls
```

### EAS Login Issues

```bash
# Logout and login again
eas logout
eas login

# Check credentials
eas whoami
```

### Cache Issues

```bash
# Clear EAS cache
eas build:clear-cache

# Clear local cache
rm -rf .expo node_modules
npm install --legacy-peer-deps
```

## 📊 Build Profiles

### Production (Default)
- APK format
- Optimized for release
- Node 20.18.0
- No Expo Go warnings

```bash
eas build --platform android --profile production
```

### Preview (Testing)
- APK format
- Internal distribution
- For testing before production

```bash
eas build --platform android --profile preview
```

### Development
- Development client
- For local testing

```bash
eas build --platform android --profile development
```

## 🎯 Build Configuration

### eas.json
```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleRelease"
      },
      "node": "20.18.0",
      "env": {
        "EAS_BUILD_NO_EXPO_GO_WARNING": "true"
      }
    }
  }
}
```

### package.json engines
```json
{
  "engines": {
    "node": ">=18.0.0 <=20.18.0",
    "npm": ">=9.0.0"
  }
}
```

## 📦 After Build

1. Download APK from EAS dashboard
2. Test on physical device
3. Submit to Google Play Store (optional)

### Download APK

```bash
# Get build URL
eas build:list

# Or visit
https://expo.dev/accounts/YOUR_ACCOUNT/projects/quakesense/builds
```

### Install on Device

1. Transfer APK to Android device
2. Enable "Install from Unknown Sources"
3. Install APK
4. Grant permissions (Location, Microphone)

## 🔐 Security Notes

- Never commit `.env` file
- Never commit `google-services.json` to public repos
- Keep `google-play-service-account.json` secure
- Use environment variables for sensitive data

## 📈 Build Monitoring

### Check Build Status

```bash
# List recent builds
eas build:list

# View specific build
eas build:view BUILD_ID

# Cancel build
eas build:cancel BUILD_ID
```

### Build Logs

```bash
# View logs
eas build:view BUILD_ID --logs
```

## 🆘 Common Errors

### "Package does not contain a valid config plugin"
- Removed from app.json plugins array
- Check package.json for incompatible packages

### "Failed to read app config"
- Run: `npx expo config --json`
- Check app.json syntax
- Validate with: `cat app.json | jq .`

### "Unexpected token 'typeof'"
- Node version mismatch
- Use Node 20.18.0
- Check babel.config.js

### "cli.appVersionSource is not set"
- Already fixed in eas.json
- Set to "remote"

### Expo Go Warning
- Already suppressed with `EAS_BUILD_NO_EXPO_GO_WARNING=true`
- Not an error, just a warning

## 📞 Support

- EAS Documentation: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/
- GitHub Issues: https://github.com/bendedo13/deprem-appp/issues

## ✨ Success Criteria

- [ ] Build completes without errors
- [ ] APK downloads successfully
- [ ] App installs on device
- [ ] All features work (GPS, Audio, Firebase)
- [ ] No crashes on startup
