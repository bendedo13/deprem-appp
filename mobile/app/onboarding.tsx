/**
 * Onboarding ekranı — ilk kullanımda gösterilir.
 * 3 adımlı tanıtım: Deprem Uyarı, Sensör Algılama, Acil İletişim.
 * Tamamlandığında AsyncStorage'a kayıt edilir.
 */

import { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    FlatList,
    TouchableOpacity,
    Animated,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { Colors, Typography, Spacing, BorderRadius } from "../src/constants/theme";

const { width, height } = Dimensions.get("window");

const ONBOARDING_KEY = "quakesense_onboarding_done";

interface OnboardingPage {
    id: string;
    icon: string;
    iconBg: string;
    title: string;
    subtitle: string;
    description: string;
}

const pages: OnboardingPage[] = [
    {
        id: "1",
        icon: "earth",
        iconBg: Colors.primary,
        title: "Anlık Deprem Uyarısı",
        subtitle: "Saniyeler İçinde Bilgi",
        description:
            "AFAD, Kandilli ve uluslararası kaynaklardan gelen deprem verilerini anında alın. Canlı harita ve push bildirimleriyle her zaman bilgili olun.",
    },
    {
        id: "2",
        icon: "cellphone-sound",
        iconBg: "#F59E0B",
        title: "Akıllı Sensör Teknolojisi",
        subtitle: "Cihazınız Sismograf Olsun",
        description:
            "Telefonunuzun ivmeölçerini kullanarak yer sarsıntısını algılar. STA/LTA algoritması ile gerçek depremi ayırt eder ve topluluk doğrulaması yapar.",
    },
    {
        id: "3",
        icon: "shield-check",
        iconBg: "#10B981",
        title: "Acil Durum Hazırlığı",
        subtitle: "Sevdikleriniz Güvende",
        description:
            'Acil kişilerinize tek tuşla "Ben İyiyim" mesajı gönderin. SMS, WhatsApp ve push bildirimi ile konumunuzu paylaşın. Deprem çantası rehberi dahil.',
    },
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    async function handleComplete() {
        await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
        router.replace("/(auth)/login");
    }

    function handleNext() {
        if (currentIndex < pages.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            handleComplete();
        }
    }

    function handleSkip() {
        handleComplete();
    }

    const renderPage = ({ item, index }: { item: OnboardingPage; index: number }) => (
        <View style={[styles.page, { width }]}>
            <View style={styles.topSection}>
                {/* Skip button */}
                {index < pages.length - 1 && (
                    <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                        <Text style={styles.skipText}>Atla</Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.text.muted} />
                    </TouchableOpacity>
                )}

                {/* Icon container with glow */}
                <View style={styles.iconArea}>
                    <View style={[styles.iconGlow, { backgroundColor: item.iconBg + "15" }]}>
                        <View style={[styles.iconCircle, { backgroundColor: item.iconBg + "25" }]}>
                            <View style={[styles.iconInner, { backgroundColor: item.iconBg }]}>
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={60}
                                    color="#fff"
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.contentSection}>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={pages}
                renderItem={renderPage}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / width);
                    setCurrentIndex(index);
                }}
                bounces={false}
            />

            {/* Bottom section */}
            <View style={styles.bottom}>
                {/* Dots */}
                <View style={styles.dotsContainer}>
                    {pages.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [8, 28, 8],
                            extrapolate: "clamp",
                        });
                        const opacity = scrollX.interpolate({
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
                                        opacity,
                                        backgroundColor:
                                            i === currentIndex
                                                ? Colors.primary
                                                : Colors.text.muted,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Action button */}
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleNext}
                    activeOpacity={0.9}
                >
                    <Text style={styles.actionText}>
                        {currentIndex === pages.length - 1 ? "Başlayalım" : "Devam"}
                    </Text>
                    <MaterialCommunityIcons
                        name={currentIndex === pages.length - 1 ? "check" : "arrow-right"}
                        size={22}
                        color="#fff"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
    },
    page: {
        flex: 1,
    },
    topSection: {
        flex: 1.2,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: Platform.OS === "android" ? 40 : 60,
    },
    skipBtn: {
        position: "absolute",
        top: Platform.OS === "android" ? 50 : 60,
        right: 24,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface,
    },
    skipText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
    },
    iconArea: {
        alignItems: "center",
        justifyContent: "center",
    },
    iconGlow: {
        width: 220,
        height: 220,
        borderRadius: 110,
        justifyContent: "center",
        alignItems: "center",
    },
    iconCircle: {
        width: 170,
        height: 170,
        borderRadius: 85,
        justifyContent: "center",
        alignItems: "center",
    },
    iconInner: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    contentSection: {
        flex: 0.8,
        paddingHorizontal: Spacing.xl + 8,
        paddingBottom: 20,
    },
    subtitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: 28,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: Spacing.md,
        lineHeight: 36,
        letterSpacing: -0.5,
    },
    description: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        lineHeight: 26,
        fontWeight: "500",
    },
    bottom: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Platform.OS === "android" ? 30 : 50,
        gap: Spacing.lg,
    },
    dotsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    actionBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        height: 60,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    actionText: {
        color: "#fff",
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
    },
});

export { ONBOARDING_KEY };
