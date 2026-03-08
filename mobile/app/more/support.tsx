import { useState } from "react";
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
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { api } from "../../src/services/api";

const CATEGORIES = [
    { label: "Genel", value: "general", icon: "help-circle-outline" },
    { label: "Hata Bildirimi", value: "bug", icon: "bug-outline" },
    { label: "Öneri", value: "feature", icon: "lightbulb-outline" },
    { label: "Hesap", value: "account", icon: "account-outline" },
    { label: "Diğer", value: "other", icon: "dots-horizontal-circle-outline" },
];

export default function SupportScreen() {
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [category, setCategory] = useState("general");
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!email.trim()) { Alert.alert("Hata", "E-posta adresinizi girin."); return; }
        if (!subject.trim() || subject.trim().length < 5) { Alert.alert("Hata", "Konu en az 5 karakter olmalıdır."); return; }
        if (!message.trim() || message.trim().length < 10) { Alert.alert("Hata", "Mesajınız en az 10 karakter olmalıdır."); return; }

        setLoading(true);
        try {
            await api.post("/api/v1/support/tickets", {
                email: email.trim(),
                subject: subject.trim(),
                message: message.trim(),
                category,
            });
            setSubmitted(true);
        } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            Alert.alert("Hata", typeof detail === "string" ? detail : "Talep gönderilemedi. Daha sonra tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <View style={styles.container}>
                <View style={styles.successContainer}>
                    <View style={styles.successIcon}>
                        <MaterialCommunityIcons name="check-circle-outline" size={72} color={Colors.primary} />
                    </View>
                    <Text style={styles.successTitle}>Talebiniz Alındı!</Text>
                    <Text style={styles.successDesc}>
                        Destek talebiniz başarıyla iletildi. En kısa sürede size dönüş yapacağız.{"\n\n"}
                        Yanıtı <Text style={{ color: Colors.primary }}>{email}</Text> adresinizde bekleyin.
                    </Text>
                    <TouchableOpacity style={styles.backBtnLg} onPress={() => router.back()}>
                        <Text style={styles.backBtnLgText}>GERİ DÖN</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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
                        <Text style={styles.title}>Destek Talebi</Text>
                        <Text style={styles.subtitle}>Size en hızlı şekilde yardımcı olalım.</Text>
                    </View>
                </View>

                {/* Kategori */}
                <View style={styles.section}>
                    <Text style={styles.label}>Kategori</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                        {CATEGORIES.map((cat) => (
                            <TouchableOpacity
                                key={cat.value}
                                style={[styles.catChip, category === cat.value && styles.catChipActive]}
                                onPress={() => setCategory(cat.value)}
                            >
                                <MaterialCommunityIcons
                                    name={cat.icon as any}
                                    size={14}
                                    color={category === cat.value ? Colors.primary : Colors.text.muted}
                                />
                                <Text style={[styles.catChipText, category === cat.value && styles.catChipTextActive]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* E-posta */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>E-posta Adresiniz *</Text>
                    <TextInput
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                        placeholder="ornek@email.com"
                        placeholderTextColor={Colors.text.muted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Konu */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Konu *</Text>
                    <TextInput
                        style={styles.input}
                        value={subject}
                        onChangeText={setSubject}
                        placeholder="Talebinizin konusu nedir?"
                        placeholderTextColor={Colors.text.muted}
                        maxLength={200}
                    />
                </View>

                {/* Mesaj */}
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mesaj *</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Sorununuzu veya önerinizi detaylı açıklayın..."
                        placeholderTextColor={Colors.text.muted}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        maxLength={5000}
                    />
                    <Text style={styles.charCount}>{message.length}/5000</Text>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="send" size={18} color="#fff" />
                            <Text style={styles.submitBtnText}>GÖNDER</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
                    <Text style={styles.infoText}>
                        Destek taleplerine genellikle 24-48 saat içinde yanıt verilmektedir.
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
    section: { marginBottom: Spacing.lg },
    label: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    catRow: { gap: 8, paddingRight: Spacing.md },
    catChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    catChipActive: {
        backgroundColor: Colors.primary + "15",
        borderColor: Colors.primary,
    },
    catChipText: { fontSize: 12, fontWeight: "700", color: Colors.text.muted },
    catChipTextActive: { color: Colors.primary },
    inputGroup: { marginBottom: Spacing.lg },
    input: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text.dark,
        fontWeight: "600",
        borderWidth: 1,
        borderColor: Colors.border.dark,
        fontSize: Typography.sizes.sm,
    },
    textarea: { minHeight: 140, paddingTop: Spacing.md },
    charCount: {
        fontSize: 10,
        color: Colors.text.muted,
        textAlign: "right",
        marginTop: 4,
        fontWeight: "600",
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
    infoBox: {
        flexDirection: "row",
        gap: Spacing.sm,
        backgroundColor: Colors.primary + "08",
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "15",
        alignItems: "flex-start",
    },
    infoText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 16, fontWeight: "600" },

    // Success state
    successContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.xxxl,
    },
    successIcon: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: Colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    successTitle: { fontSize: Typography.sizes.xxxl, fontWeight: "900", color: Colors.text.dark, marginBottom: Spacing.md },
    successDesc: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 24,
        fontWeight: "500",
        marginBottom: Spacing.xxxl,
    },
    backBtnLg: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xxxl,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    backBtnLgText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
});
