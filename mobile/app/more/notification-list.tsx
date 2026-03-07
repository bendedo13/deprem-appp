/**
 * Bildirim Listesi — Admin panelinden gönderilen bildirimlerin listesi.
 */

import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    SafeAreaView,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../src/services/api";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

const NOTIF_STORAGE_KEY = "app_notifications";

interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: "info" | "warning" | "earthquake" | "update";
    created_at: string;
    read: boolean;
}

function getNotifIcon(type: string): { name: string; color: string } {
    switch (type) {
        case "earthquake":
            return { name: "pulse", color: Colors.danger };
        case "warning":
            return { name: "alert-circle-outline", color: Colors.accent };
        case "update":
            return { name: "update", color: Colors.status.info };
        default:
            return { name: "information-outline", color: Colors.primary };
    }
}

function timeAgo(isoStr: string): string {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return "Az önce";
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
}

export default function NotificationListScreen() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data } = await api.get("/api/v1/notifications");
            const items = (data as any[]).map((n: any) => ({
                id: String(n.id),
                title: n.title || "Bildirim",
                body: n.body || n.message || "",
                type: n.type || "info",
                created_at: n.created_at || new Date().toISOString(),
                read: n.read || false,
            }));
            setNotifications(items);
            await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Load from local cache
            try {
                const cached = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
                if (cached) setNotifications(JSON.parse(cached));
            } catch {}
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const renderItem = ({ item }: { item: AppNotification }) => {
        const icon = getNotifIcon(item.type);
        return (
            <View style={[styles.card, !item.read && styles.cardUnread]}>
                <View style={[styles.iconBox, { backgroundColor: icon.color + "15" }]}>
                    <MaterialCommunityIcons name={icon.name as any} size={22} color={icon.color} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                    <Text style={styles.cardTime}>{timeAgo(item.created_at)}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bildirimler</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <MaterialCommunityIcons name="bell-off-outline" size={64} color={Colors.border.dark} />
                            <Text style={styles.emptyTitle}>Bildirim Yok</Text>
                            <Text style={styles.emptyText}>
                                Henüz bildirim almadınız. Deprem uyarıları ve sistem bildirimleri burada görünecek.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        paddingTop: Platform.OS === "android" ? 30 : 0,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    list: {
        padding: Spacing.md,
        paddingBottom: 40,
    },
    card: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        gap: Spacing.md,
    },
    cardUnread: {
        borderColor: Colors.primary + "30",
        backgroundColor: Colors.primary + "05",
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 2,
    },
    cardContent: { flex: 1, gap: 2 },
    cardTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: "700",
        color: Colors.text.dark,
    },
    cardBody: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 18,
    },
    cardTime: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.text.muted,
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
        marginTop: 6,
    },
    emptyBox: {
        alignItems: "center",
        paddingTop: 80,
        paddingHorizontal: 40,
        gap: 12,
    },
    emptyTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    emptyText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 20,
    },
});
