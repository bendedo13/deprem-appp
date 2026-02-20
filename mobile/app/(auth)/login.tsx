/**
 * Giriş ekranı — e-posta + şifre, JWT auth.
 * Login başarılıysa ana sekmelere yönlendirir.
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
import { login } from "../../src/services/authService";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    async function handleLogin() {
        if (!email.trim() || !password) {
            Alert.alert(t("auth.error_login"), t("auth.email_password_required"));
            return;
        }
        setLoading(true);
        try {
            await login(email.trim().toLowerCase(), password);
            router.replace("/(tabs)");
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                t("auth.error_login_generic");
            Alert.alert(t("auth.error_login"), msg);
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
                {/* Logo / Başlık */}
                <View style={styles.header}>
                    <Text style={styles.emoji}>🌍</Text>
                    <Text style={styles.title}>QuakeSense</Text>
                    <Text style={styles.subtitle}>{t("auth.login_subtitle")}</Text>
                </View>

                {/* Form */}
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
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        secureTextEntry
                        autoComplete="current-password"
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        style={[styles.btn, loading && styles.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.btnText}>{t("auth.login_btn")}</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t("auth.no_account")} </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>{t("auth.register")}</Text>
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
