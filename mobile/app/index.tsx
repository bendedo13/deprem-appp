/**
 * Root index — Auth durumunu kontrol edip yönlendirme yapar.
 * Stack navigator (_layout.tsx) zaten mount olduğu için router.replace güvenle çalışır.
 *
 * Part 4: İlk kez açılışta Welcome onboarding'e yönlendir.
 */

import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onAuthStateChanged } from "../src/services/firebaseAuthService";
import { Colors } from "../src/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

const WELCOME_KEY = "quakesense_welcome_done";

export default function Index() {
    useEffect(() => {
        let unsubAuth: (() => void) | null = null;

        (async () => {
            // Check if welcome onboarding is done
            const welcomeDone = await AsyncStorage.getItem(WELCOME_KEY);

            if (welcomeDone !== "true") {
                // First launch — show welcome onboarding
                router.replace("/(auth)/welcome");
                return;
            }

            // Welcome done — check auth state
            unsubAuth = onAuthStateChanged((user) => {
                router.replace(user ? "/(tabs)" : "/(auth)/login");
            });
        })();

        return () => {
            if (unsubAuth) unsubAuth();
        };
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark }}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );
}
