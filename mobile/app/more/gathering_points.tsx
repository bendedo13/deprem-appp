import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Vibration,
    Linking,
    Platform,
} from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { GatheringPoint, findNearestPoints, loadGatheringPoints } from "../../src/services/gatheringService";

export default function GatheringPointsScreen() {
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState<GatheringPoint[]>([]);
    const [nearby, setNearby] = useState<
        { point: GatheringPoint; distanceKm: number; bearingDeg: number }[]
    >([]);
    const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const all = await loadGatheringPoints();
                if (!mounted) return;
                setPoints(all);

                const { status: perm } = await Location.requestForegroundPermissionsAsync();
                if (perm === "granted") {
                    const pos = await Location.getLastKnownPositionAsync({});
                    if (pos) {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        setLocation({ lat, lon });
                        const nearest = await findNearestPoints(lat, lon, 3);
                        setNearby(nearest.map((n) => ({
                            point: n,
                            distanceKm: n.distanceKm,
                            bearingDeg: n.bearingDeg,
                        })));
                    }
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    function formatBearing(deg: number): string {
        const dirs = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"]; // Kuzey, Kuzeydoğu, ...
        const idx = Math.round(deg / 45) % 8;
        return `${dirs[idx]} • ${Math.round(deg)}°`;
    }

    const handleHaptic = () => {
        Vibration.vibrate(15);
    };

    const openNavigation = (lat: number, lon: number, name: string) => {
        Vibration.vibrate(15);
        const encodedName = encodeURIComponent(name);
        const url = Platform.select({
            ios: `maps:0,0?q=${encodedName}&ll=${lat},${lon}`,
            android: `google.navigation:q=${lat},${lon}`,
        }) ?? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
        Linking.openURL(url);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="map-marker-radius" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Toplanma Alanları</Text>
                    <Text style={styles.headerSubtitle}>
                        AFAD simülasyon verilerine göre size en yakın güvenli toplanma alanları.
                    </Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Güvenli alanlar yükleniyor…</Text>
                </View>
            ) : (
                <>
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Konumunuz</Text>
                        <View style={styles.locationRow}>
                            <MaterialCommunityIcons
                                name={location ? "crosshairs-gps" : "crosshairs-question"}
                                size={20}
                                color={location ? Colors.primary : Colors.text.muted}
                            />
                            <Text style={styles.locationText}>
                                {location
                                    ? `${location.lat.toFixed(4)}°N, ${location.lon.toFixed(4)}°E`
                                    : "Konum alınamadı. Son bilinen veriler kullanılıyor."}
                            </Text>
                        </View>

                        <Text style={styles.sectionLabel}>En Yakın 3 Toplanma Alanı</Text>
                        {nearby.length === 0 ? (
                            <Text style={styles.emptyText}>
                                Yakın konum bilgisi bulunamadı. Yine de aşağıdaki listeden size en uygun alanı seçin.
                            </Text>
                        ) : (
                            nearby.map(({ point, distanceKm, bearingDeg }) => (
                                <View key={point.id} style={styles.nearCard}>
                                    <View style={styles.nearLeft}>
                                        <View style={styles.compassCircle}>
                                            <MaterialCommunityIcons
                                                name="navigation-variant"
                                                size={20}
                                                color="#fff"
                                                style={{
                                                    transform: [{ rotate: `${bearingDeg}deg` }],
                                                }}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.nearTitle} numberOfLines={2}>
                                                {point.name}
                                            </Text>
                                            <Text style={styles.nearMeta}>
                                                {point.district}, {point.city}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.nearRight}>
                                        <Text style={styles.distanceText}>
                                            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
                                        </Text>
                                        <Text style={styles.bearingText}>{formatBearing(bearingDeg)}</Text>
                                        <TouchableOpacity
                                            style={styles.navBtn}
                                            onPress={() => openNavigation(point.latitude, point.longitude, point.name)}
                                            activeOpacity={0.8}
                                        >
                                            <MaterialCommunityIcons name="navigation-variant" size={14} color="#fff" />
                                            <Text style={styles.navBtnText}>Yol Tarifi</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Tüm Toplanma Alanları</Text>

                        {points.map((p) => (
                            <View key={p.id} style={styles.listItem}>
                                <View style={styles.listIconBox}>
                                    <MaterialCommunityIcons name="map-marker" size={18} color={Colors.accent} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listTitle}>{p.name}</Text>
                                    <Text style={styles.listMeta}>
                                        {p.district}, {p.city}
                                    </Text>
                                    <View style={styles.amenitiesRow}>
                                        {typeof p.capacity === "number" && (
                                            <Text style={styles.amenityChip}>
                                                👥 Kapasite ≈ {p.capacity}
                                            </Text>
                                        )}
                                        {p.amenities?.water && (
                                            <Text style={styles.amenityChip}>💧 Su</Text>
                                        )}
                                        {p.amenities?.electricity && (
                                            <Text style={styles.amenityChip}>⚡ Elektrik</Text>
                                        )}
                                        {p.amenities?.shelter && (
                                            <Text style={styles.amenityChip}>🏕️ Barınma</Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.xl,
        marginTop: Spacing.lg,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 18,
        backgroundColor: Colors.danger,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.lg,
    },
    headerTitle: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.text.dark,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "500",
        marginTop: 2,
    },
    loadingBox: {
        alignItems: "center",
        paddingTop: 60,
    },
    loadingText: {
        marginTop: Spacing.md,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    card: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        marginBottom: Spacing.lg,
    },
    sectionLabel: {
        fontSize: Typography.sizes.xs,
        fontWeight: "900",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.sm,
    },
    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        marginBottom: Spacing.md,
    },
    locationText: {
        flex: 1,
        color: Colors.text.dark,
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "500",
        marginTop: Spacing.sm,
    },
    nearCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.dark,
    },
    nearLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        flex: 1,
        marginRight: Spacing.sm,
    },
    compassCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.danger,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.sm,
    },
    nearTitle: {
        color: Colors.text.dark,
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
    },
    nearMeta: {
        color: Colors.text.muted,
        fontSize: 11,
        marginTop: 2,
    },
    nearRight: {
        alignItems: "flex-end",
        gap: 2,
    },
    distanceText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.primary,
    },
    bearingText: {
        fontSize: 11,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    cardHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.sm,
    },
    proPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
    },
    proPillText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "800",
    },
    proPillMuted: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    proPillMutedText: {
        color: Colors.text.muted,
        fontSize: 11,
        fontWeight: "700",
    },
    listItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border.dark,
    },
    listIconBox: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: Colors.background.dark,
        justifyContent: "center",
        alignItems: "center",
    },
    listTitle: {
        color: Colors.text.dark,
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
    },
    listMeta: {
        color: Colors.text.muted,
        fontSize: 11,
        marginTop: 2,
    },
    amenitiesRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 4,
    },
    amenityChip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.dark,
        color: Colors.text.muted,
        fontSize: 11,
        fontWeight: "600",
    },
    upgradeBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        ...Shadows.lg,
    },
    upgradeText: {
        color: "#fff",
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        textAlign: "center",
    },
    navBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary,
    },
    navBtnText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "800",
    },
});

