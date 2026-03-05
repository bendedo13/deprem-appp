/**
 * Local Expo config plugin for react-native-google-mobile-ads.
 * Adds AdMob APPLICATION_ID to AndroidManifest.xml and iOS Info.plist.
 */
const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

function withGoogleMobileAds(config, { androidAppId, iosAppId } = {}) {
    if (androidAppId) {
        config = withAndroidManifest(config, (config) => {
            const mainApplication =
                config.modResults.manifest.application?.[0];
            if (!mainApplication) return config;

            if (!mainApplication["meta-data"]) {
                mainApplication["meta-data"] = [];
            }

            // Remove existing AdMob meta-data if present
            mainApplication["meta-data"] = mainApplication["meta-data"].filter(
                (item) =>
                    item.$?.["android:name"] !==
                    "com.google.android.gms.ads.APPLICATION_ID"
            );

            // Add AdMob Application ID
            mainApplication["meta-data"].push({
                $: {
                    "android:name":
                        "com.google.android.gms.ads.APPLICATION_ID",
                    "android:value": androidAppId,
                },
            });

            return config;
        });
    }

    if (iosAppId) {
        config = withInfoPlist(config, (config) => {
            config.modResults.GADApplicationIdentifier = iosAppId;
            return config;
        });
    }

    return config;
}

module.exports = withGoogleMobileAds;
