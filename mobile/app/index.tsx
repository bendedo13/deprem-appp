/**
 * Root index — Auth durumunu kontrol edip yönlendirme yapar.
 * İlk açılışta Onboarding gösterir. Sonraki açılışlarda Login.
 * Giriş yapılmışsa FCM token backend'e kaydedilir.
 */

import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { onAuthStateChanged } from "../src/services/firebaseAuthService";
import { updateProfile } from "../src/services/authService";
import { Colors } from "../src/constants/theme";

const ONBOARDING_KEY = "onboarding_complete";

async function registerFcmToken(): Promise<void> {
    try {
        const messaging = require("@react-native-firebase/messaging").default;
        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (!enabled) return;

        const token = await messaging().getToken();
        if (token) {
            await updateProfile({ fcm_token: token });
        }
    } catch (err) {
        // FCM token kaydı başarısız olsa da uygulamayı durdurma
        console.warn("[FCM] Token kaydı başarısız:", err);
    }
}

export default function Index() {
    useEffect(() => {
        const unsub = onAuthStateChanged(async (user) => {
            if (user) {
                // Giriş yapılmış: FCM token'ı backend'e kaydet
                registerFcmToken();
                router.replace("/(tabs)");
            } else {
                // İlk kez mi açılıyor?
                const onboardingDone = await SecureStore.getItemAsync(ONBOARDING_KEY);
                if (onboardingDone) {
                    router.replace("/(auth)/login");
                } else {
                    router.replace("/(auth)/onboarding");
                }
            }
        });
        return unsub;
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark }}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );
}
