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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { register } from "../../src/services/authService";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

export default function RegisterScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.container}>
                    {/* Header Section */}
                    <View style={styles.header}>
                        <View style={styles.logoBox}>
                            <MaterialCommunityIcons name="shield-account-variant" size={40} color="#fff" />
                        </View>
                        <Text style={styles.title}>QuakeSense</Text>
                        <Text style={styles.subtitle}>{t("auth.register_subtitle")}</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t("auth.email")}</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="email-outline" size={20} color={Colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ornek@email.com"
                                    placeholderTextColor={Colors.text.muted + '80'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t("auth.password")}</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder={t("auth.password_placeholder") || "En az 8 karakter"}
                                    placeholderTextColor={Colors.text.muted + '80'}
                                    secureTextEntry={!showPassword}
                                    autoComplete="new-password"
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                                    <MaterialCommunityIcons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={Colors.text.muted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t("auth.password_confirm")}</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="lock-check-outline" size={20} color={Colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={Colors.text.muted + '80'}
                                    secureTextEntry={!showPassword}
                                    value={confirm}
                                    onChangeText={setConfirm}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                            activeOpacity={0.9}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.btnText}>{t("auth.register_btn")}</Text>
                                    <MaterialCommunityIcons name="account-plus-outline" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t("auth.has_account")} </Text>
                        <Link href="/(auth)/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>{t("auth.login")}</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    <View style={styles.branding}>
                        <MaterialCommunityIcons name="code-tags" size={14} color={Colors.text.muted} />
                        <Text style={styles.brandingText}>Developed by Alan</Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: Colors.background.dark },
    scroll: { flexGrow: 1 },
    container: { flex: 1, padding: Spacing.xl, justifyContent: "center" },
    header: { alignItems: "center", marginBottom: Spacing.xl },
    logoBox: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
    },
    title: {
        fontSize: Typography.sizes.xxxl,
        fontWeight: "800",
        color: Colors.text.dark,
        letterSpacing: -0.5
    },
    subtitle: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        marginTop: Spacing.xs,
        fontWeight: "500",
        textAlign: "center"
    },
    form: { gap: Spacing.md },
    inputGroup: { gap: Spacing.xs },
    label: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.muted,
        marginLeft: 4
    },
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
    eyeIcon: { padding: Spacing.md },
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
    footer: { flexDirection: "row", justifyContent: "center", marginTop: Spacing.xl },
    footerText: { color: Colors.text.muted, fontSize: Typography.sizes.sm, fontWeight: "500" },
    link: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: "800" },
    branding: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: Spacing.xxl,
        gap: 6,
        opacity: 0.6,
    },
    brandingText: {
        fontSize: 12,
        fontWeight: "700",
        color: Colors.text.muted,
        letterSpacing: 0.5,
        textTransform: "uppercase",
    }
});
