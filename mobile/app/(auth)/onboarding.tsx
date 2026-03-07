/**
 * Onboarding ekrani - Kayit sonrasi izin talepleri ve ozellik tanitimi.
 *
 * Gorev 5: Profesyonel Izin (Permission) Yonetimi ve Onboarding
 * - Konum, SMS Gonderme, Arka Planda Calisma ve Kamera (Flas) izinleri
 * - "Bu izne neden ihtiyacimiz var?" bilgisi sik kartlar halinde
 * - Izin reddedilirse uygulama cokmez, sadece ilgili ozellik devre disi
 */

import { useState, useRef, useCallback } from "react";
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
import {
    requestLocationPermission,
    requestBackgroundLocationPermission,
    requestNotificationPermission,
    requestCameraPermission,
    checkSmsAvailability,
    markOnboardingDone,
} from "../../src/services/permissionService";
import { usePermissions } from "../../src/context/AppContext";

const { width } = Dimensions.get("window");

interface OnboardingStep {
    id: string;
    icon: string;
    iconColor: string;
    iconBg: string;
    title: string;
    subtitle: string;
    description: string;
    whyNeeded: string;
    featureIfDenied: string;
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
        whyNeeded: "Deprem merkez uzakligini hesaplamak, S.O.S. konumunuzu paylasmak ve bolgesel uyarilari filtrelemek icin kullanilir.",
        featureIfDenied: "Konum reddedilirse: Bolgesel filtreleme ve S.O.S. konum paylasimi devre disi kalir.",
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
        whyNeeded: "Uygulama kapali olsa bile buyuk depremleri aninda haber vermek ve erken uyari gondermek icin kullanilir.",
        featureIfDenied: "Bildirim reddedilirse: Push bildirimler devre disi kalir, sadece uygulama icinde uyarilar gosterilir.",
        buttonText: "Bildirimleri Ac",
        skipText: "Sonra",
        metric: { value: "0.3s", label: "Bildirim gecikmesi" },
    },
    {
        id: "sms",
        icon: "message-text-outline",
        iconColor: Colors.status.info,
        iconBg: "rgba(59, 130, 246, 0.1)",
        title: "SMS Gonderme",
        subtitle: "Cevrimdisi yedek sistem",
        description:
            "Deprem aninda internet kesilirse, acil durum kisilerinize GPS konumunuzla birlikte otomatik SMS gonderilir.",
        whyNeeded: "Internet baglantisi olmadan bile acil durum kisilerinize konum bilgisi gondermek icin SMS erisimi gereklidir.",
        featureIfDenied: "SMS reddedilirse: Cevrimdisi S.O.S. ozeligi devre disi kalir, sadece internet uzerinden bildirim gonderilir.",
        buttonText: "SMS Erisimini Ac",
        skipText: "Sonra",
        metric: { value: "5", label: "Acil kisi limiti" },
    },
    {
        id: "camera",
        icon: "flashlight",
        iconColor: "#eab308",
        iconBg: "rgba(234, 179, 8, 0.1)",
        title: "Kamera (Flas Isigi)",
        subtitle: "Karanlikta hayat kurtarici",
        description:
            "Deprem aninda elektrikler kesildiginde telefonunuzun flas isigini otomatik olarak yakar. Karanlikta gorulmek icin kritik onem tasir.",
        whyNeeded: "Deprem algilandiginda flas isigini otomatik acmak icin kamera donanim erisimi gereklidir.",
        featureIfDenied: "Kamera reddedilirse: Otomatik flas isigi ozeligi devre disi kalir.",
        buttonText: "Kamerayi Etkinlestir",
        skipText: "Sonra",
        metric: { value: "Auto", label: "Otomatik aktiflesme" },
    },
    {
        id: "background",
        icon: "shield-lock-outline",
        iconColor: Colors.danger,
        iconBg: "rgba(220, 38, 38, 0.1)",
        title: "Arka Planda Calisma",
        subtitle: "Kesintisiz koruma",
        description:
            "Uygulama kapatildiginda veya ekran kilitlendiginde bile ivmeolcer sensoru calismaya devam eder. Deprem algilama 7/24 aktif kalir.",
        whyNeeded: "Uyurken veya telefon cebinizdeyken bile deprem algilamak icin arka plan erisimi gereklidir.",
        featureIfDenied: "Arka plan reddedilirse: Sadece uygulama acikken deprem algilanir.",
        buttonText: "Arka Plani Etkinlestir",
        skipText: "Tamamla",
        metric: { value: "7/24", label: "Kesintisiz koruma" },
    },
];

export default function OnboardingScreen() {
    const [currentStep, setCurrentStep] = useState(0);
    const [deniedPermissions, setDeniedPermissions] = useState<string[]>([]);
    const flatListRef = useRef<FlatList>(null);
    const permCtx = usePermissions();

    const handlePermission = useCallback(async () => {
        const step = STEPS[currentStep];

        if (step.id === "location") {
            const status = await requestLocationPermission();
            permCtx.updatePermission("location", status);
            if (status === "denied") {
                setDeniedPermissions((prev) => [...prev, "location"]);
            }
        } else if (step.id === "notifications") {
            const status = await requestNotificationPermission();
            permCtx.updatePermission("notifications", status);
            if (status === "denied") {
                setDeniedPermissions((prev) => [...prev, "notifications"]);
            }
        } else if (step.id === "sms") {
            const status = await checkSmsAvailability();
            permCtx.updatePermission("sms", status);
            if (status === "denied") {
                setDeniedPermissions((prev) => [...prev, "sms"]);
            }
        } else if (step.id === "camera") {
            const status = await requestCameraPermission();
            permCtx.updatePermission("camera", status);
            if (status === "denied") {
                setDeniedPermissions((prev) => [...prev, "camera"]);
            }
        } else if (step.id === "background") {
            const status = await requestBackgroundLocationPermission();
            permCtx.updatePermission("backgroundLocation", status);
            if (status === "denied") {
                setDeniedPermissions((prev) => [...prev, "background"]);
            }
        }

        goNext();
    }, [currentStep, permCtx]);

    const goNext = useCallback(() => {
        if (currentStep < STEPS.length - 1) {
            const next = currentStep + 1;
            setCurrentStep(next);
            flatListRef.current?.scrollToIndex({ index: next, animated: true });
        } else {
            // Onboarding tamamlandi
            markOnboardingDone();

            if (deniedPermissions.length > 0) {
                Alert.alert(
                    "Izin Ozeti",
                    `Bazi izinler reddedildi. Ilgili ozellikler devre disi birakildi.\n\nReddedilen: ${deniedPermissions.join(", ")}\n\nDilediginiz zaman Ayarlar'dan izinleri acabilirsiniz.`,
                    [{ text: "Tamam", onPress: () => router.replace("/(tabs)") }]
                );
            } else {
                router.replace("/(tabs)");
            }
        }
    }, [currentStep, deniedPermissions]);

    const skipPermission = useCallback(() => {
        const step = STEPS[currentStep];
        setDeniedPermissions((prev) => [...prev, step.id]);
        goNext();
    }, [currentStep, goNext]);

    const renderStep = useCallback(
        ({ item }: { item: OnboardingStep }) => {
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

                        {/* Gorev 5: Neden ihtiyacimiz var karti */}
                        <View style={styles.whyCard}>
                            <View style={styles.whyHeader}>
                                <MaterialCommunityIcons name="help-circle-outline" size={16} color={Colors.primary} />
                                <Text style={styles.whyTitle}>Bu izne neden ihtiyacimiz var?</Text>
                            </View>
                            <Text style={styles.whyText}>{item.whyNeeded}</Text>
                            <View style={styles.deniedInfoRow}>
                                <MaterialCommunityIcons name="information-outline" size={14} color={Colors.text.muted} />
                                <Text style={styles.deniedInfoText}>{item.featureIfDenied}</Text>
                            </View>
                        </View>

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
        },
        []
    );

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
                            i < currentStep && deniedPermissions.includes(STEPS[i].id) && styles.progressDotDenied,
                        ]}
                    />
                ))}
            </View>

            {/* Step Counter */}
            <Text style={styles.stepCounter}>
                {currentStep + 1} / {STEPS.length}
            </Text>

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
                    style={[styles.primaryBtn, { backgroundColor: STEPS[currentStep].iconColor }]}
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

                <TouchableOpacity onPress={skipPermission} style={styles.skipBtn}>
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
        gap: 6,
        paddingHorizontal: Spacing.xl,
        marginBottom: Spacing.sm,
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
    progressDotDenied: {
        backgroundColor: Colors.text.muted,
    },
    stepCounter: {
        textAlign: "center",
        fontSize: 10,
        fontWeight: "700",
        color: Colors.text.muted,
        marginBottom: Spacing.sm,
        letterSpacing: 1,
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
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    iconRing: {
        width: 88,
        height: 88,
        borderRadius: 44,
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
        marginBottom: Spacing.md,
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
        fontSize: Typography.sizes.xl,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        letterSpacing: -0.5,
        marginBottom: Spacing.sm,
    },
    description: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 20,
        maxWidth: 340,
        marginBottom: Spacing.md,
    },

    // Gorev 5: Neden ihtiyacimiz var karti
    whyCard: {
        width: "100%",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    whyHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: Spacing.sm,
    },
    whyTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    whyText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 20,
        marginBottom: Spacing.sm,
    },
    deniedInfoRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm + 2,
    },
    deniedInfoText: {
        flex: 1,
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "500",
        lineHeight: 14,
    },

    metricBox: {
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.xxl,
        alignItems: "center",
    },
    metricValue: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.primary,
    },
    metricLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginTop: 2,
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
