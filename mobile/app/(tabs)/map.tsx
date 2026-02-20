/**
 * Deprem harita ekranı — WebGL tabanlı react-native-maps gerektirmez.
 * Expo MapView, ejected/bare workflow gerektirdiği için basit liste görünümü.
 * Koordinat grid'i ve tıklanabilir deprem noktaları gösterilir.
 */

import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    SafeAreaView,
    Platform,
} from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWebSocket } from "../../src/hooks/useWebSocket";
import { useTranslation } from "react-i18next";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

interface EQ {
    id: string;
    magnitude: number;
    depth: number;
    latitude: number;
    longitude: number;
    location: string;
    occurred_at: string;
    source: string;
}

function magnitudeColor(m: number): string {
    if (m >= 6) return Colors.primary;
    if (m >= 5) return Colors.status.warning;
    if (m >= 4) return "#ca8a04";
    return Colors.status.success;
}

function timeAgo(iso: string): string {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return `${d}s`;
    if (d < 3600) return `${Math.floor(d / 60)}m`;
    return `${Math.floor(d / 3600)}h`;
}

export default function MapScreen() {
    const { isConnected, lastEvent } = useWebSocket();
    const { t, i18n } = useTranslation();
    const [recent, setRecent] = useState<EQ[]>([]);
    const [selected, setSelected] = useState<EQ | null>(null);

    // Son gelen deprem → listeye ekle (max 24)
    if (lastEvent) {
        const exists = recent.find((q) => q.id === lastEvent.id);
        if (!exists) {
            setRecent((prev) => [lastEvent as EQ, ...prev].slice(0, 24));
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.dot, { backgroundColor: isConnected ? Colors.status.success : Colors.text.muted }]} />
                    <Text style={styles.headerTitle}>{t("map.recent")}</Text>
                </View>
                <Text style={styles.headerStatus}>{isConnected ? t("home.live") : t("home.disconnected")}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
                {recent.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="earth" size={80} color={Colors.background.surface} />
                        <Text style={styles.emptyText}>{t("map.no_data")}</Text>
                    </View>
                ) : (
                    recent.map((eq) => (
                        <TouchableOpacity
                            key={eq.id}
                            style={[styles.card, { borderColor: magnitudeColor(eq.magnitude) + '30' }]}
                            onPress={() => setSelected(eq)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.circle, { backgroundColor: magnitudeColor(eq.magnitude) }]}>
                                <Text style={styles.magText}>{eq.magnitude.toFixed(1)}</Text>
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.loc} numberOfLines={2}>{eq.location || t("home.unknown_location")}</Text>
                                <View style={styles.timeContainer}>
                                    <MaterialCommunityIcons name="clock-outline" size={10} color={Colors.text.muted} />
                                    <Text style={styles.time}>{timeAgo(eq.occurred_at)}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Detay Modal (Bottom Sheet Style) */}
            <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelected(null)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.sheetHandle} />
                        {selected && (
                            <View style={styles.modalBody}>
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalMagBox, { backgroundColor: magnitudeColor(selected.magnitude) }]}>
                                        <Text style={styles.modalMagText}>{selected.magnitude.toFixed(1)}</Text>
                                    </View>
                                    <View style={styles.modalTitleBox}>
                                        <Text style={styles.modalTitle}>{selected.location || "Bilinmiyor"}</Text>
                                        <Text style={styles.modalSubtitle}>{new Date(selected.occurred_at).toLocaleString(i18n.language)}</Text>
                                    </View>
                                </View>

                                <View style={styles.statsContainer}>
                                    <View style={styles.statBox}>
                                        <MaterialCommunityIcons name="arrow-down" size={24} color={Colors.primary} />
                                        <Text style={styles.statLabel}>{t("map.depth")}</Text>
                                        <Text style={styles.statValue}>{selected.depth?.toFixed(1) ?? "—"} km</Text>
                                    </View>
                                    <View style={styles.statBox}>
                                        <MaterialCommunityIcons name="map-marker" size={24} color={Colors.primary} />
                                        <Text style={styles.statLabel}>Koordinatlar</Text>
                                        <Text style={styles.statValue}>{selected.latitude.toFixed(2)}, {selected.longitude.toFixed(2)}</Text>
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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === 'android' ? 30 : 0 },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background.surface,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    headerTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    headerStatus: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: "600", textTransform: "uppercase" },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: Spacing.sm,
        gap: Spacing.sm,
    },
    card: {
        width: "47.5%",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1.5,
        padding: Spacing.md,
        alignItems: "center",
        gap: 10,
    },
    circle: {
        width: 48,
        height: 48,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    magText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    cardInfo: { alignItems: "center", gap: 4 },
    loc: { color: Colors.text.dark, fontSize: 12, fontWeight: "600", textAlign: "center", minHeight: 32 },
    timeContainer: { flexDirection: "row", alignItems: "center", gap: 3 },
    time: { color: Colors.text.muted, fontSize: 10, fontWeight: "500" },
    emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100, width: '100%' },
    emptyText: { color: Colors.text.muted, fontSize: 15, marginTop: 12, fontWeight: "500" },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: Colors.background.dark,
        borderTopLeftRadius: BorderRadius.xl * 2,
        borderTopRightRadius: BorderRadius.xl * 2,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xxl,
    },
    sheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.background.surface,
        borderRadius: 2,
        alignSelf: "center",
        marginBottom: Spacing.md,
    },
    modalBody: { paddingHorizontal: Spacing.lg },
    modalHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.xl },
    modalMagBox: {
        width: 60,
        height: 60,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    modalMagText: { color: "#fff", fontSize: 24, fontWeight: "800" },
    modalTitleBox: { flex: 1 },
    modalTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    modalSubtitle: { color: Colors.text.muted, fontSize: Typography.sizes.sm, marginTop: 2 },
    statsContainer: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xl },
    statBox: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: "center",
        gap: 4,
    },
    statLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    statValue: { color: Colors.text.dark, fontSize: Typography.sizes.md, fontWeight: "700" },
    closeBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
    },
    closeBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
