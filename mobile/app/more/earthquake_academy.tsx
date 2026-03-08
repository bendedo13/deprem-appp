/**
 * Deprem Akademisi — Deprem anında yapılması gerekenler (Çök-Kapan-Tutun)
 * Kartlı step-by-step anlatım, animasyonlu geçişler, "Kendini Test Et" quiz bağlantısı.
 */

import { useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
} from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const STEPS = [
    {
        key: "cok",
        title: "ÇÖK",
        subtitle: "Yere çökün",
        body: "Deprem hissettiğiniz anda hemen bulunduğunuz yerde yere çökün. Ayakta kalmaya çalışmayın; sarsıntı sizi düşürebilir.",
        icon: "human-handsdown" as const,
        color: Colors.primary,
    },
    {
        key: "kapan",
        title: "KAPAN",
        subtitle: "Baş ve ensenizi koruyun",
        body: "Başınızı ve ensenizi iki elinizle veya kollarınızla sıkıca koruyun. Mümkünse sağlam bir masa veya divanın yanına geçin.",
        icon: "shield-account" as const,
        color: Colors.accent,
    },
    {
        key: "tutun",
        title: "TUTUN",
        subtitle: "Sağlam bir yere tutunun",
        body: "Masa veya masif bir mobilyanın ayağına sıkıca tutunun. Sarsıntı bitene kadar pozisyonunuzu koruyun.",
        icon: "hand-back-right" as const,
        color: Colors.danger,
    },
];

const CARD_ANIMATION_DURATION = 400;

export default function EarthquakeAcademyScreen() {
    const animValues = useRef(STEPS.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animValues.map((anim, i) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: CARD_ANIMATION_DURATION,
                delay: i * 120,
                useNativeDriver: true,
            })
        );
        Animated.stagger(80, animations).start();
    }, []);

    return (
        <>
            <Stack.Screen options={{ title: "Deprem Akademisi" }} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.hero}>
                    <View style={styles.heroIcon}>
                        <MaterialCommunityIcons name="school" size={40} color="#fff" />
                    </View>
                    <Text style={styles.heroTitle}>Deprem Anında Yapılması Gerekenler</Text>
                    <Text style={styles.heroSubtitle}>
                        Çök – Kapan – Tutun hareketi, deprem sırasında hayat kurtaran en temel davranıştır.
                    </Text>
                </View>

                {STEPS.map((step, index) => (
                    <Animated.View
                        key={step.key}
                        style={[
                            styles.card,
                            {
                                opacity: animValues[index],
                                transform: [
                                    {
                                        translateY: animValues[index].interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [24, 0],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <View style={[styles.stepBadge, { backgroundColor: step.color + "22" }]}>
                            <Text style={[styles.stepNumber, { color: step.color }]}>{index + 1}</Text>
                            <MaterialCommunityIcons name={step.icon} size={28} color={step.color} />
                        </View>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
                        <Text style={styles.stepBody}>{step.body}</Text>
                    </Animated.View>
                ))}

                <View style={styles.extraCard}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color={Colors.status.warning} />
                    <Text style={styles.extraText}>
                        Deprem bittikten sonra gaz ve elektriği kapatın, sağlam ayakkabı giyin ve belirlenmiş toplanma alanına gidin.
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.quizCta}
                    onPress={() => router.push("/more/earthquake_quiz")}
                    activeOpacity={0.85}
                >
                    <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#fff" />
                    <Text style={styles.quizCtaText}>Kendini Test Et</Text>
                    <Text style={styles.quizCtaSubtext}>10 soruluk deprem hazırlık testi</Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Bu bilgiler AFAD ve uluslararası deprem protokollerine dayanmaktadır. Düzenli tatbikat yapmayı unutmayın.
                    </Text>
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    hero: {
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    heroIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
        ...Shadows.lg,
    },
    heroTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        paddingHorizontal: Spacing.sm,
    },
    heroSubtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        lineHeight: 20,
    },
    card: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        ...Shadows.md,
    },
    stepBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        alignSelf: "flex-start",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
    },
    stepNumber: {
        fontSize: Typography.sizes.lg,
        fontWeight: "900",
    },
    stepTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: "900",
        color: Colors.text.dark,
        letterSpacing: 0.5,
    },
    stepSubtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.primary,
        fontWeight: "700",
        marginTop: 4,
    },
    stepBody: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 22,
        marginTop: Spacing.sm,
    },
    extraCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.md,
        backgroundColor: Colors.status.warning + "15",
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.status.warning + "40",
    },
    extraText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.text.dark,
        lineHeight: 21,
        fontWeight: "600",
    },
    quizCta: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        alignItems: "center",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: Spacing.sm,
        ...Shadows.lg,
    },
    quizCtaText: {
        fontSize: Typography.sizes.lg,
        fontWeight: "900",
        color: "#fff",
    },
    quizCtaSubtext: {
        width: "100%",
        fontSize: Typography.sizes.xs,
        color: "rgba(255,255,255,0.9)",
        marginTop: 2,
    },
    footer: {
        marginTop: Spacing.xl,
        paddingHorizontal: Spacing.sm,
    },
    footerText: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontStyle: "italic",
        textAlign: "center",
        lineHeight: 18,
    },
});
