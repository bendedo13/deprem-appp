import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
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
                    title: "Depremler",
                    tabBarIcon: ({ focused }: { focused: boolean }) => (
                        <Text style={{ fontSize: 20 }}>{focused ? "🔴" : "🌍"}</Text>
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: "Harita",
                    tabBarIcon: ({ focused }: { focused: boolean }) => (
                        <Text style={{ fontSize: 20 }}>{focused ? "📍" : "🗺️"}</Text>
                    ),
                }}
            />
        </Tabs>
    );
}
