/**
 * Hazırlık Skoru — Gamification ile kullanıcı etkileşimini artıran checklist.
 * %0–100 arası deprem hazırlık skoru hesaplar.
 * Dairesel progress ring ile ana ekranda da gösterilir.
 */

import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import ProgressRing from "../../src/components/ProgressRing";

const SCORE_STORAGE_KEY = "quakesense_preparedness";

interface ChecklistItem {
    id: string;
    icon: string;
    iconColor: string;
    title: string;
    description: string;
    points: number;
    category: "essentials" | "plan" | "knowledge" | "digital";
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
    // Essentials (Temel Gereksinimler)
    {
        id: "bag",
        icon: "bag-personal",
        iconColor: Colors.accent,
        title: "Deprem çantası hazır",
        description: "72 saatlik temel ihtiyaç malzemeleri (su, yiyecek, fener, düdük, ilaçlar)",
        points: 15,
        category: "essentials",
    },
    {
        id: "water",
        icon: "water",
        iconColor: Colors.status.info,
        title: "Yeterli su stoku var",
        description: "Kişi başı günlük 4 litre, en az 3 günlük su depolanmış",
        points: 10,
        category: "essentials",
    },
    {
        id: "firstaid",
        icon: "medical-bag",
        iconColor: Colors.danger,
        title: "İlk yardım çantası hazır",
        description: "Sargı bezi, antiseptik, ağrı kesici, kişisel ilaçlar",
        points: 10,
        category: "essentials",
    },
    {
        id: "flashlight",
        icon: "flashlight",
        iconColor: "#eab308",
        title: "Fener ve yedek pil var",
        description: "Elektrik kesintisine karşı en az 2 adet fener ve yedek piller",
        points: 5,
        category: "essentials",
    },

    // Plan (Acil Durum Planı)
    {
        id: "meeting_point",
        icon: "map-marker-check",
        iconColor: Colors.primary,
        title: "Buluşma noktası belirlendi",
        description: "Aile ile deprem sonrası toplanma noktası kararlaştırıldı",
        points: 15,
        category: "plan",
    },
    {
        id: "emergency_contacts",
        icon: "account-multiple",
        iconColor: Colors.status.info,
        title: "Acil durum kişileri eklendi",
        description: "Uygulamaya en az 2 acil durum kişisi tanımlandı",
        points: 10,
        category: "plan",
    },
    {
        id: "family_network",
        icon: "shield-account",
        iconColor: "#8b5cf6",
        title: "Güvenlik ağı kuruldu",
        description: "Aile üyeleri güvenlik ağına eklendi",
        points: 10,
        category: "plan",
    },
    {
        id: "evacuation",
        icon: "exit-run",
        iconColor: Colors.accent,
        title: "Tahliye planı yapıldı",
        description: "Ev ve iş yerinden güvenli çıkış rotaları belirlendi",
        points: 10,
        category: "plan",
    },

    // Knowledge (Bilgi)
    {
        id: "training",
        icon: "school",
        iconColor: Colors.status.info,
        title: "Deprem eğitimi alındı",
        description: "Çök-Kapan-Tutun tekniği ve ilk yardım bilgisi öğrenildi",
        points: 5,
        category: "knowledge",
    },
    {
        id: "gas_valve",
        icon: "gas-cylinder",
        iconColor: Colors.danger,
        title: "Doğalgaz vanası biliniyor",
        description: "Evin ana doğalgaz ve elektrik kesme noktaları biliniyor",
        points: 5,
        category: "knowledge",
    },

    // Digital (Dijital Hazırlık)
    {
        id: "notifications_on",
        icon: "bell-ring",
        iconColor: Colors.accent,
        title: "Bildirimler açık",
        description: "Uygulama bildirimleri ve deprem uyarıları aktif",
        points: 5,
        category: "digital",
    },
];

const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
    essentials: { label: "Temel Gereksinimler", icon: "package-variant", color: Colors.accent },
    plan: { label: "Acil Durum Planı", icon: "clipboard-check-outline", color: Colors.primary },
    knowledge: { label: "Bilgi ve Eğitim", icon: "head-lightbulb-outline", color: Colors.status.info },
    digital: { label: "Dijital Hazırlık", icon: "cellphone-check", color: "#8b5cf6" },
};

const MAX_POINTS = CHECKLIST_ITEMS.reduce((sum, item) => sum + item.points, 0);

function getScoreLevel(score: number): { label: string; color: string; emoji: string } {
    if (score >= 90) return { label: "Mükemmel", color: Colors.primary, emoji: "🏆" };
    if (score >= 70) return { label: "İyi", color: Colors.status.info, emoji: "👍" };
    if (score >= 40) return { label: "Orta", color: Colors.accent, emoji: "⚠️" };
    return { label: "Düşük", color: Colors.danger, emoji: "🔴" };
}

export default function PreparednessScoreScreen() {
    const [checked, setChecked] = useState<string[]>([]);

    useEffect(() => {
        loadChecked();
    }, []);

    const loadChecked = async () => {
        try {
            const raw = await AsyncStorage.getItem(SCORE_STORAGE_KEY);
            if (raw) setChecked(JSON.parse(raw));
        } catch {}
    };

    const toggleItem = useCallback(async (id: string) => {
        setChecked((prev) => {
            const updated = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id];
            AsyncStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    }, []);

    const totalPoints = CHECKLIST_ITEMS
        .filter((item) => checked.includes(item.id))
        .reduce((sum, item) => sum + item.points, 0);
    const scorePercent = Math.round((totalPoints / MAX_POINTS) * 100);
    const level = getScoreLevel(scorePercent);

    const categories = ["essentials", "plan", "knowledge", "digital"] as const;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Hazırlık Skoru</Text>
                    <Text style={styles.subtitle}>Deprem hazırlığınızı değerlendirin ve artırın</Text>
                </View>
            </View>

            {/* Score Card */}
            <View style={styles.scoreCard}>
                <ProgressRing
                    progress={scorePercent}
                    size={140}
                    strokeWidth={12}
                    color={level.color}
                    label="HAZIRLIK"
                />
                <View style={styles.scoreInfo}>
                    <View style={[styles.levelBadge, { backgroundColor: level.color + "15", borderColor: level.color + "30" }]}>
                        <Text style={[styles.levelText, { color: level.color }]}>
                            {level.label}
                        </Text>
                    </View>
                    <Text style={styles.scorePoints}>
                        {totalPoints} / {MAX_POINTS} puan
                    </Text>
                    <Text style={styles.scoreSub}>
                        {checked.length} / {CHECKLIST_ITEMS.length} görev tamamlandı
                    </Text>
                </View>
            </View>

            {/* Motivation Banner */}
            {scorePercent < 70 && (
                <View style={styles.motivationBanner}>
                    <MaterialCommunityIcons name="trending-up" size={20} color={Colors.accent} />
                    <Text style={styles.motivationText}>
                        {scorePercent < 30
                            ? "Deprem hazırlığınızı artırmak için aşağıdaki görevleri tamamlayın!"
                            : scorePercent < 50
                            ? "İyi gidiyorsunuz! Birkaç adım daha sizi güvende tutacak."
                            : "Neredeyse tamam! Son birkaç görev kaldı."}
                    </Text>
                </View>
            )}

            {/* Categories & Checklist */}
            {categories.map((cat) => {
                const catInfo = CATEGORY_INFO[cat];
                const catItems = CHECKLIST_ITEMS.filter((item) => item.category === cat);
                const catChecked = catItems.filter((item) => checked.includes(item.id)).length;

                return (
                    <View key={cat} style={styles.categorySection}>
                        <View style={styles.categoryHeader}>
                            <View style={[styles.categoryIcon, { backgroundColor: catInfo.color + "15" }]}>
                                <MaterialCommunityIcons name={catInfo.icon as any} size={18} color={catInfo.color} />
                            </View>
                            <Text style={styles.categoryTitle}>{catInfo.label}</Text>
                            <Text style={[styles.categoryCount, { color: catInfo.color }]}>
                                {catChecked}/{catItems.length}
                            </Text>
                        </View>

                        {catItems.map((item) => {
                            const isChecked = checked.includes(item.id);
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.checkItem, isChecked && styles.checkItemDone]}
                                    onPress={() => toggleItem(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.itemIcon,
                                            { backgroundColor: isChecked ? item.iconColor : Colors.background.dark },
                                        ]}
                                    >
                                        <MaterialCommunityIcons
                                            name={item.icon as any}
                                            size={22}
                                            color={isChecked ? "#fff" : Colors.text.muted}
                                        />
                                    </View>
                                    <View style={styles.itemText}>
                                        <Text style={[styles.itemTitle, isChecked && styles.itemTitleDone]}>
                                            {item.title}
                                        </Text>
                                        <Text style={styles.itemDesc}>{item.description}</Text>
                                        <View style={styles.pointsBadge}>
                                            <MaterialCommunityIcons name="star" size={10} color={Colors.accent} />
                                            <Text style={styles.pointsText}>+{item.points} puan</Text>
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons
                                        name={isChecked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                                        size={26}
                                        color={isChecked ? Colors.primary : Colors.border.dark}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                );
            })}

            {/* Footer Info */}
            <View style={styles.footerInfo}>
                <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
                <Text style={styles.footerText}>
                    Hazırlık skorunuz ana ekranda gösterilir. Görevleri tamamladıkça skorunuz artar ve deprem anında hayatta kalma şansınız yükselir.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.xl,
        marginTop: Spacing.lg,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    title: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.text.dark, letterSpacing: -0.5 },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    scoreCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        gap: Spacing.xl,
        ...Shadows.md,
    },
    scoreInfo: { flex: 1, gap: 8 },
    levelBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    levelText: { fontSize: Typography.sizes.sm, fontWeight: "800" },
    scorePoints: { fontSize: Typography.sizes.lg, fontWeight: "900", color: Colors.text.dark },
    scoreSub: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "600" },

    motivationBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: Colors.accent + "10",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.accent + "25",
    },
    motivationText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.accent, fontWeight: "600", lineHeight: 20 },

    categorySection: { marginBottom: Spacing.xl },
    categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    categoryIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    categoryTitle: { flex: 1, fontSize: Typography.sizes.sm, fontWeight: "800", color: Colors.text.dark, textTransform: "uppercase", letterSpacing: 0.5 },
    categoryCount: { fontSize: Typography.sizes.sm, fontWeight: "900" },

    checkItem: {
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
    checkItemDone: {
        borderColor: Colors.primary + "30",
        backgroundColor: Colors.primary + "05",
    },
    itemIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    itemText: { flex: 1, marginRight: Spacing.sm },
    itemTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    itemTitleDone: { color: Colors.primary },
    itemDesc: { fontSize: 11, color: Colors.text.muted, fontWeight: "500", marginTop: 2, lineHeight: 16 },
    pointsBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 4,
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.accent + "10",
    },
    pointsText: { fontSize: 10, fontWeight: "800", color: Colors.accent },

    footerInfo: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.md,
        backgroundColor: Colors.primary + "08",
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + "15",
    },
    footerText: { flex: 1, fontSize: 12, color: Colors.text.muted, lineHeight: 18, fontWeight: "600" },
});
