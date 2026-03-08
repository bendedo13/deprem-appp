/**
 * Dashboard — Son depremler listesi.
 * Veri: AFAD + USGS + EMSC + Sunucu (çoklu kaynak, önbellekli, 60s polling)
 * Glassmorphism kartlar, skeleton loader, kaynak rozeti, canlı WS durumu.
 */

import React, { useEffect, useState, useCallback, useRef, memo } from "react";
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
    InteractionManager,
    Image,
} from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { getBannerId } from "../../src/services/adService";
import { iAmSafe, getMe, type IAmSafeResponse } from "../../src/services/authService";
import { addChatMessage } from "../../src/services/chatService";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";
import { useLiveEarthquakes } from "../../src/hooks/useLiveEarthquakes";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import type { UnifiedEarthquake, EarthquakeSource } from "../../src/types/earthquake";
import { SOURCE_META } from "../../src/types/earthquake";

// Türkiye koordinat sınırları (yaklaşık)
const TURKEY_BOUNDS = { minLat: 35.5, maxLat: 42.5, minLon: 25.5, maxLon: 44.8 };

const CHECKLIST_KEY = "quakesense_safety_checklist";
const CHECKLIST_POINT_MAP: Record<string, number> = {
    bag: 15, firstaid: 10, water: 10, food: 10,
    meeting: 15, contacts: 10, flashlight: 5,
    documents: 5, insurance: 10, drill: 10,
};
const TOTAL_POSSIBLE = Object.values(CHECKLIST_POINT_MAP).reduce((a, b) => a + b, 0);

function magnitudeColor(mag: number): string {
    if (mag >= 6) return Colors.danger;
    if (mag >= 5) return Colors.accent;
    if (mag >= 4) return Colors.semantic.warningAmber;
    if (mag >= 3) return Colors.primary;
    return Colors.text.muted;
}

function timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}g`;
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

const SourceBadge = memo(function SourceBadge({ source }: { source: EarthquakeSource }) {
    const meta = SOURCE_META[source];
    return (
        <View style={[styles.sourceBadge, { backgroundColor: meta.bg, borderColor: meta.color + "60" }]}>
            <Text style={[styles.sourceBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
    );
});

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
    const anim = useRef(new Animated.Value(0.35)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.7, duration: 850, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.35, duration: 850, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    return (
        <Animated.View style={[styles.card, { opacity: anim }]}>
            <View style={[styles.magBadge, { backgroundColor: Colors.background.elevated }]} />
            <View style={styles.info}>
                <View style={styles.skeletonLine1} />
                <View style={styles.skeletonLine2} />
            </View>
        </Animated.View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type RegionFilter = "turkey" | "world";

export default function DashboardScreen() {
    const [refreshing, setRefreshing] = useState(false);
    const [safeLoading, setSafeLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [safetyScore, setSafetyScore] = useState(0);
    const [regionFilter, setRegionFilter] = useState<RegionFilter>("turkey");
    const { t } = useTranslation();

    const {
        earthquakes: allEarthquakes,
        loading,
        isConnected,
        isStale,
        activeSources,
        error,
        lastUpdated,
        refresh,
    } = useLiveEarthquakes();

    // Bölge filtresine göre depremleri filtrele
    const earthquakes = regionFilter === "turkey"
        ? allEarthquakes
            .filter(q =>
                q.coordinates.latitude >= TURKEY_BOUNDS.minLat &&
                q.coordinates.latitude <= TURKEY_BOUNDS.maxLat &&
                q.coordinates.longitude >= TURKEY_BOUNDS.minLon &&
                q.coordinates.longitude <= TURKEY_BOUNDS.maxLon
            )
            .slice(0, 20)
        : allEarthquakes;

    const { isMonitoring, isTriggered, peakAcceleration, staLtaRatio } = useShakeDetector(
        location?.lat ?? null,
        location?.lng ?? null
    );

    const prevTriggered = useRef(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Safety score
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

    // Pulse animation for live dot
    useEffect(() => {
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [pulseAnim]);

    // Location
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const pos = await Location.getCurrentPositionAsync({});
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        })();
    }, []);

    // Shake alert
    useEffect(() => {
        if (isTriggered && !prevTriggered.current) {
            Alert.alert(
                t("home.vibration_title"),
                t("home.vibration_body", { ratio: staLtaRatio.toFixed(1), peak: peakAcceleration.toFixed(2) })
            );
        }
        prevTriggered.current = isTriggered;
    }, [isTriggered]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refresh();
        setRefreshing(false);
    }, [refresh]);

    async function handleSafe() {
        setSafeLoading(true);
        const userName = await getMe().then((u) => u?.name?.trim() || u?.email?.split("@")[0] || "Kullanıcı").catch(() => "Kullanıcı");
        let locationStr = "";
        if (location?.lat != null && location?.lng != null) {
            try {
                const [place] = await Location.reverseGeocodeAsync({ latitude: location.lat, longitude: location.lng });
                if (place) {
                    const parts = [place.street, place.district, place.city].filter(Boolean);
                    locationStr = parts.length > 0 ? parts.join(", ") : `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
                } else {
                    locationStr = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
                }
            } catch {
                locationStr = `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
            }
        }
        const chatMessage = locationStr
            ? `${userName} — ${locationStr} — Şuan burada deprem oldu ama ben iyiyim.`
            : `${userName} — Şuan burada deprem oldu ama ben iyiyim.`;

        try {
            const res = await iAmSafe({
                includeLocation: !!location,
                latitude: location?.lat ?? null,
                longitude: location?.lng ?? null,
                customMessage: "Şuan burada deprem oldu ama ben iyiyim.",
            });
            await addChatMessage({ text: chatMessage, userName, type: "impact_report" });
            const r = res as IAmSafeResponse;
            if (r.status === "error") {
                Alert.alert(
                    "Bilgi",
                    `${r.message || t("safe.error")} Mesajınız sohbet odasına eklendi; güvenilir kişilerinize ulaşmak için Menü → Acil Kişiler'den telefon numaralarını ekleyin.`
                );
            } else if ((r.notified_contacts ?? 0) > 0) {
                Alert.alert(t("safe.sent_title"), t("safe.sent_body", { count: r.notified_contacts }));
            } else {
                Alert.alert(
                    "Mesaj Kaydedildi",
                    "Mesajınız sohbet odasına eklendi. Güvenilir kişilerinize SMS/WhatsApp ile ulaşmak için Menü → Acil Kişiler'den en az bir kişi ekleyin."
                );
            }
        } catch {
            await addChatMessage({ text: chatMessage, userName, type: "impact_report" }).catch(() => {});
            Alert.alert(
                "Bağlantı Hatası",
                "Sunucuya ulaşılamadı. Mesajınız sohbet odasına eklendi; internet bağlantınız düzeldiğinde tekrar deneyin veya Menü → Acil Kişiler'den güvenilir kişi ekleyin."
            );
        } finally {
            setSafeLoading(false);
        }
    }

    const maxMag = earthquakes.length > 0 ? Math.max(...earthquakes.map((q) => q.magnitude)) : 0;
    const last24h = earthquakes.filter((q) => Date.now() - q.date.getTime() < 86400000).length;

    // ── Earthquake card ──────────────────────────────────────────────────────

    const renderItem = useCallback(({ item }: { item: UnifiedEarthquake }) => {
        const color = magnitudeColor(item.magnitude);
        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.75}>
                <View style={[styles.magBadge, { backgroundColor: color }]}>
                    <Text style={styles.magText}>{item.magnitude.toFixed(1)}</Text>
                    <Text style={styles.magUnit}>{item.magType}</Text>
                </View>
                <View style={styles.info}>
                    <View style={styles.titleRow}>
                        <Text style={styles.locationText} numberOfLines={1}>
                            {item.title || t("home.unknown_location")}
                        </Text>
                        <SourceBadge source={item.source} />
                    </View>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="arrow-down" size={11} color={Colors.text.muted} />
                        <Text style={styles.details}>
                            {item.depth ? t("home.depth_km", { depth: item.depth.toFixed(1) }) : "—"}
                        </Text>
                        <View style={styles.dotSep} />
                        <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.text.muted} />
                        <Text style={styles.details}>{timeAgo(item.date)}</Text>
                    </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border.dark} />
            </TouchableOpacity>
        );
    }, [t]);

    // ── Empty / loading states ────────────────────────────────────────────────

    const ListEmpty = () => {
        if (loading) {
            return (
                <View>
                    {[1, 2, 3, 4, 5].map((k) => <SkeletonCard key={k} />)}
                </View>
            );
        }
        return (
            <View style={styles.emptyBox}>
                <MaterialCommunityIcons name="earth-off" size={56} color={Colors.background.elevated} />
                <Text style={styles.emptyTitle}>Veri Bulunamadı</Text>
                <Text style={styles.emptySubtitle}>
                    {error ?? "Çekmek için aşağı kaydır"}
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
                    <Text style={styles.retryBtnText}>Tekrar Dene</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // ── Header component ──────────────────────────────────────────────────────

    const ListHeader = (
        <View>
            {/* Status row */}
            <View style={styles.statusRow}>
                <View style={styles.statusChip}>
                    <Animated.View style={[
                        styles.liveDot,
                        { backgroundColor: isConnected ? Colors.primary : Colors.text.muted },
                        isConnected && { transform: [{ scale: pulseAnim }] },
                    ]} />
                    <Text style={[styles.statusChipText, { color: isConnected ? Colors.primary : Colors.text.muted }]}>
                        {isConnected ? t("home.live").toUpperCase() : t("home.disconnected").toUpperCase()}
                    </Text>
                    {isStale && (
                        <Text style={styles.staleTag}> · ÖNBELLEKTEN</Text>
                    )}
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
                    <Text style={[styles.sensorChipText, {
                        color: isTriggered ? Colors.danger : isMonitoring ? Colors.primary : Colors.text.muted,
                    }]}>
                        {isTriggered ? t("home.sensor_triggered") : isMonitoring ? "AI AKTİF" : t("home.sensor_passive")}
                    </Text>
                </View>
            </View>

            {/* Active sources chips */}
            {activeSources.length > 0 && (
                <View style={styles.sourceRow}>
                    <Text style={styles.sourceRowLabel}>Kaynaklar:</Text>
                    {activeSources.map((s) => (
                        <View key={s} style={[styles.sourceChip, { backgroundColor: SOURCE_META[s].bg, borderColor: SOURCE_META[s].color + "50" }]}>
                            <View style={[styles.sourceChipDot, { backgroundColor: SOURCE_META[s].color }]} />
                            <Text style={[styles.sourceChipText, { color: SOURCE_META[s].color }]}>{SOURCE_META[s].label}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Stats cards */}
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
                    <Text style={[styles.statValue, { color: Colors.status.info }]}>{earthquakes.length}</Text>
                    <Text style={styles.statLabel}>Toplam</Text>
                </View>
            </View>

            {/* Safety score banner */}
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
                                width: `${safetyScore}%` as unknown as number,
                                backgroundColor: safetyScore >= 70 ? Colors.primary : safetyScore >= 40 ? Colors.accent : Colors.danger,
                            }]} />
                        </View>
                        <Text style={styles.scoreBannerSub}>
                            {safetyScore === 0
                                ? "Kontrol listesini doldur"
                                : safetyScore >= 80 ? "Harika, hazırsın!"
                                : "Geliştir, daha iyisi olabilir"}
                        </Text>
                    </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border.dark} />
            </TouchableOpacity>

            {/* Bölge Filtresi */}
            <View style={styles.filterRow}>
                <TouchableOpacity
                    style={[styles.filterChip, regionFilter === "turkey" && styles.filterChipActive]}
                    onPress={() => setRegionFilter("turkey")}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.filterChipText, regionFilter === "turkey" && styles.filterChipTextActive]}>
                        🇹🇷 Türkiye (Son 20)
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterChip, regionFilter === "world" && styles.filterChipActive]}
                    onPress={() => setRegionFilter("world")}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.filterChipText, regionFilter === "world" && styles.filterChipTextActive]}>
                        🌍 Dünya
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Section header */}
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{t("home.recent_earthquakes")}</Text>
                {lastUpdated && (
                    <Text style={styles.updatedText}>
                        {timeAgo(lastUpdated)} önce güncellendi
                    </Text>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* App Header — profesyonel ikon + marka */}
            <View style={styles.header}>
                <View style={styles.brandContainer}>
                    <View style={styles.logoBox}>
                        <Image
                            source={require("../../assets/icon.png")}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                    </View>
                    <View>
                        <Text style={styles.brandTitle}>QuakeSense</Text>
                        <Text style={styles.brandSub}>Erken Uyarı Sistemi</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn}>
                        <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.text.dark} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={loading ? [] : earthquakes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={styles.list}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={<ListEmpty />}
                ListFooterComponent={
                    <View style={styles.adContainer}>
                        <BannerAd
                            unitId={getBannerId()}
                            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                        />
                    </View>
                }
                // ── Performans optimizasyonları ──────────────────────────────
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                getItemLayout={(_data, index) => ({
                    length: 76, // card height + marginBottom
                    offset: 76 * index,
                    index,
                })}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === "android" ? 30 : 0 },

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
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.background.surface,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    logoImage: {
        width: "100%",
        height: "100%",
    },
    brandTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "800", letterSpacing: -0.5 },
    brandSub: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: "600", marginTop: 1 },
    headerActions: { flexDirection: "row", gap: 8 },
    headerBtn: {
        padding: 8,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },

    // Status row
    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
    },
    statusChip: { flexDirection: "row", alignItems: "center", gap: 6 },
    liveDot: { width: 6, height: 6, borderRadius: 3 },
    statusChipText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
    staleTag: { fontSize: 9, fontWeight: "700", color: Colors.accent, letterSpacing: 0.5 },
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

    // Active sources row
    sourceRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        gap: 6,
        flexWrap: "wrap",
    },
    sourceRowLabel: { fontSize: 10, fontWeight: "700", color: Colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5 },
    sourceChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    sourceChipDot: { width: 5, height: 5, borderRadius: 2.5 },
    sourceChipText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

    // Stats
    statsRow: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
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

    // Score banner
    scoreBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
    },
    scoreBannerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.md },
    scoreRingMini: {
        width: 48, height: 48, borderRadius: 24,
        borderWidth: 3, justifyContent: "center", alignItems: "center", flexShrink: 0,
    },
    scoreRingText: { fontSize: Typography.sizes.sm, fontWeight: "900" },
    scoreBannerTitle: { fontSize: Typography.sizes.sm, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    scoreBarTrack: {
        width: 120, height: 4,
        backgroundColor: Colors.background.elevated,
        borderRadius: 2, overflow: "hidden", marginBottom: 3,
    },
    scoreBarFill: { height: 4, borderRadius: 2 },
    scoreBannerSub: { fontSize: 10, color: Colors.text.muted, fontWeight: "600" },

    // List
    list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
    listHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    listTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    updatedText: { color: Colors.text.muted, fontSize: 10, fontWeight: "500" },

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
        width: 52, height: 52,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    magText: { color: "#fff", fontSize: 18, fontWeight: "900" },
    magUnit: { color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700", marginTop: 1 },
    info: { flex: 1, marginLeft: Spacing.md },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    locationText: { flex: 1, color: Colors.text.dark, fontSize: Typography.sizes.md, fontWeight: "700" },
    detailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    details: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
    dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.text.muted, marginHorizontal: 2 },

    // Source badge
    sourceBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
    },
    sourceBadgeText: { fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },

    // Skeleton
    skeletonLine1: { height: 14, width: "70%", backgroundColor: Colors.background.elevated, borderRadius: 4, marginBottom: 6 },
    skeletonLine2: { height: 11, width: "45%", backgroundColor: Colors.background.elevated, borderRadius: 4 },

    // Empty state
    emptyBox: { alignItems: "center", paddingTop: 60, paddingBottom: 30 },
    emptyTitle: { color: Colors.text.secondary, fontSize: Typography.sizes.lg, fontWeight: "700", marginTop: 16 },
    emptySubtitle: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginTop: 6, textAlign: "center" },
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 24, paddingVertical: 10,
        backgroundColor: Colors.primary + "20",
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + "50",
    },
    retryBtnText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: "700" },

    // Filter chips
    filterRow: {
        flexDirection: "row",
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        backgroundColor: Colors.background.surface,
    },
    filterChipActive: {
        backgroundColor: Colors.primary + "20",
        borderColor: Colors.primary + "70",
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    filterChipTextActive: {
        color: Colors.primary,
    },

    // Ad
    adContainer: { alignItems: "center", marginVertical: Spacing.md },

    // Safe button
    safeBtnContainer: {
        position: "absolute",
        bottom: 20, left: Spacing.md, right: Spacing.md,
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
});
