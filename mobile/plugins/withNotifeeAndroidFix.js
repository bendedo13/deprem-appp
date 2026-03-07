/**
 * Expo Config Plugin — JitPack Notifee Timeout Fix
 *
 * Problem:
 *   @notifee/react-native ships a local Maven repo (android/libs) for its
 *   native `app.notifee:core` artifact.  However Gradle also searches ALL
 *   configured remote Maven repositories (including JitPack, which is added by
 *   other dependencies such as react-native-google-mobile-ads or Firebase).
 *   Because the version specifier is `+` (=latest), Gradle fetches
 *   maven-metadata.xml from every repo — and when JitPack times out the whole
 *   build crashes.
 *
 * Fix:
 *   1.  Exclude `app.notifee` group from JitPack so Gradle never queries it
 *       for Notifee artifacts.  The local Maven repo inside the npm package
 *       already provides everything needed.
 *   2.  Increase Gradle HTTP timeouts from the default 30 s → 180 s as a
 *       safety-net for any other JitPack-hosted dependency.
 */

const {
  withProjectBuildGradle,
  withGradleProperties,
} = require("expo/config-plugins");

const MARKER = "// [withNotifeeAndroidFix]";

/** Exclude app.notifee group from JitPack in root build.gradle */
function addJitpackExclusion(config) {
  return withProjectBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== "groovy") return gradleConfig;
    if (gradleConfig.modResults.contents.includes(MARKER)) return gradleConfig;

    const snippet = `
${MARKER}
// Exclude app.notifee from JitPack — it ships via a local Maven repo inside
// the @notifee/react-native npm package.  Querying JitPack for the dynamic "+"
// version causes "Read timed out" errors on EAS build servers.
allprojects {
    repositories.configureEach { repo ->
        if (repo instanceof MavenArtifactRepository) {
            if (repo.url.toString().contains("jitpack.io")) {
                repo.content {
                    excludeGroup("app.notifee")
                }
            }
        }
    }
}
`;
    gradleConfig.modResults.contents += snippet;
    return gradleConfig;
  });
}

/** Increase Gradle HTTP connection + socket timeout (millis) */
function increaseHttpTimeout(config) {
  return withGradleProperties(config, (gradleConfig) => {
    // Remove any existing timeout entries first
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
  config = addJitpackExclusion(config);
  config = increaseHttpTimeout(config);
  return config;
};

module.exports = withNotifeeAndroidFix;
