/**
 * Root layout — Her zaman Stack navigator render eder.
 * Auth yönlendirmesi index.tsx tarafından yapılır (navigator mount olduktan sonra).
 *
 * Başlangıç işlemleri:
 *  1. AdMob interstitial yükle (try/catch — native module yoksa sessizce atla)
 *  2. FCM foreground handler başlat
 *  3. Background earthquake polling task kaydet (expo-background-fetch)
 *  4. i18n — SecureStore'dan kaydedilmiş dili geri yükle
 */

import { useEffect } from "react";
import { Stack } from "expo-router";
import "./firebase-init";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import { registerBackgroundEarthquakeTask } from "../src/services/backgroundSeismic";
import { restorePersistedLanguage } from "../src/i18n";
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

        // Arka plan deprem polling task — FCM için fallback
        registerBackgroundEarthquakeTask().catch((err) =>
            console.warn("[Layout] Background task kaydedilemedi:", err)
        );

        // Dil geri yükle — dil ekranında seçilen dil restart sonrası kaybolmasın
        restorePersistedLanguage().catch(() => {});

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
