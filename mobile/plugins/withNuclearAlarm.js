/**
 * Expo Config Plugin — Nuclear Alarm (DND / Silent Mode Bypass)
 *
 * Yapılan işlemler:
 *  1. AndroidManifest.xml → MODIFY_AUDIO_SETTINGS + ACCESS_NOTIFICATION_POLICY izinleri eklenir.
 *     (USE_FULL_SCREEN_INTENT zaten app.json permissions listesinde mevcut.)
 *  2. android/app/src/main/java/.../NuclearAlarmModule.kt → STREAM_ALARM kanalını maksimum
 *     sese getiren native Kotlin modülü oluşturulur.
 *  3. MainApplication.kt içine modül kaydı eklenir (reactNativeHost → packages listesi).
 *
 * EAS Build güvenli: Hiçbir manuel gradle/manifest değişikliği gerekmiyor.
 * Modül tamamen Config Plugin aracılığıyla yönetilir.
 */

const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const PLUGIN_MARKER = "// [withNuclearAlarm-v1]";

// ── 1. AndroidManifest.xml — İzin enjeksiyonu ─────────────────────────────
function addManifestPermissions(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    const mainApplication = manifest.manifest;

    if (!mainApplication["uses-permission"]) {
      mainApplication["uses-permission"] = [];
    }

    const permissions = mainApplication["uses-permission"];
    const requiredPermissions = [
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.ACCESS_NOTIFICATION_POLICY",
    ];

    for (const perm of requiredPermissions) {
      const alreadyExists = permissions.some(
        (p) => p.$?.["android:name"] === perm
      );
      if (!alreadyExists) {
        permissions.push({ $: { "android:name": perm } });
      }
    }

    return modConfig;
  });
}

// ── 2. NuclearAlarmModule.kt — Native Kotlin modülü oluştur ───────────────
function createNativeAlarmModule(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;

      // Android paket yolu: com.quakesense → com/quakesense
      const packageName =
        modConfig.android?.package ?? "com.quakesense";
      const packagePath = packageName.replace(/\./g, "/");
      const modulePath = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        packagePath
      );

      // Klasör yoksa oluştur
      if (!fs.existsSync(modulePath)) {
        fs.mkdirSync(modulePath, { recursive: true });
      }

      const moduleFile = path.join(modulePath, "NuclearAlarmModule.kt");

      // Dosya zaten doğru marker ile yazılmışsa güncelleme
      if (
        fs.existsSync(moduleFile) &&
        fs.readFileSync(moduleFile, "utf8").includes(PLUGIN_MARKER)
      ) {
        return modConfig;
      }

      const kotlinCode = `${PLUGIN_MARKER}
package ${packageName}

import android.content.Context
import android.media.AudioManager
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * NuclearAlarmModule — Android STREAM_ALARM kanalını maksimum sese çıkarır.
 * DND (Do Not Disturb) / Sessiz mod aktif olsa bile alarm sesi duyulur.
 * MODIFY_AUDIO_SETTINGS + ACCESS_NOTIFICATION_POLICY izinleri gerektirir.
 */
class NuclearAlarmModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "NuclearAlarm"

    private val audioManager: AudioManager
        get() = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    /**
     * STREAM_ALARM kanalını maksimum seviyeye çıkarır.
     * Sessiz modda veya DND'de bile çalışır.
     */
    @ReactMethod
    fun setAlarmVolumeMax(promise: Promise) {
        try {
            val am = audioManager
            val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            am.setStreamVolume(
                AudioManager.STREAM_ALARM,
                maxVol,
                AudioManager.FLAG_SHOW_UI or AudioManager.FLAG_PLAY_SOUND
            )

            // Android 6+ için DND bypass — setRingerMode RINGTONE gerektirebilir
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    // INTERRUPTION_FILTER_ALL → tüm bildirimlere izin ver
                    am.setRingerMode(AudioManager.RINGER_MODE_NORMAL)
                } catch (e: SecurityException) {
                    // ACCESS_NOTIFICATION_POLICY yoksa sessiz geç, alarm zaten çalar
                }
            }

            promise.resolve("ALARM_VOLUME_MAX: $maxVol")
        } catch (e: Exception) {
            promise.reject("NUCLEAR_ALARM_ERROR", e.message ?: "Bilinmeyen hata", e)
        }
    }

    /**
     * Mevcut STREAM_ALARM ses seviyesini döndürür.
     */
    @ReactMethod
    fun getAlarmVolume(promise: Promise) {
        try {
            val current = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
            val max = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            promise.resolve(mapOf("current" to current, "max" to max))
        } catch (e: Exception) {
            promise.reject("NUCLEAR_ALARM_ERROR", e.message ?: "Bilinmeyen hata", e)
        }
    }

    /**
     * Alarm sesini geri 0'a alır (alarm durduğunda çağrılabilir).
     */
    @ReactMethod
    fun restoreVolume(savedVolume: Int, promise: Promise) {
        try {
            audioManager.setStreamVolume(
                AudioManager.STREAM_ALARM,
                savedVolume.coerceAtLeast(0),
                0
            )
            promise.resolve("VOLUME_RESTORED: $savedVolume")
        } catch (e: Exception) {
            promise.reject("NUCLEAR_ALARM_ERROR", e.message ?: "Bilinmeyen hata", e)
        }
    }
}
`;

      fs.writeFileSync(moduleFile, kotlinCode, "utf8");

      // NuclearAlarmPackage.kt — modülü React Native'e kaydet
      const packageFile = path.join(modulePath, "NuclearAlarmPackage.kt");
      if (!fs.existsSync(packageFile) || !fs.readFileSync(packageFile, "utf8").includes(PLUGIN_MARKER)) {
        const packageCode = `${PLUGIN_MARKER}
package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NuclearAlarmPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(NuclearAlarmModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;
        fs.writeFileSync(packageFile, packageCode, "utf8");
      }

      return modConfig;
    },
  ]);
}

// ── 3. MainApplication.kt — Package kaydı ────────────────────────────────
function registerPackageInMainApplication(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const packageName =
        modConfig.android?.package ?? "com.quakesense";
      const packagePath = packageName.replace(/\./g, "/");

      const mainAppPath = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        packagePath,
        "MainApplication.kt"
      );

      if (!fs.existsSync(mainAppPath)) {
        // MainApplication henüz oluşturulmamış (prebuild öncesi) — atla
        return modConfig;
      }

      let contents = fs.readFileSync(mainAppPath, "utf8");

      // Zaten kayıtlıysa tekrar ekleme
      if (contents.includes("NuclearAlarmPackage")) {
        return modConfig;
      }

      // getPackages() metodunu bul ve NuclearAlarmPackage ekle
      const insertAfter = "packages.add(new ReactNativeHostWrapper.PackagesProviderHelper())";
      const kotlinInsert = "packages.add(NuclearAlarmPackage())";

      // Kotlin versiyonunda aramayı dene
      if (contents.includes("NuclearAlarmPackage()")) {
        return modConfig; // Zaten var
      }

      // Packages listesine ekle — "return packages" veya "add(MainReactPackage())" satırı sonrasına
      const insertionPatterns = [
        /(\s+packages\.add\(ReactNativeHostWrapper\.PackagesProviderHelper\(\)\))/,
        /(\s+packages\.add\(MainReactPackage\(\)\))/,
        /(override fun getPackages.*?\n\s+val packages.*?\n)/s,
      ];

      let patched = false;
      for (const pattern of insertionPatterns) {
        if (pattern.test(contents)) {
          contents = contents.replace(
            pattern,
            `$1\n            packages.add(NuclearAlarmPackage())`
          );
          patched = true;
          break;
        }
      }

      // Fallback: import ekle ve return packages satırına ekle
      if (!patched) {
        contents = contents.replace(
          /return packages/,
          `packages.add(NuclearAlarmPackage())\n        return packages`
        );
      }

      // Import ekle
      if (!contents.includes("import ${packageName}.NuclearAlarmPackage")) {
        contents = contents.replace(
          /^(package .+)$/m,
          `$1\nimport ${packageName}.NuclearAlarmPackage`
        );
      }

      fs.writeFileSync(mainAppPath, contents, "utf8");
      return modConfig;
    },
  ]);
}

// ── Ana Plugin ─────────────────────────────────────────────────────────────
const withNuclearAlarm = (config) => {
  config = addManifestPermissions(config);
  config = createNativeAlarmModule(config);
  config = registerPackageInMainApplication(config);
  return config;
};

module.exports = withNuclearAlarm;
