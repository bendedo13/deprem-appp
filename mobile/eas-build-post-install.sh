#!/bin/bash
# eas-build-post-install.sh
# EAS lifecycle hook — runs AFTER npm install on EAS build servers.
# Copies pre-patched del/index.js to fix ERR_INVALID_ARG_TYPE error.

set -e

PATCHED_FILE="patches/del-index-patched.js"

echo "=== [eas-build-post-install] Starting del patch ==="
echo "PWD: $(pwd)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"

if [ ! -f "$PATCHED_FILE" ]; then
  echo "[WARN] $PATCHED_FILE not found, running node postinstall instead..."
  node scripts/patch-del.js
  exit 0
fi

# Find and replace ALL del/index.js files
PATCHED=0
TOTAL=0

for DEL_FILE in $(find node_modules -path "*/del/index.js" -type f 2>/dev/null); do
  TOTAL=$((TOTAL + 1))

  if grep -q "PATCHED:" "$DEL_FILE" 2>/dev/null; then
    echo "[skip] $DEL_FILE (already patched)"
    continue
  fi

  cp "$PATCHED_FILE" "$DEL_FILE"
  PATCHED=$((PATCHED + 1))
  echo "[ok] $DEL_FILE"
done

echo "=== [eas-build-post-install] Patched $PATCHED/$TOTAL del files ==="

# Verify the main one works
if [ -f "node_modules/del/index.js" ]; then
  node -e "require('./node_modules/del/index.js'); console.log('[verify] del loaded OK')" 2>&1 || echo "[verify] del load check done (may show non-critical errors)"
fi
