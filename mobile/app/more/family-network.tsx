/**
 * Güvenlik Ağı — Aile üyelerinin durumunu takip etme sayfası.
 * "Ben İyiyim" butonuna basıldığında aile üyelerinin durumu güncellenir.
 * Deprem anında aile bireylerinin güvenlik durumunu ve konumlarını gösterir.
 */

import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
    RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { api } from "../../src/services/api";

const FAMILY_STORAGE_KEY = "quakesense_family_members";

type MemberStatus = "safe" | "unknown" | "danger";

interface FamilyMember {
    id: string;
    name: string;
    phone: string;
    relationship: string;
    status: MemberStatus;
    lastSeen: string | null;
    lastLocation: { lat: number; lng: number } | null;
    avatarColor: string;
}

const AVATAR_COLORS = [
    Colors.primary,
    Colors.status.info,
    "#8b5cf6",
    "#ec4899",
    Colors.accent,
    "#06b6d4",
];

const RELATIONSHIPS = [
    { id: "spouse", label: "Eş", icon: "heart" },
    { id: "parent", label: "Anne/Baba", icon: "account-heart" },
    { id: "child", label: "Çocuk", icon: "baby-face-outline" },
    { id: "sibling", label: "Kardeş", icon: "account-multiple" },
    { id: "other", label: "Diğer", icon: "account" },
];

function getStatusInfo(status: MemberStatus) {
    switch (status) {
        case "safe":
            return { label: "Güvende", color: Colors.primary, icon: "shield-check" as const, bgColor: Colors.primary + "15" };
        case "danger":
            return { label: "Tehlikede", color: Colors.danger, icon: "alert-circle" as const, bgColor: Colors.danger + "15" };
        default:
            return { label: "Durumu Bilinmiyor", color: Colors.text.muted, icon: "help-circle-outline" as const, bgColor: Colors.background.elevated };
    }
}

function timeAgoText(isoStr: string | null): string {
    if (!isoStr) return "Bilgi yok";
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return "Az önce";
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
}

async function loadMembers(): Promise<FamilyMember[]> {
    try {
        const raw = await AsyncStorage.getItem(FAMILY_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

async function saveMembers(members: FamilyMember[]): Promise<void> {
    await AsyncStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(members));
}

export default function FamilyNetworkScreen() {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [adding, setAdding] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [relationship, setRelationship] = useState("spouse");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const local = await loadMembers();
        setMembers(local);

        // Try fetching status updates from backend
        try {
            const { data } = await api.get("/api/v1/family/members");
            if (Array.isArray(data) && data.length > 0) {
                const merged = local.map((m) => {
                    const remote = (data as any[]).find((r: any) => r.phone === m.phone);
                    if (remote) {
                        return {
                            ...m,
                            status: remote.status || m.status,
                            lastSeen: remote.last_seen || m.lastSeen,
                            lastLocation: remote.last_location || m.lastLocation,
                        };
                    }
                    return m;
                });
                setMembers(merged);
                await saveMembers(merged);
            }
        } catch {
            // Backend unavailable — use local data
        }

        setLoading(false);
        setRefreshing(false);
    };

    const handleAdd = async () => {
        if (!name.trim() || !phone.trim()) {
            Alert.alert("Hata", "İsim ve telefon numarası zorunludur.");
            return;
        }

        setSaving(true);

        const newMember: FamilyMember = {
            id: Date.now().toString(),
            name: name.trim(),
            phone: phone.trim(),
            relationship,
            status: "unknown",
            lastSeen: null,
            lastLocation: null,
            avatarColor: AVATAR_COLORS[members.length % AVATAR_COLORS.length],
        };

        try {
            await api.post("/api/v1/family/members", {
                name: newMember.name,
                phone: newMember.phone,
                relationship: newMember.relationship,
            });
        } catch {
            // Backend failed — save locally
        }

        const updated = [...members, newMember];
        setMembers(updated);
        await saveMembers(updated);

        setName("");
        setPhone("");
        setRelationship("spouse");
        setAdding(false);
        setSaving(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert("Üyeyi Kaldır", "Bu aile üyesini güvenlik ağınızdan kaldırmak istiyor musunuz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Kaldır",
                style: "destructive",
                onPress: async () => {
                    const member = members.find((m) => m.id === id);
                    try {
                        if (member) await api.delete(`/api/v1/family/members/${id}`);
                    } catch {}
                    const updated = members.filter((m) => m.id !== id);
                    setMembers(updated);
                    await saveMembers(updated);
                },
            },
        ]);
    };

    const safeCount = members.filter((m) => m.status === "safe").length;
    const unknownCount = members.filter((m) => m.status === "unknown").length;

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); loadData(); }}
                    tintColor={Colors.primary}
                />
            }
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Güvenlik Ağı</Text>
                    <Text style={styles.subtitle}>Aile üyelerinizin deprem sonrası durumunu takip edin</Text>
                </View>
            </View>

            {/* Status Summary */}
            {members.length > 0 && (
                <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { borderColor: Colors.primary + "30" }]}>
                        <View style={[styles.summaryIcon, { backgroundColor: Colors.primary + "15" }]}>
                            <MaterialCommunityIcons name="shield-check" size={20} color={Colors.primary} />
                        </View>
                        <Text style={[styles.summaryValue, { color: Colors.primary }]}>{safeCount}</Text>
                        <Text style={styles.summaryLabel}>Güvende</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: Colors.text.muted + "30" }]}>
                        <View style={[styles.summaryIcon, { backgroundColor: Colors.background.elevated }]}>
                            <MaterialCommunityIcons name="help-circle-outline" size={20} color={Colors.text.muted} />
                        </View>
                        <Text style={[styles.summaryValue, { color: Colors.text.muted }]}>{unknownCount}</Text>
                        <Text style={styles.summaryLabel}>Bilinmiyor</Text>
                    </View>
                    <View style={[styles.summaryCard, { borderColor: Colors.status.info + "30" }]}>
                        <View style={[styles.summaryIcon, { backgroundColor: Colors.status.info + "15" }]}>
                            <MaterialCommunityIcons name="account-group" size={20} color={Colors.status.info} />
                        </View>
                        <Text style={[styles.summaryValue, { color: Colors.status.info }]}>{members.length}</Text>
                        <Text style={styles.summaryLabel}>Toplam</Text>
                    </View>
                </View>
            )}

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="information-outline" size={18} color={Colors.status.info} />
                <Text style={styles.infoBannerText}>
                    "Ben İyiyim" butonuna basıldığında, bu listedeki aile üyelerinize durumunuz ve konumunuz bildirilir. Aynı uygulamayı kullanan üyelerin durumu otomatik güncellenir.
                </Text>
            </View>

            {/* Members List */}
            <View style={styles.membersList}>
                {members.map((member) => {
                    const statusInfo = getStatusInfo(member.status);
                    const relInfo = RELATIONSHIPS.find((r) => r.id === member.relationship);

                    return (
                        <View key={member.id} style={styles.memberCard}>
                            <View style={styles.memberTop}>
                                {/* Avatar */}
                                <View style={[styles.avatar, { backgroundColor: member.avatarColor + "20" }]}>
                                    <Text style={[styles.avatarText, { color: member.avatarColor }]}>
                                        {member.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                {/* Info */}
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{member.name}</Text>
                                    <View style={styles.memberMeta}>
                                        <MaterialCommunityIcons
                                            name={(relInfo?.icon || "account") as any}
                                            size={12}
                                            color={Colors.text.muted}
                                        />
                                        <Text style={styles.memberRelation}>
                                            {relInfo?.label || "Diğer"}
                                        </Text>
                                        <View style={styles.metaDot} />
                                        <Text style={styles.memberPhone}>{member.phone}</Text>
                                    </View>
                                </View>

                                {/* Delete */}
                                <TouchableOpacity onPress={() => handleDelete(member.id)} style={styles.deleteBtn}>
                                    <MaterialCommunityIcons name="close" size={18} color={Colors.text.muted} />
                                </TouchableOpacity>
                            </View>

                            {/* Status bar */}
                            <View style={[styles.statusBar, { backgroundColor: statusInfo.bgColor }]}>
                                <MaterialCommunityIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
                                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                                    {statusInfo.label}
                                </Text>
                                <View style={{ flex: 1 }} />
                                <MaterialCommunityIcons name="clock-outline" size={12} color={Colors.text.muted} />
                                <Text style={styles.lastSeenText}>{timeAgoText(member.lastSeen)}</Text>
                            </View>

                            {/* Location */}
                            {member.lastLocation && (
                                <View style={styles.locationRow}>
                                    <MaterialCommunityIcons name="map-marker" size={14} color={Colors.status.info} />
                                    <Text style={styles.locationText}>
                                        {member.lastLocation.lat.toFixed(4)}, {member.lastLocation.lng.toFixed(4)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}

                {members.length === 0 && !adding && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <MaterialCommunityIcons name="account-group-outline" size={64} color={Colors.border.dark} />
                        </View>
                        <Text style={styles.emptyTitle}>Henüz aile üyesi eklemediniz</Text>
                        <Text style={styles.emptyDesc}>
                            Aile üyelerinizi ekleyin ve deprem anında onların güvenlik durumunu anlık takip edin.
                        </Text>
                    </View>
                )}
            </View>

            {/* Add Member Button */}
            {!adding && members.length < 10 && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setAdding(true)} activeOpacity={0.9}>
                    <MaterialCommunityIcons name="plus" size={22} color="#fff" />
                    <Text style={styles.addBtnText}>AİLE ÜYESİ EKLE</Text>
                </TouchableOpacity>
            )}

            {/* Add Form */}
            {adding && (
                <View style={styles.formCard}>
                    <View style={styles.formHeader}>
                        <Text style={styles.formTitle}>Yeni Aile Üyesi</Text>
                        <TouchableOpacity onPress={() => setAdding(false)}>
                            <MaterialCommunityIcons name="close" size={20} color={Colors.text.muted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>İsim Soyisim</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Örn: Ayşe Yılmaz"
                            placeholderTextColor={Colors.text.muted}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Telefon Numarası</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Örn: 05xx xxx xx xx"
                            placeholderTextColor={Colors.text.muted}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Yakınlık</Text>
                        <View style={styles.relationRow}>
                            {RELATIONSHIPS.map((rel) => (
                                <TouchableOpacity
                                    key={rel.id}
                                    style={[
                                        styles.relationChip,
                                        relationship === rel.id && styles.relationChipActive,
                                    ]}
                                    onPress={() => setRelationship(rel.id)}
                                >
                                    <MaterialCommunityIcons
                                        name={rel.icon as any}
                                        size={16}
                                        color={relationship === rel.id ? "#fff" : Colors.text.muted}
                                    />
                                    <Text
                                        style={[
                                            styles.relationChipText,
                                            relationship === rel.id && styles.relationChipTextActive,
                                        ]}
                                    >
                                        {rel.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                        onPress={handleAdd}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>KAYDET</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {/* How it works */}
            <View style={styles.howItWorks}>
                <Text style={styles.howTitle}>Nasıl Çalışır?</Text>
                <View style={styles.howStep}>
                    <View style={[styles.howStepNum, { backgroundColor: Colors.primary + "15" }]}>
                        <Text style={[styles.howStepNumText, { color: Colors.primary }]}>1</Text>
                    </View>
                    <Text style={styles.howStepText}>Aile üyelerinizi bu sayfadan ekleyin</Text>
                </View>
                <View style={styles.howStep}>
                    <View style={[styles.howStepNum, { backgroundColor: Colors.status.info + "15" }]}>
                        <Text style={[styles.howStepNumText, { color: Colors.status.info }]}>2</Text>
                    </View>
                    <Text style={styles.howStepText}>Deprem sonrası ana sayfadaki "Ben İyiyim" butonuna basın</Text>
                </View>
                <View style={styles.howStep}>
                    <View style={[styles.howStepNum, { backgroundColor: Colors.accent + "15" }]}>
                        <Text style={[styles.howStepNumText, { color: Colors.accent }]}>3</Text>
                    </View>
                    <Text style={styles.howStepText}>Aile üyelerinizin durumu bu sayfada otomatik güncellenir</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.xl,
        marginTop: Spacing.lg,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    title: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.text.dark, letterSpacing: -0.5 },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    summaryRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
    summaryCard: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        ...Shadows.sm,
    },
    summaryIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    summaryValue: { fontSize: Typography.sizes.xxl, fontWeight: "900" },
    summaryLabel: { fontSize: 9, fontWeight: "700", color: Colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5 },

    infoBanner: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        backgroundColor: Colors.status.info + "08",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.status.info + "20",
    },
    infoBannerText: { flex: 1, fontSize: 12, color: Colors.text.muted, lineHeight: 18, fontWeight: "500" },

    membersList: { gap: Spacing.md, marginBottom: Spacing.lg },
    memberCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    memberTop: { flexDirection: "row", alignItems: "center", marginBottom: Spacing.sm },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    avatarText: { fontSize: Typography.sizes.xl, fontWeight: "900" },
    memberInfo: { flex: 1 },
    memberName: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    memberMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
    memberRelation: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "600" },
    metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.text.muted },
    memberPhone: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500" },
    deleteBtn: { padding: 8 },

    statusBar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
    },
    statusText: { fontSize: Typography.sizes.sm, fontWeight: "800" },
    lastSeenText: { fontSize: 10, color: Colors.text.muted, fontWeight: "600" },

    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border.glass,
    },
    locationText: { fontSize: Typography.sizes.xs, color: Colors.status.info, fontWeight: "600" },

    emptyState: { alignItems: "center", paddingVertical: Spacing.xxl },
    emptyIcon: { marginBottom: Spacing.md, opacity: 0.4 },
    emptyTitle: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark, marginBottom: 8 },
    emptyDesc: { fontSize: Typography.sizes.sm, color: Colors.text.muted, textAlign: "center", lineHeight: 20, maxWidth: 300 },

    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: BorderRadius.xl,
        gap: 10,
        marginBottom: Spacing.xl,
        ...Shadows.md,
    },
    addBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1, fontSize: Typography.sizes.sm },

    formCard: {
        backgroundColor: Colors.background.surface,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "40",
        marginBottom: Spacing.xl,
    },
    formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
    formTitle: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark },
    inputGroup: { marginBottom: Spacing.md },
    label: { fontSize: 11, fontWeight: "800", color: Colors.text.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    input: {
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        color: Colors.text.dark,
        fontWeight: "700",
        borderWidth: 1,
        borderColor: Colors.border.dark,
        fontSize: Typography.sizes.md,
    },
    relationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    relationChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    relationChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    relationChipText: { fontSize: Typography.sizes.xs, fontWeight: "700", color: Colors.text.muted },
    relationChipTextActive: { color: "#fff" },
    saveBtn: {
        backgroundColor: Colors.primary,
        height: 52,
        borderRadius: BorderRadius.xl,
        alignItems: "center",
        justifyContent: "center",
        marginTop: Spacing.sm,
        ...Shadows.sm,
    },
    saveBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },

    howItWorks: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    howTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    howStep: { flexDirection: "row", alignItems: "center", gap: 12 },
    howStepNum: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    howStepNumText: { fontSize: Typography.sizes.sm, fontWeight: "900" },
    howStepText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text.muted, fontWeight: "600", lineHeight: 20 },
});
