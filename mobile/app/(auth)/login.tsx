/**
 * Giriş ekranı — Firebase Auth ile e-posta + şifre ve Google Sign-In.
 * Başarılı girişte ana sekmelere yönlendirir.
 */

import { useState, useEffect, useRef } from "react";
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
    firebaseLogin,
    googleSignIn,
    getFirebaseAuthErrorKey,
    getIdToken,
    onAuthStateChanged,
} from "../../src/services/firebaseAuthService";
import { syncFirebaseToken } from "../../src/services/authService";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

export default function LoginScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const { t } = useTranslation();
    const authInProgress = useRef(false);

    // Listen for auth state changes — navigate when user becomes authenticated
    useEffect(() => {
        const unsub = onAuthStateChanged(async (user) => {
            if (user && authInProgress.current) {
                // Sync token to backend silently
                try {
                    const idToken = await getIdToken();
                    if (idToken) await syncFirebaseToken(idToken);
                } catch {
                    // Backend sync is non-critical
                }
                router.replace("/(tabs)");
            }
        });
        return unsub;
    }, []);

    async function handleLogin() {
        if (!email.trim() || !password) {
            Alert.alert(t("auth.error_login"), t("auth.email_password_required"));
            return;
        }
        setLoading(true);
        authInProgress.current = true;
        try {
            await firebaseLogin(email.trim().toLowerCase(), password);
            // Navigation is handled by onAuthStateChanged listener above
        } catch (err: unknown) {
            authInProgress.current = false;
            const errorKey = getFirebaseAuthErrorKey(err);
            const code = (err as { code?: string })?.code ?? "unknown";
            Alert.alert(t("auth.error_login"), `${t(errorKey)}\n\n[${code}]`);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignIn() {
        setGoogleLoading(true);
        authInProgress.current = true;
        try {
            await googleSignIn();
            // Navigation is handled by onAuthStateChanged listener above
        } catch (err: unknown) {
            authInProgress.current = false;
            const code = (err as { code?: string })?.code;
            if (code === "SIGN_IN_CANCELLED" || code === "12501") return;
            const msg = (err as { message?: string })?.message ?? "";
            Alert.alert(t("auth.error_login"), `${t("auth.error_google_signin")}\n\n[${code || msg}]`);
        } finally {
            setGoogleLoading(false);
        }
    }

    const isLoading = loading || googleLoading;

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoBox}>
                            <MaterialCommunityIcons name="shield-sun-outline" size={40} color="#fff" />
                        </View>
                        <Text style={styles.title}>QuakeSense</Text>
                        <Text style={styles.subtitle}>{t("auth.login_subtitle")}</Text>
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
                                    placeholderTextColor={Colors.text.muted + "80"}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    value={email}
                                    onChangeText={setEmail}
                                    editable={!isLoading}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{t("auth.password")}</Text>
                            <View style={styles.inputWrapper}>
                                <MaterialCommunityIcons name="lock-outline" size={20} color={Colors.text.muted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••"
                                    placeholderTextColor={Colors.text.muted + "80"}
                                    secureTextEntry={!showPassword}
                                    autoComplete="current-password"
                                    value={password}
                                    onChangeText={setPassword}
                                    editable={!isLoading}
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

                        <TouchableOpacity
                            style={[styles.btn, isLoading && styles.btnDisabled]}
                            onPress={handleLogin}
                            disabled={isLoading}
                            activeOpacity={0.9}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Text style={styles.btnText}>{t("auth.login_btn")}</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Ayırıcı */}
                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.dividerText}>{t("auth.or_continue_with")}</Text>
                            <View style={styles.line} />
                        </View>

                        {/* Sosyal Giriş */}
                        <TouchableOpacity
                            style={[styles.googleBtn, isLoading && styles.btnDisabled]}
                            onPress={handleGoogleSignIn}
                            disabled={isLoading}
                            activeOpacity={0.9}
                        >
                            {googleLoading ? (
                                <ActivityIndicator color={Colors.text.dark} />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
                                    <Text style={styles.googleBtnText}>{t("auth.google_signin")}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>{t("auth.no_account")} </Text>
                        <Link href="/(auth)/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>{t("auth.register")}</Text>
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
    header: { alignItems: "center", marginBottom: Spacing.xxl },
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
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        marginTop: Spacing.xs,
        fontWeight: "500",
    },
    form: { gap: Spacing.md },
    inputGroup: { gap: Spacing.xs },
    label: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.muted,
        marginLeft: 4,
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
    divider: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: Spacing.lg,
        gap: 10,
    },
    line: { flex: 1, height: 1, backgroundColor: Colors.border.dark },
    dividerText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.xs,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    googleBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        height: 56,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        gap: 10,
    },
    googleBtnText: {
        color: Colors.text.dark,
        fontSize: Typography.sizes.md,
        fontWeight: "700",
    },
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
    },
});
