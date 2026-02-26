#!/bin/bash
# eas-build-post-install.sh
# This script runs AFTER npm install on EAS build servers.
# It patches the 'del' package to fix the ERR_INVALID_ARG_TYPE error
# caused by rimraf v4+ exporting an object instead of a function.

echo "[eas-build-post-install] Patching del package for rimraf compatibility..."

# Find ALL del/index.js files in node_modules
find node_modules -path "*/del/index.js" -type f 2>/dev/null | while read -r DEL_FILE; do
  if grep -q "promisify(rimraf)" "$DEL_FILE" 2>/dev/null; then
    echo "[patch] Patching: $DEL_FILE"

    # Replace the problematic line with a safe version
    sed -i 's|const rimrafP = promisify(rimraf);|const _rimrafFn = typeof rimraf === "function" ? rimraf : (rimraf.rimraf \|\| rimraf.sync \|\| function(p, cb) { require("fs").rm(p, {recursive: true, force: true}, cb); }); const rimrafP = promisify(_rimrafFn);|g' "$DEL_FILE"

    # Verify patch worked
    if grep -q "_rimrafFn" "$DEL_FILE"; then
      echo "[patch] SUCCESS: $DEL_FILE patched"
    else
      echo "[patch] WARN: sed failed, trying node patch..."
      # Fallback: use node to patch
      node -e "
        const fs = require('fs');
        let c = fs.readFileSync('$DEL_FILE', 'utf8');
        c = c.replace(
          /const rimrafP = promisify\(rimraf\);/,
          'const _rimrafFn = typeof rimraf === \"function\" ? rimraf : (rimraf.rimraf || rimraf.sync || function(p, cb) { require(\"fs\").rm(p, {recursive: true, force: true}, cb); });\nconst rimrafP = promisify(_rimrafFn);'
        );
        fs.writeFileSync('$DEL_FILE', c);
        console.log('[patch] Node fallback SUCCESS: $DEL_FILE');
      "
    fi
  else
    echo "[patch] Skip: $DEL_FILE (already patched or different version)"
  fi
done

echo "[eas-build-post-install] Done."
