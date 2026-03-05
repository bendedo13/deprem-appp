/**
 * Root layout — Her zaman Stack navigator render eder.
 * Auth yönlendirmesi index.tsx tarafından yapılır (navigator mount olduktan sonra).
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import "./firebase-init";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import { InterstitialAd, AdEventType } from "react-native-google-mobile-ads";
import { getInterstitialId } from "../src/services/adService";
import "../src/i18n";

setBackgroundEarthquakeHandler();

export default function RootLayout() {
    useEffect(() => {
        // AdMob Interstitial
        let adCleanup = () => {};
        try {
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
