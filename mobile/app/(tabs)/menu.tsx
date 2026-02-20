import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Share } from "react-native";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
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
                message: "QuakeSense ile depremleri anlık takip edin, hayat kurtaran sismik sensör özelliğini keşfedin! https://quakesense.app",
            });
        } catch (error) {
            console.error(error);
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
                <MenuItem icon="bell-outline" title={t("menu.notifications") || "Bildirim Ayarları"} href="/more/notifications" color={Colors.primary} />
                <MenuItem icon="earth" title={t("menu.language") || "Dil Seçimi"} href="/more/language" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.about")}</Text>
                <MenuItem icon="information-outline" title={t("about.title")} href="/more/about" />
                <MenuItem icon="shield-check-outline" title={t("privacy.title")} href="/more/privacy" />
                <MenuItem icon="security" title={t("menu.security")} href="/more/security" />
                <MenuItem icon="email-outline" title={t("contact.title")} href="/more/contact" />
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.support") || "Destek"}</Text>
                <MenuItem icon="share-variant-outline" title={t("menu.share") || "Uygulamayı Paylaş"} onPress={handleShare} />
                <MenuItem icon="star-outline" title={t("menu.rate") || "Puan Ver"} onPress={() => { }} />
                <MenuItem icon="logout-variant" title={t("auth.logout") || "Çıkış Yap"} onPress={handleLogout} color="#ef4444" />
            </View>

            <View style={styles.footer}>
                <View style={styles.branding}>
                    <MaterialCommunityIcons name="code-tags" size={16} color={Colors.text.muted} />
                    <Text style={styles.brandingText}>{t("menu.developed_by")}</Text>
                </View>
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
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    menuText: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "700" },
    footer: { marginTop: Spacing.xl, alignItems: "center" },
    branding: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        opacity: 0.6,
    },
    brandingText: {
        fontSize: 13,
        fontWeight: "800",
        color: Colors.text.muted,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    }
});
