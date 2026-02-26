#!/usr/bin/env node

/**
 * Postinstall: Replace del/index.js with our pre-patched version.
 * This fixes the ERR_INVALID_ARG_TYPE error caused by rimraf v4+ exporting
 * an object instead of a function. We COPY the entire patched file rather
 * than doing regex matching, which is more reliable.
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const patchedSrc = path.join(projectRoot, 'patches', 'del-index-patched.js');

console.log('[postinstall] Patching del package...');

if (!fs.existsSync(patchedSrc)) {
  console.log('[postinstall] WARN: patches/del-index-patched.js not found, skipping.');
  process.exit(0);
}

const patchedContent = fs.readFileSync(patchedSrc, 'utf8');

// Find ALL del/index.js in the dependency tree
function findAllDelFiles(dir) {
  const results = [];
  const nmDir = path.join(dir, 'node_modules');

  if (!fs.existsSync(nmDir)) return results;

  // Check top-level del
  const topDel = path.join(nmDir, 'del', 'index.js');
  if (fs.existsSync(topDel)) results.push(topDel);

  // Check inside scoped packages that might have nested del
  try {
    const entries = fs.readdirSync(nmDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('@')) {
          // Scoped package - check sub-packages
          const scopeDir = path.join(nmDir, entry.name);
          try {
            const subEntries = fs.readdirSync(scopeDir, { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory()) {
                const nested = path.join(scopeDir, sub.name, 'node_modules', 'del', 'index.js');
                if (fs.existsSync(nested)) results.push(nested);
              }
            }
          } catch (e) { /* ignore */ }
        } else {
          // Regular package - check if it has nested del
          const nested = path.join(nmDir, entry.name, 'node_modules', 'del', 'index.js');
          if (fs.existsSync(nested)) results.push(nested);
        }
      }
    }
  } catch (e) { /* ignore */ }

  return results;
}

const delFiles = findAllDelFiles(projectRoot);

if (delFiles.length === 0) {
  console.log('[postinstall] No del/index.js found in node_modules.');
} else {
  let patched = 0;
  for (const f of delFiles) {
    try {
      const current = fs.readFileSync(f, 'utf8');
      if (current.includes('PATCHED:')) {
        console.log(`  [skip] ${f} (already patched)`);
        continue;
      }
      fs.writeFileSync(f, patchedContent, 'utf8');
      console.log(`  [ok] ${f}`);
      patched++;
    } catch (e) {
      console.error(`  [err] ${f}: ${e.message}`);
    }
  }
  console.log(`[postinstall] Patched ${patched}/${delFiles.length} del/index.js files.`);
}
