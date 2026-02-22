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

interface Contact {
    id: number;
    name: string;
    phone: string;
    email?: string;
    channel: "sms" | "push" | "both";
}

export default function ContactsScreen() {
    const { t } = useTranslation();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [channel, setChannel] = useState<"sms" | "push" | "both">("sms");

    const fetchContacts = async () => {
        try {
            const { data } = await api.get("/api/v1/users/me/contacts");
            setContacts(data);
        } catch (error) {
            console.error("Failed to fetch contacts", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const handleAdd = async () => {
        if (!name || !phone) {
            Alert.alert("Hata", "İsim ve telefon numarası zorunludur.");
            return;
        }

        try {
            setLoading(true);
            await api.post("/api/v1/users/me/contacts", {
                name,
                phone,
                email: email || undefined,
                channel
            });
            Alert.alert("Başarılı", "Acil durum kişisi eklendi.");
            setName("");
            setPhone("");
            setEmail("");
            setAdding(false);
            fetchContacts();
        } catch (error: any) {
            const msg = error.response?.data?.detail || "Kişi eklenemedi.";
            Alert.alert("Hata", msg);
        } finally {
            setLoading(false);
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
                        } catch (error) {
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
                    <View>
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
                                    <View style={styles.channelBadge}>
                                        <MaterialCommunityIcons
                                            name={contact.channel === "push" ? "bell-outline" : "message-text-outline"}
                                            size={12}
                                            color={Colors.primary}
                                        />
                                        <Text style={styles.channelText}>{contact.channel.toUpperCase()}</Text>
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

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>İsim Soyisim</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Örn: Ahmet Yılmaz"
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
                            <Text style={styles.label}>E-Posta (Opsiyonel)</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="E-posta hesabı varsa bildirim gider"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bilgilendirme Kanalı</Text>
                            <View style={styles.channelRow}>
                                {(["sms", "push", "both"] as const).map((ch) => (
                                    <TouchableOpacity
                                        key={ch}
                                        style={[styles.channelChip, channel === ch && styles.channelChipActive]}
                                        onPress={() => setChannel(ch)}
                                    >
                                        <Text style={[styles.channelChipText, channel === ch && styles.channelChipTextActive]}>
                                            {ch.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleAdd}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>KAYDET</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        "Ben İyiyim" butonuna bastığınızda, bu listedeki kişilere konumunuzla birlikte bildirim gönderilir. Toplamda en fazla 5 kişi ekleyebilirsiniz.
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
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2, flex: 1 },
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
    channelBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: Colors.primary + "10",
        borderRadius: 4,
        alignSelf: "flex-start"
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
    formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
    formTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    inputGroup: { marginBottom: Spacing.md },
    label: { fontSize: 11, fontWeight: "800", color: Colors.text.muted, marginBottom: 6, textTransform: "uppercase" },
    input: {
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text.dark,
        fontWeight: "700",
        borderWidth: 1,
        borderColor: Colors.border.dark
    },
    channelRow: { flexDirection: "row", gap: 8 },
    channelChip: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark
    },
    channelChipActive: { backgroundColor: Colors.primary + "20", borderColor: Colors.primary },
    channelChipText: { fontSize: 11, fontWeight: "800", color: Colors.text.muted },
    channelChipTextActive: { color: Colors.primary },
    saveBtn: {
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: "center",
        marginTop: Spacing.md
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
        borderColor: Colors.primary + "15"
    },
    infoText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 16, fontWeight: "600" },
});
