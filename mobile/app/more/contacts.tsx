import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { api } from "../../src/services/api";

// Backend EmergencyContactOut şeması ile eşleşir
interface Contact {
    id: number;
    name: string;
    phone: string;
    email?: string;
    relation: string;
    methods: string[];
}

const RELATION_OPTIONS = [
    "Aile", "Eş", "Arkadaş", "Komşu", "İş Arkadaşı", "Diğer"
];

// Backend kabul ettiği method değerleri: "whatsapp" | "sms" | "email"
type NotifyMethod = "sms" | "whatsapp" | "email";

export default function ContactsScreen() {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [relation, setRelation] = useState("Aile");
    const [methods, setMethods] = useState<NotifyMethod[]>(["sms"]);

    const fetchContacts = async () => {
        try {
            const { data } = await api.get<Contact[]>("/api/v1/users/me/contacts");
            setContacts(Array.isArray(data) ? data : []);
        } catch (error) {
            console.warn("[Contacts] Fetch hatası:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const toggleMethod = (m: NotifyMethod) => {
        setMethods((prev) =>
            prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
        );
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
        if (methods.length === 0) {
            Alert.alert("Hata", "En az bir bildirim kanalı seçin.");
            return;
        }

        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                name: name.trim(),
                phone: phone.trim().replace(/\s/g, ""),
                relation,
                methods: methods.length > 0 ? methods : ["sms"],
                priority: 1,
            };
            if (email.trim()) {
                payload.email = email.trim();
            }
            await api.post("/api/v1/users/me/contacts", payload);
            Alert.alert("Başarılı", `${name} acil kişiler listesine eklendi.`);
            setName("");
            setPhone("");
            setEmail("");
            setRelation("Aile");
            setMethods(["sms"]);
            setAdding(false);
            fetchContacts();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string | unknown }; status?: number } };
            const detail = err?.response?.data?.detail;
            let msg = "Kişi eklenemedi. Bilgileri kontrol edin.";
            if (typeof detail === "string") {
                msg = detail;
            } else if (Array.isArray(detail)) {
                msg = detail.map((d: { msg?: string }) => d?.msg ?? "").filter(Boolean).join(", ") || msg;
            } else if (detail && typeof detail === "object" && "msg" in detail) {
                msg = String((detail as { msg: string }).msg);
            }
            Alert.alert("Hata", msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: number) => {
        Alert.alert(
            "Sil",
            "Bu kişiyi silmek istediğinize emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.delete(`/api/v1/users/me/contacts/${id}`);
                            fetchContacts();
                        } catch {
                            Alert.alert("Hata", "Silme işlemi başarısız.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Acil Kişiler</Text>
                        <Text style={styles.subtitle}>Deprem sonrası "Güvendeyim" mesajı gidecek kişiler.</Text>
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
                                    <Text style={styles.contactPhone}>{contact.phone}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={styles.channelBadge}>
                                            <MaterialCommunityIcons name="account-heart-outline" size={11} color={Colors.primary} />
                                            <Text style={styles.channelText}>{contact.relation}</Text>
                                        </View>
                                        {(contact.methods ?? []).map((m) => (
                                            <View key={m} style={styles.channelBadge}>
                                                <Text style={styles.channelText}>{m.toUpperCase()}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => handleDelete(contact.id)} style={styles.deleteBtn}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={24} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {contacts.length === 0 && !adding && (
                            <View style={styles.emptyState}>
                                <MaterialCommunityIcons name="account-multiple-plus-outline" size={64} color={Colors.border.dark} />
                                <Text style={styles.emptyText}>Henüz acil durum kişisi eklemediniz.</Text>
                            </View>
                        )}
                    </View>
                )}

                {!adding && contacts.length < 5 && (
                    <TouchableOpacity
                        style={styles.addTrigger}
                        onPress={() => setAdding(true)}
                    >
                        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                        <Text style={styles.addTriggerText}>YENİ KİŞİ EKLE</Text>
                    </TouchableOpacity>
                )}

                {adding && (
                    <View style={styles.formCard}>
                        <View style={styles.formHeader}>
                            <Text style={styles.formTitle}>Yeni Acil Durum Kişisi</Text>
                            <TouchableOpacity onPress={() => setAdding(false)}>
                                <MaterialCommunityIcons name="close" size={20} color={Colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        {/* İsim */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>İsim Soyisim *</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Örn: Ahmet Yılmaz"
                                placeholderTextColor={Colors.text.muted}
                            />
                        </View>

                        {/* Telefon */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Telefon Numarası *</Text>
                            <TextInput
                                style={styles.input}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="+905xxxxxxxxx veya 05xx xxx xx xx"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="phone-pad"
                            />
                        </View>

                        {/* E-Posta */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>E-Posta (Opsiyonel)</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="E-posta ile de bildirim alabilir"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Yakınlık Derecesi — ZORUNLU */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Yakınlık Derecesi *</Text>
                            <View style={styles.chipRow}>
                                {RELATION_OPTIONS.map((r) => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[styles.chip, relation === r && styles.chipActive]}
                                        onPress={() => setRelation(r)}
                                    >
                                        <Text style={[styles.chipText, relation === r && styles.chipTextActive]}>{r}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Bildirim Kanalı — çoklu seçim */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bildirim Kanalı * (çoklu seçim)</Text>
                            <View style={styles.channelRow}>
                                {(["sms", "whatsapp", "email"] as NotifyMethod[]).map((m) => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.channelChip, methods.includes(m) && styles.channelChipActive]}
                                        onPress={() => toggleMethod(m)}
                                    >
                                        <MaterialCommunityIcons
                                            name={m === "whatsapp" ? "whatsapp" : m === "email" ? "email-outline" : "message-text-outline"}
                                            size={14}
                                            color={methods.includes(m) ? Colors.primary : Colors.text.muted}
                                        />
                                        <Text style={[styles.channelChipText, methods.includes(m) && styles.channelChipTextActive]}>
                                            {m.toUpperCase()}
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
                        "Ben İyiyim" butonuna bastığınızda, bu listedeki kişilere SMS/WhatsApp ile konumunuz iletilir. En fazla 5 kişi ekleyebilirsiniz.
                    </Text>
                </View>
            </ScrollView>
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
    channelRow: { flexDirection: "row", gap: 8 },
    channelChip: {
        flex: 1,
        flexDirection: "row",
        gap: 4,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    channelChipActive: { backgroundColor: Colors.primary + "15", borderColor: Colors.primary },
    channelChipText: { fontSize: 11, fontWeight: "800", color: Colors.text.muted },
    channelChipTextActive: { color: Colors.primary },
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
});
