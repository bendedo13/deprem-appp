/**
 * Local Expo config plugin for react-native-google-mobile-ads.
 *
 * Handles:
 * 1. AndroidManifest.xml — AdMob APPLICATION_ID meta-data
 * 2. android/build.gradle — googleMobileAdsJson ext property for Gradle
 * 3. iOS Info.plist — GADApplicationIdentifier
 */
const {
    withAndroidManifest,
    withInfoPlist,
    withProjectBuildGradle,
    withDangerousMod,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withGoogleMobileAds(config, { androidAppId, iosAppId } = {}) {
    // 1) Android: Add APPLICATION_ID to AndroidManifest.xml
    if (androidAppId) {
        config = withAndroidManifest(config, (config) => {
            const mainApplication =
                config.modResults.manifest.application?.[0];
            if (!mainApplication) return config;

            if (!mainApplication["meta-data"]) {
                mainApplication["meta-data"] = [];
            }

            mainApplication["meta-data"] = mainApplication["meta-data"].filter(
                (item) =>
                    item.$?.["android:name"] !==
                    "com.google.android.gms.ads.APPLICATION_ID"
            );

            mainApplication["meta-data"].push({
                $: {
                    "android:name":
                        "com.google.android.gms.ads.APPLICATION_ID",
                    "android:value": androidAppId,
                },
            });

            return config;
        });

        // 2) Android: Inject googleMobileAdsJson ext into root build.gradle
        //    so the package's build.gradle can read it
        config = withProjectBuildGradle(config, (config) => {
            if (config.modResults.language !== "groovy") return config;

            const injection = `
// [withGoogleMobileAds] Inject googleMobileAdsJson ext for react-native-google-mobile-ads
import groovy.json.JsonOutput
rootProject.ext.googleMobileAdsJson = [
    raw: ["android_app_id": "${androidAppId}"],
    isFlagEnabled: { key, defaultValue -> return defaultValue },
    getStringValue: { key, defaultValue ->
        def map = ["android_app_id": "${androidAppId}"]
        return map[key] ? map[key] : defaultValue
    }
]
// [/withGoogleMobileAds]
`;

            // Only inject once
            if (!config.modResults.contents.includes("[withGoogleMobileAds]")) {
                config.modResults.contents =
                    injection + config.modResults.contents;
            }

            return config;
        });
    }

    // 3) iOS: Add GADApplicationIdentifier to Info.plist
    if (iosAppId) {
        config = withInfoPlist(config, (config) => {
            config.modResults.GADApplicationIdentifier = iosAppId;
            return config;
        });
    }

    return config;
}

module.exports = withGoogleMobileAds;
