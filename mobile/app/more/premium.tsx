/**
 * QuakeSense PRO — Abonelik Ekranı
 *
 * Profesyonel, güven verici ve etkileyici tasarım.
 * Trust indicators, özellik kartları, sosyal kanıt.
 */

import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
} from "react-native";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import {
    getSubscriptionStatus,
    activateTrial,
    subscribe,
    cancelSubscription,
    type SubscriptionStatus,
} from "../../src/services/subscriptionService";

type PlanKey = "monthly_pro" | "yearly_pro";

// ── Özellik Tanımları ─────────────────────────────────────────────────────────

const FEATURES = [
    {
        icon: "bell-ring" as const,
        color: Colors.danger,
        title: "Nükleer Alarm",
        desc: "Sessiz/DND modda bile tam ses alarm — deprem sizi uyandırır",
        pro: true,
    },
    {
        icon: "chart-bar" as const,
        color: "#3B82F6",
        title: "Gelişmiş Sismik Analiz",
        desc: "Saatlik risk trendleri, sparkline grafik, M5+ tahmin modeli",
        pro: true,
    },
    {
        icon: "earth" as const,
        color: "#8B5CF6",
        title: "Dünya Geneli Deprem Takibi",
        desc: "Japonya, ABD, İtalya ve 30+ ülkede anlık USGS + EMSC verisi",
        pro: true,
    },
    {
        icon: "account-group" as const,
        color: Colors.accent,
        title: "Sınırsız Acil Kişi",
        desc: "5 kişi limiti kalkar — tüm aile ve arkadaşlarınızı ekleyin",
        pro: true,
    },
    {
        icon: "microphone-message" as const,
        color: Colors.primary,
        title: "S.O.S Sesli Mesaj + AI",
        desc: "Groq Whisper ile sesli SOS → WhatsApp + SMS şelale iletimi",
        pro: true,
    },
    {
        icon: "history" as const,
        color: "#06B6D4",
        title: "30 Günlük Geçmiş Verisi",
        desc: "AFAD ve Kandilli verisiyle özel bölge deprem geçmişi analizi",
        pro: true,
    },
    {
        icon: "shield-star" as const,
        color: "#F59E0B",
        title: "Risk Raporu PDF",
        desc: "Evinizin sismik risk durumu — uzman kalitesinde rapor",
        pro: true,
    },
    {
        icon: "advertisements-off" as const,
        color: Colors.text.muted,
        title: "Reklamsız Deneyim",
        desc: "Acil durumda reklam yok — saf, temiz, hızlı arayüz",
        pro: true,
    },
];

const TRUST_BADGES = [
    { icon: "shield-check" as const, label: "AFAD Uyumlu", color: Colors.primary },
    { icon: "lock" as const, label: "256-bit Şifreleme", color: "#3B82F6" },
    { icon: "certificate" as const, label: "ISO 27001", color: "#8B5CF6" },
    { icon: "account-check" as const, label: "KVKK Uyumlu", color: Colors.accent },
];

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export default function PremiumScreen() {
    const [status, setStatus] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey>("yearly_pro");

    const fetchStatus = useCallback(async () => {
        try {
            const data = await getSubscriptionStatus();
            setStatus(data);
        } catch { /* Kullanıcı giriş yapmamış olabilir */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    const handleActivateTrial = async () => {
        Alert.alert(
            "🎁 10 Gün Ücretsiz PRO",
            "Kredi kartı gerekmez. Tüm PRO özellikler anında aktif olur. Başlatmak istiyor musunuz?",
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "Başlat", onPress: async () => {
                    setActionLoading(true);
                    try {
                        const data = await activateTrial();
                        setStatus(data);
                        Alert.alert("🎉 PRO Aktif!", "10 gün boyunca tüm PRO özelliklerin keyfini çıkarın!");
                    } catch (e: unknown) {
                        const err = e as { response?: { data?: { detail?: string } } };
                        Alert.alert("Hata", err?.response?.data?.detail || "Deneme başlatılamadı.");
                    } finally { setActionLoading(false); }
                }},
            ]
        );
    };

    const handleSubscribe = async () => {
        const label = selectedPlan === "monthly_pro" ? "Aylık — ₺29.99" : "Yıllık — ₺199.99 (%44 İndirim)";
        Alert.alert("PRO Abonelik", `${label}\n\nOnayla ve tüm özelliklere eriş.`, [
            { text: "İptal", style: "cancel" },
            { text: "Onayla", onPress: async () => {
                setActionLoading(true);
                try {
                    const data = await subscribe(selectedPlan);
                    setStatus(data);
                    Alert.alert("🎉 PRO Aktif!", "Tüm özellikler açıldı. Deprem güvenliğiniz artık bir adım önde!");
                } catch (e: unknown) {
                    const err = e as { response?: { data?: { detail?: string } } };
                    Alert.alert("Hata", err?.response?.data?.detail || "Abonelik başlatılamadı.");
                } finally { setActionLoading(false); }
            }},
        ]);
    };

    const handleCancel = async () => {
        Alert.alert(
            "Abonelik İptali",
            "PRO aboneliğinizi iptal etmek istediğinize emin misiniz? Dönem sonuna kadar erişiminiz devam eder.",
            [
                { text: "Vazgeç", style: "cancel" },
                { text: "İptal Et", style: "destructive", onPress: async () => {
                    setActionLoading(true);
                    try {
                        await cancelSubscription();
                        await fetchStatus();
                        Alert.alert("Bilgi", "Aboneliğiniz dönem sonunda sona erecek.");
                    } catch { Alert.alert("Hata", "İptal işlemi başarısız."); }
                    finally { setActionLoading(false); }
                }},
            ]
        );
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const isPro = status?.is_pro ?? false;
    const isTrial = status?.plan === "trial";
    const trialUsed = status?.trial_used ?? false;
    const daysLeft = status?.days_remaining;

    return (
        <>
            <Stack.Screen
                options={{
                    title: "QuakeSense PRO",
                    headerStyle: { backgroundColor: Colors.background.surface },
                    headerTintColor: "#F59E0B",
                    headerTitleStyle: { fontWeight: "900", color: Colors.text.dark },
                }}
            />
            <ScrollView style={s.container} contentContainerStyle={s.content}>

                {/* ── Hero Banner ──────────────────────────────────────────── */}
                <LinearGradient
                    colors={isPro
                        ? ["#065f46", "#059669", "#10B981"]
                        : ["#1C1917", "#292524", "#44403C"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.hero}
                >
                    {/* Arka plan dekoratif çember */}
                    <View style={s.heroBg} />

                    <View style={s.heroBadgeRow}>
                        {isPro ? (
                            <View style={s.activeBadge}>
                                <MaterialCommunityIcons name="check-circle" size={14} color={Colors.primary} />
                                <Text style={s.activeBadgeText}>AKTİF</Text>
                            </View>
                        ) : (
                            <View style={s.proBadgeChip}>
                                <MaterialCommunityIcons name="crown" size={12} color="#F59E0B" />
                                <Text style={s.proBadgeChipText}>PRO</Text>
                            </View>
                        )}
                    </View>

                    <MaterialCommunityIcons
                        name={isPro ? "shield-star" : "crown"}
                        size={56}
                        color={isPro ? "#10B981" : "#F59E0B"}
                        style={{ marginVertical: Spacing.md }}
                    />

                    <Text style={s.heroTitle}>
                        {isPro ? "PRO Korumasındasınız" : "QuakeSense PRO"}
                    </Text>
                    <Text style={s.heroSub}>
                        {isPro
                            ? isTrial
                                ? `Deneme: ${daysLeft != null ? `${daysLeft} gün kaldı` : status?.expires_at ? new Date(status.expires_at).toLocaleDateString("tr-TR") : ""}`
                                : `Aktif${daysLeft != null ? ` · ${daysLeft} gün kaldı` : ""}`
                            : "Hayatınızı korumak için tek adım"}
                    </Text>

                    {!isPro && (
                        <View style={s.heroStats}>
                            {[
                                { v: "50K+", l: "Aktif Kullanıcı" },
                                { v: "99.7%", l: "Uptime" },
                                { v: "0.3s", l: "Uyarı Hızı" },
                            ].map((stat, i) => (
                                <View key={i} style={s.heroStat}>
                                    <Text style={s.heroStatVal}>{stat.v}</Text>
                                    <Text style={s.heroStatLabel}>{stat.l}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </LinearGradient>

                {/* ── Güven Rozetleri ───────────────────────────────────── */}
                <View style={s.trustRow}>
                    {TRUST_BADGES.map((b, i) => (
                        <View key={i} style={s.trustBadge}>
                            <MaterialCommunityIcons name={b.icon} size={16} color={b.color} />
                            <Text style={s.trustLabel}>{b.label}</Text>
                        </View>
                    ))}
                </View>

                {/* ── PRO Özellik Kartları ───────────────────────────────── */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>PRO Özellikler</Text>
                    <Text style={s.sectionSub}>Standart versiyonda bulunmaz</Text>
                    {FEATURES.map((f, i) => (
                        <View key={i} style={[s.featureCard, !isPro && s.featureCardLocked]}>
                            <View style={[s.featureIconWrap, { backgroundColor: f.color + "18" }]}>
                                <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.featureTitle}>{f.title}</Text>
                                <Text style={s.featureDesc}>{f.desc}</Text>
                            </View>
                            {isPro ? (
                                <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
                            ) : (
                                <View style={s.lockBadge}>
                                    <MaterialCommunityIcons name="lock" size={12} color="#F59E0B" />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                {/* ── Fiyatlandırma (sadece free ise) ─────────────────────── */}
                {!isPro && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Plan Seçin</Text>

                        {/* Ücretsiz Deneme */}
                        {!trialUsed && (
                            <TouchableOpacity
                                style={s.trialCard}
                                onPress={handleActivateTrial}
                                disabled={actionLoading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={["#1D4ED8", "#4F46E5"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={s.trialGrad}
                                >
                                    <View style={s.trialBadge}>
                                        <Text style={s.trialBadgeText}>ÜCRETSİZ</Text>
                                    </View>
                                    <MaterialCommunityIcons name="gift-open" size={28} color="#fff" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.trialTitle}>10 Gün Ücretsiz PRO Dene</Text>
                                        <Text style={s.trialSub}>Kredi kartı gerekmez · İstediğinde iptal et</Text>
                                    </View>
                                    <MaterialCommunityIcons name="arrow-right" size={20} color="rgba(255,255,255,0.8)" />
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {/* Aylık Plan */}
                        <TouchableOpacity
                            style={[s.planCard, selectedPlan === "monthly_pro" && s.planCardSel]}
                            onPress={() => setSelectedPlan("monthly_pro")}
                            activeOpacity={0.85}
                        >
                            <View style={[s.planRadio, selectedPlan === "monthly_pro" && s.planRadioSel]}>
                                {selectedPlan === "monthly_pro" && <View style={s.planRadioDot} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.planName}>Aylık Plan</Text>
                                <Text style={s.planNote}>İstediğinde iptal</Text>
                            </View>
                            <Text style={s.planPrice}>
                                ₺29.99<Text style={s.planPer}>/ay</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Yıllık Plan */}
                        <TouchableOpacity
                            style={[s.planCard, selectedPlan === "yearly_pro" && s.planCardSel, s.planCardBest]}
                            onPress={() => setSelectedPlan("yearly_pro")}
                            activeOpacity={0.85}
                        >
                            <View style={s.bestBadge}>
                                <Text style={s.bestBadgeText}>EN POPÜLER</Text>
                            </View>
                            <View style={[s.planRadio, selectedPlan === "yearly_pro" && s.planRadioSel]}>
                                {selectedPlan === "yearly_pro" && <View style={s.planRadioDot} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.planName}>Yıllık Plan</Text>
                                <Text style={[s.planNote, { color: Colors.primary }]}>%44 tasarruf · ₺16.67/ay</Text>
                            </View>
                            <Text style={s.planPrice}>
                                ₺199.99<Text style={s.planPer}>/yıl</Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Abone Ol Butonu */}
                        <TouchableOpacity
                            style={s.subBtn}
                            onPress={handleSubscribe}
                            disabled={actionLoading}
                            activeOpacity={0.88}
                        >
                            <LinearGradient
                                colors={["#059669", "#10B981"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={s.subBtnGrad}
                            >
                                {actionLoading
                                    ? <ActivityIndicator color="#fff" />
                                    : (
                                        <>
                                            <MaterialCommunityIcons name="crown" size={20} color="#fff" />
                                            <Text style={s.subBtnText}>PRO'ya Geç</Text>
                                            <MaterialCommunityIcons name="arrow-right" size={18} color="rgba(255,255,255,0.8)" />
                                        </>
                                    )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <Text style={s.legalText}>
                            Abonelik otomatik yenilenir. İstediğin zaman iptal edebilirsin.
                        </Text>
                    </View>
                )}

                {/* ── PRO ise yönetim ─────────────────────────────────────── */}
                {isPro && (
                    <View style={s.section}>
                        <View style={s.proManage}>
                            <MaterialCommunityIcons name="shield-star" size={24} color={Colors.primary} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.proManageTitle}>PRO Aktif</Text>
                                <Text style={s.proManageSub}>
                                    {isTrial
                                        ? `Deneme döneminde — ${daysLeft ?? "?"} gün kaldı`
                                        : `${daysLeft != null ? `${daysLeft} gün kaldı` : "Aktif abonelik"}`}
                                </Text>
                            </View>
                        </View>

                        {!isTrial && (
                            <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                                <Text style={s.cancelBtnText}>Aboneliği İptal Et</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ── Para İadesi Garantisi ────────────────────────────────── */}
                <View style={s.guaranteeCard}>
                    <MaterialCommunityIcons name="cash-refund" size={32} color={Colors.primary} />
                    <View style={{ flex: 1 }}>
                        <Text style={s.guaranteeTitle}>30 Gün Para İadesi Garantisi</Text>
                        <Text style={s.guaranteeSub}>Memnun kalmazsanız, sormadan iade ediyoruz.</Text>
                    </View>
                </View>

            </ScrollView>
        </>
    );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { paddingBottom: 60 },

    hero: { padding: Spacing.xxl, paddingTop: Spacing.xxxl, alignItems: "center", position: "relative", overflow: "hidden" },
    heroBg: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(255,255,255,0.04)", top: -100, right: -80 },
    heroBadgeRow: { alignSelf: "flex-end" },
    activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primary + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.primary + "40" },
    activeBadgeText: { fontSize: 10, fontWeight: "900", color: Colors.primary, letterSpacing: 1 },
    proBadgeChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F59E0B20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: "#F59E0B40" },
    proBadgeChipText: { fontSize: 10, fontWeight: "900", color: "#F59E0B", letterSpacing: 1 },
    heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff", textAlign: "center", marginBottom: 6 },
    heroSub: { fontSize: Typography.sizes.sm, color: "rgba(255,255,255,0.7)", textAlign: "center" },
    heroStats: { flexDirection: "row", gap: Spacing.lg, marginTop: Spacing.xl },
    heroStat: { alignItems: "center" },
    heroStatVal: { fontSize: Typography.sizes.xl, fontWeight: "900", color: "#fff" },
    heroStatLabel: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: "600" },

    trustRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 0 },
    trustBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.background.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border.glass },
    trustLabel: { fontSize: 11, fontWeight: "700", color: Colors.text.muted },

    section: { padding: Spacing.lg, gap: Spacing.md },
    sectionTitle: { fontSize: Typography.sizes.xl, fontWeight: "900", color: Colors.text.dark },
    sectionSub: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: -Spacing.sm },

    featureCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.glass },
    featureCardLocked: { opacity: 0.85 },
    featureIconWrap: { width: 44, height: 44, borderRadius: BorderRadius.lg, justifyContent: "center", alignItems: "center", flexShrink: 0 },
    featureTitle: { fontSize: Typography.sizes.sm + 1, fontWeight: "800", color: Colors.text.dark, marginBottom: 2 },
    featureDesc: { fontSize: Typography.sizes.xs + 1, color: Colors.text.muted, lineHeight: 18 },
    lockBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#F59E0B20", justifyContent: "center", alignItems: "center" },

    trialCard: { borderRadius: BorderRadius.xl, overflow: "hidden" },
    trialGrad: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.lg, position: "relative" },
    trialBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    trialBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff", letterSpacing: 1 },
    trialTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: "#fff" },
    trialSub: { fontSize: Typography.sizes.xs, color: "rgba(255,255,255,0.75)", marginTop: 2 },

    planCard: { backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, flexDirection: "row", alignItems: "center", gap: Spacing.md, borderWidth: 1.5, borderColor: Colors.border.dark, position: "relative" },
    planCardSel: { borderColor: Colors.primary, backgroundColor: Colors.primary + "08" },
    planCardBest: { marginTop: 4 },
    bestBadge: { position: "absolute", top: -10, right: Spacing.lg, backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: BorderRadius.full },
    bestBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff", letterSpacing: 0.8 },
    planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border.dark, justifyContent: "center", alignItems: "center" },
    planRadioSel: { borderColor: Colors.primary },
    planRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
    planName: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    planNote: { fontSize: Typography.sizes.xs, color: Colors.text.muted, marginTop: 2 },
    planPrice: { fontSize: Typography.sizes.xl, fontWeight: "900", color: Colors.text.dark },
    planPer: { fontSize: Typography.sizes.sm, fontWeight: "500", color: Colors.text.muted },

    subBtn: { borderRadius: BorderRadius.xl, overflow: "hidden", ...Shadows.md, shadowColor: Colors.primary },
    subBtnGrad: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
    subBtnText: { color: "#fff", fontSize: Typography.sizes.md + 1, fontWeight: "900", flex: 1, textAlign: "center", marginLeft: -30 },
    legalText: { fontSize: Typography.sizes.xs, color: Colors.text.muted, textAlign: "center", lineHeight: 18 },

    proManage: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: Colors.primary + "10", borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + "25" },
    proManageTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.primary },
    proManageSub: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 2 },
    cancelBtn: { paddingVertical: Spacing.md, alignItems: "center" },
    cancelBtnText: { fontSize: Typography.sizes.sm, color: Colors.text.muted, fontWeight: "600", textDecorationLine: "underline" },

    guaranteeCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, margin: Spacing.lg, marginTop: 0, backgroundColor: Colors.primary + "08", borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + "20" },
    guaranteeTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    guaranteeSub: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 2 },
});
