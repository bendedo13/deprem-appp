import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import {
    getSubscriptionStatus,
    activateTrial,
    subscribe,
    cancelSubscription,
    PRO_FEATURES,
    type SubscriptionStatus,
} from "../../src/services/subscriptionService";

type PlanKey = "monthly_pro" | "yearly_pro";

export default function PremiumScreen() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>("yearly_pro");

    const fetchStatus = useCallback(async () => {
        try {
            const data = await getSubscriptionStatus();
            setStatus(data);
        } catch {
            // User might not be logged in
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleActivateTrial = async () => {
        Alert.alert(
            "Ücretsiz Deneme",
            "10 gün boyunca tüm PRO özelliklere erişebileceksiniz. Başlatmak istiyor musunuz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Başlat",
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const data = await activateTrial();
                            setStatus(data);
                            Alert.alert("🎉 Deneme Başladı!", "10 gün boyunca PRO özelliklerin keyfini çıkarın!");
                        } catch (e: any) {
                            Alert.alert("Hata", e?.response?.data?.detail || "Deneme başlatılamadı.");
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSubscribe = async () => {
        const planLabel = selectedPlan === "monthly_pro" ? "Aylık (₺29.99)" : "Yıllık (₺199.99)";
        Alert.alert(
            "PRO Abonelik",
            `${planLabel} planını aktifleştirmek istiyor musunuz?`,
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Onayla",
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const data = await subscribe(selectedPlan);
                            setStatus(data);
                            Alert.alert("🎉 PRO Aktif!", "Tüm özellikler kullanımınıza açıldı.");
                        } catch (e: any) {
                            Alert.alert("Hata", e?.response?.data?.detail || "Abonelik başlatılamadı.");
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = async () => {
        Alert.alert(
            "Abonelik İptali",
            "PRO aboneliğinizi iptal etmek istediğinize emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "İptal Et",
                    style: "destructive",
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            await cancelSubscription();
                            await fetchStatus();
                            Alert.alert("Bilgi", "Aboneliğiniz iptal edildi.");
                        } catch {
                            Alert.alert("Hata", "İptal işlemi başarısız.");
                        } finally {
                            setActionLoading(false);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const isPro = status?.is_pro;
    const isTrial = status?.subscription_plan === "trial";
    const trialUsed = status?.trial_used;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Hero */}
            <LinearGradient
                colors={isPro ? ["#059669", "#10B981"] : ["#F59E0B", "#F97316"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
            >
                <MaterialCommunityIcons
                    name={isPro ? "crown" : "rocket-launch"}
                    size={48}
                    color="#fff"
                />
                <Text style={styles.heroTitle}>
                    {isPro ? "PRO Aktif! 🎉" : "QuakeSense PRO"}
                </Text>
                <Text style={styles.heroSubtitle}>
                    {isPro
                        ? isTrial
                            ? `Deneme süresi: ${status?.subscription_expires_at ? new Date(status.subscription_expires_at).toLocaleDateString("tr-TR") : ""}`
                            : "Tüm premium özellikler aktif"
                        : "Deprem güvenliğinizi üst seviyeye taşıyın"}
                </Text>
            </LinearGradient>

            {/* Features */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>PRO Özellikler</Text>
                {Object.entries(PRO_FEATURES).map(([key, label]) => (
                    <View key={key} style={styles.featureRow}>
                        <View style={[styles.featureIcon, isPro && styles.featureIconActive]}>
                            <MaterialCommunityIcons
                                name={isPro ? "check-circle" : "lock"}
                                size={18}
                                color={isPro ? Colors.primary : Colors.text.muted}
                            />
                        </View>
                        <Text style={[styles.featureText, isPro && styles.featureTextActive]}>
                            {label}
                        </Text>
                        {!isPro && (
                            <View style={styles.proBadge}>
                                <Text style={styles.proBadgeText}>PRO</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {/* Plan Selection (only for non-pro) */}
            {!isPro && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Plan Seçin</Text>

                    {/* Trial Button */}
                    {!trialUsed && (
                        <TouchableOpacity
                            style={styles.trialCard}
                            onPress={handleActivateTrial}
                            disabled={actionLoading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={["#3B82F6", "#6366F1"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.trialGradient}
                            >
                                <MaterialCommunityIcons name="gift" size={24} color="#fff" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.trialTitle}>10 Gün Ücretsiz Deneyin</Text>
                                    <Text style={styles.trialSub}>Kredi kartı gerekmez</Text>
                                </View>
                                <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Monthly */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === "monthly_pro" && styles.planCardSelected]}
                        onPress={() => setSelectedPlan("monthly_pro")}
                        activeOpacity={0.8}
                    >
                        <View style={styles.planHeader}>
                            <View style={[styles.planRadio, selectedPlan === "monthly_pro" && styles.planRadioActive]}>
                                {selectedPlan === "monthly_pro" && <View style={styles.planRadioDot} />}
                            </View>
                            <Text style={styles.planName}>Aylık</Text>
                        </View>
                        <Text style={styles.planPrice}>₺29.99<Text style={styles.planPeriod}>/ay</Text></Text>
                    </TouchableOpacity>

                    {/* Yearly */}
                    <TouchableOpacity
                        style={[styles.planCard, selectedPlan === "yearly_pro" && styles.planCardSelected]}
                        onPress={() => setSelectedPlan("yearly_pro")}
                        activeOpacity={0.8}
                    >
                        <View style={styles.planHeader}>
                            <View style={[styles.planRadio, selectedPlan === "yearly_pro" && styles.planRadioActive]}>
                                {selectedPlan === "yearly_pro" && <View style={styles.planRadioDot} />}
                            </View>
                            <Text style={styles.planName}>Yıllık</Text>
                            <View style={styles.saveBadge}>
                                <Text style={styles.saveBadgeText}>%44 TASARRUF</Text>
                            </View>
                        </View>
                        <Text style={styles.planPrice}>₺199.99<Text style={styles.planPeriod}>/yıl</Text></Text>
                    </TouchableOpacity>

                    {/* Subscribe Button */}
                    <TouchableOpacity
                        style={styles.subscribeBtn}
                        onPress={handleSubscribe}
                        disabled={actionLoading}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={Colors.gradient.emerald as [string, string]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.subscribeBtnGradient}
                        >
                            {actionLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <MaterialCommunityIcons name="crown" size={20} color="#fff" />
                                    <Text style={styles.subscribeBtnText}>PRO'ya Geç</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            )}

            {/* Cancel (for pro users) */}
            {isPro && (
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleCancel}
                        disabled={actionLoading}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.cancelBtnText}>Aboneliği İptal Et</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    Ödeme işlemleri güvenli şekilde gerçekleştirilir. İstediğiniz zaman iptal edebilirsiniz.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { paddingBottom: Spacing.xxxl },

    hero: {
        padding: Spacing.xl,
        paddingTop: Spacing.xxl,
        paddingBottom: Spacing.xl,
        alignItems: "center",
        gap: Spacing.sm,
    },
    heroTitle: {
        fontSize: Typography.sizes.xxxl,
        fontWeight: Typography.weights.black,
        color: "#fff",
        textAlign: "center",
        letterSpacing: -0.5,
    },
    heroSubtitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        color: "rgba(255,255,255,0.85)",
        textAlign: "center",
    },

    section: {
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.extrabold,
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.sm,
        marginLeft: 4,
    },

    featureRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        gap: Spacing.sm,
    },
    featureIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: "rgba(107, 114, 128, 0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    featureIconActive: {
        backgroundColor: Colors.primary + "20",
    },
    featureText: {
        flex: 1,
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.bold,
        color: Colors.text.muted,
    },
    featureTextActive: {
        color: Colors.text.dark,
    },
    proBadge: {
        backgroundColor: Colors.accent + "20",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
    },
    proBadgeText: {
        fontSize: 9,
        fontWeight: Typography.weights.black,
        color: Colors.accent,
        letterSpacing: 0.5,
    },

    trialCard: {
        borderRadius: BorderRadius.xl,
        overflow: "hidden",
        marginBottom: Spacing.sm,
        ...Shadows.md,
    },
    trialGradient: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    trialTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.extrabold,
        color: "#fff",
    },
    trialSub: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.semibold,
        color: "rgba(255,255,255,0.7)",
        marginTop: 2,
    },

    planCard: {
        backgroundColor: Colors.background.surface,
        borderWidth: 2,
        borderColor: Colors.border.dark,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    planCardSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "08",
    },
    planHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
    },
    planRadio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: Colors.border.dark,
        justifyContent: "center",
        alignItems: "center",
    },
    planRadioActive: {
        borderColor: Colors.primary,
    },
    planRadioDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
    },
    planName: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.extrabold,
        color: Colors.text.dark,
    },
    planPrice: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.black,
        color: Colors.primary,
    },
    planPeriod: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        color: Colors.text.muted,
    },
    saveBadge: {
        backgroundColor: Colors.primary + "20",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.full,
    },
    saveBadgeText: {
        fontSize: 9,
        fontWeight: Typography.weights.black,
        color: Colors.primary,
        letterSpacing: 0.5,
    },

    subscribeBtn: {
        borderRadius: BorderRadius.xl,
        overflow: "hidden",
        marginTop: Spacing.sm,
        ...Shadows.md,
    },
    subscribeBtnGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    subscribeBtnText: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.black,
        color: "#fff",
        letterSpacing: 0.5,
    },

    cancelBtn: {
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: Colors.danger + "40",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
    },
    cancelBtnText: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.bold,
        color: Colors.danger,
    },

    footer: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xl,
        alignItems: "center",
    },
    footerText: {
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.medium,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 18,
    },
});
