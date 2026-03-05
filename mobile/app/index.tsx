/**
 * Root index — Auth durumunu kontrol edip yönlendirme yapar.
 * Stack navigator (_layout.tsx) zaten mount olduğu için router.replace güvenle çalışır.
 */

import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { onAuthStateChanged } from "../src/services/firebaseAuthService";
import { Colors } from "../src/constants/theme";

export default function Index() {
    useEffect(() => {
        const unsub = onAuthStateChanged((user) => {
            router.replace(user ? "/(tabs)" : "/(auth)/login");
        });
        return unsub;
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark }}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );
}
