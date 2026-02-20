import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from "react-i18next";
import { Colors } from "../../src/constants/theme";

export default function TabsLayout() {
    const { t } = useTranslation();
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: Colors.background.dark,
                    borderTopColor: Colors.background.surface,
                    height: 60,
                    paddingBottom: 8,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.text.muted,
                headerStyle: { backgroundColor: Colors.background.dark },
                headerTintColor: Colors.text.dark,
                headerTitleStyle: { fontWeight: "800", fontSize: 18 },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.earthquakes"),
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="earth" color={color} size={size + 4} />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: t("tabs.map"),
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="map-marker-radius" color={color} size={size + 4} />
                    ),
                }}
            />
            <Tabs.Screen
                name="menu"
                options={{
                    title: t("tabs.menu"),
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="menu" color={color} size={size + 4} />
                    ),
                }}
            />
        </Tabs>
    );
}
