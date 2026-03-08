import { useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Modal, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

export default function SecurityScreen() {
    const { t } = useTranslation();

    // Şifremi Unuttum modal state
    const [forgotVisible, setForgotVisible] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);

    // Şifre Değiştir modal state
    const [changeVisible, setChangeVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [changeLoading, setChangeLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);

    const handleForgotPassword = async () => {
        const email = forgotEmail.trim();
        if (!email) {
            Alert.alert("Hata", "E-posta adresinizi girin.");
            return;
        }
        setForgotLoading(true);
        try {
            await auth().sendPasswordResetEmail(email);
            Alert.alert(
                "E-posta Gönderildi",
                `${email} adresine şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edin.`,
                [{ text: "Tamam", onPress: () => { setForgotVisible(false); setForgotEmail(""); } }]
            );
        } catch (err: any) {
            const code = err?.code ?? "";
            if (code === "auth/user-not-found") {
                Alert.alert("Hata", "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.");
            } else if (code === "auth/invalid-email") {
                Alert.alert("Hata", "Geçersiz e-posta adresi.");
            } else {
                Alert.alert("Hata", "E-posta gönderilemedi. Daha sonra tekrar deneyin.");
            }
        } finally {
            setForgotLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert("Hata", "Tüm alanları doldurun.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Hata", "Yeni şifreler eşleşmiyor.");
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert("Hata", "Yeni şifre en az 6 karakter olmalıdır.");
            return;
        }

        setChangeLoading(true);
        try {
            const user = auth().currentUser;
            if (!user || !user.email) {
                Alert.alert("Hata", "Oturum bilgisi bulunamadı. Tekrar giriş yapın.");
                return;
            }

            // Önce mevcut şifre ile yeniden doğrula
            const credential = auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);

            // Şifreyi güncelle
            await user.updatePassword(newPassword);

            Alert.alert(
                "Başarılı",
                "Şifreniz başarıyla değiştirildi.",
                [{ text: "Tamam", onPress: () => {
                    setChangeVisible(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                }}]
            );
        } catch (err: any) {
            const code = err?.code ?? "";
            if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
                Alert.alert("Hata", "Mevcut şifreniz yanlış.");
            } else if (code === "auth/weak-password") {
                Alert.alert("Hata", "Yeni şifre çok zayıf. Daha güçlü bir şifre seçin.");
            } else if (code === "auth/requires-recent-login") {
                Alert.alert("Hata", "Bu işlem için yakın zamanda giriş yapmanız gerekiyor. Çıkış yapıp tekrar giriş yapın.");
            } else {
                Alert.alert("Hata", "Şifre değiştirilemedi. Daha sonra tekrar deneyin.");
            }
        } finally {
            setChangeLoading(false);
        }
    };

    const SecurityItem = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
        <View style={styles.item}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name={icon} size={24} color={Colors.primary} />
            </View>
            <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemDesc}>{desc}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("menu.security")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.intro}>
                    Güvenliğiniz bizim için teknik bir gereklilikten ötesidir. QuakeSense, en yüksek güvenlik standartlarını uygulamaktadır.
                </Text>

                {/* Şifre Eylemleri */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => setForgotVisible(true)}
                    >
                        <MaterialCommunityIcons name="lock-reset" size={20} color={Colors.primary} />
                        <Text style={styles.actionBtnText}>Şifremi Unuttum</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        onPress={() => setChangeVisible(true)}
                    >
                        <MaterialCommunityIcons name="lock-outline" size={20} color="#fff" />
                        <Text style={[styles.actionBtnText, { color: "#fff" }]}>Şifre Değiştir</Text>
                    </TouchableOpacity>
                </View>

                <SecurityItem
                    icon="lock-check"
                    title="Uçtan Uca Şifreleme"
                    desc="Sunucularımızla kurulan tüm bağlantılar TLS 1.3 protokolü ile en üst düzeyde şifrelenmektedir."
                />

                <SecurityItem
                    icon="account-shield"
                    title="Kimlik Doğrulama"
                    desc="Kullanıcı verileriniz JWT (JSON Web Token) altyapısı ile güvenli bir şekilde doğrulanır."
                />

                <SecurityItem
                    icon="database-lock"
                    title="Veri İzolasyonu"
                    desc="FCM tokenları ve acil durum rehberi gibi kritik verileriniz izole ve şifreli veritabanlarında saklanır."
                />

                <SecurityItem
                    icon="alert-decagram"
                    title="Anlık Risk İzleme"
                    desc="Sistem altyapımız olası siber saldırılara karşı 7/24 otomatik olarak izlenmektedir."
                />

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-variant" size={20} color={Colors.text.muted} />
                    <Text style={styles.infoText}>
                        Zafiyet bildirimleri için lütfen iletişim sayfamızdan bizimle irtibata geçin.
                    </Text>
                </View>
            </ScrollView>

            {/* Şifremi Unuttum Modal */}
            <Modal visible={forgotVisible} transparent animationType="slide" onRequestClose={() => setForgotVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Şifremi Unuttum</Text>
                            <TouchableOpacity onPress={() => setForgotVisible(false)}>
                                <MaterialCommunityIcons name="close" size={22} color={Colors.text.muted} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalDesc}>
                            Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı gönderilecektir.
                        </Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>E-posta Adresi</Text>
                            <TextInput
                                style={styles.input}
                                value={forgotEmail}
                                onChangeText={setForgotEmail}
                                placeholder="ornek@email.com"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.submitBtn, forgotLoading && { opacity: 0.6 }]}
                            onPress={handleForgotPassword}
                            disabled={forgotLoading}
                        >
                            {forgotLoading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.submitBtnText}>SIFIRLA</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Şifre Değiştir Modal */}
            <Modal visible={changeVisible} transparent animationType="slide" onRequestClose={() => setChangeVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
                            <TouchableOpacity onPress={() => setChangeVisible(false)}>
                                <MaterialCommunityIcons name="close" size={22} color={Colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Mevcut Şifre</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Mevcut şifreniz"
                                    placeholderTextColor={Colors.text.muted}
                                    secureTextEntry={!showCurrent}
                                />
                                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                                    <MaterialCommunityIcons
                                        name={showCurrent ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={Colors.text.muted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Yeni Şifre</Text>
                            <View style={styles.passwordRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="En az 6 karakter"
                                    placeholderTextColor={Colors.text.muted}
                                    secureTextEntry={!showNew}
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                                    <MaterialCommunityIcons
                                        name={showNew ? "eye-off-outline" : "eye-outline"}
                                        size={20}
                                        color={Colors.text.muted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Yeni Şifre (Tekrar)</Text>
                            <TextInput
                                style={styles.input}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                placeholder="Şifreyi tekrar girin"
                                placeholderTextColor={Colors.text.muted}
                                secureTextEntry={true}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, changeLoading && { opacity: 0.6 }]}
                            onPress={handleChangePassword}
                            disabled={changeLoading}
                        >
                            {changeLoading
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.submitBtnText}>ŞİFREYİ DEĞİŞTİR</Text>
                            }
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    intro: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        lineHeight: 24,
        marginBottom: Spacing.xl,
        textAlign: "center",
        fontWeight: "500"
    },
    actionsRow: {
        flexDirection: "row",
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.primary + "40",
    },
    actionBtnPrimary: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: "800",
        color: Colors.primary,
    },
    item: {
        flexDirection: "row",
        backgroundColor: Colors.background.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.background.dark,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    itemContent: { flex: 1 },
    itemTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    itemDesc: { fontSize: Typography.sizes.sm, color: Colors.text.muted, lineHeight: 20, fontWeight: "500" },
    infoBox: {
        flexDirection: "row",
        padding: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.xl,
        alignItems: "center",
        gap: 10,
    },
    infoText: { flex: 1, fontSize: 12, color: Colors.text.muted, fontWeight: "600" },

    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
    },
    modalCard: {
        backgroundColor: Colors.background.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
        borderTopWidth: 1,
        borderColor: Colors.border.dark,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    modalTitle: { fontSize: Typography.sizes.lg, fontWeight: "900", color: Colors.text.dark },
    modalDesc: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "500",
        lineHeight: 20,
        marginBottom: Spacing.lg,
    },
    inputGroup: { marginBottom: Spacing.md },
    label: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        color: Colors.text.dark,
        fontWeight: "700",
        borderWidth: 1,
        borderColor: Colors.border.dark,
        fontSize: Typography.sizes.sm,
    },
    passwordRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    eyeBtn: {
        width: 44,
        height: 44,
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        justifyContent: "center",
        alignItems: "center",
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        alignItems: "center",
        marginTop: Spacing.md,
    },
    submitBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
});
