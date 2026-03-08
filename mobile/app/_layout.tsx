/**
 * Root layout — Her zaman Stack navigator render eder.
 * Auth yönlendirmesi index.tsx tarafından yapılır (navigator mount olduktan sonra).
 *
 * Başlangıç işlemleri:
 *  1. AdMob interstitial yükle (try/catch — native module yoksa sessizce atla)
 *  2. FCM foreground handler başlat
 *  3. Background earthquake polling task kaydet (expo-background-fetch)
 *  4. i18n — SecureStore'dan kaydedilmiş dili geri yükle
 *  5. Nükleer alarm overlay — 1.8G+ algılandığında "Sesi Kapat / Güvendeyim" modalı
 */

import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import "./firebase-init";
import { setBackgroundEarthquakeHandler, setupFcmEarthquakeHandler } from "../src/services/fcmEarthquakeHandler";
import { registerBackgroundEarthquakeTask } from "../src/services/backgroundSeismic";
import { restorePersistedLanguage } from "../src/i18n";
import {
    subscribeCriticalAlarm,
    stopCriticalAlarm,
    isCriticalAlarmPlaying,
} from "../src/services/criticalAlarmService";
import { Colors, Typography, Spacing, BorderRadius } from "../src/constants/theme";
import "../src/i18n";

setBackgroundEarthquakeHandler();

export default function RootLayout() {
    const [criticalAlarmPlaying, setCriticalAlarmPlaying] = useState(false);

    useEffect(() => {
        setCriticalAlarmPlaying(isCriticalAlarmPlaying());
        const unsub = subscribeCriticalAlarm(setCriticalAlarmPlaying);
        return unsub;
    }, []);
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
        <>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="more" />
            </Stack>

            {/* Nükleer alarm overlay — Sesi Kapat / Güvendeyim basana kadar tam ekran */}
            <Modal
                visible={criticalAlarmPlaying}
                transparent
                animationType="fade"
                statusBarTranslucent
            >
                <View style={criticalAlarmStyles.overlay}>
                    <View style={criticalAlarmStyles.box}>
                        <MaterialCommunityIcons name="alert-octagon" size={64} color={Colors.danger} />
                        <Text style={criticalAlarmStyles.title}>DEPREM UYARISI</Text>
                        <Text style={criticalAlarmStyles.subtitle}>
                            Sensör yüksek ivme algıladı. Güvende misiniz?
                        </Text>
                        <TouchableOpacity
                            style={criticalAlarmStyles.button}
                            onPress={() => stopCriticalAlarm()}
                            activeOpacity={0.9}
                        >
                            <MaterialCommunityIcons name="shield-check" size={24} color="#fff" />
                            <Text style={criticalAlarmStyles.buttonText}>Sesi Kapat / Güvendeyim</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const criticalAlarmStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.9)",
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.xl,
    },
    box: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xxxl,
        alignItems: "center",
        borderWidth: 3,
        borderColor: Colors.danger,
        minWidth: 280,
    },
    title: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.danger,
        marginTop: Spacing.lg,
    },
    subtitle: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        marginTop: Spacing.sm,
        textAlign: "center",
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md + 4,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.xl,
        marginTop: Spacing.xxl,
    },
    buttonText: {
        color: "#fff",
        fontSize: Typography.sizes.md,
        fontWeight: "800",
    },
});
