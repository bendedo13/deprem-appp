/**
 * Expo Config Plugin — JitPack Notifee Timeout Fix (v2)
 *
 * Root cause:
 *   @notifee/react-native bundles its native `app.notifee:core` AAR inside
 *   the npm package at `android/libs/` as a local Maven repo.  The dependency
 *   is declared with `version: '+'` (dynamic).  Gradle resolves `+` by
 *   querying ALL configured Maven repositories — including JitPack (added by
 *   react-native-google-mobile-ads).  When JitPack times out the build fails.
 *
 * Fix strategy (belt-and-suspenders):
 *   1. settings.gradle — Add `exclusiveContent` filter so the local Notifee
 *      Maven repo is the ONLY source for `app.notifee` group, and add
 *      `excludeGroup` on JitPack so it never looks there for Notifee.
 *   2. build.gradle   — Force `app.notifee:core` to the exact bundled version
 *      (`202108261754`) via `resolutionStrategy`, eliminating the dynamic `+`
 *      resolution entirely.
 *   3. gradle.properties — Increase HTTP timeouts as extra safety net.
 */

const {
  withProjectBuildGradle,
  withSettingsGradle,
  withGradleProperties,
} = require("expo/config-plugins");

const SETTINGS_MARKER = "// [withNotifeeAndroidFix-settings]";
const BUILD_MARKER = "// [withNotifeeAndroidFix-build]";

// Exact version of app.notifee:core bundled in node_modules/@notifee/react-native/android/libs
const NOTIFEE_CORE_VERSION = "202108261754";

/**
 * 1. Patch settings.gradle:
 *    - Exclude app.notifee from JitPack in dependencyResolutionManagement
 *    - Also handle any allprojects block
 */
function patchSettingsGradle(config) {
  return withSettingsGradle(config, (settingsConfig) => {
    let contents = settingsConfig.modResults.contents;
    if (contents.includes(SETTINGS_MARKER)) return settingsConfig;

    // Inject a `gradle.beforeProject` callback that filters JitPack for every project
    const snippet = `
${SETTINGS_MARKER}
// Prevent JitPack from being queried for app.notifee artifacts.
// The local Maven repo inside @notifee/react-native already provides them.
gradle.beforeProject { proj ->
    proj.repositories.configureEach { repo ->
        if (repo instanceof MavenArtifactRepository) {
            def repoUrl = repo.url.toString()
            if (repoUrl.contains("jitpack.io")) {
                repo.content {
                    excludeGroup("app.notifee")
                }
            }
        }
    }
}
`;
    contents += snippet;
    settingsConfig.modResults.contents = contents;
    return settingsConfig;
  });
}

/**
 * 2. Patch root build.gradle:
 *    - Force app.notifee:core to exact bundled version via resolutionStrategy
 *    - This eliminates the `+` dynamic version lookup entirely
 */
function patchBuildGradle(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== "groovy") return gradleConfig;
    let contents = gradleConfig.modResults.contents;
    if (contents.includes(BUILD_MARKER)) return gradleConfig;

    const snippet = `
${BUILD_MARKER}
// Force app.notifee:core to exact bundled version — no dynamic '+' resolution needed.
// Also exclude JitPack from resolving app.notifee in every subproject.
subprojects { sub ->
    sub.configurations.configureEach { configuration ->
        configuration.resolutionStrategy {
            force 'app.notifee:core:${NOTIFEE_CORE_VERSION}'
        }
    }
    sub.afterEvaluate {
        sub.repositories.configureEach { repo ->
            if (repo instanceof MavenArtifactRepository) {
                if (repo.url.toString().contains("jitpack.io")) {
                    repo.content {
                        excludeGroup("app.notifee")
                    }
                }
            }
        }
    }
}
`;
    contents += snippet;
    gradleConfig.modResults.contents = contents;
    return gradleConfig;
  });
}

/**
 * 3. Increase Gradle HTTP timeouts in gradle.properties (safety net)
 */
function increaseHttpTimeout(config) {
  return withGradleProperties(config, (gradleConfig) => {
    gradleConfig.modResults = gradleConfig.modResults.filter(
      (p) =>
        !(
          p.type === "property" &&
          p.key &&
          (p.key.includes("http.connectionTimeout") ||
            p.key.includes("http.socketTimeout"))
        )
    );

    gradleConfig.modResults.push(
      {
        type: "property",
        key: "systemProp.org.gradle.internal.http.connectionTimeout",
        value: "180000",
      },
      {
        type: "property",
        key: "systemProp.org.gradle.internal.http.socketTimeout",
        value: "180000",
      }
    );

    return gradleConfig;
  });
}

/** Main plugin entry */
const withNotifeeAndroidFix = (config) => {
  config = patchSettingsGradle(config);
  config = patchBuildGradle(config);
  config = increaseHttpTimeout(config);
  return config;
};

module.exports = withNotifeeAndroidFix;
