/**
 * Onboarding ekrani - Kayit sonrasi izin talepleri ve ozellik tanitimi.
 * Hassas Konum, Bildirim ve Kritik Uyari izinleri icin ikna edici, profesyonel ekranlar.
 */

import { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    FlatList,
    Alert,
    Platform,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const { width } = Dimensions.get("window");

interface OnboardingStep {
    id: string;
    icon: string;
    iconColor: string;
    iconBg: string;
    title: string;
    subtitle: string;
    description: string;
    buttonText: string;
    skipText: string;
    metric?: { value: string; label: string };
}

const STEPS: OnboardingStep[] = [
    {
        id: "location",
        icon: "crosshairs-gps",
        iconColor: Colors.primary,
        iconBg: "rgba(16, 185, 129, 0.1)",
        title: "Hassas Konum Erisimi",
        subtitle: "Hayat kurtaran bilgi",
        description:
            "Konumunuzu bilmemiz, size en yakin depremleri aninda bildirmemizi ve acil durumlarda kurtarma ekiplerine dogru koordinat iletmemizi saglar.",
        buttonText: "Konumu Etkinlestir",
        skipText: "Sonra",
        metric: { value: "<2km", label: "Konum hassasiyeti" },
    },
    {
        id: "notifications",
        icon: "bell-ring-outline",
        iconColor: Colors.accent,
        iconBg: "rgba(249, 115, 22, 0.1)",
        title: "Deprem Bildirimleri",
        subtitle: "Kritik uyarilar",
        description:
            "Anlik deprem bildirimleri, buyukluge ve konumunuza gore filtrelenir. Sessiz saatlerde sadece kritik alarmlar gonderilir.",
        buttonText: "Bildirimleri Ac",
        skipText: "Sonra",
        metric: { value: "0.3s", label: "Bildirim gecikmesi" },
    },
    {
        id: "sensor",
        icon: "vibrate",
        iconColor: Colors.danger,
        iconBg: "rgba(220, 38, 38, 0.1)",
        title: "Sensor Erisimi",
        subtitle: "Erken uyari teknolojisi",
        description:
            "Telefonunuzun ivmeolceri ile yer titresimini algilariz. STA/LTA algoritmasi P-dalgasini tespit eder ve yikici S-dalgasi gelmeden sizi uyarir.",
        buttonText: "Sensoru Etkinlestir",
        skipText: "Tamamla",
        metric: { value: "%99.7", label: "Dogruluk orani" },
    },
];

export default function OnboardingScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    async function handlePermission() {
        const step = STEPS[currentStep];

        if (step.id === "location") {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Konum Izni", "Konum izni deprem uyarilari icin onemlidir. Ayarlardan acabilirsiniz.");
            }
        } else if (step.id === "notifications") {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== "granted") {
                Alert.alert("Bildirim Izni", "Bildirim izni kritik deprem uyarilari icin gereklidir.");
            }
        }

        goNext();
    }

    function goNext() {
        if (currentStep < STEPS.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            flatListRef.current?.scrollToIndex({ index: next, animated: true });
        } else {
            router.replace("/(tabs)");
        }
    }

    function renderStep({ item }: { item: OnboardingStep }) {
        return (
            <View style={[styles.slide, { width }]}>
                <View style={styles.slideContent}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: item.iconBg }]}>
                        <View style={[styles.iconRing, { borderColor: item.iconColor + "30" }]}>
                            <MaterialCommunityIcons
                                name={item.icon as any}
                                size={48}
                                color={item.iconColor}
                            />
                        </View>
                    </View>

                    {/* Badge */}
                    <View style={[styles.badge, { borderColor: item.iconColor + "30" }]}>
                        <View style={[styles.badgeDot, { backgroundColor: item.iconColor }]} />
                        <Text style={[styles.badgeText, { color: item.iconColor }]}>
                            {item.subtitle}
                        </Text>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>

                    {/* Metric */}
                    {item.metric && (
                        <View style={styles.metricBox}>
                            <Text style={styles.metricValue}>{item.metric.value}</Text>
                            <Text style={styles.metricLabel}>{item.metric.label}</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Progress */}
            <View style={styles.progressBar}>
                {STEPS.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            i <= currentStep && styles.progressDotActive,
                        ]}
                    />
                ))}
            </View>

            <FlatList
                ref={flatListRef}
                data={STEPS}
                renderItem={renderStep}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
            />

            {/* Buttons */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handlePermission}
                    activeOpacity={0.9}
                >
                    <MaterialCommunityIcons
                        name={STEPS[currentStep].icon as any}
                        size={20}
                        color="#fff"
                    />
                    <Text style={styles.primaryBtnText}>
                        {STEPS[currentStep].buttonText}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={goNext} style={styles.skipBtn}>
                    <Text style={styles.skipText}>{STEPS[currentStep].skipText}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        paddingTop: Platform.OS === "android" ? 48 : 60,
    },
    progressBar: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.lg,
    },
    progressDot: {
        flex: 1,
        height: 3,
        borderRadius: 2,
        backgroundColor: Colors.background.elevated,
    },
    progressDotActive: {
        backgroundColor: Colors.primary,
    },
    slide: {
        flex: 1,
        justifyContent: "center",
    },
    slideContent: {
        paddingHorizontal: Spacing.xl,
        alignItems: "center",
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    iconRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginBottom: Spacing.lg,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    title: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        letterSpacing: -0.5,
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
    metricBox: {
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xxl,
        alignItems: "center",
    },
    metricValue: {
        fontSize: Typography.sizes.xxxl,
        fontWeight: "900",
        color: Colors.primary,
    },
    metricLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 4,
    },
    footer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xxl,
        gap: Spacing.md,
    },
    primaryBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        height: 56,
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
    },
    skipBtn: {
        alignItems: "center",
        paddingVertical: Spacing.sm,
    },
    skipText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "600",
    },
});
