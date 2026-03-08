/**
 * Deprem Harita/Liste Ekranı — Çoklu kaynak, filtrelenebilir, skeleton loader.
 * Veri: useLiveEarthquakes (AFAD + USGS + EMSC + Sunucu)
 */

import { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    SafeAreaView,
    Platform,
    Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { useLiveEarthquakes } from "../../src/hooks/useLiveEarthquakes";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import type { UnifiedEarthquake, EarthquakeSource } from "../../src/types/earthquake";
import { SOURCE_META } from "../../src/types/earthquake";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function magnitudeColor(m: number): string {
    if (m >= 6) return Colors.danger;
    if (m >= 5) return Colors.accent;
    if (m >= 4) return "#ca8a04";
    return Colors.primary;
}

function timeAgo(date: Date): string {
    const d = Math.floor((Date.now() - date.getTime()) / 1000);
    if (d < 60) return `${d}s`;
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    if (d < 86400) return `${Math.floor(d / 3600)}h`;
    return `${Math.floor(d / 86400)}g`;
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: EarthquakeSource }) {
    const meta = SOURCE_META[source];
    return (
        <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.color + "60" }]}>
            <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
    );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

type FilterOption = "ALL" | EarthquakeSource;

function FilterChip({
    label,
    active,
    color,
    onPress,
}: {
    label: string;
    active: boolean;
    color: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.filterChip,
                active && { backgroundColor: color + "25", borderColor: color + "70" },
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {active && <View style={[styles.filterDot, { backgroundColor: color }]} />}
            <Text style={[styles.filterChipText, active && { color }]}>{label}</Text>
        </TouchableOpacity>
    );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonGridCard() {
    const anim = useRef(new Animated.Value(0.35)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 0.7, duration: 900, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0.35, duration: 900, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    return (
        <Animated.View style={[styles.card, styles.skeletonCard, { opacity: anim }]}>
            <View style={styles.skeletonCircle} />
            <View style={styles.skeletonCardInfo}>
                <View style={styles.skeletonL1} />
                <View style={styles.skeletonL2} />
            </View>
        </Animated.View>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MapScreen() {
    const { t, i18n } = useTranslation();
    const params = useLocalSearchParams<{ focusLat?: string; focusLon?: string; focusId?: string }>();
    const [selected, setSelected] = useState<UnifiedEarthquake | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterOption>("ALL");
    const [regionFilter, setRegionFilter] = useState<"ALL" | "TR">("ALL");
    const [highlightId, setHighlightId] = useState<string | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    const {
        earthquakes,
        loading,
        isConnected,
        isStale,
        activeSources,
        refresh,
    } = useLiveEarthquakes();

    // Haritaya yönlendirme parametresi geldiğinde ilgili depremi öne çıkar
    useEffect(() => {
        if (params.focusLat && params.focusLon) {
            const lat = parseFloat(params.focusLat);
            const lon = parseFloat(params.focusLon);
            if (!isNaN(lat) && !isNaN(lon)) {
                // Koordinata en yakın depremi bul
                const target = earthquakes.find((eq) => {
                    if (params.focusId && eq.id === params.focusId) return true;
                    const dLat = Math.abs(eq.coordinates.latitude - lat);
                    const dLon = Math.abs(eq.coordinates.longitude - lon);
                    return dLat < 0.05 && dLon < 0.05;
                });
                if (target) {
                    setSelected(target);
                    setHighlightId(target.id);
                    // 5 saniye sonra highlight'ı kaldır
                    setTimeout(() => setHighlightId(null), 5000);
                } else {
                    // Deprem listede yoksa koordinat bilgisiyle sahte detay göster
                    setSelected({
                        id: `focus_${lat}_${lon}`,
                        magnitude: 0,
                        depth: 0,
                        coordinates: { latitude: lat, longitude: lon },
                        title: "Yönlendirilen Konum",
                        date: new Date(),
                        source: "AFAD",
                        magType: "ML",
                    });
                }
                // Scroll en başa
                scrollRef.current?.scrollTo({ y: 0, animated: true });
            }
        }
    }, [params.focusLat, params.focusLon, earthquakes.length]);

    // Apply source + region filter
    const filtered = earthquakes.filter((q) => {
        if (activeFilter !== "ALL" && q.source !== activeFilter) return false;
        if (regionFilter === "TR") {
            const { latitude, longitude } = q.coordinates;
            if (latitude < 35.5 || latitude > 42.5 || longitude < 25.5 || longitude > 45) return false;
        }
        return true;
    });

    const FILTER_OPTIONS: { key: FilterOption; label: string; color: string }[] = [
        { key: "ALL", label: "Tümü", color: Colors.primary },
        { key: "AFAD", label: "AFAD", color: SOURCE_META.AFAD.color },
        { key: "USGS", label: "USGS", color: SOURCE_META.USGS.color },
        { key: "EMSC", label: "EMSC", color: SOURCE_META.EMSC.color },
        { key: "SUNUCU", label: "Sunucu", color: SOURCE_META.SUNUCU.color },
    ];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.dot, { backgroundColor: isConnected ? Colors.primary : Colors.text.muted }]} />
                    <Text style={styles.headerTitle}>{t("map.recent")}</Text>
                    {isStale && (
                        <View style={styles.staleChip}>
                            <Text style={styles.staleChipText}>ÖNBELLEK</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
                    <MaterialCommunityIcons name="refresh" size={18} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Region toggle: Global / Türkiye */}
            <View style={styles.regionRow}>
                <TouchableOpacity
                    style={[styles.regionBtn, regionFilter === "ALL" && styles.regionBtnActive]}
                    onPress={() => setRegionFilter("ALL")}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="earth" size={14} color={regionFilter === "ALL" ? "#fff" : Colors.text.muted} />
                    <Text style={[styles.regionBtnText, regionFilter === "ALL" && styles.regionBtnTextActive]}>Global</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.regionBtn, regionFilter === "TR" && styles.regionBtnActive]}
                    onPress={() => setRegionFilter("TR")}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="flag" size={14} color={regionFilter === "TR" ? "#fff" : Colors.text.muted} />
                    <Text style={[styles.regionBtnText, regionFilter === "TR" && styles.regionBtnTextActive]}>Türkiye</Text>
                </TouchableOpacity>
            </View>

            {/* Source filter chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
            >
                {FILTER_OPTIONS.filter((f) =>
                    f.key === "ALL" || activeSources.includes(f.key as EarthquakeSource)
                ).map((f) => (
                    <FilterChip
                        key={f.key}
                        label={f.label}
                        active={activeFilter === f.key}
                        color={f.color}
                        onPress={() => setActiveFilter(f.key)}
                    />
                ))}
            </ScrollView>

            {/* Count line */}
            <View style={styles.countRow}>
                <Text style={styles.countText}>
                    {filtered.length} deprem · {activeSources.length} kaynak aktif
                </Text>
            </View>

            {/* Grid */}
            <ScrollView ref={scrollRef} contentContainerStyle={styles.grid}>
                {loading ? (
                    [1, 2, 3, 4, 5, 6].map((k) => <SkeletonGridCard key={k} />)
                ) : filtered.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="earth-off" size={72} color={Colors.background.surface} />
                        <Text style={styles.emptyText}>{t("map.no_data")}</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
                            <Text style={styles.retryBtnText}>Yenile</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    filtered.map((eq) => (
                        <TouchableOpacity
                            key={eq.id}
                            style={[
                                styles.card,
                                { borderColor: magnitudeColor(eq.magnitude) + "35" },
                                highlightId === eq.id && styles.cardHighlight,
                            ]}
                            onPress={() => setSelected(eq)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.circle, { backgroundColor: magnitudeColor(eq.magnitude) }]}>
                                <Text style={styles.magText}>{eq.magnitude.toFixed(1)}</Text>
                                <Text style={styles.magUnit}>{eq.magType}</Text>
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.loc} numberOfLines={2}>
                                    {eq.title || t("home.unknown_location")}
                                </Text>
                                <View style={styles.cardMeta}>
                                    <View style={styles.timeContainer}>
                                        <MaterialCommunityIcons name="clock-outline" size={10} color={Colors.text.muted} />
                                        <Text style={styles.time}>{timeAgo(eq.date)}</Text>
                                    </View>
                                    <SourceBadge source={eq.source} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Detail Modal */}
            <Modal
                visible={!!selected}
                transparent
                animationType="slide"
                onRequestClose={() => setSelected(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelected(null)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.sheetHandle} />
                        {selected && (
                            <View style={styles.modalBody}>
                                {/* Title row */}
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalMagBox, { backgroundColor: magnitudeColor(selected.magnitude) }]}>
                                        <Text style={styles.modalMagText}>{selected.magnitude.toFixed(1)}</Text>
                                        <Text style={styles.modalMagUnit}>{selected.magType}</Text>
                                    </View>
                                    <View style={styles.modalTitleBox}>
                                        <View style={styles.modalTitleRow}>
                                            <Text style={styles.modalTitle} numberOfLines={2}>
                                                {selected.title || "Bilinmiyor"}
                                            </Text>
                                            <SourceBadge source={selected.source} />
                                        </View>
                                        <Text style={styles.modalSubtitle}>
                                            {selected.date.toLocaleString(i18n.language)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Stats */}
                                <View style={styles.statsContainer}>
                                    <View style={styles.statBox}>
                                        <MaterialCommunityIcons name="arrow-down" size={22} color={Colors.accent} />
                                        <Text style={styles.statLabel}>{t("map.depth")}</Text>
                                        <Text style={styles.statValue}>{selected.depth?.toFixed(1) ?? "—"} km</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <MaterialCommunityIcons name="map-marker" size={22} color={Colors.accent} />
                                        <Text style={styles.statLabel}>Koordinatlar</Text>
                                        <Text style={styles.statValue}>
                                            {selected.coordinates.latitude.toFixed(3)}, {selected.coordinates.longitude.toFixed(3)}
                                        </Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <MaterialCommunityIcons name="database" size={22} color={SOURCE_META[selected.source].color} />
                                        <Text style={styles.statLabel}>Kaynak</Text>
                                        <Text style={[styles.statValue, { color: SOURCE_META[selected.source].color }]}>
                                            {SOURCE_META[selected.source].label}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                                    <Text style={styles.closeBtnText}>{t("map.close")}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
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
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    headerTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    staleChip: {
        paddingHorizontal: 6, paddingVertical: 2,
        backgroundColor: Colors.accent + "20",
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.accent + "50",
    },
    staleChipText: { color: Colors.accent, fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
    refreshBtn: { padding: 8, backgroundColor: Colors.background.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.glass },

    // Filters
    filterRow: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: 8,
        flexDirection: "row",
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        backgroundColor: Colors.background.surface,
    },
    filterDot: { width: 5, height: 5, borderRadius: 2.5 },
    filterChipText: { color: Colors.text.muted, fontSize: 11, fontWeight: "700" },

    // Count
    countRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
    countText: { color: Colors.text.muted, fontSize: 11, fontWeight: "600" },

    // Grid
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: Spacing.sm,
        gap: Spacing.sm,
        paddingBottom: 30,
    },
    card: {
        width: "47.5%",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1.5,
        padding: Spacing.md,
        alignItems: "center",
        gap: 8,
    },
    circle: {
        width: 52, height: 52,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    magText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    magUnit: { color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700" },
    cardInfo: { alignItems: "center", gap: 6, width: "100%" },
    loc: { color: Colors.text.dark, fontSize: 12, fontWeight: "600", textAlign: "center", minHeight: 30 },
    cardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" },
    timeContainer: { flexDirection: "row", alignItems: "center", gap: 3 },
    time: { color: Colors.text.muted, fontSize: 10, fontWeight: "500" },

    // Source badge (used on cards)
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
    },
    badgeDot: { width: 4, height: 4, borderRadius: 2 },
    badgeText: { fontSize: 8, fontWeight: "800", letterSpacing: 0.3 },

    // Highlight (navigasyondan gelen deprem)
    cardHighlight: {
        borderColor: Colors.accent,
        borderWidth: 2.5,
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },

    // Skeleton
    skeletonCard: { borderColor: Colors.border.glass },
    skeletonCircle: { width: 52, height: 52, borderRadius: BorderRadius.lg, backgroundColor: Colors.background.elevated },
    skeletonCardInfo: { alignItems: "center", gap: 6, width: "100%" },
    skeletonL1: { height: 12, width: "75%", backgroundColor: Colors.background.elevated, borderRadius: 4 },
    skeletonL2: { height: 10, width: "50%", backgroundColor: Colors.background.elevated, borderRadius: 4 },

    // Empty
    emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, width: "100%" },
    emptyText: { color: Colors.text.muted, fontSize: 15, marginTop: 14, fontWeight: "500" },
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 24, paddingVertical: 10,
        backgroundColor: Colors.primary + "20",
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.primary + "50",
    },
    retryBtnText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: "700" },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: Colors.background.dark,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xxl,
    },
    sheetHandle: {
        width: 40, height: 4,
        backgroundColor: Colors.background.elevated,
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: Spacing.md,
    },
    modalBody: { paddingHorizontal: Spacing.lg },
    modalHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, marginBottom: Spacing.xl },
    modalMagBox: {
        width: 64, height: 64,
        borderRadius: BorderRadius.xl,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    modalMagText: { color: "#fff", fontSize: 24, fontWeight: "800" },
    modalMagUnit: { color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: "700" },
    modalTitleBox: { flex: 1 },
    modalTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 4 },
    modalTitle: { flex: 1, color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    modalSubtitle: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginTop: 2 },
    statsContainer: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xl },
    statBox: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm + 4,
        alignItems: "center",
        gap: 4,
    },
    statLabel: { color: Colors.text.muted, fontSize: 9, fontWeight: "700", textTransform: "uppercase" },
    statValue: { color: Colors.text.dark, fontSize: Typography.sizes.sm, fontWeight: "700", textAlign: "center" },
    closeBtn: {
        backgroundColor: Colors.accent,
        borderRadius: BorderRadius.lg,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
    },
    closeBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },

    // Region toggle
    regionRow: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    regionBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        backgroundColor: Colors.background.surface,
    },
    regionBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    regionBtnText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    regionBtnTextActive: {
        color: "#fff",
    },
});
