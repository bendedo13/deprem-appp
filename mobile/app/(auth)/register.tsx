/**
 * Kayıt ekranı — e-posta + şifre + şifre doğrulama.
 * Başarılı kayıtta ana sekmelere yönlendirir.
 */

import { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from "react-native";
import { router, Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { register } from "../../src/services/authService";

export default function RegisterScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    async function handleRegister() {
        if (!email.trim() || !password || !confirm) {
            Alert.alert(t("auth.error_register"), t("auth.all_fields_required"));
            return;
        }
        if (password !== confirm) {
            Alert.alert(t("auth.error_register"), t("auth.passwords_dont_match"));
            return;
        }
        if (password.length < 8) {
            Alert.alert(t("auth.error_register"), t("auth.password_too_short"));
            return;
        }

        setLoading(true);
        try {
            await register(email.trim().toLowerCase(), password);
            router.replace("/(tabs)");
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                t("auth.error_register_generic");
            Alert.alert(t("auth.error_register"), msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Text style={styles.emoji}>🌍</Text>
                    <Text style={styles.title}>QuakeSense</Text>
                    <Text style={styles.subtitle}>{t("auth.register_subtitle")}</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>{t("auth.email")}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="ornek@email.com"
                        placeholderTextColor="#64748b"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <Text style={styles.label}>{t("auth.password")}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="En az 8 karakter"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                        autoComplete="new-password"
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Text style={styles.label}>{t("auth.password_confirm")}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                        value={confirm}
                        onChangeText={setConfirm}
                    />

                    <TouchableOpacity
                        style={[styles.btn, loading && styles.btnDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>{t("auth.register_btn")}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t("auth.has_account")} </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>{t("auth.login")}</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: "#0f172a" },
    container: { flexGrow: 1, justifyContent: "center", padding: 24 },
    header: { alignItems: "center", marginBottom: 40 },
    emoji: { fontSize: 56, marginBottom: 8 },
    title: { fontSize: 32, fontWeight: "800", color: "#f8fafc", letterSpacing: 0.5 },
    subtitle: { fontSize: 15, color: "#94a3b8", marginTop: 4 },
    form: { gap: 12 },
    label: { fontSize: 14, fontWeight: "600", color: "#cbd5e1", marginBottom: 4 },
    input: {
        backgroundColor: "#1e293b",
        borderWidth: 1,
        borderColor: "#334155",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: "#f8fafc",
        marginBottom: 8,
    },
    btn: {
        backgroundColor: "#ef4444",
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
        marginTop: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
    footer: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
    footerText: { color: "#94a3b8", fontSize: 14 },
    link: { color: "#ef4444", fontSize: 14, fontWeight: "700" },
});
