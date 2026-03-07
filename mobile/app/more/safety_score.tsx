/**
 * Hazirlik Skoru - Gamification ile depreme hazirlik kontrol listesi
 * Dairesel ilerleme gostergesi + checklist + puan sistemi
 */

import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const CHECKLIST_KEY = "quakesense_safety_checklist";

interface CheckItem {
    id: string;
    label: string;
    desc: string;
    icon: string;
    points: number;
    category: string;
    color: string;
}

const CHECKLIST: CheckItem[] = [
    {
        id: "bag",
        label: "Deprem çantam hazır",
        desc: "Su, ilaç, el feneri, düdük, ilk yardım malzemeleri",
        icon: "bag-personal",
        points: 15,
        category: "Temel Hazırlık",
        color: Colors.primary,
    },
    {
        id: "firstaid",
        label: "İlk yardım çantam var",
        desc: "Bandaj, antiseptik, ağrı kesici, reçeteli ilaçlar",
        icon: "medical-bag",
        points: 10,
        category: "Temel Hazırlık",
        color: Colors.primary,
    },
    {
        id: "water",
        label: "3 günlük su stoğum var",
        desc: "Kişi başı günde en az 3 litre",
        icon: "water",
        points: 10,
        category: "Temel Hazırlık",
        color: Colors.status.info,
    },
    {
        id: "food",
        label: "Acil gıda stoğum var",
        desc: "Konserve, kuru gıda, enerji barı gibi uzun ömürlü ürünler",
        icon: "food-variant",
        points: 10,
        category: "Temel Hazırlık",
        color: Colors.status.info,
    },
    {
        id: "meeting",
        label: "Aile buluşma noktam belli",
        desc: "Konut dışında bir buluşma yeri belirleyin",
        icon: "map-marker-check",
        points: 15,
        category: "Aile Planı",
        color: Colors.accent,
    },
    {
        id: "contacts",
        label: "Acil kişilerim uygulamada kayıtlı",
        desc: "Güvenlik ağına en az 2 kişi ekleyin",
        icon: "account-multiple-check",
        points: 10,
        category: "Aile Planı",
        color: Colors.accent,
    },
    {
        id: "flashlight",
        label: "El feneri ve pil var",
        desc: "Şarjlı veya pilleli yedek el feneri",
        icon: "flashlight",
        points: 5,
        category: "Ekipman",
        color: "#ca8a04",
    },
    {
        id: "documents",
        label: "Önemli belgeler hazır",
        desc: "Kimlik, pasaport, tapu, sigorta poliçesi kopyaları",
        icon: "file-document-multiple",
        points: 5,
        category: "Ekipman",
        color: "#ca8a04",
    },
    {
        id: "insurance",
        label: "DASK sigortam var",
        desc: "Zorunlu Deprem Sigorta Poliçesi aktif",
        icon: "shield-home",
        points: 10,
        category: "Sigorta & Hukuk",
        color: Colors.status.info,
    },
    {
        id: "drill",
        label: "Deprem tatbikatı yaptım",
        desc: "Aile ile tatbikat yapın, çıkış rotalarını planlayın",
        icon: "alarm-light",
        points: 10,
        category: "Eğitim",
        color: Colors.danger,
    },
];

const TOTAL_POINTS = CHECKLIST.reduce((sum, item) => sum + item.points, 0);

// Progress Ring (no-SVG approach using two rotating half-circles)
function ProgressRing({ score, size = 150 }: { score: number; size?: number }) {
    const strokeWidth = 14;
    const halfSize = size / 2;
    const progress = Math.min(Math.max(score, 0), 100) / 100;
    const color = score >= 70 ? Colors.primary : score >= 40 ? Colors.accent : Colors.danger;

    // Right half rotation: -180deg at 0%, 0deg at 50%
    const rotateRight = Math.min(progress * 2, 1) * 180 - 180;
    // Left half rotation: -180deg at 50%, 0deg at 100%
    const rotateLeft = Math.max(progress * 2 - 1, 0) * 180 - 180;

    const circleBase = {
        position: "absolute" as const,
        width: size,
        height: size,
        borderRadius: halfSize,
        borderWidth: strokeWidth,
    };

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            {/* Track */}
            <View style={[circleBase, { borderColor: Colors.background.elevated }]} />

            {/* Right half (0–50%) */}
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: halfSize,
                    width: halfSize,
                    height: size,
                    overflow: "hidden",
                }}
            >
                <View
                    style={[
                        circleBase,
                        {
                            left: -halfSize,
                            borderColor: progress > 0 ? color : "transparent",
                            transform: [{ rotate: `${rotateRight}deg` }],
                        },
                    ]}
                />
            </View>

            {/* Left half (50–100%) */}
            <View
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: halfSize,
                    height: size,
                    overflow: "hidden",
                }}
            >
                <View
                    style={[
                        circleBase,
                        {
                            left: 0,
                            borderColor: progress > 0.5 ? color : "transparent",
                            transform: [{ rotate: `${rotateLeft}deg` }],
                        },
                    ]}
                />
            </View>

            {/* Center label */}
            <View
                style={{
                    width: size - strokeWidth * 2 - 10,
                    height: size - strokeWidth * 2 - 10,
                    borderRadius: (size - strokeWidth * 2 - 10) / 2,
                    backgroundColor: Colors.background.dark,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Text style={{ fontSize: 30, fontWeight: "900", color }}>{score}</Text>
                <Text style={{ fontSize: 9, color: Colors.text.muted, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase" }}>
                    PUAN
                </Text>
            </View>
        </View>
    );
}

function getScoreLabel(score: number) {
    if (score >= 80) return { label: "Hazır!", color: Colors.primary, icon: "shield-check" };
    if (score >= 60) return { label: "İyi Gidiyorsun", color: "#ca8a04", icon: "shield-half-full" };
    if (score >= 40) return { label: "Geliştirebilirsin", color: Colors.accent, icon: "shield-outline" };
    return { label: "Hazırlığa Başla", color: Colors.danger, icon: "shield-off-outline" };
}

export default function SafetyScoreScreen() {
    const [checked, setChecked] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const loadChecklist = useCallback(async () => {
        try {
            const stored = await SecureStore.getItemAsync(CHECKLIST_KEY);
            if (stored) setChecked(new Set(JSON.parse(stored)));
        } catch {
            // empty
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadChecklist(); }, [loadChecklist]);

    async function toggleItem(id: string) {
        const newChecked = new Set(checked);
        if (newChecked.has(id)) {
            newChecked.delete(id);
        } else {
            newChecked.add(id);
        }
        setChecked(newChecked);
        try {
            await SecureStore.setItemAsync(CHECKLIST_KEY, JSON.stringify([...newChecked]));
        } catch { /* ignore */ }
    }

    const earnedPoints = CHECKLIST.filter((item) => checked.has(item.id)).reduce((sum, item) => sum + item.points, 0);
    const score = Math.round((earnedPoints / TOTAL_POINTS) * 100);
    const scoreInfo = getScoreLabel(score);

    // Group by category
    const categories = [...new Set(CHECKLIST.map((i) => i.category))];

    if (loading) return null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hazırlık Skorun</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Score Hero */}
                <View style={styles.scoreHero}>
                    <ProgressRing score={score} size={160} />

                    <View style={[styles.scoreBadge, { borderColor: scoreInfo.color + "40", backgroundColor: scoreInfo.color + "10" }]}>
                        <MaterialCommunityIcons name={scoreInfo.icon as any} size={16} color={scoreInfo.color} />
                        <Text style={[styles.scoreBadgeText, { color: scoreInfo.color }]}>{scoreInfo.label}</Text>
                    </View>

                    <Text style={styles.scoreSubtext}>
                        {checked.size} / {CHECKLIST.length} görev tamamlandı · {earnedPoints}/{TOTAL_POINTS} puan
                    </Text>

                    {/* Progress bar */}
                    <View style={styles.progressBarWrap}>
                        <View style={styles.progressBarTrack}>
                            <View style={[styles.progressBarFill, {
                                width: `${score}%` as any,
                                backgroundColor: scoreInfo.color,
                            }]} />
                        </View>
                        <Text style={[styles.progressPct, { color: scoreInfo.color }]}>{score}%</Text>
                    </View>
                </View>

                {/* Checklist by category */}
                {categories.map((cat) => {
                    const catItems = CHECKLIST.filter((i) => i.category === cat);
                    const catChecked = catItems.filter((i) => checked.has(i.id)).length;

                    return (
                        <View key={cat} style={styles.categorySection}>
                            <View style={styles.catHeader}>
                                <Text style={styles.catTitle}>{cat}</Text>
                                <Text style={styles.catProgress}>{catChecked}/{catItems.length}</Text>
                            </View>

                            {catItems.map((item) => {
                                const isChecked = checked.has(item.id);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.checkCard,
                                            isChecked && { borderColor: item.color + "40", backgroundColor: item.color + "05" },
                                        ]}
                                        onPress={() => toggleItem(item.id)}
                                        activeOpacity={0.7}
                                    >
                                        {/* Checkbox */}
                                        <View
                                            style={[
                                                styles.checkbox,
                                                isChecked
                                                    ? { backgroundColor: item.color, borderColor: item.color }
                                                    : { borderColor: Colors.border.dark },
                                            ]}
                                        >
                                            {isChecked && (
                                                <MaterialCommunityIcons name="check" size={14} color="#fff" />
                                            )}
                                        </View>

                                        {/* Icon */}
                                        <View style={[styles.itemIcon, { backgroundColor: isChecked ? item.color + "15" : Colors.background.elevated }]}>
                                            <MaterialCommunityIcons
                                                name={item.icon as any}
                                                size={20}
                                                color={isChecked ? item.color : Colors.text.muted}
                                            />
                                        </View>

                                        {/* Text */}
                                        <View style={styles.itemText}>
                                            <Text style={[styles.itemLabel, isChecked && { color: Colors.text.dark, textDecorationLine: "none" }]}>
                                                {item.label}
                                            </Text>
                                            <Text style={styles.itemDesc} numberOfLines={1}>{item.desc}</Text>
                                        </View>

                                        {/* Points */}
                                        <View style={[styles.pointsBadge, { backgroundColor: isChecked ? item.color : Colors.background.elevated }]}>
                                            <Text style={[styles.pointsText, { color: isChecked ? "#fff" : Colors.text.muted }]}>
                                                +{item.points}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    );
                })}

                {/* Tips */}
                <View style={styles.tipCard}>
                    <View style={styles.tipHeader}>
                        <MaterialCommunityIcons name="lightbulb-on" size={18} color={Colors.accent} />
                        <Text style={styles.tipTitle}>İpucu</Text>
                    </View>
                    <Text style={styles.tipText}>
                        Deprem çantanızı 6 ayda bir kontrol edin. Su stoğu ve ilaçların son kullanma tarihlerini güncelleyin.
                    </Text>
                </View>

                <View style={{ height: Spacing.xxl }} />
            </ScrollView>
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
        paddingTop: 54,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
    },

    content: { padding: Spacing.md },

    // Score Hero
    scoreHero: {
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
        gap: Spacing.md,
    },
    scoreBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    scoreBadgeText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
    },
    scoreSubtext: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "600",
        textAlign: "center",
    },
    progressBarWrap: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    progressBarTrack: {
        flex: 1,
        height: 6,
        backgroundColor: Colors.background.elevated,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: 6,
        borderRadius: 3,
    },
    progressPct: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        width: 36,
        textAlign: "right",
    },

    // Category
    categorySection: { marginBottom: Spacing.xl },
    catHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.sm,
        paddingHorizontal: 4,
    },
    catTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    catProgress: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.muted,
    },

    checkCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    itemIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    itemText: { flex: 1 },
    itemLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.dark,
        marginBottom: 2,
    },
    itemDesc: {
        fontSize: 11,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    pointsBadge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8,
        paddingVertical: 3,
        minWidth: 32,
        alignItems: "center",
    },
    pointsText: {
        fontSize: 11,
        fontWeight: "900",
    },

    // Tip
    tipCard: {
        backgroundColor: Colors.accent + "10",
        borderWidth: 1,
        borderColor: Colors.accent + "30",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
    },
    tipHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: Spacing.xs,
    },
    tipTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.accent,
    },
    tipText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 20,
        fontWeight: "600",
    },
});
