/**
 * Postinstall script — Gradle 8.8 + Expo SDK 51 compatibility patches.
 *
 * Patches applied:
 *
 * 1) expo-modules-core — ExpoModulesCorePlugin.gradle
 *    `components.release` fails with Gradle ≥ 8.8 (shipped by RN 0.74.5).
 *    Replace with a safe `findByName('release')` guard.
 *
 * 2) expo-application (and other expo modules) — android/build.gradle
 *    Newer versions may use `plugins { id 'expo-module-gradle-plugin' }`.
 *    Rewrite them to use the classic `apply from:` pattern for SDK 51.
 */

const fs = require('fs');
const path = require('path');

const NM = path.join(__dirname, '..', 'node_modules');

/* ------------------------------------------------------------------ */
/* Patch 1 — ExpoModulesCorePlugin.gradle: components.release fix     */
/* ------------------------------------------------------------------ */

function patchExpoModulesCorePlugin() {
  const pluginFile = path.join(
    NM,
    'expo-modules-core',
    'android',
    'ExpoModulesCorePlugin.gradle'
  );

  if (!fs.existsSync(pluginFile)) {
    console.log('[fix-expo-gradle] expo-modules-core plugin not found, skipping patch #1.');
    return;
  }

  let content = fs.readFileSync(pluginFile, 'utf8');

  // Already patched?
  if (content.includes('findByName')) {
    console.log('[fix-expo-gradle] Patch #1 already applied (findByName), skipping.');
    return;
  }

  const oldCode = 'from components.release';

  if (!content.includes(oldCode)) {
    console.log('[fix-expo-gradle] Patch #1 target not found, skipping.');
    return;
  }

  const newCode = [
    "def releaseComponent = components.findByName('release')",
    '          if (releaseComponent != null) {',
    '            from releaseComponent',
    '          }',
  ].join('\n');

  content = content.replace(oldCode, newCode);
  fs.writeFileSync(pluginFile, content, 'utf8');
  console.log('[fix-expo-gradle] ✅ Patch #1 applied — ExpoModulesCorePlugin.gradle (components.release).');
}

/* ------------------------------------------------------------------ */
/* Patch 2 — Rewrite expo module build.gradle files that use the      */
/*           newer `expo-module-gradle-plugin` plugin-id syntax back  */
/*           to the classic `apply from:` pattern (SDK 51).           */
/* ------------------------------------------------------------------ */

function patchExpoModuleBuildGradle(moduleName) {
  const buildGradle = path.join(NM, moduleName, 'android', 'build.gradle');

  if (!fs.existsSync(buildGradle)) return;

  let content = fs.readFileSync(buildGradle, 'utf8');

  // Detect the newer plugin-id pattern
  if (!content.includes('expo-module-gradle-plugin')) return;

  console.log(`[fix-expo-gradle] Patching ${moduleName}/android/build.gradle — removing expo-module-gradle-plugin...`);

  // Replace "apply plugin: 'expo-module-gradle-plugin'" or plugins { id 'expo-module-gradle-plugin' }
  // with the classic SDK-51 pattern using ExpoModulesCorePlugin.gradle
  const classicHeader = [
    "apply plugin: 'com.android.library'",
    '',
    `group = 'host.exp.exponent'`,
    '',
    'def expoModulesCorePlugin = new File(project(":expo-modules-core").projectDir.absolutePath, "ExpoModulesCorePlugin.gradle")',
    'apply from: expoModulesCorePlugin',
    'applyKotlinExpoModulesCorePlugin()',
    'useCoreDependencies()',
    'useDefaultAndroidSdkVersions()',
    'useExpoPublishing()',
  ].join('\n');

  // Remove plugin block or apply plugin line for expo-module-gradle-plugin
  content = content.replace(
    /plugins\s*\{[^}]*expo-module-gradle-plugin[^}]*\}/gs,
    classicHeader
  );
  content = content.replace(
    /apply\s+plugin:\s*['"]expo-module-gradle-plugin['"]/g,
    classicHeader
  );

  fs.writeFileSync(buildGradle, content, 'utf8');
  console.log(`[fix-expo-gradle] ✅ Patch #2 applied — ${moduleName}/android/build.gradle.`);
}

/* ------------------------------------------------------------------ */
/* Discover & patch ALL expo-* packages                               */
/* ------------------------------------------------------------------ */

function patchAllExpoModules() {
  const dirs = [];

  try {
    // Top-level packages
    for (const entry of fs.readdirSync(NM)) {
      if (entry.startsWith('expo-')) dirs.push(entry);
    }
    // Scoped @expo packages
    const scopedDir = path.join(NM, '@expo');
    if (fs.existsSync(scopedDir)) {
      for (const entry of fs.readdirSync(scopedDir)) {
        dirs.push(`@expo/${entry}`);
      }
    }
  } catch (e) {
    console.log('[fix-expo-gradle] Could not list node_modules, skipping patch #2.');
    return;
  }

  for (const mod of dirs) {
    try {
      patchExpoModuleBuildGradle(mod);
    } catch (e) {
      console.log(`[fix-expo-gradle] Warning: could not patch ${mod}: ${e.message}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Run all patches                                                    */
/* ------------------------------------------------------------------ */

console.log('[fix-expo-gradle] Running postinstall Gradle compatibility patches...');
patchExpoModulesCorePlugin();
patchAllExpoModules();
console.log('[fix-expo-gradle] Done.');
