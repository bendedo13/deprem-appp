import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Vibration,
} from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import {
    ImpactReport,
    ImpactType,
    addImpactReport,
    loadImpactReports,
} from "../../src/services/impactReportService";

const TYPE_META: Record<
    ImpactType,
    { label: string; color: string; icon: string }
> = {
    building_damage: {
        label: "Binam Hasarlı",
        color: Colors.danger,
        icon: "home-alert",
    },
    road_blocked: {
        label: "Yollar Kapalı",
        color: Colors.accent,
        icon: "road-variant",
    },
    fire: {
        label: "Yangın Var",
        color: "#f97316",
        icon: "fire",
    },
};

export default function ImpactMapScreen() {
    const [reports, setReports] = useState<ImpactReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeType, setActiveType] = useState<ImpactType | "all">("all");
    /** Seçilen bildirim tipi — "Gönder"e basılınca sohbet odasına bu tip + adres gider. */
    const [selectedReportType, setSelectedReportType] = useState<ImpactType | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await loadImpactReports();
                if (mounted) setReports(data);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const handleSubmit = async (type: ImpactType) => {
        Vibration.vibrate(30);
        setSubmitting(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                const next = await addImpactReport({
                    type,
                    latitude: 0,
                    longitude: 0,
                });
                setReports(next);
                return;
            }
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });
            const next = await addImpactReport({
                type,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            });
            setReports(next);
        } finally {
            setSubmitting(false);
        }
    };

    /** Seçilen tipi sohbet odasına "Barış mahallesinde 1007. sokakta yollar kapalı" formatında gönderir. */
    const handleSendToChat = async () => {
        if (!selectedReportType) return;
        Vibration.vibrate(30);
        setSubmitting(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let addressText = TYPE_META[selectedReportType].label;
            let lat = 0;
            let lng = 0;
            if (status === "granted") {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
                try {
                    const [place] = await Location.reverseGeocodeAsync({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    });
                    if (place) {
                        const parts = [place.street, place.district, place.subregion, place.city].filter(Boolean);
                        const locationStr = parts.length > 0 ? parts.join(", ") : `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
                        addressText = `${locationStr} — ${TYPE_META[selectedReportType].label}`;
                    } else {
                        addressText = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} — ${TYPE_META[selectedReportType].label}`;
                    }
                } catch {
                    addressText = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} — ${TYPE_META[selectedReportType].label}`;
                }
            }
            const next = await addImpactReport({ type: selectedReportType, latitude: lat, longitude: lng });
            setReports(next);
            router.push({ pathname: "/more/chat", params: { initialMessage: addressText } });
            setSelectedReportType(null);
        } finally {
            setSubmitting(false);
        }
    };

    const filtered =
        activeType === "all"
            ? reports
            : reports.filter((r) => r.type === activeType);

    const counts: Record<ImpactType, number> = {
        building_damage: reports.filter((r) => r.type === "building_damage").length,
        road_blocked: reports.filter((r) => r.type === "road_blocked").length,
        fire: reports.filter((r) => r.type === "fire").length,
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="alert-decagram" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Live Impact Map</Text>
                    <Text style={styles.headerSubtitle}>
                        Deprem sonrası hasar, yol kapanması ve yangın bildirimlerini canlı olarak toplayan
                        simüle edilmiş etki haritası.
                    </Text>
                </View>
            </View>

            {/* Özet */}
            <View style={styles.summaryRow}>
                {(["building_damage", "road_blocked", "fire"] as ImpactType[]).map(
                    (t) => {
                        const meta = TYPE_META[t];
                        const count = counts[t];
                        return (
                            <View key={t} style={styles.summaryCard}>
                                <View
                                    style={[
                                        styles.summaryIcon,
                                        { backgroundColor: meta.color + "22" },
                                    ]}
                                >
                                    <MaterialCommunityIcons
                                        name={meta.icon as any}
                                        size={20}
                                        color={meta.color}
                                    />
                                </View>
                                <Text style={styles.summaryLabel}>{meta.label}</Text>
                                <Text style={[styles.summaryCount, { color: meta.color }]}>
                                    {count}
                                </Text>
                            </View>
                        );
                    }
                )}
            </View>

            {/* Bildirim butonları — seçim + Gönder */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hızlı Hasar Bildirimi</Text>
                <View style={styles.reportRow}>
                    {(["building_damage", "road_blocked", "fire"] as ImpactType[]).map(
                        (t) => {
                            const meta = TYPE_META[t];
                            const selected = selectedReportType === t;
                            return (
                                <TouchableOpacity
                                    key={t}
                                    style={[styles.reportBtn, { borderColor: meta.color + "70" }, selected && { backgroundColor: meta.color + "18", borderWidth: 2 }]}
                                    activeOpacity={0.85}
                                    disabled={submitting}
                                    onPress={() => setSelectedReportType(selected ? null : t)}
                                >
                                    <MaterialCommunityIcons
                                        name={meta.icon as "home-alert" | "road-variant" | "fire"}
                                        size={20}
                                        color={meta.color}
                                    />
                                    <Text style={[styles.reportBtnText, { color: meta.color }]}>
                                        {meta.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        }
                    )}
                </View>
                {selectedReportType !== null && (
                    <TouchableOpacity
                        style={[styles.sendToChatBtn, submitting && { opacity: 0.7 }]}
                        onPress={handleSendToChat}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="send" size={20} color="#fff" />
                                <Text style={styles.sendToChatBtnText}>Gönder — Sohbet Odasına Paylaş</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
                <Text style={styles.helperText}>
                    * Bir seçenek seçip "Gönder"e basarak konumunuzla birlikte sohbet odasında paylaşabilirsiniz.
                </Text>
            </View>

            {/* Filtre */}
            <View style={styles.filterRow}>
                {[
                    { key: "all", label: "Tümü" },
                    { key: "building_damage", label: "Bina" },
                    { key: "road_blocked", label: "Yol" },
                    { key: "fire", label: "Yangın" },
                ].map((f) => (
                    <TouchableOpacity
                        key={f.key}
                        style={[
                            styles.filterChip,
                            activeType === f.key && styles.filterChipActive,
                        ]}
                        onPress={() =>
                            setActiveType(f.key as ImpactType | "all")
                        }
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.filterChipText,
                                activeType === f.key && styles.filterChipTextActive,
                            ]}
                        >
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* "Heatmap" listesi */}
            <View style={styles.heatCard}>
                <Text style={styles.sectionTitle}>Son Bildirimler</Text>
                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={Colors.primary} />
                    </View>
                ) : filtered.length === 0 ? (
                    <Text style={styles.emptyText}>
                        Henüz kayıtlı bildirim yok. Bir seçenek seçip "Gönder"e basarak sohbet odasına paylaşın.
                    </Text>
                ) : (
                    filtered.map((r: ImpactReport) => {
                        const meta = TYPE_META[r.type];
                        const date = new Date(r.created_at);
                        return (
                            <View key={r.id} style={styles.reportItem}>
                                <View style={[styles.reportBadge, { borderColor: meta.color + "70" }]}>
                                    <MaterialCommunityIcons name={meta.icon as "home-alert" | "road-variant" | "fire"} size={18} color={meta.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.reportTitle, { color: meta.color }]}>{meta.label}</Text>
                                    <Text style={styles.reportMeta}>
                                        {r.latitude !== 0 ? `${r.latitude.toFixed(3)}, ${r.longitude.toFixed(3)}` : "Konum bilgisi yok"}
                                        {"  •  "}
                                        {date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </View>
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
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 18,
        backgroundColor: Colors.danger,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.md,
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
    summaryRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        alignItems: "flex-start",
        gap: 4,
    },
    summaryIcon: {
        width: 30,
        height: 30,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    summaryLabel: {
        fontSize: 11,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    summaryCount: {
        fontSize: Typography.sizes.lg,
        fontWeight: "900",
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.sm,
    },
    reportRow: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    reportBtn: {
        flex: 1,
        borderRadius: BorderRadius.xl,
        borderWidth: 1.5,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.sm,
        backgroundColor: Colors.background.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    reportBtnText: {
        fontSize: 11,
        fontWeight: "800",
        textTransform: "uppercase",
    },
    helperText: {
        fontSize: 10,
        color: Colors.text.muted,
        marginTop: Spacing.sm,
    },
    sendToChatBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.sm,
    },
    sendToChatBtnText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: "#fff",
    },
    filterRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    filterChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
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
        fontSize: 11,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    filterChipTextActive: {
        color: Colors.primary,
    },
    heatCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    loadingBox: {
        alignItems: "center",
        paddingVertical: Spacing.lg,
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "500",
    },
    reportItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        paddingVertical: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border.dark,
    },
    reportBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.background.dark,
    },
    reportTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
    },
    reportMeta: {
        fontSize: 11,
        color: Colors.text.muted,
        marginTop: 2,
    },
});

