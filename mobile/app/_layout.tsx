/**
 * Root layout — uygulama başlangıcında:
 * 1. Onboarding tamamlandı mı kontrol eder
 * 2. Token kontrolü yapar
 * Onboarding → Auth → Tabs sırasıyla yönlendirir.
 */

import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as SecureStore from "expo-secure-store";
import "./firebase-init";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import { hasToken } from "../src/services/authService";
import { InterstitialAd, AdEventType } from "react-native-google-mobile-ads";
import { getInterstitialId } from "../src/services/adService";
import "../src/i18n";
import { Colors } from "../src/constants/theme";

const ONBOARDING_KEY = "quakesense_onboarding_done";

setBackgroundEarthquakeHandler();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // AdMob Interstitial
    const interstitial = InterstitialAd.createForAdRequest(getInterstitialId(), {
      requestNonPersonalizedAdsOnly: true,
    });
    const adUnsub = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitial.show();
    });
    interstitial.load();

    // FCM foreground handler kur
    const unsub = setupFcmEarthquakeHandler();

    // Onboarding + Auth durumuna göre yönlendir
    (async () => {
      const onboardingDone = await SecureStore.getItemAsync(ONBOARDING_KEY);
      if (!onboardingDone) {
        router.replace("/onboarding");
      } else {
        const tokenExists = await hasToken();
        router.replace(tokenExists ? "/(tabs)" : "/(auth)/login");
      }
      setReady(true);
    })();

    return () => {
      adUnsub();
      unsub();
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
