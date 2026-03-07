/**
 * Welcome Onboarding — İlk kez indiren kullanıcılar için 4 kaydırmalı karşılama ekranı.
 * Uygulamanın misyonunu, erken uyarı sistemini ve veri kaynaklarını anlatır.
 */

import { useState, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    FlatList,
    Platform,
    Animated,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const { width, height } = Dimensions.get("window");
const WELCOME_KEY = "quakesense_welcome_done";

export async function isWelcomeDone(): Promise<boolean> {
    try {
        return (await AsyncStorage.getItem(WELCOME_KEY)) === "true";
    } catch {
        return false;
    }
}

interface WelcomeSlide {
    id: string;
    icon: string;
    iconColor: string;
    bgGradientTop: string;
    title: string;
    subtitle: string;
    description: string;
    features: { icon: string; text: string }[];
}

const SLIDES: WelcomeSlide[] = [
    {
        id: "welcome",
        icon: "shield-check",
        iconColor: Colors.primary,
        bgGradientTop: Colors.primary + "08",
        title: "QuakeSense'e\nHoş Geldiniz",
        subtitle: "Hayat Kurtaran Erken Uyarı Sistemi",
        description:
            "Deprem anında saniyeler hayat kurtarır. QuakeSense, gelişmiş sensör teknolojisi ve yapay zeka ile sizi olası depremlerden önce uyarır.",
        features: [
            { icon: "lightning-bolt", text: "Saniyeler içinde erken uyarı" },
            { icon: "shield-lock", text: "7/24 kesintisiz koruma" },
            { icon: "earth", text: "Türkiye genelinde kapsama" },
        ],
    },
    {
        id: "technology",
        icon: "chip",
        iconColor: Colors.status.info,
        bgGradientTop: Colors.status.info + "08",
        title: "Gelişmiş Deprem\nAlgılama Teknolojisi",
        subtitle: "STA/LTA Sismik Analiz Algoritması",
        description:
            "Telefonunuzun ivmeölçer sensörü, profesyonel sismograflarda kullanılan STA/LTA algoritması ile sürekli analiz edilir. P-dalgalarını erken tespit eder.",
        features: [
            { icon: "waveform", text: "50 Hz hassas sensör örneklemesi" },
            { icon: "brain", text: "AI destekli sarsıntı doğrulama" },
            { icon: "cellphone-check", text: "Kalibrasyon ile kişisel uyum" },
        ],
    },
    {
        id: "data",
        icon: "database-check",
        iconColor: "#f59e0b",
        bgGradientTop: "#f59e0b08",
        title: "Resmi ve\nGüvenilir Veriler",
        subtitle: "Devlet Kurumu API Entegrasyonu",
        description:
            "Tüm deprem verileri AFAD ve Kandilli Rasathanesi'nden anlık olarak alınır. Veriler bağımsız doğrulama sürecinden geçirilir.",
        features: [
            { icon: "bank", text: "AFAD resmi veri kaynağı" },
            { icon: "school", text: "Kandilli Rasathanesi entegrasyonu" },
            { icon: "check-decagram", text: "Çapraz doğrulama sistemi" },
        ],
    },
    {
        id: "safety",
        icon: "account-group",
        iconColor: Colors.danger,
        bgGradientTop: Colors.danger + "08",
        title: "Aile Güvenlik Ağı\nve Acil Durum",
        subtitle: "Sevdiklerinizi Koruyun",
        description:
            "Aile üyelerinizi ekleyin, deprem anında tek tuşla 'Ben İyiyim' mesajı gönderin. İnternet kesilse bile SMS ile konum bilginiz iletilir.",
        features: [
            { icon: "heart-pulse", text: "Tek tuşla 'Ben İyiyim' bildirimi" },
            { icon: "message-text-fast", text: "Çevrimdışı SMS yedek sistemi" },
            { icon: "map-marker-check", text: "GPS konum paylaşımı" },
        ],
    },
];

export default function WelcomeScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = useCallback(() => {
        if (currentIndex < SLIDES.length - 1) {
            const next = currentIndex + 1;
            setCurrentIndex(next);
            flatListRef.current?.scrollToIndex({ index: next, animated: true });
        } else {
            completeWelcome();
        }
    }, [currentIndex]);

    const handleSkip = useCallback(() => {
        completeWelcome();
    }, []);

    const completeWelcome = async () => {
        await AsyncStorage.setItem(WELCOME_KEY, "true");
        router.replace("/(auth)/login");
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index ?? 0);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const renderSlide = useCallback(({ item, index }: { item: WelcomeSlide; index: number }) => {
        return (
            <View style={[styles.slide, { width }]}>
                <View style={styles.slideContent}>
                    {/* Floating icon */}
                    <View style={[styles.iconOuter, { backgroundColor: item.iconColor + "12" }]}>
                        <View style={[styles.iconInner, { backgroundColor: item.iconColor + "20" }]}>
                            <MaterialCommunityIcons
                                name={item.icon as any}
                                size={52}
                                color={item.iconColor}
                            />
                        </View>
                    </View>

                    {/* Title block */}
                    <Text style={styles.title}>{item.title}</Text>
                    <View style={[styles.subtitleBadge, { borderColor: item.iconColor + "30" }]}>
                        <View style={[styles.subtitleDot, { backgroundColor: item.iconColor }]} />
                        <Text style={[styles.subtitleText, { color: item.iconColor }]}>
                            {item.subtitle}
                        </Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.description}>{item.description}</Text>

                    {/* Feature cards */}
                    <View style={styles.featureList}>
                        {item.features.map((f, i) => (
                            <View key={i} style={styles.featureCard}>
                                <View style={[styles.featureIcon, { backgroundColor: item.iconColor + "15" }]}>
                                    <MaterialCommunityIcons
                                        name={f.icon as any}
                                        size={18}
                                        color={item.iconColor}
                                    />
                                </View>
                                <Text style={styles.featureText}>{f.text}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    }, []);

    const isLast = currentIndex === SLIDES.length - 1;

    return (
        <View style={styles.container}>
            {/* Skip button */}
            {!isLast && (
                <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                    <Text style={styles.skipText}>Atla</Text>
                </TouchableOpacity>
            )}

            {/* Slides */}
            <Animated.FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />

            {/* Bottom section */}
            <View style={styles.footer}>
                {/* Dots */}
                <View style={styles.dotsRow}>
                    {SLIDES.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 24, 8],
                            extrapolate: "clamp",
                        });
                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: "clamp",
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.dot,
                                    {
                                        width: dotWidth,
                                        opacity: dotOpacity,
                                        backgroundColor:
                                            i === currentIndex
                                                ? SLIDES[currentIndex].iconColor
                                                : Colors.text.muted,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                    style={[
                        styles.ctaBtn,
                        { backgroundColor: SLIDES[currentIndex].iconColor },
                    ]}
                    onPress={handleNext}
                    activeOpacity={0.9}
                >
                    <Text style={styles.ctaBtnText}>
                        {isLast ? "Başlayalım" : "Devam"}
                    </Text>
                    <MaterialCommunityIcons
                        name={isLast ? "rocket-launch" : "arrow-right"}
                        size={20}
                        color="#fff"
                    />
                </TouchableOpacity>

                {/* Trust badge */}
                <View style={styles.trustRow}>
                    <MaterialCommunityIcons name="shield-check" size={14} color={Colors.primary} />
                    <Text style={styles.trustText}>
                        Verileriniz şifrelenir ve hiçbir 3. tarafla paylaşılmaz
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
    },
    skipBtn: {
        position: "absolute",
        top: Platform.OS === "android" ? 48 : 60,
        right: Spacing.xl,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    skipText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
    },
    slide: {
        flex: 1,
        justifyContent: "center",
    },
    slideContent: {
        paddingHorizontal: Spacing.xl,
        alignItems: "center",
        paddingTop: Platform.OS === "android" ? 80 : 90,
    },
    iconOuter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    iconInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
    },
    title: {
        fontSize: Typography.sizes.xxxl,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        letterSpacing: -1,
        lineHeight: 40,
        marginBottom: Spacing.md,
    },
    subtitleBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginBottom: Spacing.lg,
    },
    subtitleDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    subtitleText: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    description: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 24,
        maxWidth: 340,
        marginBottom: Spacing.xl,
    },
    featureList: {
        width: "100%",
        gap: Spacing.sm,
    },
    featureCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    featureText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.dark,
    },
    footer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Platform.OS === "android" ? Spacing.xl : Spacing.xxl,
        gap: Spacing.md,
    },
    dotsRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    ctaBtn: {
        height: 58,
        borderRadius: BorderRadius.xxl,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        ...Shadows.md,
    },
    ctaBtnText: {
        color: "#fff",
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
    },
    trustRow: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
    },
    trustText: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "600",
    },
});
