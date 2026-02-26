/**
 * Root layout — uygulama başlangıcında token kontrolü yapar.
 * Token varsa tabs'a, yoksa auth'a yönlendirir.
 */

import { useEffect } from "react";
import { Stack, router } from "expo-router";
import "./firebase-init";  // Firebase initialization - MUST BE FIRST
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import { hasToken } from "../src/services/authService";
import "../src/i18n";  // i18next init — uygulama başlarken dil yüklenir

setBackgroundEarthquakeHandler();

export default function RootLayout() {
  useEffect(() => {
    // AdMob — sadece paket kuruluysa çalıştır
    let adUnsub: (() => void) | null = null;
    try {
      const { InterstitialAd, AdEventType } = require("react-native-google-mobile-ads");
      const { getInterstitialId } = require("../src/services/adService");
      const interstitial = InterstitialAd.createForAdRequest(getInterstitialId(), {
        requestNonPersonalizedAdsOnly: true,
      });
      adUnsub = interstitial.addAdEventListener(AdEventType.LOADED, () => {
        interstitial.show();
      });
      interstitial.load();
    } catch {
      // react-native-google-mobile-ads kurulu değilse sessizce devam et
    }

    // FCM foreground handler kur
    const unsub = setupFcmEarthquakeHandler();

    // Auth durumuna göre yönlendir
    hasToken().then((exists) => {
      router.replace(exists ? "/(tabs)" : "/(auth)/login");
    });

    return () => {
      adUnsub?.();
      unsub();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
