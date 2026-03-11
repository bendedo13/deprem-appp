/**
 * Expo Config Plugin — Seismic Foreground Service
 *
 * Yapılan işlemler:
 *  1. AndroidManifest.xml → FOREGROUND_SERVICE_LOCATION izni eklenir.
 *     (FOREGROUND_SERVICE zaten app.json'da mevcut.)
 *  2. AndroidManifest.xml → SeismicForegroundService <service> etiketi eklenir.
 *     android:foregroundServiceType="location" → Doze Mode'da da çalışır.
 *  3. android/app/src/main/java/com/quakesense/SeismicForegroundService.kt yazılır.
 *     - SIGNIFICANT_MOTION sensörü dinler (donanımsal, batarya dostu).
 *     - Hareket algılandığında JS tarafına event gönderir.
 *     - STA/LTA için ivmeölçeri yalnızca SIGNIFICANT_MOTION sonrası aktive eder.
 *  4. SeismicForegroundServicePackage.kt → React Native'e kayıt.
 *
 * Not: TYPE_SIGNIFICANT_MOTION cihazda yoksa TYPE_LINEAR_ACCELERATION'a fallback yapar.
 */

const {
  withAndroidManifest,
  withDangerousMod,
} = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

const PLUGIN_MARKER = "// [withSeismicForegroundService-v1]";
const SERVICE_NAME = ".SeismicForegroundService";

// ── 1. AndroidManifest — İzin + Service etiketi ───────────────────────────
function patchManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;

    // İzin ekle
    if (!manifest["uses-permission"]) manifest["uses-permission"] = [];
    const perms = manifest["uses-permission"];

    const requiredPerms = [
      "android.permission.FOREGROUND_SERVICE_LOCATION",
    ];
    for (const perm of requiredPerms) {
      if (!perms.some((p) => p.$?.["android:name"] === perm)) {
        perms.push({ $: { "android:name": perm } });
      }
    }

    // <application> içine <service> etiketi ekle
    const application = manifest.application?.[0];
    if (!application) return modConfig;

    if (!application.service) application.service = [];
    const services = application.service;

    const alreadyExists = services.some(
      (s) => s.$?.["android:name"] === SERVICE_NAME
    );
    if (!alreadyExists) {
      services.push({
        $: {
          "android:name": SERVICE_NAME,
          "android:foregroundServiceType": "location",
          "android:exported": "false",
          "android:enabled": "true",
        },
      });
    }

    return modConfig;
  });
}

// ── 2. SeismicForegroundService.kt — Native Service ──────────────────────
function createForegroundServiceKotlin(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const packageName = modConfig.android?.package ?? "com.quakesense";
      const packagePath = packageName.replace(/\./g, "/");
      const modulePath = path.join(
        projectRoot, "android", "app", "src", "main", "java", packagePath
      );

      if (!fs.existsSync(modulePath)) {
        fs.mkdirSync(modulePath, { recursive: true });
      }

      const serviceFile = path.join(modulePath, "SeismicForegroundService.kt");
      if (
        fs.existsSync(serviceFile) &&
        fs.readFileSync(serviceFile, "utf8").includes(PLUGIN_MARKER)
      ) {
        return modConfig;
      }

      const kotlinCode = `${PLUGIN_MARKER}
package ${packageName}

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * SeismicForegroundService — Doze Mode'da bile çalışan deprem sensör servisi.
 *
 * Strateji (batarya dostu):
 *  1. TYPE_SIGNIFICANT_MOTION (donanımsal) dinler — sıfır batarya tüketimi.
 *  2. Hareket algılandığında TYPE_LINEAR_ACCELERATION aktive edilir (kısa süre).
 *  3. İvmeölçer verisi JS tarafına "SeismicMotion" eventi olarak iletilir.
 *  4. JS tarafındaki STA/LTA algoritması tetiklenir.
 *
 * Doze Mode: foregroundServiceType="location" ile sistem tarafından uyandırılır.
 */
class SeismicForegroundService : Service() {

    companion object {
        const val TAG = "SeismicFgService"
        const val CHANNEL_ID = "seismic_foreground"
        const val NOTIFICATION_ID = 9001
        const val ACTION_START = "START_SEISMIC_SERVICE"
        const val ACTION_STOP = "STOP_SEISMIC_SERVICE"
        const val EVENT_MOTION = "SeismicMotion"
        const val EVENT_SIGNIFICANT = "SeismicSignificantMotion"

        /** Statik ReactContext referansı — JS'e event göndermek için */
        @Volatile var reactContext: ReactApplicationContext? = null

        fun sendEventToJS(context: ReactApplicationContext?, eventName: String, data: com.facebook.react.bridge.WritableMap) {
            try {
                context
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit(eventName, data)
            } catch (e: Exception) {
                Log.w(TAG, "JS event gönderilemedi: \${e.message}")
            }
        }
    }

    private lateinit var sensorManager: SensorManager
    private var significantMotionSensor: Sensor? = null
    private var linearAccelSensor: Sensor? = null
    private var isAccelActive = false

    // ── Significant Motion Trigger ─────────────────────────────────────────
    private val significantMotionTrigger = object : android.hardware.TriggerEventListener() {
        override fun onTrigger(event: android.hardware.TriggerEvent) {
            Log.i(TAG, "SignificantMotion algılandı — ivmeölçer aktive ediliyor")
            val params = Arguments.createMap()
            params.putString("type", "SIGNIFICANT_MOTION")
            params.putDouble("timestamp", System.currentTimeMillis().toDouble())
            sendEventToJS(reactContext, EVENT_SIGNIFICANT, params)

            // İvmeölçeri 10 saniye aktive et, sonra kapat
            startAccelerometer()
            android.os.Handler(mainLooper).postDelayed({ stopAccelerometer() }, 10_000L)

            // Significant Motion one-shot — yeniden kayıt gerekir
            registerSignificantMotion()
        }
    }

    // ── Linear Accelerometer Listener ─────────────────────────────────────
    private val accelListener = object : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val mag = Math.sqrt((x * x + y * y + z * z).toDouble()).toFloat()

            val params = Arguments.createMap()
            params.putDouble("x", x.toDouble())
            params.putDouble("y", y.toDouble())
            params.putDouble("z", z.toDouble())
            params.putDouble("magnitude", mag.toDouble())
            params.putDouble("timestamp", System.currentTimeMillis().toDouble())
            sendEventToJS(reactContext, EVENT_MOTION, params)
        }

        override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {}
    }

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        significantMotionSensor = sensorManager.getDefaultSensor(Sensor.TYPE_SIGNIFICANT_MOTION)
        linearAccelSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LINEAR_ACCELERATION)
            ?: sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) // Fallback
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> { stopSelf(); return START_NOT_STICKY }
        }

        startForegroundWithNotification()
        registerSignificantMotion()
        Log.i(TAG, "Seismic Foreground Service başlatıldı")
        return START_STICKY  // Sistem kapatırsa yeniden başlat
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.cancelTriggerSensor(significantMotionTrigger, significantMotionSensor)
        stopAccelerometer()
        Log.i(TAG, "Seismic Foreground Service durduruldu")
    }

    private fun registerSignificantMotion() {
        val sensor = significantMotionSensor
        if (sensor != null) {
            sensorManager.requestTriggerSensor(significantMotionTrigger, sensor)
            Log.d(TAG, "SignificantMotion sensörü kayıtlı")
        } else {
            // Cihazda TYPE_SIGNIFICANT_MOTION yoksa direkt ivmeölçere geç
            Log.w(TAG, "TYPE_SIGNIFICANT_MOTION yok — direkt ivmeölçer kullanılıyor")
            startAccelerometer()
        }
    }

    private fun startAccelerometer() {
        if (isAccelActive) return
        linearAccelSensor?.let {
            // SENSOR_DELAY_NORMAL = batarya dostu (200ms aralık)
            sensorManager.registerListener(accelListener, it, SensorManager.SENSOR_DELAY_NORMAL)
            isAccelActive = true
            Log.d(TAG, "İvmeölçer aktive edildi")
        }
    }

    private fun stopAccelerometer() {
        if (!isAccelActive) return
        sensorManager.unregisterListener(accelListener)
        isAccelActive = false
        Log.d(TAG, "İvmeölçer deaktive edildi")
    }

    private fun startForegroundWithNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Deprem İzleme",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Arka planda deprem sinyali izleniyor"
                setShowBadge(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("QuakeSense Aktif")
            .setContentText("Deprem sinyali arka planda izleniyor...")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)
    }
}
`;

      fs.writeFileSync(serviceFile, kotlinCode, "utf8");

      // Package kaydı
      const packageFile = path.join(modulePath, "SeismicForegroundServicePackage.kt");
      if (!fs.existsSync(packageFile) || !fs.readFileSync(packageFile, "utf8").includes(PLUGIN_MARKER)) {
        const packageCode = `${PLUGIN_MARKER}
package ${packageName}

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SeismicForegroundServicePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(SeismicForegroundServiceModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;
        fs.writeFileSync(packageFile, packageCode, "utf8");
      }

      // SeismicForegroundServiceModule.kt — JS'den servisi başlat/durdur
      const moduleFile = path.join(modulePath, "SeismicForegroundServiceModule.kt");
      if (!fs.existsSync(moduleFile) || !fs.readFileSync(moduleFile, "utf8").includes(PLUGIN_MARKER)) {
        const moduleCode = `${PLUGIN_MARKER}
package ${packageName}

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * SeismicForegroundServiceModule — JS'den Foreground Service'i başlatır/durdurur.
 * Ayrıca ReactContext referansını servise geçirir (event emit için).
 */
class SeismicForegroundServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SeismicForegroundService"

    override fun initialize() {
        super.initialize()
        // ReactContext'i servise geç (event emit için)
        SeismicForegroundService.reactContext = reactApplicationContext
    }

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, SeismicForegroundService::class.java).apply {
                action = SeismicForegroundService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve("SEISMIC_SERVICE_STARTED")
        } catch (e: Exception) {
            promise.reject("SEISMIC_SERVICE_ERROR", e.message ?: "Servis başlatılamadı", e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, SeismicForegroundService::class.java).apply {
                action = SeismicForegroundService.ACTION_STOP
            }
            reactApplicationContext.startService(intent)
            promise.resolve("SEISMIC_SERVICE_STOPPED")
        } catch (e: Exception) {
            promise.reject("SEISMIC_SERVICE_ERROR", e.message ?: "Servis durdurulamadı", e)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) { /* NativeEventEmitter için gerekli */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* NativeEventEmitter için gerekli */ }
}
`;
        fs.writeFileSync(moduleFile, moduleCode, "utf8");
      }

      return modConfig;
    },
  ]);
}

// ── 3. MainApplication — Package kayıtları ───────────────────────────────
function registerPackagesInMainApplication(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const packageName = modConfig.android?.package ?? "com.quakesense";
      const packagePath = packageName.replace(/\./g, "/");
      const mainAppPath = path.join(
        projectRoot, "android", "app", "src", "main", "java", packagePath, "MainApplication.kt"
      );

      if (!fs.existsSync(mainAppPath)) return modConfig;

      let contents = fs.readFileSync(mainAppPath, "utf8");
      if (contents.includes("SeismicForegroundServicePackage")) return modConfig;

      contents = contents.replace(
        /return packages/,
        `packages.add(SeismicForegroundServicePackage())\n        return packages`
      );

      if (!contents.includes(`import ${packageName}.SeismicForegroundServicePackage`)) {
        contents = contents.replace(
          /^(package .+)$/m,
          `$1\nimport ${packageName}.SeismicForegroundServicePackage`
        );
      }

      fs.writeFileSync(mainAppPath, contents, "utf8");
      return modConfig;
    },
  ]);
}

const withSeismicForegroundService = (config) => {
  config = patchManifest(config);
  config = createForegroundServiceKotlin(config);
  config = registerPackagesInMainApplication(config);
  return config;
};

module.exports = withSeismicForegroundService;
