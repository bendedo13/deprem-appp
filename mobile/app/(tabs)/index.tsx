/**
 * Professional Dashboard - Merkezi sismik harita, anlik AI dogrulama durumu.
 * Glassmorphism kartlar, yuksek kontrastli tipografi.
 *
 * Gorev 4: API Retry + Cache Layer entegrasyonu
 * Gorev 6: useCallback/useMemo ile performans optimizasyonu
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";

// AdMob — optional, may not be available in all builds
let BannerAd: any = null;
let BannerAdSize: any = {};
let getBannerId: (() => string) | null = null;
try {
    const ads = require("react-native-google-mobile-ads");
    BannerAd = ads.BannerAd;
    BannerAdSize = ads.BannerAdSize;
    getBannerId = require("../../src/services/adService").getBannerId;
} catch {
    // AdMob not available
}
import { router } from "expo-router";
import { iAmSafe } from "../../src/services/authService";
import { useWebSocket, EarthquakeEvent } from "../../src/hooks/useWebSocket";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";
import { Colors, Typography, Spacing, BorderRadius, Glass, Shadows } from "../../src/constants/theme";
import {
    fetchWithCacheAndRetry,
    startAutoRetry,
    CachedEarthquake,
    FetchResult,
} from "../../src/services/earthquakeCacheService";
import { useNetwork } from "../../src/context/AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProgressRing from "../../src/components/ProgressRing";

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

function formatCacheAge(ms: number | null): string {
    if (ms === null) return "";
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return "az once";
    if (minutes < 60) return `${minutes} dk once`;
    return `${Math.floor(minutes / 60)} saat once`;
}

export default function DashboardScreen() {
    const [quakes, setQuakes] = useState<Earthquake[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [safeLoading, setSafeLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const { t } = useTranslation();
    const { isConnected, lastEvent } = useWebSocket();
    const { isMonitoring, isTriggered, peakAcceleration, staLtaRatio } = useShakeDetector(
        location?.lat ?? null,
        location?.lng ?? null
    );
    const prevTriggered = useRef(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const retryHandleRef = useRef<{ stop: () => void } | null>(null);

    // Gorev 4: Network/cache context
    const networkCtx = useNetwork();
    const [fromCache, setFromCache] = useState(false);
    const [cacheAgeMs, setCacheAgeMs] = useState<number | null>(null);

    // Part 4: Preparedness score
    const [prepScore, setPrepScore] = useState(0);

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

    // Load preparedness score
    useEffect(() => {
        AsyncStorage.getItem("quakesense_preparedness").then((raw) => {
            if (!raw) return;
            try {
                const checked: string[] = JSON.parse(raw);
                // Max points = 100 (sum of all checklist items)
                const maxPoints = 100;
                const pointsMap: Record<string, number> = {
                    bag: 15, water: 10, firstaid: 10, flashlight: 5,
                    meeting_point: 15, emergency_contacts: 10, family_network: 10, evacuation: 10,
                    training: 5, gas_valve: 5, notifications_on: 5,
                };
                const total = checked.reduce((sum, id) => sum + (pointsMap[id] || 0), 0);
                setPrepScore(Math.round((total / maxPoints) * 100));
            } catch {}
        });
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

    // ── Gorev 4: Deprem verilerini cache + retry ile cek ────────────────────
    const fetchQuakes = useCallback(async () => {
        try {
            const result: FetchResult = await fetchWithCacheAndRetry(
                "/api/v1/earthquakes?limit=50"
            );

            setQuakes(result.data as Earthquake[]);
            setFromCache(result.fromCache);
            setCacheAgeMs(result.cacheAge);
            networkCtx.setOnline(!result.fromCache);

            // API basarisiz ve cache'ten gosterdik — auto-retry baslat
            if (result.fromCache && result.data.length > 0) {
                networkCtx.setRetrying(true);
                retryHandleRef.current?.stop();

                retryHandleRef.current = startAutoRetry(
                    "/api/v1/earthquakes?limit=50",
                    (retryResult) => {
                        setQuakes(retryResult.data as Earthquake[]);
                        setFromCache(retryResult.fromCache);
                        setCacheAgeMs(retryResult.cacheAge);

                        if (!retryResult.fromCache) {
                            // Basarili — retry durdu
                            networkCtx.setOnline(true);
                            networkCtx.setRetrying(false);
                        }
                    }
                );
            }
        } catch {
            // fetchWithCacheAndRetry kendi icinde hata yonetiyor
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [t]);

    useEffect(() => {
        fetchQuakes();
        return () => {
            retryHandleRef.current?.stop();
        };
    }, [fetchQuakes]);

    useEffect(() => {
        if (!lastEvent) return;
        setQuakes((prev) => {
            const exists = prev.find((q) => q.id === lastEvent.id);
            if (exists) return prev;
            return [lastEvent as Earthquake, ...prev].slice(0, 100);
        });
    }, [lastEvent]);

    const handleSafe = useCallback(async () => {
        setSafeLoading(true);
        try {
            const res = await iAmSafe();
            Alert.alert(t("safe.sent_title"), t("safe.sent_body", { count: res.notified_contacts }));
        } catch {
            Alert.alert(t("safe.error"));
        } finally {
            setSafeLoading(false);
        }
    }, [t]);

    // Gorev 6: Memoized stats
    const maxMag = useMemo(
        () => (quakes.length > 0 ? Math.max(...quakes.map((q) => q.magnitude)) : 0),
        [quakes]
    );
    const last24h = useMemo(
        () => quakes.filter((q) => Date.now() - new Date(q.occurred_at).getTime() < 86400000).length,
        [quakes]
    );

    // Gorev 6: Memoized renderItem
    const renderItem = useCallback(
        ({ item }: { item: Earthquake }) => {
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
        },
        [t]
    );

    const keyExtractor = useCallback((item: Earthquake) => item.id, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header — Premium */}
            <View style={styles.header}>
                <View style={styles.brandContainer}>
                    <View style={styles.logoBox}>
                        <View style={styles.logoInner}>
                            <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
                        </View>
                    </View>
                    <View>
                        <View style={styles.brandRow}>
                            <Text style={styles.brandTitle}>Quake</Text>
                            <Text style={styles.brandTitleAccent}>Sense</Text>
                        </View>
                        <Text style={styles.brandSub}>Erken Uyari Sistemi</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.scoreRingBtn}
                        onPress={() => router.push("/more/preparedness-score")}
                        activeOpacity={0.8}
                    >
                        <ProgressRing
                            progress={prepScore}
                            size={42}
                            strokeWidth={4}
                            color={prepScore >= 70 ? Colors.primary : prepScore >= 40 ? Colors.accent : Colors.danger}
                            showLabel={false}
                        />
                        <Text style={styles.scoreRingText}>%{prepScore}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => router.push("/more/notification-list")}>
                        <MaterialCommunityIcons name="bell-outline" size={20} color={Colors.text.dark} />
                        <View style={styles.notifDot} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={quakes}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => {
                            setRefreshing(true);
                            retryHandleRef.current?.stop();
                            fetchQuakes();
                        }}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={styles.list}
                removeClippedSubviews={true}
                maxToRenderPerBatch={15}
                windowSize={10}
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

                        {/* Gorev 4: Cache/Retry bilgi banneri */}
                        {fromCache && (
                            <View style={styles.cacheBanner}>
                                <MaterialCommunityIcons name="cloud-off-outline" size={16} color={Colors.accent} />
                                <View style={styles.cacheBannerTexts}>
                                    <Text style={styles.cacheBannerTitle}>
                                        Cevrimdisi Mod {networkCtx.isRetrying ? "— Yeniden baglaniyor..." : ""}
                                    </Text>
                                    <Text style={styles.cacheBannerSub}>
                                        {cacheAgeMs !== null
                                            ? `Cache verileri gosteriliyor (${formatCacheAge(cacheAgeMs)})`
                                            : "Son basarili veriler gosteriliyor"}
                                    </Text>
                                </View>
                                {networkCtx.isRetrying && (
                                    <ActivityIndicator size="small" color={Colors.accent} />
                                )}
                            </View>
                        )}

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
                                <Text style={styles.statLabel}>En Buyuk</Text>
                            </View>
                            <View style={styles.statCard}>
                                <MaterialCommunityIcons name="access-point" size={20} color={Colors.status.info} />
                                <Text style={[styles.statValue, { color: Colors.status.info }]}>{quakes.length}</Text>
                                <Text style={styles.statLabel}>Toplam</Text>
                            </View>
                        </View>

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
                    BannerAd && getBannerId ? (
                        <View style={styles.adContainer}>
                            <BannerAd
                                unitId={getBannerId()}
                                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                                requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                            />
                        </View>
                    ) : null
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

    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.md, paddingVertical: Spacing.md + 4, borderBottomWidth: 1, borderBottomColor: Colors.border.glass },
    brandContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
    logoBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center", ...Shadows.md },
    logoInner: { width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.primaryDark, justifyContent: "center", alignItems: "center" },
    brandRow: { flexDirection: "row", alignItems: "baseline" },
    brandTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "900", letterSpacing: -0.5 },
    brandTitleAccent: { color: Colors.primary, fontSize: Typography.sizes.lg, fontWeight: "900", letterSpacing: -0.5 },
    brandSub: { color: Colors.text.muted, fontSize: 9, fontWeight: "700", marginTop: 2, letterSpacing: 1.5, textTransform: "uppercase" },
    headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
    scoreRingBtn: { position: "relative" as const, justifyContent: "center", alignItems: "center" },
    scoreRingText: { position: "absolute" as const, fontSize: 9, fontWeight: "900" as const, color: Colors.text.dark },
    headerBtn: { position: "relative" as const, padding: 10, backgroundColor: Colors.background.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border.glass },
    notifDot: { position: "absolute" as const, top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.danger, borderWidth: 1.5, borderColor: Colors.background.dark },

    statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2 },
    statusChip: { flexDirection: "row", alignItems: "center", gap: 6 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    statusChipText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    sensorChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border.glass, backgroundColor: Colors.background.surface },
    sensorChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

    // Gorev 4: Cache banner
    cacheBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        backgroundColor: Colors.accent + "10",
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.accent + "25",
    },
    cacheBannerTexts: { flex: 1 },
    cacheBannerTitle: { fontSize: 11, fontWeight: "800", color: Colors.accent },
    cacheBannerSub: { fontSize: 10, fontWeight: "500", color: Colors.text.muted, marginTop: 1 },

    statsRow: { flexDirection: "row", paddingHorizontal: Spacing.md, gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.sm },
    statCard: { flex: 1, backgroundColor: Colors.background.surface, borderWidth: 1, borderColor: Colors.border.glass, borderRadius: BorderRadius.xxl, padding: Spacing.md, alignItems: "center", gap: 6, ...Shadows.sm },
    statValue: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.primary },
    statLabel: { fontSize: 9, fontWeight: "700", color: Colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5 },

    list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
    listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: Spacing.md, marginBottom: Spacing.sm },
    listTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    filterText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: "600" },

    card: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xxl, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border.glass, ...Shadows.sm },
    magBadge: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", ...Shadows.sm },
    magText: { color: "#fff", fontSize: 18, fontWeight: "900" },
    magUnit: { color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700", marginTop: 1 },
    info: { flex: 1, marginLeft: Spacing.md },
    locationText: { color: Colors.text.dark, fontSize: Typography.sizes.md, fontWeight: "700" },
    detailRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    details: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
    dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.text.muted, marginHorizontal: 2 },

    adContainer: { alignItems: "center", marginVertical: Spacing.md },

    safeBtnContainer: { position: "absolute", bottom: 24, left: Spacing.lg, right: Spacing.lg, ...Shadows.lg },
    safeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xxl, height: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 12 },
    safeBtnDisabled: { opacity: 0.6 },
    safeBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800", letterSpacing: 0.3 },
});
