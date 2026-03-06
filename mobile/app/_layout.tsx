/**
 * Root layout — Her zaman Stack navigator render eder.
 * Auth yönlendirmesi index.tsx tarafından yapılır (navigator mount olduktan sonra).
 *
 * Entegrasyonlar:
 * - AppProvider (Görev 6: Performans Context)
 * - Background Service (Görev 1: Foreground Service)
 * - FCM Earthquake Handler
 * - AdMob
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import "./firebase-init";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import "../src/i18n";
import { AppProvider } from "../src/context/AppContext";
import {
    defineBackgroundSensorTask,
    setupAppStateListener,
    isBackgroundServiceActive,
    startBackgroundSensorService,
} from "../src/services/backgroundService";

// Modül seviyesinde background task tanımla (app bundle yüklendiğinde)
defineBackgroundSensorTask();
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

        // Görev 1: Background service — önceki oturumda aktifse tekrar başlat
        isBackgroundServiceActive().then((active) => {
            if (active) {
                startBackgroundSensorService();
            }
        });

        // Görev 1: App state listener — arka plana geçişlerde sticky notification
        const appStateCleanup = setupAppStateListener();

        return () => {
            adCleanup();
            fcmUnsub();
            appStateCleanup();
        };
    }, []);

    return (
        <AppProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="more" />
            </Stack>
        </AppProvider>
    );
}
