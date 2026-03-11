/**
 * QuakeSense Onboarding — Modern Dark UI
 *
 * 5 Slayt Akışı:
 *  0. Hoş Geldiniz + Dil Seçici
 *  1. Konum İzni (Sismik Radar)
 *  2. Bildirimler + DND (Nükleer Uyarı)
 *  3. Pil Optimizasyonu (Kesintisiz Koruma)
 *  4. Tamamlandı
 *
 * Özellikler:
 *  - Tam i18n (12 dil), dil seçici slayt 0'da
 *  - AppState dinleyici: Ayarlardan döndüğünde izinler yeniden kontrol edilir
 *  - İzin önce popup, reddedilirse Ayarlar deep-link
 *  - SecureStore'a onboarding_complete = true yazılır
 *  - Animated ile slide + fade + scale animasyonları
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    AppState,
    AppStateStatus,
    Animated,
    Dimensions,
    Platform,
    Alert,
    StatusBar,
    Linking,
} from "react-native";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import i18n from "../../src/i18n";

import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import {
    getPermissionStatus,
    requestLocationAlwaysAndOpenSettingsIfNeeded,
    requestCriticalNotificationAndOpenSettingsIfNeeded,
    openBatteryOptimizationSettings,
    openDndPolicySettings,
    hasCriticalPermissionsForWarning,
} from "../../src/services/permissionService";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const ONBOARDING_KEY = "onboarding_complete";
const LANG_KEY = "quakesense_lang";

// ─── Desteklenen Diller ────────────────────────────────────────────────────
const LANGUAGES = [
    { code: "tr", flag: "🇹🇷", label: "Türkçe" },
    { code: "en", flag: "🇬🇧", label: "English" },
    { code: "de", flag: "🇩🇪", label: "Deutsch" },
    { code: "fr", flag: "🇫🇷", label: "Français" },
    { code: "ru", flag: "🇷🇺", label: "Русский" },
    { code: "ja", flag: "🇯🇵", label: "日本語" },
    { code: "zh", flag: "🇨🇳", label: "中文" },
    { code: "it", flag: "🇮🇹", label: "Italiano" },
    { code: "el", flag: "🇬🇷", label: "Ελληνικά" },
    { code: "pt", flag: "🇧🇷", label: "Português" },
    { code: "id", flag: "🇮🇩", label: "Bahasa" },
    { code: "ne", flag: "🇳🇵", label: "नेपाली" },
];

// ─── İzin Durumu Tipi ─────────────────────────────────────────────────────
interface PermState {
    location: boolean;
    notification: boolean;
    battery: boolean;
}

export default function OnboardingScreen() {
    const { t } = useTranslation();
    const [step, setStep] = useState(0);
    const [activeLang, setActiveLang] = useState(i18n.language ?? "en");
    const [permState, setPermState] = useState<PermState>({
        location: false,
        notification: false,
        battery: false,
    });
    const [checking, setChecking] = useState(false);

    // Animasyon değerleri
    const slideX = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;
    const iconScale = useRef(new Animated.Value(0.6)).current;
    const iconOpacity = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const TOTAL_STEPS = 5;

    // ── İzin Durumunu Yenile ──────────────────────────────────────────────
    const refreshPermissions = useCallback(async () => {
        try {
            const status = await getPermissionStatus();
            setPermState({
                location: status.locationForeground === "granted",
                notification: status.notifications === "granted",
                battery: false, // Android'de programatik kontrol için native gerekir
            });
        } catch {
            // ignore
        }
    }, []);

    // ── AppState Dinleyici (Ayarlardan Dönerken) ──────────────────────────
    useEffect(() => {
        const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
            if (state === "active") {
                refreshPermissions();
            }
        });
        refreshPermissions();
        return () => sub.remove();
    }, [refreshPermissions]);

    // ── İkon Giriş Animasyonu (Her Slayt Değişiminde) ────────────────────
    const animateSlideIn = useCallback(
        (direction: 1 | -1 = 1) => {
            iconScale.setValue(0.6);
            iconOpacity.setValue(0);
            slideX.setValue(direction * SCREEN_W * 0.3);
            opacity.setValue(0);

            Animated.parallel([
                Animated.spring(iconScale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(iconOpacity, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                }),
                Animated.spring(slideX, {
                    toValue: 0,
                    tension: 60,
                    friction: 9,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
            ]).start();
        },
        [iconScale, iconOpacity, slideX, opacity]
    );

    // ── İlerleme Çubuğu ──────────────────────────────────────────────────
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: (step / (TOTAL_STEPS - 1)) * 100,
            duration: 400,
            useNativeDriver: false,
        }).start();
    }, [step, progressAnim]);

    // ── Slayt Geçişi ─────────────────────────────────────────────────────
    function goToStep(next: number, direction: 1 | -1 = 1) {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(slideX, {
                toValue: -direction * SCREEN_W * 0.15,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setStep(next);
            animateSlideIn(direction);
        });
    }

    useEffect(() => {
        animateSlideIn(1);
    }, []);

    // ── Dil Seçimi ────────────────────────────────────────────────────────
    async function changeLanguage(code: string) {
        setActiveLang(code);
        await i18n.changeLanguage(code);
        try {
            await SecureStore.setItemAsync(LANG_KEY, code);
        } catch {
            // ignore
        }
    }

    // ── Onboarding Tamamla ───────────────────────────────────────────────
    async function finishOnboarding() {
        const { ok, missing } = await hasCriticalPermissionsForWarning();
        if (!ok) {
            Alert.alert(
                t("onboarding.missing_title"),
                t("onboarding.missing_body"),
                [
                    { text: t("onboarding.proceed"), onPress: saveAndContinue },
                    { text: t("onboarding.go_settings"), onPress: () => Linking.openSettings() },
                ]
            );
            return;
        }
        await saveAndContinue();
    }

    async function saveAndContinue() {
        try {
            await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
        } catch {
            // ignore
        }
        router.replace("/(auth)/login");
    }

    // ── İzin Butonlarına Tıklama ─────────────────────────────────────────
    async function handleLocationPermission() {
        setChecking(true);
        try {
            await requestLocationAlwaysAndOpenSettingsIfNeeded();
        } finally {
            setChecking(false);
        }
        await refreshPermissions();
    }

    async function handleNotificationPermission() {
        setChecking(true);
        try {
            await requestCriticalNotificationAndOpenSettingsIfNeeded();
        } finally {
            setChecking(false);
        }
        await refreshPermissions();
    }

    async function handleDndSettings() {
        await openDndPolicySettings();
    }

    async function handleBatterySettings() {
        setChecking(true);
        try {
            await openBatteryOptimizationSettings();
        } finally {
            setChecking(false);
        }
    }

    // ── Birincil Buton Aksiyon ────────────────────────────────────────────
    async function handlePrimaryAction() {
        switch (step) {
            case 0: goToStep(1); break;
            case 1: await handleLocationPermission(); if (permState.location) goToStep(2); else goToStep(2); break;
            case 2: await handleNotificationPermission(); goToStep(3); break;
            case 3: await handleBatterySettings(); goToStep(4); break;
            case 4: await finishOnboarding(); break;
        }
    }

    function handleNext() {
        if (step < TOTAL_STEPS - 1) goToStep(step + 1);
        else finishOnboarding();
    }

    // ─── Slayt İçerikleri ────────────────────────────────────────────────

    const slides = [
        {
            icon: "shield-check" as const,
            iconColor: Colors.primary,
            iconBg: "rgba(16, 185, 129, 0.12)",
            badgeColor: Colors.primary,
            badge: t("onboarding.welcome.badge"),
            title: t("onboarding.welcome.title"),
            subtitle: t("onboarding.welcome.subtitle"),
            primaryLabel: t("onboarding.welcome.start"),
            primaryIcon: "arrow-right" as const,
        },
        {
            icon: "crosshairs-gps" as const,
            iconColor: Colors.primary,
            iconBg: "rgba(16, 185, 129, 0.12)",
            badgeColor: Colors.primary,
            badge: t("onboarding.location.badge"),
            title: t("onboarding.location.title"),
            subtitle: t("onboarding.location.description"),
            metricValue: t("onboarding.location.metric_value"),
            metricLabel: t("onboarding.location.metric_label"),
            primaryLabel: permState.location ? t("onboarding.granted") : t("onboarding.location.button"),
            primaryIcon: permState.location ? ("check-circle" as const) : ("map-marker-check" as const),
            granted: permState.location,
        },
        {
            icon: "bell-ring" as const,
            iconColor: Colors.danger,
            iconBg: "rgba(220, 38, 38, 0.12)",
            badgeColor: Colors.danger,
            badge: t("onboarding.notification.badge"),
            title: t("onboarding.notification.title"),
            subtitle: t("onboarding.notification.description"),
            metricValue: t("onboarding.notification.metric_value"),
            metricLabel: t("onboarding.notification.metric_label"),
            primaryLabel: permState.notification ? t("onboarding.granted") : t("onboarding.notification.button"),
            primaryIcon: permState.notification ? ("check-circle" as const) : ("bell-check" as const),
            secondaryLabel: t("onboarding.notification.button_dnd"),
            secondaryAction: handleDndSettings,
            granted: permState.notification,
        },
        {
            icon: "battery-charging" as const,
            iconColor: "#F59E0B",
            iconBg: "rgba(245, 158, 11, 0.12)",
            badgeColor: "#F59E0B",
            badge: t("onboarding.battery.badge"),
            title: t("onboarding.battery.title"),
            subtitle: t("onboarding.battery.description"),
            metricValue: t("onboarding.battery.metric_value"),
            metricLabel: t("onboarding.battery.metric_label"),
            primaryLabel: t("onboarding.battery.button"),
            primaryIcon: "battery-plus" as const,
            granted: permState.battery,
        },
        {
            icon: "shield-star" as const,
            iconColor: Colors.primary,
            iconBg: "rgba(16, 185, 129, 0.15)",
            badgeColor: Colors.primary,
            badge: t("onboarding.complete.badge"),
            title: t("onboarding.complete.title"),
            subtitle: t("onboarding.complete.description"),
            primaryLabel: t("onboarding.complete.button"),
            primaryIcon: "account-plus" as const,
        },
    ];

    const slide = slides[step];
    const isSmall = SCREEN_H < 700;
    const iconSize = isSmall ? 96 : 120;

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Arka plan degradesi */}
            <View style={[s.bgGradient, { backgroundColor: Colors.background.dark }]} />
            <View
                style={[
                    s.bgAccent,
                    { backgroundColor: slide.iconColor + "08" },
                ]}
            />

            {/* Üst Bar: İlerleme + Atla */}
            <View style={s.topBar}>
                <View style={s.progressTrack}>
                    <Animated.View
                        style={[
                            s.progressFill,
                            {
                                backgroundColor: slide.iconColor,
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ["0%", "100%"],
                                }),
                            },
                        ]}
                    />
                </View>
                <TouchableOpacity style={s.skipBtn} onPress={finishOnboarding} activeOpacity={0.7}>
                    <Text style={s.skipText}>{t("onboarding.skip")}</Text>
                </TouchableOpacity>
            </View>

            {/* Ana İçerik — Animasyonlu */}
            <Animated.View
                style={[
                    s.content,
                    { opacity, transform: [{ translateX: slideX }] },
                ]}
            >
                {/* İkon */}
                <Animated.View
                    style={[
                        s.iconOuter,
                        {
                            backgroundColor: slide.iconBg,
                            width: iconSize,
                            height: iconSize,
                            borderRadius: iconSize / 2,
                            transform: [{ scale: iconScale }],
                            opacity: iconOpacity,
                        },
                    ]}
                >
                    <View
                        style={[
                            s.iconInner,
                            {
                                borderColor: slide.iconColor + "35",
                                backgroundColor: slide.iconBg,
                                width: iconSize * 0.68,
                                height: iconSize * 0.68,
                                borderRadius: (iconSize * 0.68) / 2,
                            },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name={slide.icon}
                            size={iconSize * 0.38}
                            color={slide.iconColor}
                        />
                    </View>
                </Animated.View>

                {/* Rozet */}
                <View
                    style={[
                        s.badge,
                        {
                            borderColor: slide.badgeColor + "35",
                            backgroundColor: slide.badgeColor + "12",
                        },
                    ]}
                >
                    <View style={[s.badgeDot, { backgroundColor: slide.badgeColor }]} />
                    <Text style={[s.badgeText, { color: slide.badgeColor }]}>{slide.badge}</Text>
                </View>

                {/* Başlık */}
                <Text style={s.title}>{slide.title}</Text>

                {/* Açıklama */}
                <Text style={s.subtitle}>{slide.subtitle}</Text>

                {/* Metrik Kart (izin slayları) */}
                {"metricValue" in slide && slide.metricValue && (
                    <View style={[s.metricCard, { borderColor: slide.iconColor + "25" }]}>
                        <Text style={[s.metricValue, { color: slide.iconColor }]}>
                            {slide.metricValue}
                        </Text>
                        <Text style={s.metricLabel}>{slide.metricLabel}</Text>
                    </View>
                )}

                {/* İstatistikler (Hoş Geldiniz slaydı) */}
                {step === 0 && (
                    <View style={s.statsRow}>
                        {[
                            { v: "0.3s", l: t("onboarding.welcome.stat_speed") },
                            { v: "4", l: t("onboarding.welcome.stat_perms") },
                            { v: "99.7%", l: t("onboarding.welcome.stat_accuracy") },
                        ].map((stat, i) => (
                            <View
                                key={i}
                                style={[s.statItem, { borderColor: Colors.primary + "25" }]}
                            >
                                <Text style={[s.statValue, { color: Colors.primary }]}>{stat.v}</Text>
                                <Text style={s.statLabel}>{stat.l}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Dil Seçici (Hoş Geldiniz slaydı) */}
                {step === 0 && (
                    <View style={s.langSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.langRow}
                        >
                            {LANGUAGES.map((lang) => (
                                <TouchableOpacity
                                    key={lang.code}
                                    style={[
                                        s.langChip,
                                        activeLang === lang.code && {
                                            borderColor: Colors.primary,
                                            backgroundColor: Colors.primary + "18",
                                        },
                                    ]}
                                    onPress={() => changeLanguage(lang.code)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={s.langFlag}>{lang.flag}</Text>
                                    <Text
                                        style={[
                                            s.langLabel,
                                            activeLang === lang.code && { color: Colors.primary, fontWeight: "700" },
                                        ]}
                                    >
                                        {lang.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* İzin Durumu Göstergesi */}
                {"granted" in slide && (
                    <View style={[s.permStatus, slide.granted ? s.permGranted : s.permNotGranted]}>
                        <MaterialCommunityIcons
                            name={slide.granted ? "check-circle" : "alert-circle-outline"}
                            size={16}
                            color={slide.granted ? Colors.primary : Colors.text.muted}
                        />
                        <Text
                            style={[
                                s.permStatusText,
                                { color: slide.granted ? Colors.primary : Colors.text.muted },
                            ]}
                        >
                            {slide.granted
                                ? t("onboarding.granted")
                                : t("onboarding.not_granted")}
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Alt Butonlar */}
            <View style={s.footer}>
                {/* Adım Noktaları */}
                <View style={s.dots}>
                    {slides.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                s.dot,
                                i === step
                                    ? [s.dotActive, { backgroundColor: slide.iconColor, width: 20 }]
                                    : { backgroundColor: Colors.background.elevated },
                            ]}
                        />
                    ))}
                </View>

                {/* Birincil Buton */}
                <TouchableOpacity
                    style={[
                        s.primaryBtn,
                        {
                            backgroundColor:
                                "granted" in slide && slide.granted
                                    ? Colors.primary
                                    : slide.iconColor,
                        },
                        ...(checking ? [s.primaryBtnDisabled] : []),
                    ]}
                    onPress={handlePrimaryAction}
                    disabled={checking}
                    activeOpacity={0.88}
                >
                    <MaterialCommunityIcons name={slide.primaryIcon} size={20} color="#fff" />
                    <Text style={s.primaryBtnText}>{slide.primaryLabel}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>

                {/* İkincil Buton (DND gibi ek ayarlar) */}
                {"secondaryLabel" in slide && slide.secondaryLabel && (
                    <TouchableOpacity
                        style={s.secondaryBtn}
                        onPress={slide.secondaryAction}
                        activeOpacity={0.75}
                    >
                        <MaterialCommunityIcons name="tune" size={15} color={slide.iconColor} />
                        <Text style={[s.secondaryBtnText, { color: slide.iconColor }]}>
                            {slide.secondaryLabel}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Atla / İleri (küçük link) */}
                <TouchableOpacity onPress={handleNext} style={s.skipLink} activeOpacity={0.7}>
                    <Text style={s.skipLinkText}>
                        {step === TOTAL_STEPS - 1 ? t("onboarding.finish") : t("onboarding.next")}
                    </Text>
                    <MaterialCommunityIcons name="arrow-right" size={14} color={Colors.text.muted} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Stiller ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        paddingTop: Platform.OS === "android" ? 48 : 56,
    },
    bgGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    bgAccent: {
        position: "absolute",
        top: -120,
        right: -80,
        width: 320,
        height: 320,
        borderRadius: 160,
        opacity: 0.6,
    },

    // ── Üst Bar ────────────────────────────────────────────────────────
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.md,
    },
    progressTrack: {
        flex: 1,
        height: 3,
        backgroundColor: Colors.background.elevated,
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },
    skipBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    skipText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.xs,
        fontWeight: "700",
        letterSpacing: 0.3,
    },

    // ── Animasyonlu İçerik ────────────────────────────────────────────
    content: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.md,
    },

    // ── İkon ─────────────────────────────────────────────────────────
    iconOuter: {
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.lg + 4,
        ...Shadows.glow("#10B981"),
    },
    iconInner: {
        borderWidth: 1.5,
        justifyContent: "center",
        alignItems: "center",
    },

    // ── Rozet ────────────────────────────────────────────────────────
    badge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginBottom: Spacing.md,
    },
    badgeDot: { width: 6, height: 6, borderRadius: 3 },
    badgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 1,
    },

    // ── Başlık / Açıklama ─────────────────────────────────────────────
    title: {
        fontSize: 26,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        lineHeight: 34,
        marginBottom: Spacing.sm + 4,
    },
    subtitle: {
        fontSize: Typography.sizes.sm + 1,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 22,
        maxWidth: 340,
        marginBottom: Spacing.lg,
    },

    // ── Metrik Kart ───────────────────────────────────────────────────
    metricCard: {
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xxl,
        paddingVertical: Spacing.md - 2,
        paddingHorizontal: Spacing.xxl,
        alignItems: "center",
        marginBottom: Spacing.md,
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
        letterSpacing: 0.8,
        marginTop: 2,
    },

    // ── İstatistikler ─────────────────────────────────────────────────
    statsRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        marginBottom: Spacing.md,
        width: "100%",
    },
    statItem: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md - 4,
        alignItems: "center",
    },
    statValue: {
        fontSize: Typography.sizes.lg,
        fontWeight: "900",
    },
    statLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.4,
        marginTop: 2,
        textAlign: "center",
    },

    // ── Dil Seçici ────────────────────────────────────────────────────
    langSection: {
        width: "100%",
        marginTop: Spacing.sm,
    },
    langRow: {
        flexDirection: "row",
        gap: Spacing.sm,
        paddingHorizontal: 2,
    },
    langChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    langFlag: { fontSize: 16 },
    langLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "600",
    },

    // ── İzin Durumu ───────────────────────────────────────────────────
    permStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        marginTop: Spacing.sm,
    },
    permGranted: {
        borderColor: Colors.primary + "40",
        backgroundColor: Colors.primary + "10",
    },
    permNotGranted: {
        borderColor: Colors.border.glass,
        backgroundColor: Colors.background.surface,
    },
    permStatusText: {
        fontSize: Typography.sizes.xs,
        fontWeight: "700",
    },

    // ── Alt Alan ─────────────────────────────────────────────────────
    footer: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Platform.OS === "android" ? Spacing.xxl : Spacing.xxxl,
        gap: Spacing.md - 4,
        alignItems: "center",
    },
    dots: {
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
        marginBottom: Spacing.xs,
    },
    dot: { height: 6, width: 6, borderRadius: 3 },
    dotActive: { height: 6, borderRadius: 3 },
    primaryBtn: {
        width: "100%",
        borderRadius: BorderRadius.xl,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        ...Shadows.md,
    },
    primaryBtnDisabled: { opacity: 0.65 },
    primaryBtnText: {
        color: "#fff",
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        flex: 1,
        textAlign: "center",
        marginLeft: -30,
    },
    secondaryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    secondaryBtnText: {
        fontSize: Typography.sizes.xs + 1,
        fontWeight: "700",
    },
    skipLink: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
    },
    skipLinkText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.xs + 1,
        fontWeight: "600",
    },
});
