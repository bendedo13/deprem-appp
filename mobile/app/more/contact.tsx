import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

export default function ContactScreen() {
    const { t } = useTranslation();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!name || !email || !message) {
            Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
            return;
        }
        setLoading(true);
        // Simüle edilmiş API çağrısı
        setTimeout(() => {
            setLoading(false);
            Alert.alert(t("contact.success"), "", [
                { text: "Tamam", onPress: () => router.back() }
            ]);
        }, 1500);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("contact.title")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.introBox}>
                    <Text style={styles.introTitle}>Bize Ulaşın</Text>
                    <Text style={styles.introDesc}>Sorularınız, önerileriniz veya teknik destek için aşağıdaki formu kullanabilirsiniz.</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t("contact.name")}</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="account-outline" size={20} color={Colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Adınız Soyadınız"
                                placeholderTextColor={Colors.text.muted + '80'}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t("auth.email")}</Text>
                        <View style={styles.inputWrapper}>
                            <MaterialCommunityIcons name="email-outline" size={20} color={Colors.text.muted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Email adresiniz"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={Colors.text.muted + '80'}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t("contact.message")}</Text>
                        <View style={[styles.inputWrapper, { alignItems: "flex-start", paddingTop: 12 }]}>
                            <MaterialCommunityIcons name="pencil-outline" size={20} color={Colors.text.muted} style={[styles.inputIcon, { marginTop: 4 }]} />
                            <TextInput
                                style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Mesajınız..."
                                multiline
                                placeholderTextColor={Colors.text.muted + '80'}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.btn, loading && styles.btnDisabled]}
                        onPress={handleSend}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.btnText}>{t("contact.send")}</Text>
                                <MaterialCommunityIcons name="send" size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.extraContact}>
                    <Text style={styles.extraTitle}>Geliştirici İletişim</Text>
                    <View style={styles.contactRow}>
                        <MaterialCommunityIcons name="web" size={20} color={Colors.primary} />
                        <Text style={styles.contactText}>quakesense.app</Text>
                    </View>
                    <View style={styles.contactRow}>
                        <MaterialCommunityIcons name="github" size={20} color={Colors.primary} />
                        <Text style={styles.contactText}>github.com/alan</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingTop: 50,
        paddingBottom: 20,
        backgroundColor: Colors.background.dark,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark },
    content: { padding: Spacing.xl },
    introBox: { marginBottom: Spacing.xl },
    introTitle: { fontSize: 24, fontWeight: "800", color: Colors.text.dark, marginBottom: 8 },
    introDesc: { fontSize: Typography.sizes.md, color: Colors.text.muted, lineHeight: 22, fontWeight: "500" },
    form: { gap: Spacing.lg },
    inputGroup: { gap: Spacing.xs },
    label: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.muted, marginLeft: 4 },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    inputIcon: { marginLeft: Spacing.md },
    input: {
        flex: 1,
        paddingHorizontal: Spacing.md,
        paddingVertical: 14,
        fontSize: Typography.sizes.md,
        color: Colors.text.dark,
    },
    btn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },
    extraContact: { marginTop: Spacing.xxxl, paddingTop: Spacing.xl, borderTopWidth: 1, borderTopColor: Colors.border.dark },
    extraTitle: { fontSize: Typography.sizes.sm, fontWeight: "800", color: Colors.text.dark, marginBottom: Spacing.md },
    contactRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.md },
    contactText: { fontSize: Typography.sizes.md, color: Colors.text.muted, fontWeight: "600" },
});
