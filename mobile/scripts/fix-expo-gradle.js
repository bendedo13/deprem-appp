/**
 * Postinstall script — Gradle 8.8 uyumluluk yaması.
 *
 * expo-modules-core@1.12.x içindeki ExpoModulesCorePlugin.gradle
 * dosyasında `components.release` ifadesi Gradle 8.8 ile çalışmaz.
 * Bu script güvenli bir `findByName` çağrısına çevirir.
 *
 * Ayrıca `useExpoPublishing` bloğunu uygulama build'lerinde
 * tamamen atlamak için güvenli bir kontrol ekler.
 */

const fs = require('fs');
const path = require('path');

const PLUGIN_FILE = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-core',
  'android',
  'ExpoModulesCorePlugin.gradle'
);

function patchFile() {
  if (!fs.existsSync(PLUGIN_FILE)) {
    console.log('[fix-expo-gradle] expo-modules-core not found, skipping patch.');
    return;
  }

  let content = fs.readFileSync(PLUGIN_FILE, 'utf8');

  // Already patched?
  if (content.includes('findByName')) {
    console.log('[fix-expo-gradle] Already patched, skipping.');
    return;
  }

  // Replace: from components.release
  // With:    def releaseComponent = components.findByName('release')
  //          if (releaseComponent != null) { from releaseComponent }
  const oldCode = 'from components.release';
  const newCode = [
    "def releaseComponent = components.findByName('release')",
    '          if (releaseComponent != null) {',
    '            from releaseComponent',
    '          }',
  ].join('\n');

  if (!content.includes(oldCode)) {
    console.log('[fix-expo-gradle] Target code not found, skipping.');
    return;
  }

  content = content.replace(oldCode, newCode);
  fs.writeFileSync(PLUGIN_FILE, content, 'utf8');
  console.log('[fix-expo-gradle] ✅ Patched ExpoModulesCorePlugin.gradle for Gradle 8.8 compat.');
}

patchFile();
