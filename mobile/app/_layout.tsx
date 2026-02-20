/**
 * Root layout — uygulama başlangıcında token kontrolü yapar.
 * Token varsa tabs'a, yoksa auth'a yönlendirir.
 */

import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import { hasToken } from "../src/services/authService";
import "../src/i18n";  // i18next init — uygulama başlarken dil yüklenir

setBackgroundEarthquakeHandler();

export default function RootLayout() {
  useEffect(() => {
    // FCM foreground handler kur
    const unsub = setupFcmEarthquakeHandler();

    // Auth durumuna göre yönlendir
    hasToken().then((exists) => {
      router.replace(exists ? "/(tabs)" : "/(auth)/login");
    });

    return unsub;
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
