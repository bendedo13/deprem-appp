/**
 * Professional Onboarding - Hos Geldin + Izin Talepleri
 * 4 slaytli karsilama ekrani + izin adimlari
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
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

const ONBOARDING_KEY = "onboarding_complete";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

interface Slide {
    id: string;
    type: "welcome" | "permission";
    icon: string;
    iconColor: string;
    iconBg: string;
    accentColor: string;
    badge: string;
    title: string;
    description: string;
    buttonText: string;
    skipText: string;
    metric?: { value: string; label: string };
    permissionId?: "location" | "notifications" | "sensor";
    stats?: Array<{ value: string; label: string }>;
}

const SLIDES: Slide[] = [
    {
        id: "welcome",
        type: "welcome",
        icon: "shield-check",
        iconColor: Colors.primary,
        iconBg: "rgba(16, 185, 129, 0.12)",
        accentColor: Colors.primary,
        badge: "Yapay Zeka Destekli",
        title: "QuakeSense'e\nHoş Geldiniz",
        description:
            "Türkiye'nin en gelişmiş deprem erken uyarı sistemi. Hayatınızı ve sevdiklerinizi korumak için buradayız.",
        buttonText: "Keşfet",
        skipText: "Atla",
        stats: [
            { value: "0.3s", label: "Uyarı Hızı" },
            { value: "3", label: "Resmi Kaynak" },
            { value: "%99.7", label: "Doğruluk" },
        ],
    },
    {
        id: "earlywarning",
        type: "welcome",
        icon: "broadcast",
        iconColor: Colors.accent,
        iconBg: "rgba(249, 115, 22, 0.12)",
        accentColor: Colors.accent,
        badge: "Erken Uyarı Sistemi",
        title: "Yıkıcı Dalgadan\nÖnce Uyarılın",
        description:
            "Telefonunuzun sensörleri ile P-dalgasını tespit ederiz. Yıkıcı S-dalgası gelmeden saniyeler önce sizi uyararak tahliye sürenizi artırırız.",
        buttonText: "Devam Et",
        skipText: "Atla",
        metric: { value: "8-12s", label: "Tahliye Süresi Kazanımı" },
    },
    {
        id: "datasources",
        type: "welcome",
        icon: "database-check",
        iconColor: Colors.status.info,
        iconBg: "rgba(59, 130, 246, 0.12)",
        accentColor: Colors.status.info,
        badge: "Resmi Veri Kaynakları",
        title: "Güvenilir\nResmi Veriler",
        description:
            "AFAD, Kandilli Rasathanesi ve USGS'den anlık veri alıyoruz. Hiçbir şey doğrulanmadan size ulaşmıyor.",
        buttonText: "Harika!",
        skipText: "Atla",
        stats: [
            { value: "AFAD", label: "T.C. Resmi" },
            { value: "KRİBO", label: "Kandilli" },
            { value: "USGS", label: "Uluslararası" },
        ],
    },
    {
        id: "location",
        type: "permission",
        permissionId: "location",
        icon: "crosshairs-gps",
        iconColor: Colors.primary,
        iconBg: "rgba(16, 185, 129, 0.12)",
        accentColor: Colors.primary,
        badge: "Gerekli İzin",
        title: "Hassas Konum\nErişimi",
        description:
            "Konumunuza en yakın depremleri filtreleyerek gereksiz bildirimleri engelliyoruz. Aile güvenlik ağınız için de konum şart.",
        buttonText: "Konumu Etkinleştir",
        skipText: "Şimdi Değil",
        metric: { value: "<2km", label: "Konum Hassasiyeti" },
    },
];

export default function OnboardingScreen() {
    const { width, height } = useWindowDimensions(); // Responsive: ekran boyutu değişince yeniden render
    const [currentStep, setCurrentStep] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    async function handleAction() {
        const slide = SLIDES[currentStep];

        if (slide.type === "permission") {
            if (slide.permissionId === "location") {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== "granted") {
                    Alert.alert(
                        "Konum İzni",
                        "Konum izni olmadan yakın deprem uyarıları alınamaz. Ayarlardan açabilirsiniz.",
                        [
                            { text: "Tamam", onPress: () => finishAndRequestNotifications() },
                        ]
                    );
                    return;
                }
                finishAndRequestNotifications();
                return;
            }
        }

        goNext();
    }

    async function finishAndRequestNotifications() {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Bildirim İzni", "Deprem bildirimlerini almak için izin gereklidir.");
        }
        await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
        router.replace("/(auth)/login");
    }

    async function goNext() {
        if (currentStep < SLIDES.length - 1) {
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();

            const next = currentStep + 1;
            setCurrentStep(next);
            flatListRef.current?.scrollToIndex({ index: next, animated: true });
        } else {
            await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
            router.replace("/(auth)/login");
        }
    }

    function renderSlide({ item }: { item: Slide }) {
        return (
            <View style={[styles.slide, { width }]}>
                <View style={styles.slideContent}>
                    {/* Icon Container */}
                    <View style={[styles.iconOuter, { backgroundColor: item.iconBg }]}>
                        <View style={[styles.iconInner, { borderColor: item.iconColor + "30", backgroundColor: item.iconBg }]}>
                            <MaterialCommunityIcons name={item.icon as any} size={52} color={item.iconColor} />
                        </View>
                        {/* Pulse ring */}
                        <View style={[styles.iconPulse, { borderColor: item.iconColor + "15" }]} />
                    </View>

                    {/* Badge */}
                    <View style={[styles.badge, { borderColor: item.accentColor + "40", backgroundColor: item.accentColor + "10" }]}>
                        <View style={[styles.badgeDot, { backgroundColor: item.accentColor }]} />
                        <Text style={[styles.badgeText, { color: item.accentColor }]}>{item.badge}</Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{item.title}</Text>

                    {/* Description */}
                    <Text style={styles.description}>{item.description}</Text>

                    {/* Metric or Stats */}
                    {item.metric && (
                        <View style={[styles.metricCard, { borderColor: item.accentColor + "30" }]}>
                            <Text style={[styles.metricValue, { color: item.accentColor }]}>{item.metric.value}</Text>
                            <Text style={styles.metricLabel}>{item.metric.label}</Text>
                        </View>
                    )}

                    {item.stats && (
                        <View style={styles.statsRow}>
                            {item.stats.map((stat, i) => (
                                <View key={i} style={[styles.statItem, { borderColor: item.accentColor + "25" }]}>
                                    <Text style={[styles.statValue, { color: item.accentColor }]}>{stat.value}</Text>
                                    <Text style={styles.statLabel}>{stat.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        );
    }

    const currentSlide = SLIDES[currentStep];

    return (
        <View style={styles.container}>
            {/* Header: Progress + Skip */}
            <View style={styles.topBar}>
                <View style={styles.progressBar}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressSegment,
                                {
                                    backgroundColor: i <= currentStep ? currentSlide.accentColor : Colors.background.elevated,
                                    flex: 1,
                                },
                            ]}
                        />
                    ))}
                </View>
                <TouchableOpacity onPress={async () => { await SecureStore.setItemAsync(ONBOARDING_KEY, "true"); router.replace("/(auth)/login"); }} style={styles.skipTopBtn}>
                    <Text style={styles.skipTopText}>Geç</Text>
                </TouchableOpacity>
            </View>

            {/* Slides */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    scrollEnabled={false}
                    showsHorizontalScrollIndicator={false}
                    getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
                />
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
                {/* Dot indicators */}
                <View style={styles.dots}>
                    {SLIDES.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                i === currentStep
                                    ? [styles.dotActive, { backgroundColor: currentSlide.accentColor, width: 24 }]
                                    : { backgroundColor: Colors.background.elevated },
                            ]}
                        />
                    ))}
                </View>

                {/* Primary Button */}
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: currentSlide.accentColor }]}
                    onPress={handleAction}
                    activeOpacity={0.88}
                >
                    <MaterialCommunityIcons name={currentSlide.icon as any} size={20} color="#fff" />
                    <Text style={styles.primaryBtnText}>{currentSlide.buttonText}</Text>
                    <MaterialCommunityIcons name="arrow-right" size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                {/* Secondary / Skip */}
                <TouchableOpacity onPress={goNext} style={styles.skipBtn} activeOpacity={0.7}>
                    <Text style={styles.skipBtnText}>{currentSlide.skipText}</Text>
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

    // Top bar
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
    progressSegment: {
        height: 3,
        borderRadius: 2,
    },
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

    // Slide
    slide: {
        flex: 1,
        justifyContent: "center",
    },
    slideContent: {
        paddingHorizontal: Spacing.xl,
        alignItems: "center",
        paddingBottom: Spacing.lg,
    },

    // Icon
    iconOuter: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.xl,
        position: "relative",
    },
    iconInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    iconPulse: {
        position: "absolute",
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 1,
    },

    // Badge
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

    // Text
    title: {
        fontSize: 28,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        letterSpacing: -0.5,
        lineHeight: 36,
        marginBottom: Spacing.md,
    },
    description: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 25,
        maxWidth: 340,
        marginBottom: Spacing.xl,
    },

    // Metric
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
        fontSize: Typography.sizes.xxxl,
        fontWeight: "900",
        letterSpacing: -1,
    },
    metricLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 4,
    },

    // Stats
    statsRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    statItem: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
    },
    statValue: {
        fontSize: Typography.sizes.lg,
        fontWeight: "900",
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 2,
    },

    // Footer
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
    dot: {
        height: 6,
        width: 6,
        borderRadius: 3,
    },
    dotActive: {
        height: 6,
        borderRadius: 3,
    },
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
    skipBtn: {
        paddingVertical: Spacing.xs,
    },
    skipBtnText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "600",
    },
});
