# 🔥 ESM/CJS Compatibility Fix

## 🚨 Problem

```
Error [ERR_REQUIRE_ESM]: require() of ES Module node_modules/tempy/index.js
from @expo/cli/build/src/prebuild/updateFromTemplate.js not supported.
```

### Root Cause
- `tempy@3.x` is ESM-only (uses `import`)
- `@expo/cli` uses CommonJS (uses `require()`)
- Node.js cannot `require()` an ESM module
- This breaks `expo prebuild` completely

## ✅ Complete Solution

### 1. Downgrade to CommonJS-Compatible Versions

**package.json overrides:**
```json
{
  "overrides": {
    "glob": "^10.3.10",
    "inflight": "^1.0.6",
    "rimraf": "^5.0.5",
    "del": "6.1.1",        // ← CommonJS compatible
    "tempy": "1.0.1"       // ← CommonJS compatible (last CJS version)
  }
}
```

### 2. Node Version Stabilization

- `.nvmrc`: `18.19.1` (LTS)
- `package.json` engines: `18.x`
- `eas.json` node: `18.19.1`

### 3. Why These Versions?

| Package | Version | Reason |
|---------|---------|--------|
| `tempy` | 1.0.1 | Last CommonJS version before ESM-only |
| `del` | 6.1.1 | Compatible with tempy 1.x, stable |
| Node | 18.19.1 | LTS, fully compatible with Expo SDK 51 |

## 🚀 VPS Commands

```bash
ssh root@46.4.123.77

cd /opt/deprem-appp/mobile

# Install Node 18.19.1 (if not installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18.19.1
nvm use 18.19.1
node -v  # Should show v18.19.1

# Git sync
git reset --hard HEAD
git pull origin main

# Verify .nvmrc
cat .nvmrc  # Should show 18.19.1

# Complete clean
rm -rf node_modules package-lock.json .expo dist android ios
npm cache clean --force

# Fresh install
npm install --legacy-peer-deps

# Verify tempy version (should be 1.0.1)
npm ls tempy

# Verify del version (should be 6.1.1)
npm ls del

# Run dedupe
npm dedupe

# Test expo config
npx expo config --json

# Test expo doctor
npx expo-doctor

# Test prebuild (THIS SHOULD WORK NOW)
npx expo prebuild --no-install --platform android --clean

# Clean prebuild artifacts
rm -rf android ios

# Start EAS build
eas build --platform android --profile production
```

## 📋 Or Use Automated Script

```bash
cd /opt/deprem-appp/mobile
chmod +x FIX_AND_BUILD.sh
bash FIX_AND_BUILD.sh
```

## 🔍 Verification Checklist

```bash
# 1. Node version
node -v
# Expected: v18.19.1

# 2. tempy version (must be 1.0.1, NOT 3.x)
npm ls tempy
# Expected: tempy@1.0.1

# 3. del version (must be 6.1.1, NOT 7.x)
npm ls del
# Expected: del@6.1.1

# 4. Expo config works
npx expo config --json
# Expected: JSON output without errors

# 5. Prebuild works
npx expo prebuild --no-install --platform android --clean
# Expected: Completes without ESM error

# 6. EAS build starts
eas build --platform android --profile production
# Expected: Build starts successfully
```

## 🎯 Expected Output

### Before Fix
```
Error [ERR_REQUIRE_ESM]: require() of ES Module node_modules/tempy/index.js
from @expo/cli/build/src/prebuild/updateFromTemplate.js not supported.
```

### After Fix
```
✔ Android Prebuild complete!
✔ Build started successfully
```

## 📊 Dependency Tree

```
@expo/cli (CommonJS)
  └── uses require()
      └── del@6.1.1 (CommonJS)
          └── tempy@1.0.1 (CommonJS) ✅
```

## 🆘 If Still Fails

### Check tempy version
```bash
npm ls tempy
```

If it shows `tempy@3.x` or higher:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
npm ls tempy  # Should now show 1.0.1
```

### Check Node version
```bash
node -v
```

If not 18.19.1:
```bash
nvm install 18.19.1
nvm use 18.19.1
nvm alias default 18.19.1
```

### Force override
If npm still installs wrong version, add to package.json:
```json
{
  "resolutions": {
    "tempy": "1.0.1",
    "del": "6.1.1"
  }
}
```

## 📝 Technical Summary

### Issue
- Expo CLI (CommonJS) cannot `require()` tempy v3+ (ESM-only)
- Node.js throws `ERR_REQUIRE_ESM` error
- Prebuild crashes before Android project generation

### Solution
- Downgrade `tempy` to 1.0.1 (last CommonJS version)
- Downgrade `del` to 6.1.1 (compatible with tempy 1.x)
- Use Node 18.19.1 LTS (stable, Expo SDK 51 compatible)
- Force versions via `overrides` in package.json

### Why Not Upgrade Expo CLI?
- Expo SDK 51 uses specific CLI version
- Upgrading CLI requires upgrading entire SDK
- SDK upgrade = breaking changes across project
- Downgrading dependencies is safer and faster

## ✨ Success Criteria

- [ ] Node version: 18.19.1
- [ ] tempy version: 1.0.1
- [ ] del version: 6.1.1
- [ ] `npx expo config --json` works
- [ ] `npx expo-doctor` passes
- [ ] `npx expo prebuild --no-install --platform android --clean` completes
- [ ] `eas build --platform android --profile production` starts
- [ ] Build completes in 10-20 minutes
- [ ] APK downloads successfully

## 🎉 Final Command

```bash
ssh root@46.4.123.77
cd /opt/deprem-appp/mobile

# Install Node 18.19.1
nvm install 18.19.1
nvm use 18.19.1

# Run fix script
git reset --hard HEAD
git pull origin main
chmod +x FIX_AND_BUILD.sh
bash FIX_AND_BUILD.sh
```

That's it! Prebuild will work now.
