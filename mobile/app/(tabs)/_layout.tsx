import { Tabs } from "expo-router";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors, BorderRadius, Shadows } from "../../src/constants/theme";

export default function TabsLayout() {
    const { t } = useTranslation();
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: {
                    backgroundColor: Colors.background.surface,
                    borderTopWidth: 1,
                    borderTopColor: Colors.border.glass,
                    height: 74,
                    paddingBottom: 12,
                    paddingTop: 8,
                    ...Shadows.lg,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.text.muted,
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 0.3,
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: t("tabs.earthquakes"),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            <MaterialCommunityIcons name="pulse" color={color} size={focused ? 26 : 24} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: t("tabs.map"),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            <MaterialCommunityIcons name="map-marker-radius" color={color} size={focused ? 26 : 24} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="sensor"
                options={{
                    title: t("tabs.sensor"),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            <MaterialCommunityIcons name="shield-alert-outline" color={color} size={focused ? 26 : 24} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="sos"
                options={{
                    title: "S.O.S",
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.sosTabIcon, focused && styles.sosTabIconActive]}>
                            <MaterialCommunityIcons
                                name="alert-circle"
                                color={focused ? "#fff" : Colors.danger}
                                size={22}
                            />
                        </View>
                    ),
                    tabBarLabelStyle: {
                        fontSize: 10,
                        fontWeight: "800",
                        color: Colors.danger,
                    },
                }}
            />
            <Tabs.Screen
                name="menu"
                options={{
                    title: t("tabs.menu"),
                    tabBarIcon: ({ color, focused }) => (
                        <View style={focused ? styles.activeIconWrap : undefined}>
                            <MaterialCommunityIcons name="cog-outline" color={color} size={focused ? 26 : 24} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeIconWrap: {
        backgroundColor: Colors.primary + "12",
        borderRadius: 12,
        padding: 4,
    },
    sosTabIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.danger + "15",
        justifyContent: "center",
        alignItems: "center",
        marginTop: -4,
    },
    sosTabIconActive: {
        backgroundColor: Colors.danger,
        ...Shadows.sm,
        shadowColor: Colors.danger,
    },
});
