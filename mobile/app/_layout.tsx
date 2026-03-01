/**
 * Root layout — Firebase Auth state dinleyerek yönlendirme yapar.
 * Kullanıcı girişliyse tabs'a, değilse auth'a yönlendirir.
 */

import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import "./firebase-init";
import { onAuthStateChanged } from "../src/services/firebaseAuthService";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import { InterstitialAd, AdEventType } from "react-native-google-mobile-ads";
import { getInterstitialId } from "../src/services/adService";
import { Colors } from "../src/constants/theme";
import "../src/i18n";

setBackgroundEarthquakeHandler();

export default function RootLayout() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // AdMob Interstitial
        try {
            const interstitial = InterstitialAd.createForAdRequest(getInterstitialId(), {
                requestNonPersonalizedAdsOnly: true,
            });
            const adUnsub = interstitial.addAdEventListener(AdEventType.LOADED, () => {
                interstitial.show();
            });
            interstitial.load();
            // cleanup ad listener
            const cleanupAd = () => adUnsub();
            // store for return
            var adCleanup = cleanupAd;
        } catch {
            // AdMob başlatılamazsa uygulamayı durdurma
            var adCleanup = () => {};
        }

        // FCM foreground handler
        const fcmUnsub = setupFcmEarthquakeHandler();

        // Firebase Auth state listener — tek kaynak: Firebase
        const authUnsub = onAuthStateChanged((user) => {
            if (!isReady) setIsReady(true);
            router.replace(user ? "/(tabs)" : "/(auth)/login");
        });

        return () => {
            adCleanup();
            fcmUnsub();
            authUnsub();
        };
    }, []);

    if (!isReady) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}

const styles = StyleSheet.create({
    loading: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.background.dark,
    },
});
