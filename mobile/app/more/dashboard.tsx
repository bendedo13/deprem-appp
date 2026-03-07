/**
 * Kullanıcı Paneli (Dashboard) — Profil, şifre değiştirme, tema, dil, abonelik, gizlilik.
 */

import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    TextInput,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    Platform,
    Modal,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import auth from "@react-native-firebase/auth";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

export default function DashboardScreen() {
    const { t, i18n } = useTranslation();
    const user = auth().currentUser;

    // Password change
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Theme toggle
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Language
    const [showLangModal, setShowLangModal] = useState(false);
    const currentLang = i18n.language;

    // Profile edit
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [profileLoading, setProfileLoading] = useState(false);

    const handlePasswordChange = async () => {
        if (!newPassword || !confirmPassword) {
            Alert.alert("Hata", "Tüm alanları doldurun.");
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert("Hata", "Yeni şifreler eşleşmiyor.");
            return;
        }
        if (newPassword.length < 8) {
            Alert.alert("Hata", "Şifre en az 8 karakter olmalıdır.");
            return;
        }

        setPasswordLoading(true);
        try {
            // Re-authenticate with current password
            const email = user?.email;
            if (email && currentPassword) {
                const credential = auth.EmailAuthProvider.credential(email, currentPassword);
                await user?.reauthenticateWithCredential(credential);
            }
            await user?.updatePassword(newPassword);
            Alert.alert("Başarılı", "Şifreniz güncellendi.");
            setShowPasswordModal(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            const code = err?.code || "";
            if (code === "auth/wrong-password") {
                Alert.alert("Hata", "Mevcut şifre yanlış.");
            } else if (code === "auth/requires-recent-login") {
                Alert.alert("Hata", "Güvenlik nedeniyle tekrar giriş yapmanız gerekiyor.");
            } else {
                Alert.alert("Hata", "Şifre güncellenemedi. " + (err?.message || ""));
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleLanguageChange = (lang: string) => {
        i18n.changeLanguage(lang);
        setShowLangModal(false);
    };

    const handleProfileSave = async () => {
        setProfileLoading(true);
        try {
            await user?.updateProfile({ displayName: displayName.trim() });
            Alert.alert("Başarılı", "Profil güncellendi.");
            setShowProfileModal(false);
        } catch {
            Alert.alert("Hata", "Profil güncellenemedi.");
        } finally {
            setProfileLoading(false);
        }
    };

    const SectionHeader = ({ title }: { title: string }) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    const MenuItem = ({ icon, title, subtitle, onPress, rightComponent, color = Colors.text.dark }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
            <View style={[styles.menuIconBox, { backgroundColor: color + "15" }]}>
                <MaterialCommunityIcons name={icon} size={20} color={color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
            </View>
            {rightComponent || (onPress && <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border.dark} />)}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Kullanıcı Paneli</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarBox}>
                        <MaterialCommunityIcons name="account" size={32} color="#fff" />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{user?.displayName || "Kullanıcı"}</Text>
                        <Text style={styles.profileEmail}>{user?.email || "E-posta yok"}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.editProfileBtn}
                        onPress={() => setShowProfileModal(true)}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Account Section */}
                <SectionHeader title="HESAP" />
                <View style={styles.section}>
                    <MenuItem
                        icon="account-edit-outline"
                        title="Kişisel Bilgileri Düzenle"
                        subtitle="İsim ve profil bilgileri"
                        onPress={() => setShowProfileModal(true)}
                        color={Colors.primary}
                    />
                    <MenuItem
                        icon="lock-outline"
                        title="Şifre Değiştir"
                        subtitle="Güvenli şifre güncelleme"
                        onPress={() => setShowPasswordModal(true)}
                        color={Colors.accent}
                    />
                </View>

                {/* Preferences Section */}
                <SectionHeader title="TERCİHLER" />
                <View style={styles.section}>
                    <MenuItem
                        icon="translate"
                        title="Dil Seçimi"
                        subtitle={currentLang === "tr" ? "Türkçe" : "English"}
                        onPress={() => setShowLangModal(true)}
                        color={Colors.status.info}
                    />
                    <MenuItem
                        icon="theme-light-dark"
                        title="Tema"
                        subtitle={isDarkMode ? "Koyu Tema" : "Aydınlık Tema"}
                        color="#8B5CF6"
                        rightComponent={
                            <Switch
                                value={isDarkMode}
                                onValueChange={setIsDarkMode}
                                trackColor={{ false: Colors.border.dark, true: Colors.primary + "50" }}
                                thumbColor={isDarkMode ? Colors.primary : Colors.text.muted}
                            />
                        }
                    />
                </View>

                {/* Subscription Section */}
                <SectionHeader title="ABONELİK" />
                <View style={styles.subscriptionCard}>
                    <View style={styles.subHeader}>
                        <View style={styles.subBadge}>
                            <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" />
                            <Text style={styles.subBadgeText}>FREE</Text>
                        </View>
                        <Text style={styles.subTitle}>Ücretsiz Plan</Text>
                    </View>
                    <View style={styles.subFeatures}>
                        <View style={styles.subFeatureRow}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.primary} />
                            <Text style={styles.subFeatureText}>Anlık deprem bildirimleri</Text>
                        </View>
                        <View style={styles.subFeatureRow}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.primary} />
                            <Text style={styles.subFeatureText}>Temel erken uyarı sistemi</Text>
                        </View>
                        <View style={styles.subFeatureRow}>
                            <MaterialCommunityIcons name="check-circle" size={16} color={Colors.primary} />
                            <Text style={styles.subFeatureText}>5 acil durum kişisi</Text>
                        </View>
                        <View style={styles.subFeatureRow}>
                            <MaterialCommunityIcons name="lock" size={16} color={Colors.text.muted} />
                            <Text style={[styles.subFeatureText, { color: Colors.text.muted }]}>Gelişmiş AI analizi (Pro)</Text>
                        </View>
                        <View style={styles.subFeatureRow}>
                            <MaterialCommunityIcons name="lock" size={16} color={Colors.text.muted} />
                            <Text style={[styles.subFeatureText, { color: Colors.text.muted }]}>Reklamsız deneyim (Pro)</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.upgradeBtn} activeOpacity={0.85}>
                        <MaterialCommunityIcons name="arrow-up-bold-circle" size={18} color="#fff" />
                        <Text style={styles.upgradeBtnText}>Pro'ya Yükselt</Text>
                    </TouchableOpacity>
                </View>

                {/* Legal Section */}
                <SectionHeader title="YASAL" />
                <View style={styles.section}>
                    <MenuItem
                        icon="shield-check-outline"
                        title="Gizlilik Politikası"
                        onPress={() => router.push("/more/privacy")}
                        color={Colors.text.muted}
                    />
                    <MenuItem
                        icon="file-document-outline"
                        title="Kullanım Koşulları"
                        onPress={() => router.push("/more/privacy")}
                        color={Colors.text.muted}
                    />
                </View>

                {/* Footer */}
                <View style={styles.footerSection}>
                    <Text style={styles.footerText}>developed by Alan 2017-2026 ©</Text>
                </View>
            </ScrollView>

            {/* Password Change Modal */}
            <Modal visible={showPasswordModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Şifre Değiştir</Text>
                            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={Colors.text.dark} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalForm}>
                            <Text style={styles.inputLabel}>Mevcut Şifre</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={currentPassword}
                                onChangeText={setCurrentPassword}
                                secureTextEntry
                                placeholder="Mevcut şifreniz"
                                placeholderTextColor={Colors.text.muted}
                            />

                            <Text style={styles.inputLabel}>Yeni Şifre</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                                placeholder="En az 8 karakter"
                                placeholderTextColor={Colors.text.muted}
                            />

                            <Text style={styles.inputLabel}>Yeni Şifre (Tekrar)</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                placeholder="Şifreyi tekrar girin"
                                placeholderTextColor={Colors.text.muted}
                            />

                            <TouchableOpacity
                                style={[styles.modalBtn, passwordLoading && { opacity: 0.6 }]}
                                onPress={handlePasswordChange}
                                disabled={passwordLoading}
                            >
                                {passwordLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalBtnText}>Şifreyi Güncelle</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Language Selection Modal */}
            <Modal visible={showLangModal} transparent animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLangModal(false)}>
                    <View style={styles.langModal}>
                        <Text style={styles.langModalTitle}>Dil Seçimi</Text>
                        {[
                            { code: "tr", label: "Türkçe", flag: "TR" },
                            { code: "en", label: "English", flag: "EN" },
                        ].map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[styles.langItem, currentLang === lang.code && styles.langItemActive]}
                                onPress={() => handleLanguageChange(lang.code)}
                            >
                                <Text style={styles.langFlag}>{lang.flag}</Text>
                                <Text style={[styles.langLabel, currentLang === lang.code && { color: Colors.primary }]}>
                                    {lang.label}
                                </Text>
                                {currentLang === lang.code && (
                                    <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Profile Edit Modal */}
            <Modal visible={showProfileModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Profil Düzenle</Text>
                            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={Colors.text.dark} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalForm}>
                            <Text style={styles.inputLabel}>Ad Soyad</Text>
                            <TextInput
                                style={styles.modalInput}
                                value={displayName}
                                onChangeText={setDisplayName}
                                placeholder="İsminizi girin"
                                placeholderTextColor={Colors.text.muted}
                            />

                            <View style={styles.readonlyField}>
                                <Text style={styles.inputLabel}>E-posta</Text>
                                <Text style={styles.readonlyValue}>{user?.email || "-"}</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.modalBtn, profileLoading && { opacity: 0.6 }]}
                                onPress={handleProfileSave}
                                disabled={profileLoading}
                            >
                                {profileLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalBtnText}>Kaydet</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        paddingTop: Platform.OS === "android" ? 30 : 0,
    },
    content: { padding: Spacing.md, paddingBottom: Spacing.xxxl },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.lg,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },

    // Profile Card
    profileCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        marginBottom: Spacing.lg,
        gap: Spacing.md,
    },
    avatarBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    profileInfo: { flex: 1 },
    profileName: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark },
    profileEmail: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 2 },
    editProfileBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
    },

    // Section
    sectionTitle: {
        fontSize: 10,
        fontWeight: "800",
        color: Colors.text.muted,
        letterSpacing: 1.5,
        marginBottom: Spacing.sm,
        marginLeft: 4,
        marginTop: Spacing.md,
    },
    section: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        overflow: "hidden",
    },

    // Menu Item
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.md,
        gap: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
    },
    menuIconBox: {
        width: 38,
        height: 38,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    menuContent: { flex: 1 },
    menuTitle: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.dark },
    menuSub: { fontSize: 11, color: Colors.text.muted, marginTop: 1 },

    // Subscription Card
    subscriptionCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    subHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    subBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#F59E0B" + "15",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    subBadgeText: { fontSize: 10, fontWeight: "900", color: "#F59E0B", letterSpacing: 1 },
    subTitle: { fontSize: Typography.sizes.md, fontWeight: "700", color: Colors.text.dark },
    subFeatures: { gap: 8 },
    subFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    subFeatureText: { fontSize: Typography.sizes.sm, color: Colors.text.dark, fontWeight: "500" },
    upgradeBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 48,
        marginTop: 4,
        ...Shadows.sm,
    },
    upgradeBtnText: { color: "#fff", fontSize: Typography.sizes.sm, fontWeight: "800" },

    // Footer
    footerSection: {
        alignItems: "center",
        marginTop: Spacing.xxl,
    },
    footerText: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.muted,
        letterSpacing: 0.3,
        opacity: 0.6,
    },

    // Modal shared
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.7)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: Colors.background.dark,
        borderTopLeftRadius: BorderRadius.xl * 2,
        borderTopRightRadius: BorderRadius.xl * 2,
        padding: Spacing.xl,
        paddingBottom: Spacing.xxxl,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.lg,
    },
    modalTitle: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },
    modalForm: { gap: Spacing.md },
    inputLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    modalInput: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        color: Colors.text.dark,
        fontWeight: "700",
        borderWidth: 1,
        borderColor: Colors.border.dark,
        fontSize: Typography.sizes.md,
    },
    modalBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        marginTop: Spacing.sm,
    },
    modalBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },
    readonlyField: { gap: 4 },
    readonlyValue: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        fontWeight: "600",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },

    // Language Modal
    langModal: {
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginHorizontal: Spacing.xl,
        marginBottom: 200,
        gap: Spacing.md,
    },
    langModalTitle: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    langItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    langItemActive: {
        borderColor: Colors.primary + "50",
        backgroundColor: Colors.primary + "08",
    },
    langFlag: { fontSize: 16, fontWeight: "900", color: Colors.text.dark },
    langLabel: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "700", color: Colors.text.dark },
});
