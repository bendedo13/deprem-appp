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
} from "react-native";
import { useWebSocket } from "../../src/hooks/useWebSocket";
import { useTranslation } from "react-i18next";

interface EQ {
    id: string;
    magnitude: number;
    depth: number;
    latitude: number;
    longitude: number;
    location: string;
    occurred_at: string;
}

function magnitudeColor(m: number): string {
    if (m >= 6) return "#dc2626";
    if (m >= 5) return "#ea580c";
    if (m >= 4) return "#ca8a04";
    return "#16a34a";
}

function timeAgo(iso: string): string {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (d < 60) return `${d}sn`;
    if (d < 3600) return `${Math.floor(d / 60)}dk`;
    return `${Math.floor(d / 3600)}sa`;
}

export default function MapScreen() {
    const { isConnected, lastEvent } = useWebSocket();
    const { t, i18n } = useTranslation();
    const [recent, setRecent] = useState<EQ[]>([]);
    const [selected, setSelected] = useState<EQ | null>(null);

    // Son gelen deprem → listeye ekle (max 20)
    if (lastEvent) {
        const exists = recent.find((q) => q.id === lastEvent.id);
        if (!exists) {
            setRecent((prev) => [lastEvent as EQ, ...prev].slice(0, 20));
        }
    }

    return (
        <View style={styles.container}>
            {/* Başlık */}
            <View style={styles.header}>
                <View style={[styles.dot, { backgroundColor: isConnected ? "#22c55e" : "#64748b" }]} />
                <Text style={styles.headerText}>
                    {isConnected ? t("home.live") : t("home.disconnected")} · {t("map.recent")}
                </Text>
            </View>

            {/* Deprem Kutuları */}
            <ScrollView contentContainerStyle={styles.grid}>
                {recent.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyEmoji}>🌍</Text>
                        <Text style={styles.emptyText}>{t("map.no_data")}</Text>
                    </View>
                ) : (
                    recent.map((eq) => (
                        <TouchableOpacity
                            key={eq.id}
                            style={[styles.card, { borderColor: magnitudeColor(eq.magnitude) }]}
                            onPress={() => setSelected(eq)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.circle, { backgroundColor: magnitudeColor(eq.magnitude) }]}>
                                <Text style={styles.magText}>{eq.magnitude.toFixed(1)}</Text>
                            </View>
                            <Text style={styles.loc} numberOfLines={2}>{eq.location || t("home.unknown_location")}</Text>
                            <Text style={styles.time}>{timeAgo(eq.occurred_at)}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Detay Modal */}
            <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
                <View style={styles.modalBg}>
                    <View style={styles.modalCard}>
                        {selected && (
                            <>
                                <Text style={styles.modalTitle}>
                                    M{selected.magnitude.toFixed(1)} — {selected.location || "Bilinmiyor"}
                                </Text>
                                <Text style={styles.modalRow}>📍 {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}</Text>
                                <Text style={styles.modalRow}>🕳️ {t("map.depth")}: {selected.depth?.toFixed(0) ?? "—"} km</Text>
                                <Text style={styles.modalRow}>
                                    🕒 {new Date(selected.occurred_at).toLocaleString(i18n.language)}
                                </Text>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)}>
                                    <Text style={styles.closeBtnText}>{t("map.close")}</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 12,
        backgroundColor: "#1e293b",
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    headerText: { color: "#94a3b8", fontSize: 13 },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        padding: 12,
        gap: 10,
        justifyContent: "flex-start",
    },
    card: {
        width: "46%",
        backgroundColor: "#1e293b",
        borderRadius: 12,
        borderWidth: 2,
        padding: 12,
        alignItems: "center",
        gap: 6,
    },
    circle: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
    },
    magText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    loc: { color: "#cbd5e1", fontSize: 12, textAlign: "center" },
    time: { color: "#64748b", fontSize: 11 },
    emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100 },
    emptyEmoji: { fontSize: 48 },
    emptyText: { color: "#64748b", fontSize: 15, marginTop: 12 },
    modalBg: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
    },
    modalCard: {
        backgroundColor: "#1e293b",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        gap: 12,
    },
    modalTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "700" },
    modalRow: { color: "#94a3b8", fontSize: 14 },
    closeBtn: {
        backgroundColor: "#ef4444",
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 8,
    },
    closeBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
