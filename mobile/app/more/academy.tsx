import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Vibration,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

type Question = {
    id: string;
    text: string;
    options: { id: string; label: string; correct?: boolean }[];
};

const QUIZ_KEY = "quakesense_academy_quiz_v1";

const QUESTIONS: Question[] = [
    {
        id: "q1",
        text: "Deprem anında EVDEYKEN en güvenli hareket hangisidir?",
        options: [
            { id: "a", label: "Pencereden dışarı atlamak" },
            { id: "b", label: "Sağlam bir masanın altına ÇÖK-KAPAN-TUTUN", correct: true },
            { id: "c", label: "Asansöre binip en alt kata inmek" },
        ],
    },
    {
        id: "q2",
        text: "DEPREM SIRASINDA ARAÇTAYSANIZ ne yapmalısınız?",
        options: [
            { id: "a", label: "Köprü ve tünellerin tam altına park etmek" },
            { id: "b", label: "Güvenli bir yerde durup araç içinde kalmak", correct: true },
            { id: "c", label: "Hemen aracı terk edip koşmak" },
        ],
    },
    {
        id: "q3",
        text: "ENKAZ ALTINDAYSANIZ ilk yapmanız gereken ne olmalıdır?",
        options: [
            { id: "a", label: "Bağırarak sürekli yardım istemek" },
            { id: "b", label: "Tozu azaltmak için ağız ve burnu kapatıp sakin kalmak", correct: true },
            { id: "c", label: "Etrafı kazmak için sürekli hareket etmek" },
        ],
    },
];

export default function AcademyScreen() {
    const [passed, setPassed] = useState(false);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(QUIZ_KEY);
                if (raw) {
                    const data = JSON.parse(raw) as { passed: boolean };
                    if (data.passed) setPassed(true);
                }
            } catch {
                // ignore
            }
        })();
    }, []);

    const handleSelect = (qId: string, optId: string) => {
        Vibration.vibrate(10);
        setAnswers((prev) => ({ ...prev, [qId]: optId }));
    };

    const handleSubmit = async () => {
        Vibration.vibrate(20);
        setSubmitted(true);
        const correctCount = QUESTIONS.filter((q) => {
            const chosen = answers[q.id];
            return q.options.some((o) => o.id === chosen && o.correct);
        }).length;
        if (correctCount === QUESTIONS.length && !passed) {
            setPassed(true);
            try {
                await AsyncStorage.setItem(QUIZ_KEY, JSON.stringify({ passed: true }));
            } catch {
                // ignore
            }
        }
    };

    const correctCount = QUESTIONS.filter((q) => {
        const chosen = answers[q.id];
        return q.options.some((o) => o.id === chosen && o.correct);
    }).length;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="school-outline" size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Deprem Akademisi</Text>
                    <Text style={styles.headerSubtitle}>
                        Deprem anında doğru davranışları öğrenin, hazırlık skorunuzu güçlendirin.
                    </Text>
                </View>
            </View>

            {/* Senaryolar */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Deprem Anında Ne Yapmalı?</Text>

                <View style={styles.scenarioCard}>
                    <View style={styles.scenarioIcon}>
                        <MaterialCommunityIcons name="home-thermometer-outline" size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.scenarioTitle}>EVDE</Text>
                        <Text style={styles.scenarioText}>
                            Pencerelerden ve devrilebilecek eşyalardan uzak durun. Sağlam bir masa veya
                            iç duvar yanında ÇÖK-KAPAN-TUTUN pozisyonu alın. Asansöre binmeyin.
                        </Text>
                    </View>
                </View>

                <View style={styles.scenarioCard}>
                    <View style={[styles.scenarioIcon, { backgroundColor: Colors.accent }]}>
                        <MaterialCommunityIcons name="office-building-marker-outline" size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.scenarioTitle}>DIŞARIDA</Text>
                        <Text style={styles.scenarioText}>
                            Binalardan, enerji hatlarından ve ağaçlardan uzak, açık bir alana geçin. Deniz
                            kıyısından uzaklaşın, panik yapmadan çevrenizi gözlemleyin.
                        </Text>
                    </View>
                </View>

                <View style={styles.scenarioCard}>
                    <View style={[styles.scenarioIcon, { backgroundColor: "#0ea5e9" }]}>
                        <MaterialCommunityIcons name="car-emergency" size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.scenarioTitle}>ARAÇTA</Text>
                        <Text style={styles.scenarioText}>
                            Köprü, tünel ve üst geçitlerden uzak, güvenli bir noktada durun. Emniyet kemerinizi
                            takılı tutarak araç içinde bekleyin, yolları acil araçlar için boş bırakın.
                        </Text>
                    </View>
                </View>

                <View style={styles.scenarioCard}>
                    <View style={[styles.scenarioIcon, { backgroundColor: Colors.danger }]}>
                        <MaterialCommunityIcons name="account-hard-hat" size={22} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.scenarioTitle}>ENKAZ ALTINDA</Text>
                        <Text style={styles.scenarioText}>
                            Tozdan korunmak için ağzınızı ve burnunuzu bezle kapatın. Enerjinizi koruyun, düzenli
                            aralıklarla metal yüzeylere vurarak ses verin. Sürekli bağırmak yerine nefesinizi idareli kullanın.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Quiz */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Hayatta Kalma Bilgisi Testi</Text>
                {QUESTIONS.map((q) => (
                    <View key={q.id} style={styles.questionCard}>
                        <Text style={styles.questionText}>{q.text}</Text>
                        {q.options.map((opt) => {
                            const selected = answers[q.id] === opt.id;
                            const isCorrect = opt.correct;
                            const showState = submitted;
                            const success = showState && selected && isCorrect;
                            const error = showState && selected && !isCorrect;
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[
                                        styles.optionBtn,
                                        selected && styles.optionSelected,
                                        success && styles.optionCorrect,
                                        error && styles.optionWrong,
                                    ]}
                                    onPress={() => handleSelect(q.id, opt.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.optionText,
                                            selected && styles.optionTextSelected,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                    {success && (
                                        <MaterialCommunityIcons
                                            name="check-circle"
                                            size={18}
                                            color="#22c55e"
                                        />
                                    )}
                                    {error && (
                                        <MaterialCommunityIcons
                                            name="close-circle"
                                            size={18}
                                            color="#ef4444"
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleSubmit}
                    activeOpacity={0.9}
                >
                    <Text style={styles.submitText}>Skorumu Göster</Text>
                </TouchableOpacity>

                <View style={styles.scoreBox}>
                    <Text style={styles.scoreTitle}>Hazırlık Skoru</Text>
                    <Text style={styles.scoreValue}>
                        {correctCount} / {QUESTIONS.length}
                    </Text>
                    {submitted && correctCount === QUESTIONS.length && (
                        <Text style={styles.scoreSub}>
                            Harika! Tüm cevaplar doğru. Hazırlık seviyen maksimum. 🎯
                        </Text>
                    )}
                    {submitted && correctCount < QUESTIONS.length && (
                        <Text style={styles.scoreSub}>
                            Bazı cevaplar hatalı. Senaryoları tekrar inceleyip testi yeniden çözebilirsin.
                        </Text>
                    )}
                    {passed && (
                        <View style={styles.badgeRow}>
                            <MaterialCommunityIcons name="shield-star" size={18} color={Colors.primary} />
                            <Text style={styles.badgeText}>Deprem Akademisi Tamamlandı</Text>
                        </View>
                    )}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 18,
        backgroundColor: Colors.accent,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.md,
    },
    headerTitle: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.text.dark,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "500",
        marginTop: 2,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },
    scenarioCard: {
        flexDirection: "row",
        gap: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        marginBottom: Spacing.sm,
    },
    scenarioIcon: {
        width: 40,
        height: 40,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    scenarioTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: 4,
    },
    scenarioText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 18,
        fontWeight: "500",
    },
    questionCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        marginBottom: Spacing.md,
    },
    questionText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: Spacing.md,
    },
    optionBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        backgroundColor: Colors.background.dark,
        marginBottom: 6,
    },
    optionSelected: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "10",
    },
    optionCorrect: {
        borderColor: "#22c55e",
        backgroundColor: "#22c55e20",
    },
    optionWrong: {
        borderColor: "#ef4444",
        backgroundColor: "#ef444420",
    },
    optionText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "600",
        marginRight: Spacing.sm,
    },
    optionTextSelected: {
        color: Colors.text.dark,
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        alignItems: "center",
        justifyContent: "center",
        ...Shadows.lg,
    },
    submitText: {
        color: "#fff",
        fontSize: Typography.sizes.md,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
    scoreBox: {
        marginTop: Spacing.lg,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        alignItems: "center",
        gap: 6,
    },
    scoreTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: "900",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    scoreValue: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.primary,
    },
    scoreSub: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        textAlign: "center",
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
    },
    badgeText: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
});

