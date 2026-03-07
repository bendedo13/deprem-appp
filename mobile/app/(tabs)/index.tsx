/**
 * Professional Dashboard - Merkezi sismik harita, anlik AI dogrulama durumu.
 * Glassmorphism kartlar, yuksek kontrastli tipografi.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    RefreshControl,
    SafeAreaView,
    Platform,
    Animated,
} from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { getBannerId } from "../../src/services/adService";
import { api } from "../../src/services/api";
import { iAmSafe } from "../../src/services/authService";
import { useWebSocket, EarthquakeEvent } from "../../src/hooks/useWebSocket";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";
import { Colors, Typography, Spacing, BorderRadius, Glass, Shadows } from "../../src/constants/theme";

const CHECKLIST_KEY = "quakesense_safety_checklist";
const CHECKLIST_TOTAL = 100; // total possible points map to 100%
const CHECKLIST_ITEMS_COUNT = 10;

interface Earthquake {
    id: string;
    source: string;
    magnitude: number;
    depth: number;
    latitude: number;
    longitude: number;
    location: string;
    occurred_at: string;
}

function magnitudeColor(mag: number): string {
    if (mag >= 6) return Colors.danger;
    if (mag >= 5) return Colors.accent;
    if (mag >= 4) return "#ca8a04";
    if (mag >= 3) return Colors.primary;
    return Colors.text.muted;
}

function timeAgo(isoStr: string): string {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

const CHECKLIST_POINT_MAP: Record<string, number> = {
    bag: 15, firstaid: 10, water: 10, food: 10,
    meeting: 15, contacts: 10, flashlight: 5,
    documents: 5, insurance: 10, drill: 10,
};
const TOTAL_POSSIBLE = Object.values(CHECKLIST_POINT_MAP).reduce((a, b) => a + b, 0);

export default function DashboardScreen() {
    const [quakes, setQuakes] = useState<Earthquake[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [safeLoading, setSafeLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [safetyScore, setSafetyScore] = useState(0);
    const { t } = useTranslation();
    const { isConnected, lastEvent } = useWebSocket();
    const { isMonitoring, isTriggered, peakAcceleration, staLtaRatio } = useShakeDetector(
        location?.lat ?? null,
        location?.lng ?? null
    );
    const prevTriggered = useRef(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Load safety score
    useEffect(() => {
        (async () => {
            try {
                const stored = await SecureStore.getItemAsync(CHECKLIST_KEY);
                if (stored) {
                    const checked: string[] = JSON.parse(stored);
                    const earned = checked.reduce((sum, id) => sum + (CHECKLIST_POINT_MAP[id] ?? 0), 0);
                    setSafetyScore(Math.round((earned / TOTAL_POSSIBLE) * 100));
                }
            } catch { /* ignore */ }
        })();
    }, []);

    // Pulse animation for live indicator
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, []);

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const pos = await Location.getCurrentPositionAsync({});
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        })();
    }, []);

    useEffect(() => {
        if (isTriggered && !prevTriggered.current) {
            Alert.alert(
                t("home.vibration_title"),
                t("home.vibration_body", { ratio: staLtaRatio.toFixed(1), peak: peakAcceleration.toFixed(2) })
            );
        }
        prevTriggered.current = isTriggered;
    }, [isTriggered]);

    const fetchQuakes = useCallback(async () => {
        try {
            // API { items: [], total: N, page: 1, page_size: 50 } döndürür
            const { data } = await api.get<{ items?: Earthquake[]; total?: number } | Earthquake[]>(
                "/api/v1/earthquakes?page_size=50&hours=24"
            );
            // Hem düz array hem de {items: []} formatını destekle
            const list: Earthquake[] = Array.isArray(data)
                ? data
                : (data as { items?: Earthquake[] }).items ?? [];
            setQuakes(list);
        } catch (err: unknown) {
            // Hata detayını logla — sessizce devam et, Alert gösterme (ilk yüklemede rahatsız etmesin)
            console.warn("[Earthquakes] Fetch hatası:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchQuakes(); }, [fetchQuakes]);

    useEffect(() => {
        if (!lastEvent) return;
        setQuakes((prev) => {
            const exists = prev.find((q) => q.id === lastEvent.id);
            if (exists) return prev;
            return [lastEvent as Earthquake, ...prev].slice(0, 100);
        });
    }, [lastEvent]);

    async function handleSafe() {
        setSafeLoading(true);
        try {
            const res = await iAmSafe();
            Alert.alert(t("safe.sent_title"), t("safe.sent_body", { count: res.notified_contacts }));
        } catch {
            Alert.alert(t("safe.error"));
        } finally {
            setSafeLoading(false);
        }
    }

    // Stats from current data
    const maxMag = quakes.length > 0 ? Math.max(...quakes.map(q => q.magnitude)) : 0;
    const last24h = quakes.filter(q => {
        const diff = Date.now() - new Date(q.occurred_at).getTime();
        return diff < 86400000;
    }).length;

    const renderItem = ({ item }: { item: Earthquake }) => {
        const color = magnitudeColor(item.magnitude);
        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                <View style={[styles.magBadge, { backgroundColor: color }]}>
                    <Text style={styles.magText}>{item.magnitude.toFixed(1)}</Text>
                    <Text style={styles.magUnit}>{item.source?.toUpperCase() === "AFAD" ? "Mw" : "Ml"}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.locationText} numberOfLines={1}>
                        {item.location || t("home.unknown_location")}
                    </Text>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="arrow-down" size={11} color={Colors.text.muted} />
                        <Text style={styles.details}>
                            {item.depth ? t("home.depth_km", { depth: item.depth.toFixed(1) }) : "\u2014"}
                        </Text>
                        <View style={styles.dotSep} />
                        <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.text.muted} />
                        <Text style={styles.details}>{timeAgo(item.occurred_at)}</Text>
                    </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border.dark} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.brandContainer}>
                    <View style={styles.logoBox}>
                        <MaterialCommunityIcons name="shield-check" size={18} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.brandTitle}>QuakeSense</Text>
                        <Text style={styles.brandSub}>Erken Uyari Sistemi</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn}>
                        <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.text.dark} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={quakes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchQuakes(); }}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View>
                        {/* AI Status + Connection */}
                        <View style={styles.statusRow}>
                            <View style={styles.statusChip}>
                                <Animated.View style={[styles.liveDot, { backgroundColor: isConnected ? Colors.primary : Colors.text.muted, transform: [{ scale: isConnected ? pulseAnim : 1 }] }]} />
                                <Text style={[styles.statusChipText, { color: isConnected ? Colors.primary : Colors.text.muted }]}>
                                    {isConnected ? "CANLI" : "BAGLANTI KESILDI"}
                                </Text>
                            </View>
                            <View style={[
                                styles.sensorChip,
                                isTriggered && { backgroundColor: Colors.danger + "20", borderColor: Colors.danger + "40" },
                                isMonitoring && !isTriggered && { backgroundColor: Colors.primary + "10", borderColor: Colors.primary + "30" },
                            ]}>
                                <MaterialCommunityIcons
                                    name={isTriggered ? "alert-circle" : isMonitoring ? "shield-check" : "shield-off-outline"}
                                    size={12}
                                    color={isTriggered ? Colors.danger : isMonitoring ? Colors.primary : Colors.text.muted}
                                />
                                <Text style={[styles.sensorChipText, { color: isTriggered ? Colors.danger : isMonitoring ? Colors.primary : Colors.text.muted }]}>
                                    {isTriggered ? t("home.sensor_triggered") : isMonitoring ? "AI AKTIF" : t("home.sensor_passive")}
                                </Text>
                            </View>
                        </View>

                        {/* Stats Cards — Glassmorphism */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={Colors.primary} />
                                <Text style={styles.statValue}>{last24h}</Text>
                                <Text style={styles.statLabel}>Son 24 Saat</Text>
                            </View>
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="arrow-up-bold" size={20} color={Colors.accent} />
                                <Text style={[styles.statValue, { color: Colors.accent }]}>{maxMag.toFixed(1)}</Text>
                                <Text style={styles.statLabel}>En Büyük</Text>
                            </View>
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="access-point" size={20} color={Colors.status.info} />
                                <Text style={[styles.statValue, { color: Colors.status.info }]}>{quakes.length}</Text>
                                <Text style={styles.statLabel}>Toplam</Text>
                            </View>
                        </View>

                        {/* Safety Score Banner */}
                        <TouchableOpacity
                            style={styles.scoreBanner}
                            onPress={() => router.push("/more/safety_score")}
                            activeOpacity={0.8}
                        >
                            <View style={styles.scoreBannerLeft}>
                                <View style={[styles.scoreRingMini, {
                                    borderColor: safetyScore >= 70 ? Colors.primary : safetyScore >= 40 ? Colors.accent : Colors.danger,
                                }]}>
                                    <Text style={[styles.scoreRingText, {
                                        color: safetyScore >= 70 ? Colors.primary : safetyScore >= 40 ? Colors.accent : Colors.danger,
                                    }]}>{safetyScore}</Text>
                                </View>
                                <View>
                                    <Text style={styles.scoreBannerTitle}>Hazırlık Skorum</Text>
                                    <View style={styles.scoreBarTrack}>
                                        <View style={[styles.scoreBarFill, {
                                            width: `${safetyScore}%` as any,
                                            backgroundColor: safetyScore >= 70 ? Colors.primary : safetyScore >= 40 ? Colors.accent : Colors.danger,
                                        }]} />
                                    </View>
                                    <Text style={styles.scoreBannerSub}>
                                        {safetyScore === 0 ? "Kontrol listesini doldur" : safetyScore >= 80 ? "Harika, hazırsın! 🎉" : "Geliştir, daha iyisi olabilir"}
                                    </Text>
                                </View>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border.dark} />
                        </TouchableOpacity>

                        {/* Section Title */}
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>{t("home.recent_earthquakes")}</Text>
                            <TouchableOpacity>
                                <Text style={styles.filterText}>
                                    {t("home.filter")} <MaterialCommunityIcons name="filter-variant" size={12} />
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                ListFooterComponent={
                    <View style={styles.adContainer}>
                        <BannerAd
                            unitId={getBannerId()}
                            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                        />
                    </View>
                }
            />

            {/* Safe Button */}
            <View style={styles.safeBtnContainer}>
                <TouchableOpacity
                    style={[styles.safeBtn, safeLoading && styles.safeBtnDisabled]}
                    onPress={handleSafe}
                    disabled={safeLoading}
                    activeOpacity={0.9}
                >
                    {safeLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
                            <Text style={styles.safeBtnText}>{t("home.i_am_safe")}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === "android" ? 30 : 0 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
    },
    brandContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoBox: {
        backgroundColor: Colors.primary,
        padding: 8,
        borderRadius: BorderRadius.lg,
        ...Shadows.sm,
    },
    brandTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "800", letterSpacing: -0.5 },
    brandSub: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: "600", marginTop: 1 },
    headerActions: { flexDirection: "row", gap: 8 },
    headerBtn: { padding: 8, backgroundColor: Colors.background.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.glass },

    // Status
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
    },
    statusChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    statusChipText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    sensorChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        backgroundColor: Colors.background.surface,
    },
    sensorChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

    // Stats
    statsRow: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
        gap: 4,
    },
    statValue: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.primary },
    statLabel: { fontSize: 9, fontWeight: "700", color: Colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5 },

    // List
    list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
    listHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    listTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    filterText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: "600" },

    // Card
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    magBadge: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    magText: { color: "#fff", fontSize: 18, fontWeight: "900" },
    magUnit: { color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700", marginTop: 1 },
    info: { flex: 1, marginLeft: Spacing.md },
    locationText: { color: Colors.text.dark, fontSize: Typography.sizes.md, fontWeight: "700" },
    detailRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    details: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
    dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.text.muted, marginHorizontal: 2 },

    // Ad
    adContainer: { alignItems: "center", marginVertical: Spacing.md },

    // Safe Button
    safeBtnContainer: {
        position: "absolute",
        bottom: 20,
        left: Spacing.md,
        right: Spacing.md,
        ...Shadows.lg,
    },
    safeBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    safeBtnDisabled: { opacity: 0.6 },
    safeBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },

    // Safety score banner
    scoreBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.xs,
        marginBottom: Spacing.sm,
    },
    scoreBannerLeft: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
    },
    scoreRingMini: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 3,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    scoreRingText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
    },
    scoreBannerTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: 4,
    },
    scoreBarTrack: {
        width: 120,
        height: 4,
        backgroundColor: Colors.background.elevated,
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 3,
    },
    scoreBarFill: {
        height: 4,
        borderRadius: 2,
    },
    scoreBannerSub: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "600",
    },
});
