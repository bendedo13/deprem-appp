/**
 * Acil Kişiler — Sıfırdan yeniden inşa.
 * CRUD: Ekle, Listele, Sil. Toast ile hata yönetimi.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { api } from "../../src/services/api";

/** Backend EmergencyContactOut: id, name, phone_number, relationship (alias), is_active */
interface Contact {
    id: number;
    name: string;
    phone_number: string;
    relationship: string;
    is_active: boolean;
}

/** API payload - backend EmergencyContactIn kabul eder: relationship veya relation_type */
const buildContactPayload = (name: string, phone: string, relation: string) => ({
    name: name.trim(),
    phone_number: phone.trim(),
    relationship: relation,
});

const RELATION_OPTIONS = ["Aile", "Eş", "Arkadaş", "Komşu", "İş Arkadaşı", "Diğer"];
const MAX_CONTACTS = 5;

export default function ContactsScreen() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [relation, setRelation] = useState("Aile");
    const [adding, setAdding] = useState(false);

    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;

    const showToast = useCallback(
        (message: string, type: "success" | "error") => {
            setToast({ message, type });
            toastAnim.setValue(0);
            Animated.sequence([
                Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(2500),
                Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setToast(null));
        },
        [toastAnim]
    );

    const fetchContacts = useCallback(async () => {
        try {
            const { data } = await api.get<Contact[]>("/api/v1/users/me/contacts");
            setContacts(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast("Liste yüklenemedi.", "error");
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const extractErrorMessage = (error: unknown): string => {
        const res = error as { response?: { data?: { detail?: string | { msg?: string }[]; ok?: boolean } }; message?: string; code?: string };
        const detail = res?.response?.data?.detail;
        if (typeof detail === "string") return detail;
        if (Array.isArray(detail)) {
            const msgs = detail.map((d: { msg?: string }) => d?.msg).filter(Boolean);
            return msgs.length ? msgs.join("\n") : "Kişi eklenemedi. Bilgileri kontrol edin.";
        }
        if (res?.code === "ECONNABORTED" || res?.message?.includes("timeout")) {
            return "İstek zaman aşımına uğradı. Lütfen tekrar deneyin.";
        }
        if (res?.message?.includes("Network Error")) {
            return "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.";
        }
        return "Kişi eklenemedi. Bağlantıyı kontrol edip tekrar deneyin.";
    };

    const handleAdd = async () => {
        if (!name.trim()) {
            Alert.alert("Hata", "İsim soyisim zorunludur.");
            return;
        }
        if (!phone.trim()) {
            Alert.alert("Hata", "Telefon numarası zorunludur.");
            return;
        }

        setSaving(true);
        try {
            const payload = buildContactPayload(name, phone, relation);
            const { data } = await api.post<Contact>("/api/v1/users/me/contacts", payload);
            showToast(`${data.name} acil kişiler listesine eklendi.`, "success");
            setName("");
            setPhone("");
            setRelation("Aile");
            setAdding(false);
            await fetchContacts();
        } catch (error: unknown) {
            const msg = extractErrorMessage(error);
            Alert.alert("Kişi Eklenemedi", msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: number, contactName: string) => {
        setSaving(true);
        api
            .delete(`/api/v1/users/me/contacts/${id}`)
            .then(async () => {
                showToast(`${contactName} listeden silindi.`, "success");
                await fetchContacts();
            })
            .catch((err) => {
                Alert.alert("Silme Hatası", extractErrorMessage(err));
            })
            .finally(() => setSaving(false));
    };

    const confirmDelete = (c: Contact) => {
        const { Alert } = require("react-native");
        Alert.alert(
            "Sil",
            `${c.name} kişisini silmek istediğinize emin misiniz?`,
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "Sil", style: "destructive", onPress: () => handleDelete(c.id, c.name) },
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Acil Kişiler</Text>
                        <Text style={styles.subtitle}>
                            S.O.S veya "Ben İyiyim" mesajı gidecek kişiler. En fazla {MAX_CONTACTS} kişi.
                        </Text>
                    </View>
                </View>

                {loading && contacts.length === 0 ? (
                    <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.list}>
                        {contacts.map((contact) => (
                            <View key={contact.id} style={styles.contactCard}>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>{contact.name}</Text>
                                    <Text style={styles.contactPhone}>{contact.phone_number}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={styles.channelBadge}>
                                            <MaterialCommunityIcons
                                                name="account-heart-outline"
                                                size={11}
                                                color={Colors.primary}
                                            />
                                            <Text style={styles.channelText}>{contact.relationship}</Text>
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => confirmDelete(contact)}
                                    style={styles.deleteBtn}
                                    disabled={saving}
                                >
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {contacts.length === 0 && !adding && (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons
                                    name="account-multiple-plus-outline"
                                    size={64}
                                    color={Colors.border.dark}
                                />
                                <Text style={styles.emptyText}>Henüz acil durum kişisi eklemediniz.</Text>
                            </View>
                        )}
                    </View>
                )}

                {!adding && contacts.length < MAX_CONTACTS && (
                    <TouchableOpacity style={styles.addTrigger} onPress={() => setAdding(true)}>
                        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                        <Text style={styles.addTriggerText}>YENİ KİŞİ EKLE</Text>
                    </TouchableOpacity>
                )}

                {adding && (
                    <View style={styles.formCard}>
                        <View style={styles.formHeader}>
                            <Text style={styles.formTitle}>Yeni Acil Kişi</Text>
                            <TouchableOpacity onPress={() => setAdding(false)} disabled={saving}>
                                <MaterialCommunityIcons name="close" size={20} color={Colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>İsim Soyisim *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Örn: Alan İnal"
                                placeholderTextColor={Colors.text.muted}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Telefon Numarası *</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="05513521373 veya +905513521373"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Yakınlık</Text>
                            <View style={styles.chipRow}>
                                {RELATION_OPTIONS.map((r) => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.chip, relation === r && styles.chipActive]}
                                        onPress={() => setRelation(r)}
                                    >
                                        <Text style={[styles.chipText, relation === r && styles.chipTextActive]}>
                                            {r}
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

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        S.O.S veya "Ben İyiyim" tetiklendiğinde bu kişilere Twilio üzerinden SMS ve WhatsApp mesajı
                        gönderilir. Telefon numarası +90 veya 05xx formatında olmalıdır.
                    </Text>
                </View>
            </ScrollView>

            {toast && (
                <Animated.View
                    style={[
                        styles.toast,
                        toast.type === "success" ? styles.toastSuccess : styles.toastError,
                        {
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [50, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <MaterialCommunityIcons
                        name={toast.type === "success" ? "check-circle" : "alert-circle"}
                        size={20}
                        color="#fff"
                    />
                    <Text style={styles.toastText}>{toast.message}</Text>
                </Animated.View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
        marginTop: Spacing.lg,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    title: { fontSize: Typography.sizes.xxl, fontWeight: "800", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },
    list: { gap: Spacing.md },
    contactCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    contactInfo: { flex: 1 },
    contactName: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    contactPhone: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 2 },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
    channelBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: Colors.primary + "10",
        borderRadius: 4,
    },
    channelText: { fontSize: 9, fontWeight: "900", color: Colors.primary },
    deleteBtn: { padding: 8 },
    emptyState: { alignItems: "center", padding: 40, opacity: 0.5 },
    emptyText: { textAlign: "center", marginTop: 12, color: Colors.text.muted, fontWeight: "600" },
    addTrigger: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.lg,
        gap: 8,
    },
    addTriggerText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
    formCard: {
        backgroundColor: Colors.background.surface,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "40",
        marginTop: Spacing.lg,
    },
    formHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    formTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    inputGroup: { marginBottom: Spacing.md },
    label: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.text.muted,
        marginBottom: 6,
        textTransform: "uppercase",
    },
    input: {
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text.dark,
        fontWeight: "700",
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    chipActive: { backgroundColor: Colors.primary + "15", borderColor: Colors.primary },
    chipText: { fontSize: Typography.sizes.xs, fontWeight: "700", color: Colors.text.muted },
    chipTextActive: { color: Colors.primary },
    saveBtn: {
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: "center",
        marginTop: Spacing.md,
    },
    saveBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
    infoBox: {
        flexDirection: "row",
        backgroundColor: Colors.primary + "08",
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.xxl,
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary + "15",
    },
    infoText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 16, fontWeight: "600" },
    toast: {
        position: "absolute",
        bottom: Spacing.xl,
        left: Spacing.lg,
        right: Spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        ...Platform.select({ ios: { shadowRadius: 8, shadowOpacity: 0.3 }, android: { elevation: 8 } }),
    },
    toastSuccess: { backgroundColor: Colors.semantic?.toastSuccess ?? "#065f46" },
    toastError: { backgroundColor: Colors.semantic?.toastError ?? Colors.danger },
    toastText: { color: "#fff", fontSize: Typography.sizes.sm, fontWeight: "700", flex: 1 },
});
