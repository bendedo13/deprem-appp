#!/usr/bin/env node

/**
 * Postinstall script to patch the `del` package's incompatibility with rimraf v4+.
 *
 * del@6.x calls util.promisify(rimraf) but rimraf v4+ exports an object, not a function.
 * This script patches del/index.js to handle both cases.
 */

const fs = require('fs');
const path = require('path');

function findDelIndex(startDir) {
  const locations = [
    path.join(startDir, 'node_modules', 'del', 'index.js'),
    path.join(startDir, 'node_modules', '@expo', 'cli', 'node_modules', 'del', 'index.js'),
    path.join(startDir, 'node_modules', 'tempy', 'node_modules', 'del', 'index.js'),
  ];
  return locations.filter(loc => fs.existsSync(loc));
}

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Already patched
  if (content.includes('PATCHED_BY_POSTINSTALL')) {
    console.log(`  [skip] ${filePath} (already patched)`);
    return;
  }

  // Patch: wrap promisify(rimraf) to handle object exports
  const original = "const rimrafP = promisify(rimraf);";
  const patched = [
    "// PATCHED_BY_POSTINSTALL: handle rimraf v4+ object export",
    "const _rimrafFn = typeof rimraf === 'function' ? rimraf : (rimraf.rimraf || rimraf.sync || function(p, cb) { require('fs').rm(p, {recursive: true, force: true}, cb); });",
    "const rimrafP = promisify(_rimrafFn);"
  ].join('\n');

  if (content.includes(original)) {
    content = content.replace(original, patched);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [patched] ${filePath}`);
  } else if (content.includes('promisify(rimraf)')) {
    // Different formatting, try regex
    content = content.replace(
      /const\s+rimrafP\s*=\s*promisify\s*\(\s*rimraf\s*\)\s*;/,
      patched
    );
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  [patched] ${filePath}`);
  } else {
    console.log(`  [skip] ${filePath} (pattern not found, may be different version)`);
  }
}

console.log('[postinstall] Checking del package compatibility...');

const projectRoot = path.resolve(__dirname, '..');
const files = findDelIndex(projectRoot);

if (files.length === 0) {
  console.log('[postinstall] No del/index.js found, skipping patch.');
} else {
  files.forEach(patchFile);
}

console.log('[postinstall] Done.');
