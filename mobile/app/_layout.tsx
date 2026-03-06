/**
 * Root layout — Her zaman Stack navigator render eder.
 * Auth yönlendirmesi index.tsx tarafından yapılır (navigator mount olduktan sonra).
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import "./firebase-init";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import "../src/i18n";

setBackgroundEarthquakeHandler();

export default function RootLayout() {
    useEffect(() => {
        // AdMob Interstitial — try/catch ile sarılı (native module yoksa crash önlenir)
        let adCleanup = () => {};
        try {
            const { InterstitialAd, AdEventType } = require("react-native-google-mobile-ads");
            const { getInterstitialId } = require("../src/services/adService");
            const interstitial = InterstitialAd.createForAdRequest(getInterstitialId(), {
                requestNonPersonalizedAdsOnly: true,
            });
            const adUnsub = interstitial.addAdEventListener(AdEventType.LOADED, () => {
                interstitial.show();
            });
            interstitial.load();
            adCleanup = () => adUnsub();
        } catch {
            // AdMob başlatılamazsa uygulamayı durdurma
        }

        // FCM foreground handler
        const fcmUnsub = setupFcmEarthquakeHandler();

        return () => {
            adCleanup();
            fcmUnsub();
        };
    }, []);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="more" />
        </Stack>
    );
}
