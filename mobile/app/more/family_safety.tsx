/**
 * Guvenlik Agi - Aile takip ve durumu
 * Uyelerin "Ben İyiyim" durumlarini ve konumlarini goster
 */

import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Modal,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const FAMILY_KEY = "quakesense_family_members";

type MemberStatus = "safe" | "unknown" | "danger";

interface FamilyMember {
    id: string;
    name: string;
    phone: string;
    relation: string;
    status: MemberStatus;
    lastUpdated?: string;
}

const RELATION_OPTIONS = ["Eş", "Anne", "Baba", "Kardeş", "Çocuk", "Dost", "Diğer"];

const STATUS_CONFIG: Record<MemberStatus, { label: string; color: string; icon: string; bg: string }> = {
    safe: { label: "Güvende", color: Colors.primary, icon: "shield-check", bg: Colors.primary + "15" },
    unknown: { label: "Durum Bilinmiyor", color: Colors.text.muted, icon: "help-circle", bg: Colors.background.elevated },
    danger: { label: "Yardım İstedi", color: Colors.danger, icon: "alert-circle", bg: Colors.danger + "15" },
};

export default function FamilySafetyScreen() {
    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [relation, setRelation] = useState(RELATION_OPTIONS[0]);

    const loadMembers = useCallback(async () => {
        try {
            const stored = await SecureStore.getItemAsync(FAMILY_KEY);
            if (stored) setMembers(JSON.parse(stored));
        } catch {
            // empty
        }
    }, []);

    useEffect(() => { loadMembers(); }, [loadMembers]);

    async function saveMembers(list: FamilyMember[]) {
        await SecureStore.setItemAsync(FAMILY_KEY, JSON.stringify(list));
        setMembers(list);
    }

    async function addMember() {
        if (!name.trim() || !phone.trim()) {
            Alert.alert("Hata", "Ad ve telefon alanları zorunludur.");
            return;
        }
        const newMember: FamilyMember = {
            id: Date.now().toString(),
            name: name.trim(),
            phone: phone.trim(),
            relation,
            status: "unknown",
        };
        await saveMembers([...members, newMember]);
        setName("");
        setPhone("");
        setRelation(RELATION_OPTIONS[0]);
        setModalVisible(false);
    }

    async function removeMember(id: string) {
        Alert.alert(
            "Üyeyi Kaldır",
            "Bu kişiyi güvenlik ağınızdan kaldırmak istiyor musunuz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Kaldır",
                    style: "destructive",
                    onPress: async () => {
                        await saveMembers(members.filter((m) => m.id !== id));
                    },
                },
            ]
        );
    }

    function formatLastUpdated(iso?: string) {
        if (!iso) return "Henüz güncellenmedi";
        const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
        if (diff < 1) return "Az önce";
        if (diff < 60) return `${diff} dakika önce`;
        if (diff < 1440) return `${Math.floor(diff / 60)} saat önce`;
        return `${Math.floor(diff / 1440)} gün önce`;
    }

    const safeCount = members.filter((m) => m.status === "safe").length;
    const unknownCount = members.filter((m) => m.status === "unknown").length;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Güvenlik Ağım</Text>
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    style={styles.addBtn}
                >
                    <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="shield-account" size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Deprem anında "Ben İyiyim" butonuna bastığınızda bu listedeki kişiler otomatik bilgilendirilir.
                    </Text>
                </View>

                {/* Summary */}
                {members.length > 0 && (
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, { borderColor: Colors.primary + "30" }]}>
                            <MaterialCommunityIcons name="shield-check" size={22} color={Colors.primary} />
                            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{safeCount}</Text>
                            <Text style={styles.summaryLabel}>Güvende</Text>
                        </View>
                        <View style={[styles.summaryCard, { borderColor: Colors.text.muted + "30" }]}>
                            <MaterialCommunityIcons name="help-circle" size={22} color={Colors.text.muted} />
                            <Text style={[styles.summaryValue, { color: Colors.text.muted }]}>{unknownCount}</Text>
                            <Text style={styles.summaryLabel}>Bilinmiyor</Text>
                        </View>
                        <View style={[styles.summaryCard, { borderColor: Colors.status.info + "30" }]}>
                            <MaterialCommunityIcons name="account-group" size={22} color={Colors.status.info} />
                            <Text style={[styles.summaryValue, { color: Colors.status.info }]}>{members.length}</Text>
                            <Text style={styles.summaryLabel}>Toplam</Text>
                        </View>
                    </View>
                )}

                {/* Member List */}
                {members.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIcon}>
                            <MaterialCommunityIcons name="account-group-outline" size={48} color={Colors.text.muted} />
                        </View>
                        <Text style={styles.emptyTitle}>Güvenlik Ağınız Boş</Text>
                        <Text style={styles.emptyDesc}>
                            Aile üyelerinizi ekleyerek deprem anında birbirinizin durumundan haberdar olun.
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyBtn}
                            onPress={() => setModalVisible(true)}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="plus-circle" size={18} color="#fff" />
                            <Text style={styles.emptyBtnText}>İlk Kişiyi Ekle</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.memberList}>
                        <Text style={styles.listTitle}>Güvenlik Ağım ({members.length} Kişi)</Text>
                        {members.map((member) => {
                            const status = STATUS_CONFIG[member.status];
                            return (
                                <View key={member.id} style={styles.memberCard}>
                                    {/* Avatar */}
                                    <View style={[styles.avatar, { backgroundColor: status.bg }]}>
                                        <Text style={[styles.avatarLetter, { color: status.color }]}>
                                            {member.name.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>

                                    {/* Info */}
                                    <View style={styles.memberInfo}>
                                        <View style={styles.memberTopRow}>
                                            <Text style={styles.memberName}>{member.name}</Text>
                                            <View style={[styles.relationBadge]}>
                                                <Text style={styles.relationText}>{member.relation}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.memberPhone}>{member.phone}</Text>

                                        {/* Status */}
                                        <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
                                            <MaterialCommunityIcons name={status.icon as any} size={12} color={status.color} />
                                            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                                        </View>
                                        <Text style={styles.lastUpdated}>{formatLastUpdated(member.lastUpdated)}</Text>
                                    </View>

                                    {/* Actions */}
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => removeMember(member.id)}
                                    >
                                        <MaterialCommunityIcons name="trash-can-outline" size={18} color={Colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {/* Add More */}
                        <TouchableOpacity
                            style={styles.addMoreBtn}
                            onPress={() => setModalVisible(true)}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons name="account-plus-outline" size={20} color={Colors.primary} />
                            <Text style={styles.addMoreText}>Kişi Ekle</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Explanation */}
                <View style={styles.explainCard}>
                    <Text style={styles.explainTitle}>Nasıl Çalışır?</Text>
                    {[
                        { icon: "bell-ring", text: "Deprem olduğunda uygulama sizi bilgilendirir" },
                        { icon: "shield-check", text: '"Ben İyiyim" butonuna basın' },
                        { icon: "message-check", text: "Güvenlik ağınızdaki herkes SMS/bildirim alır" },
                        { icon: "map-marker-check", text: "Güvenli olduğunuz bilgisi paylaşılır" },
                    ].map((item, i) => (
                        <View key={i} style={styles.explainRow}>
                            <View style={styles.explainIconBox}>
                                <MaterialCommunityIcons name={item.icon as any} size={16} color={Colors.primary} />
                            </View>
                            <Text style={styles.explainText}>{item.text}</Text>
                        </View>
                    ))}
                </View>

                <View style={{ height: Spacing.xxl }} />
            </ScrollView>

            {/* Add Member Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                />
                <View style={styles.modalSheet}>
                    <View style={styles.modalHandle} />
                    <Text style={styles.modalTitle}>Kişi Ekle</Text>

                    <Text style={styles.inputLabel}>Ad Soyad *</Text>
                    <View style={styles.inputWrap}>
                        <MaterialCommunityIcons name="account-outline" size={18} color={Colors.text.muted} />
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: Ahmet Yılmaz"
                            placeholderTextColor={Colors.text.muted}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    <Text style={styles.inputLabel}>Telefon *</Text>
                    <View style={styles.inputWrap}>
                        <MaterialCommunityIcons name="phone-outline" size={18} color={Colors.text.muted} />
                        <TextInput
                            style={styles.input}
                            placeholder="+90 5xx xxx xx xx"
                            placeholderTextColor={Colors.text.muted}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    <Text style={styles.inputLabel}>Yakınlık</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relationScroll}>
                        {RELATION_OPTIONS.map((r) => (
                            <TouchableOpacity
                                key={r}
                                style={[
                                    styles.relationChip,
                                    relation === r && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                                ]}
                                onPress={() => setRelation(r)}
                            >
                                <Text style={[styles.relationChipText, relation === r && { color: "#fff" }]}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.modalSubmitBtn} onPress={addMember} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
                        <Text style={styles.modalSubmitText}>Ekle</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                        <Text style={styles.modalCancelText}>İptal</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingTop: 54,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
        gap: Spacing.sm,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    headerTitle: {
        flex: 1,
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.sm,
    },

    content: { padding: Spacing.md },

    infoBanner: {
        flexDirection: "row",
        gap: Spacing.sm,
        alignItems: "flex-start",
        backgroundColor: Colors.primary + "10",
        borderWidth: 1,
        borderColor: Colors.primary + "30",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.primary,
        lineHeight: 20,
        fontWeight: "600",
    },

    summaryRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginBottom: Spacing.xl,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
        gap: 4,
    },
    summaryValue: { fontSize: Typography.sizes.xxl, fontWeight: "900" },
    summaryLabel: { fontSize: 10, color: Colors.text.muted, fontWeight: "700" },

    emptyState: {
        alignItems: "center",
        paddingVertical: Spacing.xxl,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    emptyTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: Spacing.sm,
    },
    emptyDesc: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 22,
        maxWidth: 280,
        marginBottom: Spacing.xl,
    },
    emptyBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        ...Shadows.sm,
    },
    emptyBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },

    memberList: { marginBottom: Spacing.xl },
    listTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },

    memberCard: {
        flexDirection: "row",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        alignItems: "center",
        gap: Spacing.md,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    avatarLetter: { fontSize: Typography.sizes.xl, fontWeight: "900" },
    memberInfo: { flex: 1 },
    memberTopRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: 2,
    },
    memberName: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    relationBadge: {
        backgroundColor: Colors.background.elevated,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    relationText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    memberPhone: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        marginBottom: Spacing.xs,
    },
    statusChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: "flex-start",
        marginBottom: 2,
    },
    statusText: { fontSize: 11, fontWeight: "800" },
    lastUpdated: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    removeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.danger + "10",
        justifyContent: "center",
        alignItems: "center",
    },

    addMoreBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary + "10",
        borderWidth: 1,
        borderColor: Colors.primary + "30",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginTop: Spacing.sm,
    },
    addMoreText: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.primary,
    },

    explainCard: {
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginTop: Spacing.sm,
    },
    explainTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: Spacing.md,
    },
    explainRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    explainIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: Colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    explainText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "600",
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalSheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.background.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Spacing.xl,
        paddingBottom: Platform.OS === "android" ? Spacing.xxl : 40,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.border.dark,
        alignSelf: "center",
        marginBottom: Spacing.xl,
    },
    modalTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: "900",
        color: Colors.text.dark,
        marginBottom: Spacing.xl,
    },
    inputLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.muted,
        marginBottom: Spacing.xs,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    inputWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
        height: 50,
    },
    input: {
        flex: 1,
        color: Colors.text.dark,
        fontSize: Typography.sizes.md,
    },
    relationScroll: { marginBottom: Spacing.xl },
    relationChip: {
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: Spacing.sm,
        backgroundColor: Colors.background.dark,
    },
    relationChipText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    modalSubmitBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        height: 54,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginBottom: Spacing.sm,
        ...Shadows.sm,
    },
    modalSubmitText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },
    modalCancelBtn: {
        alignItems: "center",
        padding: Spacing.sm,
    },
    modalCancelText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
    },
});
