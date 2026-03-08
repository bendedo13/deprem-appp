/**
 * Onboarding — Karşılama + 4 Kritik İzin Kartı (UX/Settings)
 * İzin Ver → ilgili sistem ayarına yönlendirir. Eksik izinle ana ekrana geçiş uyarı ile kısıtlanır.
 */

import { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    Platform,
    Animated,
    useWindowDimensions,
    Linking,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import {
    openPermissionSystemScreen,
    hasCriticalPermissionsForWarning,
    type PermissionId,
} from "../../src/services/permissionService";

const ONBOARDING_KEY = "onboarding_complete";

interface PermissionSlide {
    id: string;
    permissionId: PermissionId;
    icon: string;
    iconColor: string;
    iconBg: string;
    badge: string;
    title: string;
    description: string;
    buttonText: string;
    metric?: { value: string; label: string };
}

const PERMISSION_SLIDES: PermissionSlide[] = [
    {
        id: "location",
        permissionId: "location_always",
        icon: "crosshairs-gps",
        iconColor: Colors.primary,
        iconBg: "rgba(16, 185, 129, 0.12)",
        badge: "Kritik İzin",
        title: "Konum İzni\n(Her Zaman)",
        description:
            "Arka planda konum takibi ile deprem anında acil kişilerinize konumunuz iletilsin. Yakın deprem uyarıları için gereklidir.",
        buttonText: "İzin Ver",
        metric: { value: "Arka plan", label: "Sürekli konum" },
    },
    {
        id: "battery",
        permissionId: "battery_optimization",
        icon: "battery-charging",
        iconColor: "#F59E0B",
        iconBg: "rgba(245, 158, 11, 0.12)",
        badge: "Android",
        title: "Pil Optimizasyonunu\nDevre Dışı Bırak",
        description:
            "Uygulamanın uyutulmaması için pil optimizasyonundan QuakeSense'i çıkarın. Deprem anında kesintisiz uyarı alırsınız.",
        buttonText: "Ayarları Aç",
        metric: { value: "7/24", label: "Kesintisiz koruma" },
    },
    {
        id: "sensor",
        permissionId: "sensor_activity",
        icon: "motion-sensor",
        iconColor: Colors.status.info,
        iconBg: "rgba(59, 130, 246, 0.12)",
        badge: "Sensör",
        title: "Fiziksel Aktivite / Sensör",
        description:
            "İvmeölçer verisi için hareket/aktivite izni. Erken uyarı sensörü bu veriyle çalışır.",
        buttonText: "Ayarları Aç",
        metric: { value: "İvmeölçer", label: "STA/LTA algılama" },
    },
    {
        id: "notification",
        permissionId: "critical_notification",
        icon: "bell-ring",
        iconColor: Colors.danger,
        iconBg: "rgba(220, 38, 38, 0.12)",
        badge: "Kritik Bildirim",
        title: "Öncelikli / Kritik Bildirim",
        description:
            "Rahatsız Etmeyin modunu delmek için bildirim izni gerekir. Deprem uyarısı sessizde bile çalar.",
        buttonText: "İzin Ver",
        metric: { value: "DND bypass", label: "Tam ses" },
    },
];

const WELCOME_SLIDES = [
    {
        id: "welcome",
        type: "welcome" as const,
        icon: "shield-check",
        iconColor: Colors.primary,
        iconBg: "rgba(16, 185, 129, 0.12)",
        badge: "Yapay Zeka Destekli",
        title: "QuakeSense'e\nHoş Geldiniz",
        description:
            "Türkiye'nin deprem erken uyarı sistemi. Hayatınızı ve sevdiklerinizi korumak için 4 kritik izni verin.",
        buttonText: "Başla",
        skipText: "Atla",
        stats: [
            { value: "0.3s", label: "Uyarı Hızı" },
            { value: "4", label: "Kritik İzin" },
            { value: "%99.7", label: "Doğruluk" },
        ],
    },
];

type SlideItem =
    | (typeof WELCOME_SLIDES)[0]
    | (PermissionSlide & { type: "permission" });

const ALL_SLIDES: SlideItem[] = [
    ...WELCOME_SLIDES,
    ...PERMISSION_SLIDES.map((s) => ({ ...s, type: "permission" as const })),
];

export default function OnboardingScreen() {
    const { width, height } = useWindowDimensions();
    const isSmallScreen = height < 700;
    const iconSize = isSmallScreen ? 100 : 128;
    const [currentStep, setCurrentStep] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    async function finishOnboarding() {
        const { ok, missing } = await hasCriticalPermissionsForWarning();
        if (!ok && missing.length > 0) {
            Alert.alert(
                "Önerilen İzinler Verilmedi",
                `Şu izinler henüz verilmedi: ${missing.join(", ")}. Ana ekrana geçmek istiyor musunuz?`,
                [
                    { text: "Yine de Devam Et", onPress: () => saveAndGoToLogin() },
                    { text: "Ayarlara Git", onPress: () => Linking.openSettings() },
                ]
            );
            return;
        }
        await saveAndGoToLogin();
    }

    async function saveAndGoToLogin() {
        await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
        router.replace("/(auth)/login");
    }

    async function handlePrimaryButton() {
        const slide = ALL_SLIDES[currentStep];
        if ("type" in slide && slide.type === "permission") {
            await openPermissionSystemScreen(slide.permissionId);
            if (currentStep >= ALL_SLIDES.length - 1) {
                finishOnboarding();
            } else {
                goNext();
            }
            return;
        }
        goNext();
    }

    function goNext() {
        if (currentStep < ALL_SLIDES.length - 1) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
            const next = currentStep + 1;
            setCurrentStep(next);
            flatListRef.current?.scrollToIndex({ index: next, animated: true });
        } else {
            finishOnboarding();
        }
    }

    function renderSlide({ item }: { item: SlideItem }) {
        const isWelcome = "type" in item && item.type === "welcome";
        const isPermission = "type" in item && item.type === "permission";
        const permSlide = isPermission ? (item as PermissionSlide & { type: "permission" }) : null;

        return (
            <View style={[styles.slide, { width }]}>
                <View style={styles.slideContent}>
                    <View
                        style={[
                            styles.iconOuter,
                            {
                                backgroundColor: item.iconBg,
                                width: iconSize,
                                height: iconSize,
                                borderRadius: iconSize / 2,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.iconInner,
                                {
                                    borderColor: item.iconColor + "40",
                                    backgroundColor: item.iconBg,
                                    width: iconSize * 0.7,
                                    height: iconSize * 0.7,
                                    borderRadius: iconSize * 0.35,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name={item.icon as "shield-check"}
                                size={iconSize * 0.4}
                                color={item.iconColor}
                            />
                        </View>
                    </View>

                    <View
                        style={[
                            styles.badge,
                            {
                                borderColor: item.iconColor + "40",
                                backgroundColor: item.iconColor + "12",
                            },
                        ]}
                    >
                        <View style={[styles.badgeDot, { backgroundColor: item.iconColor }]} />
                        <Text style={[styles.badgeText, { color: item.iconColor }]}>{item.badge}</Text>
                    </View>

                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>

                    {permSlide?.metric && (
                        <View style={[styles.metricCard, { borderColor: item.iconColor + "30" }]}>
                            <Text style={[styles.metricValue, { color: item.iconColor }]}>
                                {permSlide.metric.value}
                            </Text>
                            <Text style={styles.metricLabel}>{permSlide.metric.label}</Text>
                        </View>
                    )}

                    {isWelcome && "stats" in item && item.stats && (
                        <View style={styles.statsRow}>
                            {item.stats.map((stat: { value: string; label: string }, i: number) => (
                                <View
                                    key={i}
                                    style={[styles.statItem, { borderColor: item.iconColor + "25" }]}
                                >
                                    <Text style={[styles.statValue, { color: item.iconColor }]}>
                                        {stat.value}
                                    </Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    }

    const currentSlide = ALL_SLIDES[currentStep];
    const accentColor = currentSlide.iconColor;
    const isLastStep = currentStep === ALL_SLIDES.length - 1;
    const isPermissionStep = "type" in currentSlide && currentSlide.type === "permission";

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View style={styles.progressBar}>
                    {ALL_SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressSegment,
                                {
                                    backgroundColor: i <= currentStep ? accentColor : Colors.background.elevated,
                                    flex: 1,
                                },
                            ]}
                        />
                    ))}
                </View>
                <TouchableOpacity onPress={finishOnboarding} style={styles.skipTopBtn}>
                    <Text style={styles.skipTopText}>Geç</Text>
                </TouchableOpacity>
            </View>

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                    ref={flatListRef}
                    data={ALL_SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                />
            </Animated.View>

            <View style={styles.footer}>
                <View style={styles.dots}>
                    {ALL_SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === currentStep
                                    ? [styles.dotActive, { backgroundColor: accentColor, width: 24 }]
                                    : { backgroundColor: Colors.background.elevated },
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                    onPress={handlePrimaryButton}
                    activeOpacity={0.88}
                >
                    <MaterialCommunityIcons name={currentSlide.icon as "shield-check"} size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>
                        {isPermissionStep ? "İzin Ver" : currentSlide.buttonText}
                    </Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                <TouchableOpacity onPress={goNext} style={styles.skipBtn} activeOpacity={0.7}>
                    <Text style={styles.skipBtnText}>
                        {isLastStep ? "Bitir" : "Atla"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        paddingTop: Platform.OS === "android" ? 44 : 54,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.lg,
        gap: Spacing.md,
    },
    progressBar: {
        flex: 1,
        flexDirection: "row",
        gap: 6,
        height: 3,
    },
    progressSegment: { height: 3, borderRadius: 2 },
    skipTopBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    skipTopText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
    },
    slide: { flex: 1, justifyContent: "center" },
    slideContent: {
        paddingHorizontal: Spacing.xl,
        alignItems: "center",
        paddingBottom: Spacing.lg,
    },
    iconOuter: {
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    iconInner: {
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginBottom: Spacing.lg,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 1.2,
    },
    title: {
        fontSize: 26,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        lineHeight: 34,
        marginBottom: Spacing.md,
    },
    description: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 24,
        maxWidth: 340,
        marginBottom: Spacing.xl,
    },
    metricCard: {
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xxl,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        alignItems: "center",
        marginBottom: Spacing.sm,
    },
    metricValue: {
        fontSize: Typography.sizes.xl,
        fontWeight: "900",
    },
    metricLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 4,
    },
    statsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
    statItem: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
    },
    statValue: { fontSize: Typography.sizes.lg, fontWeight: "900" },
    statLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 2,
    },
    footer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Platform.OS === "android" ? Spacing.xxl : Spacing.xxxl,
        gap: Spacing.md,
        alignItems: "center",
    },
    dots: {
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        marginBottom: Spacing.sm,
    },
    dot: { height: 6, width: 6, borderRadius: 3 },
    dotActive: { height: 6, borderRadius: 3 },
    primaryBtn: {
        width: "100%",
        borderRadius: BorderRadius.xl,
        height: 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        ...Shadows.md,
    },
    primaryBtnText: {
        color: "#fff",
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        flex: 1,
        textAlign: "center",
        marginLeft: -28,
    },
    skipBtn: { paddingVertical: Spacing.xs },
    skipBtnText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "600",
    },
});
