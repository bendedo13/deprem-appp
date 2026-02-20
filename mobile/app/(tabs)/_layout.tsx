import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";

export default function TabsLayout() {
    const { t } = useTranslation();
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: { backgroundColor: "#0f172a", borderTopColor: "#1e293b" },
                tabBarActiveTintColor: "#ef4444",
                tabBarInactiveTintColor: "#64748b",
                headerStyle: { backgroundColor: "#0f172a" },
                headerTintColor: "#f8fafc",
                headerTitleStyle: { fontWeight: "700" },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.earthquakes"),
                    tabBarIcon: ({ focused }: { focused: boolean }) => (
                        <Text style={{ fontSize: 20 }}>{focused ? "🔴" : "🌍"}</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: t("tabs.map"),
                    tabBarIcon: ({ focused }: { focused: boolean }) => (
                        <Text style={{ fontSize: 20 }}>{focused ? "📍" : "🗺️"}</Text>
                    ),
                }}
            />
        </Tabs>
    );
}
