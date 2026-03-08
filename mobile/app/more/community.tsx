/**
 * Bölge Sohbeti — Topluluk Uyarıları.
 * Anlık hasar bildirimleri: yol kapandı, yangın, bina hasarı, vs.
 */

import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    RefreshControl,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
    ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { api } from "../../src/services/api";

// ─── Types & Constants ────────────────────────────────────────────────────────

interface Report {
    id: number;
    category: string;
    description?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
    created_at: string;
}

const CATEGORIES = [
    { key: "road_closed", label: "Yol Kapalı", icon: "road-variant", color: "#f97316" },
    { key: "fire", label: "Yangın Var", icon: "fire", color: "#ef4444" },
    { key: "building_damage", label: "Yapı Hasarlı", icon: "home-alert-outline", color: "#dc2626" },
    { key: "flood", label: "Su Baskını", icon: "water-alert", color: "#3b82f6" },
    { key: "injury", label: "Yaralı Var", icon: "medical-bag", color: "#e11d48" },
    { key: "rescue_needed", label: "Kurtarma Lazım", icon: "lifebuoy", color: "#7c3aed" },
    { key: "safe", label: "Bölge Güvenli", icon: "check-circle-outline", color: "#10B981" },
    { key: "other", label: "Diğer", icon: "dots-horizontal-circle-outline", color: "#6b7280" },
];

function getCategoryMeta(key: string) {
    return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

function timeAgo(isoStr: string): string {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return `${diff}sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
    return `${Math.floor(diff / 86400)}g önce`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CommunityScreen() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sendModalVisible, setSendModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [description, setDescription] = useState("");
    const [sending, setSending] = useState(false);

    const fetchReports = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const { data } = await api.get<Report[]>("/api/v1/community/reports?hours=48&limit=100");
            setReports(data);
        } catch {
            // show empty list
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchReports(); }, []);

    const handleSend = async () => {
        if (!selectedCategory) {
            Alert.alert("Hata", "Lütfen bir durum seçin.");
            return;
        }
        setSending(true);
        try {
            // Get location
            let lat: number | undefined;
            let lon: number | undefined;
            let district: string | undefined;

            const { status } = await Location.getForegroundPermissionsAsync();
            if (status === "granted") {
                const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                lat = pos.coords.latitude;
                lon = pos.coords.longitude;
                try {
                    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
                    district = [place?.district, place?.city].filter(Boolean).join(", ");
                } catch { /* skip reverse geocode */ }
            }

            await api.post("/api/v1/community/reports", {
                category: selectedCategory,
                description: description.trim() || undefined,
                district,
                latitude: lat,
                longitude: lon,
            });

            setSendModalVisible(false);
            setSelectedCategory(null);
            setDescription("");
            fetchReports(true);
            Alert.alert("Bildirim Gönderildi", "Topluluk uyarınız paylaşıldı. Teşekkürler!");
        } catch {
            Alert.alert("Hata", "Bildirim gönderilemedi. İnternet bağlantınızı kontrol edin.");
        } finally {
            setSending(false);
        }
    };

    const renderReport = ({ item }: { item: Report }) => {
        const cat = getCategoryMeta(item.category);
        return (
            <View style={styles.reportCard}>
                <View style={[styles.catDot, { backgroundColor: cat.color + "25", borderColor: cat.color + "50" }]}>
                    <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                    <View style={styles.reportTop}>
                        <Text style={[styles.catLabel, { color: cat.color }]}>{cat.label}</Text>
                        <Text style={styles.timeLabel}>{timeAgo(item.created_at)}</Text>
                    </View>
                    {item.district && <Text style={styles.districtLabel}>📍 {item.district}</Text>}
                    {item.description && <Text style={styles.descText}>{item.description}</Text>}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Bölge Sohbeti</Text>
                    <Text style={styles.subtitle}>Topluluk Uyarıları · Son 48 saat</Text>
                </View>
                <TouchableOpacity
                    style={styles.sendHeaderBtn}
                    onPress={() => setSendModalVisible(true)}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Quick report buttons */}
            <View style={styles.quickRow}>
                <Text style={styles.quickLabel}>Hızlı Bildir:</Text>
                <View style={styles.quickBtns}>
                    {CATEGORIES.slice(0, 4).map((cat) => (
                        <TouchableOpacity
                            key={cat.key}
                            style={[styles.quickBtn, { backgroundColor: cat.color + "15", borderColor: cat.color + "40" }]}
                            onPress={() => {
                                setSelectedCategory(cat.key);
                                setSendModalVisible(true);
                            }}
                        >
                            <MaterialCommunityIcons name={cat.icon as any} size={14} color={cat.color} />
                            <Text style={[styles.quickBtnText, { color: cat.color }]}>{cat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Feed */}
            <FlatList
                data={reports}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderReport}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchReports(true)}
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.emptyBox}>
                            <ActivityIndicator color={Colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.emptyBox}>
                            <MaterialCommunityIcons name="chat-outline" size={48} color={Colors.text.muted} />
                            <Text style={styles.emptyText}>Henüz bildirim yok</Text>
                            <Text style={styles.emptySubtext}>İlk bildirimi sen yap!</Text>
                        </View>
                    )
                }
            />

            {/* Send Modal */}
            <Modal
                visible={sendModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setSendModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHandle} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Durum Bildir</Text>
                            <TouchableOpacity onPress={() => { setSendModalVisible(false); setSelectedCategory(null); setDescription(""); }}>
                                <MaterialCommunityIcons name="close" size={22} color={Colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        {/* Category grid */}
                        <Text style={styles.modalLabel}>Durum Seçin</Text>
                        <View style={styles.catGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[
                                        styles.catGridItem,
                                        selectedCategory === cat.key && { backgroundColor: cat.color + "20", borderColor: cat.color },
                                    ]}
                                    onPress={() => setSelectedCategory(cat.key)}
                                >
                                    <MaterialCommunityIcons name={cat.icon as any} size={22} color={cat.color} />
                                    <Text style={[styles.catGridText, selectedCategory === cat.key && { color: cat.color }]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Optional description */}
                        <Text style={styles.modalLabel}>Açıklama (opsiyonel)</Text>
                        <TextInput
                            style={styles.descInput}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="Detay ekleyin... (Cadde adı, yapı numarası, vs.)"
                            placeholderTextColor={Colors.text.muted}
                            multiline
                            numberOfLines={3}
                            maxLength={500}
                        />

                        <TouchableOpacity
                            style={[styles.sendBtn, !selectedCategory && { opacity: 0.4 }]}
                            onPress={handleSend}
                            disabled={!selectedCategory || sending}
                        >
                            {sending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="send" size={18} color="#fff" />
                                    <Text style={styles.sendBtnText}>BİLDİR</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    header: {
        flexDirection: "row", alignItems: "center", gap: Spacing.md,
        paddingHorizontal: Spacing.md, paddingTop: 50, paddingBottom: Spacing.lg,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.background.surface, justifyContent: "center", alignItems: "center",
        borderWidth: 1, borderColor: Colors.border.dark,
    },
    title: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500" },
    sendHeaderBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center",
    },

    quickRow: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
    quickLabel: { fontSize: 11, fontWeight: "800", color: Colors.text.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
    quickBtns: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    quickBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md,
        borderWidth: 1,
    },
    quickBtnText: { fontSize: 11, fontWeight: "700" },

    listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxxl },
    reportCard: {
        flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm,
        backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl,
        borderWidth: 1, borderColor: Colors.border.dark, padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    catDot: {
        width: 44, height: 44, borderRadius: 22,
        justifyContent: "center", alignItems: "center", borderWidth: 1, flexShrink: 0,
    },
    reportTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    catLabel: { fontSize: 13, fontWeight: "800" },
    timeLabel: { fontSize: 10, color: Colors.text.muted, fontWeight: "500" },
    districtLabel: { fontSize: 11, color: Colors.text.muted, fontWeight: "600", marginBottom: 4 },
    descText: { fontSize: 12, color: Colors.text.dark, fontWeight: "500", lineHeight: 18 },

    emptyBox: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { color: Colors.text.muted, fontSize: 16, fontWeight: "700" },
    emptySubtext: { color: Colors.text.muted, fontSize: 13, fontWeight: "500" },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    modalCard: {
        backgroundColor: Colors.background.surface,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: Spacing.xl, paddingBottom: Spacing.xxxl,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: Colors.border.dark, borderRadius: 2, alignSelf: "center", marginBottom: Spacing.lg },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
    modalTitle: { fontSize: Typography.sizes.lg, fontWeight: "900", color: Colors.text.dark },
    modalLabel: { fontSize: 11, fontWeight: "800", color: Colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: Spacing.lg },
    catGridItem: {
        flexBasis: "22%", flexGrow: 1, alignItems: "center", gap: 4, paddingVertical: 12,
        backgroundColor: Colors.background.dark, borderRadius: BorderRadius.lg,
        borderWidth: 1.5, borderColor: Colors.border.dark,
    },
    catGridText: { fontSize: 9, fontWeight: "800", color: Colors.text.muted, textAlign: "center" },
    descInput: {
        backgroundColor: Colors.background.dark, borderRadius: BorderRadius.md,
        padding: Spacing.md, color: Colors.text.dark, fontWeight: "600",
        borderWidth: 1, borderColor: Colors.border.dark, minHeight: 80,
        marginBottom: Spacing.lg, textAlignVertical: "top",
    },
    sendBtn: {
        backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.lg,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    sendBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
});
