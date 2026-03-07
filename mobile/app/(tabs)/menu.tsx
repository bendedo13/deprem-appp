import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Share, Linking, Platform } from "react-native";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { logout } from "../../src/services/authService";

export default function MenuScreen() {
    const { t } = useTranslation();

    const handleLogout = async () => {
        Alert.alert(
            t("auth.logout_title") || "Çıkış Yap",
            t("auth.logout_confirm") || "Çıkış yapmak istediğinizden emin misiniz?",
            [
                { text: t("map.close"), style: "cancel" },
                {
                    text: t("auth.login_btn"),
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        router.replace("/(auth)/login");
                    }
                }
            ]
        );
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: t("common.share_message"),
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleRate = async () => {
        try {
            const url = Platform.OS === 'ios'
                ? 'https://apps.apple.com/app/quakesense/id6504180566'
                : 'https://play.google.com/store/apps/details?id=com.quakesense';
            await Linking.openURL(url);
        } catch (error) {
            Alert.alert(t("common.error"), t("common.error"));
        }
    };

    const MenuItem = ({ icon, title, href, onPress, color = Colors.text.dark }: any) => {
        const Content = (
            <View style={styles.menuItem}>
                <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                    <MaterialCommunityIcons name={icon} size={22} color={color} />
                </View>
                <Text style={[styles.menuText, { color }]}>{title}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.border.dark} />
            </View>
        );

        if (onPress) {
            return (
                <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                    {Content}
                </TouchableOpacity>
            );
        }

        return (
            <Link href={href} asChild>
                <TouchableOpacity activeOpacity={0.7}>
                    {Content}
                </TouchableOpacity>
            </Link>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>{t("menu.title")}</Text>
                <Text style={styles.subtitle}>{t("menu.version")}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.settings")}</Text>
                <MenuItem icon="account-circle-outline" title="Kullanıcı Paneli" href="/more/dashboard" color={Colors.primary} />
                <MenuItem icon="bell-badge-outline" title="Bildirim Tercihleri" href="/more/notification-preferences" color={Colors.accent} />
                <MenuItem icon="bell-outline" title={t("menu.notifications") || "Bildirim Ayarları"} href="/more/notifications" color={Colors.primary} />
                <MenuItem icon="earth" title={t("menu.language") || "Dil Seçimi"} href="/more/language" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Acil Durum</Text>
                <MenuItem icon="microphone" title="S.O.S Sesli Mesaj" href="/more/sos" color="#DC2626" />
                <MenuItem icon="shield-account" title="Güvenlik Ağı" href="/more/family-network" color="#8b5cf6" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.preparation") || "Hazırlık"}</Text>
                <MenuItem icon="chart-arc" title="Hazırlık Skoru" href="/more/preparedness-score" color={Colors.primary} />
                <MenuItem icon="shield-search" title={t("menu.risk_analysis") || "Risk Analizi"} href="/more/risk_analysis" color={Colors.primary} />
                <MenuItem icon="account-multiple-outline" title={t("menu.emergency_contacts") || "Acil Kişiler"} href="/more/contacts" color={Colors.primary} />
                <MenuItem icon="briefcase-outline" title={t("menu.survival_kit") || "Deprem Çantası"} href="/more/survival_kit" color="#f59e0b" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.about")}</Text>
                <MenuItem icon="help-circle-outline" title="Nasıl Çalışır?" href="/more/how-it-works" color={Colors.status.info} />
                <MenuItem icon="information-outline" title={t("about.title")} href="/more/about" />
                <MenuItem icon="shield-check-outline" title={t("privacy.title")} href="/more/privacy" />
                <MenuItem icon="security" title={t("menu.security")} href="/more/security" />
                <MenuItem icon="email-outline" title={t("contact.title")} href="/more/contact" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.support") || "Destek"}</Text>
                <MenuItem icon="share-variant-outline" title={t("menu.share") || "Uygulamayı Paylaş"} onPress={handleShare} />
                <MenuItem icon="star-outline" title={t("menu.rate") || "Puan Ver"} onPress={handleRate} />
                <MenuItem icon="logout-variant" title={t("auth.logout") || "Çıkış Yap"} onPress={handleLogout} color="#ef4444" />
            </View>

            <View style={styles.footer}>
                <View style={styles.trustBanner}>
                    <MaterialCommunityIcons name="shield-check" size={16} color={Colors.primary} />
                    <Text style={styles.trustText}>
                        Deprem verileri resmi devlet kurumu API'lerinden anlık olarak sağlanmaktadır.
                    </Text>
                </View>
                <View style={styles.copyrightLine} />
                <Text style={styles.copyrightText}>developed by Alan 2017-2026 ©</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    header: { marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    title: { fontSize: Typography.sizes.xxxl, fontWeight: "800", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 4, fontWeight: "600" },
    section: { marginBottom: Spacing.xxl },
    sectionTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.md,
        marginLeft: 4
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 13,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    menuText: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "700" },
    footer: { marginTop: Spacing.xl, alignItems: "center", gap: Spacing.md },
    trustBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.primary + "08",
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.primary + "15",
    },
    trustText: {
        flex: 1,
        fontSize: 11,
        fontWeight: "600",
        color: Colors.primary,
        lineHeight: 16,
    },
    copyrightLine: {
        width: 40,
        height: 1,
        backgroundColor: Colors.border.glass,
        marginTop: 4,
    },
    copyrightText: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.muted,
        letterSpacing: 0.3,
        opacity: 0.6,
    },
});
