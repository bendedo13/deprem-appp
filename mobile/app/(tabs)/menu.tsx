import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Share, Linking, Platform } from "react-native";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { logout, getMe } from "../../src/services/authService";
import { getSubscriptionStatus, type SubscriptionStatus } from "../../src/services/subscriptionService";

export default function MenuScreen() {
    const { t } = useTranslation();
    const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
    const [loadingSub, setLoadingSub] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoadingSub(true);
        getSubscriptionStatus()
            .then((data) => {
                if (mounted) setSubStatus(data);
            })
            .catch(() => {
                if (mounted) setSubStatus(null);
            })
            .finally(() => {
                if (mounted) setLoadingSub(false);
            });

        // Admin kontrolü
        getMe()
            .then((user: any) => {
                if (mounted && user?.is_admin) setIsAdmin(true);
            })
            .catch(() => {});

        return () => {
            mounted = false;
        };
    }, []);

    const isPro = subStatus?.is_pro;

    const handleLogout = async () => {
        Alert.alert(
            t("auth.logout_title") || "Çıkış Yap",
            t("auth.logout_confirm") || "Çıkış yapmak istediğinizden emin misiniz?",
            [
                { text: t("auth.logout_cancel") || "Vazgeç", style: "cancel" },
                {
                    text: t("auth.logout_confirm_btn") || "Çıkış Yap",
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
            await Share.share({ message: t("common.share_message") || "QuakeSense ile depreme hazırlıklı ol! https://quakesense.app" });
        } catch { /* ignore */ }
    };

    const handleRate = async () => {
        try {
            const url = Platform.OS === "ios"
                ? "https://apps.apple.com/app/quakesense/id6504180566"
                : "https://play.google.com/store/apps/details?id=com.quakesense";
            await Linking.openURL(url);
        } catch {
            Alert.alert(t("common.error") || "Hata", "Uygulama mağazası açılamadı.");
        }
    };

    const goToPremium = () => {
        router.push("/more/premium");
    };

    const MenuItem = ({ icon, title, href, onPress, color = Colors.text.dark, badge }: any) => {
        const Content = (
            <View style={styles.menuItem}>
                <View style={[styles.iconBox, { backgroundColor: color + "15" }]}>
                    <MaterialCommunityIcons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.menuText, { color }]}>{title}</Text>
                {badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
                <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.border.dark} />
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

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerBrand}>
                    <View style={styles.headerLogo}>
                        <MaterialCommunityIcons name="shield-check" size={18} color="#fff" />
                    </View>
                    <View>
                        <Text style={styles.title}>{t("menu.title")}</Text>
                        <Text style={styles.subtitle}>{t("menu.version")}</Text>
                    </View>
                </View>
            </View>

            {/* Patron Paneli — sadece admin görür */}
            {isAdmin && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: "#FFD700" }]}>👑 YÖNETİM</Text>
                    <TouchableOpacity
                        style={[styles.menuItem, {
                            borderColor: "#FFD70040",
                            borderWidth: 1.5,
                            backgroundColor: "#FFD70008",
                        }]}
                        onPress={() => router.push("/more/admin")}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconBox, { backgroundColor: "#FFD70020" }]}>
                            <MaterialCommunityIcons name="shield-crown" size={20} color="#FFD700" />
                        </View>
                        <Text style={[styles.menuText, { color: "#FFD700" }]}>Patron Paneli (Admin)</Text>
                        <View style={[styles.badge, { backgroundColor: "#FFD700" }]}>
                            <Text style={[styles.badgeText, { color: "#000" }]}>ADMIN</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#FFD700" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Premium */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⭐ Premium</Text>
                <MenuItem
                    icon="crown"
                    title="QuakeSense PRO"
                    href="/more/premium"
                    color="#F59E0B"
                    badge="PRO"
                />
            </View>

            {/* Ayarlar */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.settings")}</Text>
                <MenuItem
                    icon="bell-badge-outline"
                    title="Bildirim Tercihleri"
                    href="/more/notification_preferences"
                    color={Colors.accent}
                    badge="Yeni"
                />
                <MenuItem icon="bell-outline" title={t("menu.notifications") || "Bildirim Ayarları"} href="/more/notifications" color={Colors.primary} />
                <MenuItem icon="earth" title={t("menu.language") || "Dil Seçimi"} href="/more/language" />
            </View>

            {/* Acil Durum */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🆘 {t("menu.emergency") || "Acil Durum"}</Text>
                <MenuItem
                    icon="microphone"
                    title="S.O.S Sesli Mesaj"
                    onPress={isPro ? () => router.push("/more/sos") : goToPremium}
                    color={Colors.danger}
                    badge={isPro ? undefined : "PRO"}
                />
                <MenuItem
                    icon="account-heart-outline"
                    title="Güvenlik Ağım"
                    onPress={isPro ? () => router.push("/more/family_safety") : goToPremium}
                    color={Colors.danger}
                    badge={isPro ? "Yeni" : "PRO"}
                />
                <MenuItem
                    icon="map-marker-radius"
                    title="Toplanma Alanları"
                    href="/more/gathering_points"
                    color={Colors.primary}
                />
                <MenuItem
                    icon="map-legend"
                    title="Live Impact Map"
                    href="/more/impact_map"
                    color={Colors.accent}
                />
            </View>

            {/* Hazırlık */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.preparation") || "Hazırlık"}</Text>
                <MenuItem
                    icon="shield-star-outline"
                    title="Hazırlık Skorum"
                    onPress={isPro ? () => router.push("/more/safety_score") : goToPremium}
                    color={Colors.primary}
                    badge={isPro ? "Yeni" : "PRO"}
                />
                <MenuItem icon="shield-search" title={t("menu.risk_analysis") || "Risk Analizi"} href="/more/risk_analysis" color={Colors.primary} />
                <MenuItem
                    icon="account-multiple-outline"
                    title={t("menu.emergency_contacts") || "Acil Kişiler"}
                    onPress={isPro ? () => router.push("/more/contacts") : goToPremium}
                    color={Colors.primary}
                    badge={isPro ? undefined : "PRO"}
                />
                <MenuItem
                    icon="briefcase-outline"
                    title={t("menu.survival_kit") || "Deprem Çantası"}
                    href="/more/survival_kit"
                    color="#f59e0b"
                />
            </View>

            {/* Hakkımızda */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.about")}</Text>
                <MenuItem icon="information-outline" title={t("about.title")} href="/more/about" />
                <MenuItem icon="shield-check-outline" title={t("privacy.title")} href="/more/privacy" />
                <MenuItem icon="security" title={t("menu.security")} href="/more/security" />
                <MenuItem icon="email-outline" title={t("contact.title")} href="/more/contact" />
                <MenuItem icon="medical-bag" title="Sağlık Kartı & Kurtarma QR" href="/more/health_card" />
            </View>

            {/* Destek */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("menu.support") || "Destek"}</Text>
                <MenuItem icon="share-variant-outline" title={t("menu.share") || "Uygulamayı Paylaş"} onPress={handleShare} />
                <MenuItem icon="star-outline" title={t("menu.rate") || "Puan Ver"} onPress={handleRate} />
                <MenuItem icon="logout-variant" title={t("auth.logout") || "Çıkış Yap"} onPress={handleLogout} color={Colors.danger} />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.branding}>
                    <MaterialCommunityIcons name="shield-check" size={14} color={Colors.primary} />
                    <Text style={styles.brandingText}>QuakeSense — Hayatınızı Koruyoruz</Text>
                </View>
                <Text style={styles.brandingSubText}>{t("menu.developed_by")}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { paddingBottom: Spacing.xxxl },

    header: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.xl,
        paddingBottom: Spacing.xl,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
        marginBottom: Spacing.md,
    },
    headerBrand: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    headerLogo: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.sm,
    },
    title: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.text.dark, letterSpacing: -0.5 },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, marginTop: 2, fontWeight: "600" },

    section: {
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.sm,
        marginLeft: 4,
    },

    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.xs + 2,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        gap: Spacing.sm,
    },
    iconBox: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    menuText: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "700" },

    badge: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: "900",
        color: "#fff",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },

    footer: {
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.md,
        alignItems: "center",
        gap: 4,
        paddingBottom: Spacing.lg,
    },
    branding: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    brandingText: {
        fontSize: 13,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    brandingSubText: {
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.muted,
        opacity: 0.6,
    },
});
