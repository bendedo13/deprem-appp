import { Stack } from "expo-router";
import { Colors } from "../../src/constants/theme";

const screenOptions = {
    headerStyle: { backgroundColor: Colors.background.dark },
    headerTintColor: Colors.text.dark,
    headerTitleStyle: { fontWeight: "700" as const, fontSize: 17 },
    headerShadowVisible: false,
};

export default function MoreLayout() {
    return (
        <Stack screenOptions={screenOptions}>
            <Stack.Screen name="contacts" options={{ title: "Acil Kişiler" }} />
            <Stack.Screen name="notification_preferences" options={{ title: "Bildirim Tercihleri" }} />
            <Stack.Screen name="risk_analysis" options={{ title: "Risk Analizi" }} />
            <Stack.Screen name="safety_score" options={{ title: "Hazırlık Skorum" }} />
            <Stack.Screen name="survival_kit" options={{ title: "Acil Durum Kiti" }} />
            <Stack.Screen name="family_safety" options={{ title: "Aile Güvenliği" }} />
            <Stack.Screen name="about" options={{ title: "Hakkında" }} />
            <Stack.Screen name="privacy" options={{ title: "Gizlilik Politikası" }} />
            <Stack.Screen name="language" options={{ title: "Dil Seçimi" }} />
            <Stack.Screen name="contact" options={{ title: "İletişim" }} />
            <Stack.Screen name="notifications" options={{ title: "Bildirimler" }} />
            <Stack.Screen name="security" options={{ title: "Güvenlik" }} />
            <Stack.Screen name="sos" options={{ title: "Acil SOS" }} />
            <Stack.Screen name="support" options={{ title: "Destek Talebi" }} />
        </Stack>
    );
}
