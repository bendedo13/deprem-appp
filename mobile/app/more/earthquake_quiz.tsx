/**
 * Deprem hazırlık quiz'i — 10 rastgele soru, sonuç ekranında doğru/yanlış ve "Neden?" açıklamaları.
 */

import { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const QUIZ_SIZE = 10;

interface QuizItem {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

// Rastgele 10 soru seç (soru havuzu import edilecek)
function pickRandomQuestions(all: QuizItem[], count: number): QuizItem[] {
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

export default function EarthquakeQuizScreen() {
    const [questions, setQuestions] = useState<QuizItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<number[]>([]);
    const [showResult, setShowResult] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await require("../../src/data/earthquake_quiz.json") as QuizItem[];
                if (mounted) setQuestions(pickRandomQuestions(data, QUIZ_SIZE));
            } catch (e) {
                if (mounted) setQuestions([]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const handleAnswer = useCallback((selectedIndex: number) => {
        setAnswers((prev) => [...prev, selectedIndex]);
        if (currentIndex + 1 >= questions.length) {
            setShowResult(true);
        } else {
            setCurrentIndex((i) => i + 1);
        }
    }, [currentIndex, questions.length]);

    const correctCount = answers.filter((a, i) => questions[i] && a === questions[i].correctIndex).length;
    const wrongIndices = answers
        .map((a, i) => (questions[i] && a !== questions[i].correctIndex ? i : -1))
        .filter((i) => i >= 0);

    if (loading) {
        return (
            <>
                <Stack.Screen options={{ title: "Deprem Testi" }} />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Sorular yükleniyor…</Text>
                </View>
            </>
        );
    }

    if (questions.length === 0) {
        return (
            <>
                <Stack.Screen options={{ title: "Deprem Testi" }} />
                <View style={styles.centered}>
                    <Text style={styles.errorText}>Soru bankası yüklenemedi.</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Geri</Text>
                    </TouchableOpacity>
                </View>
            </>
        );
    }

    // Sonuç ekranı
    if (showResult) {
        return (
            <>
                <Stack.Screen options={{ title: "Test Sonucu" }} />
                <ScrollView style={styles.container} contentContainerStyle={styles.resultContent}>
                    <View style={styles.resultHeader}>
                        <View style={[styles.resultCircle, correctCount >= 7 ? styles.resultCircleGood : styles.resultCircleWeak]}>
                            <Text style={styles.resultScore}>{correctCount} / {questions.length}</Text>
                            <Text style={styles.resultLabel}>Doğru</Text>
                        </View>
                        <Text style={styles.resultTitle}>
                            {correctCount >= 7 ? "Tebrikler!" : "Daha fazla çalışın"}
                        </Text>
                        <Text style={styles.resultSubtitle}>
                            {correctCount >= 7
                                ? "Deprem hazırlığı konusunda iyi bir temele sahipsiniz."
                                : "Deprem Akademisi bölümünü tekrar okuyup testi yenileyebilirsiniz."}
                        </Text>
                    </View>

                    {wrongIndices.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Yanlış yaptığınız sorular — Neden?</Text>
                            {wrongIndices.map((idx) => {
                                const q = questions[idx];
                                const userChoice = answers[idx];
                                return (
                                    <View key={q.id} style={styles.explanationCard}>
                                        <Text style={styles.explanationQuestion}>{q.question}</Text>
                                        <Text style={styles.explanationYourAnswer}>
                                            Sizin cevabınız: {q.options[userChoice]}
                                        </Text>
                                        <Text style={styles.explanationCorrect}>
                                            Doğru cevap: {q.options[q.correctIndex]}
                                        </Text>
                                        <View style={styles.whyRow}>
                                            <MaterialCommunityIcons name="information-outline" size={18} color={Colors.primary} />
                                            <Text style={styles.explanationWhy}>{q.explanation}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.resultActions}>
                        <TouchableOpacity style={styles.retryBtn} onPress={() => router.replace("/more/earthquake_quiz")}>
                            <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
                            <Text style={styles.retryBtnText}>Tekrar Çöz</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.academyBtn} onPress={() => router.back()}>
                            <Text style={styles.academyBtnText}>Akademiye Dön</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </>
        );
    }

    // Soru ekranı
    const q = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <>
            <Stack.Screen options={{ title: `Soru ${currentIndex + 1}/${questions.length}` }} />
            <View style={styles.container}>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.questionText}>{q.question}</Text>
                    {q.options.map((opt, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.optionBtn}
                            onPress={() => handleAnswer(idx)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.optionNumber}>
                                <Text style={styles.optionNumberText}>{String.fromCharCode(65 + idx)}</Text>
                            </View>
                            <Text style={styles.optionText}>{opt}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.text.muted} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.xl,
    },
    loadingText: { marginTop: Spacing.md, color: Colors.text.muted, fontWeight: "600" },
    errorText: { color: Colors.text.muted, textAlign: "center", marginBottom: Spacing.lg },
    backBtn: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
    },
    backBtnText: { color: "#fff", fontWeight: "800" },

    progressBar: {
        height: 4,
        backgroundColor: Colors.background.surface,
        width: "100%",
    },
    progressFill: {
        height: "100%",
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    scroll: { flex: 1 },
    scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    questionText: {
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: Spacing.xl,
        lineHeight: 26,
    },
    optionBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    optionNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary + "30",
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    optionNumberText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        color: Colors.primary,
    },
    optionText: { flex: 1, fontSize: Typography.sizes.md, color: Colors.text.dark, fontWeight: "600" },

    resultContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    resultHeader: {
        alignItems: "center",
        marginBottom: Spacing.xl,
    },
    resultCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    resultCircleGood: { backgroundColor: Colors.primary + "30" },
    resultCircleWeak: { backgroundColor: Colors.accent + "30" },
    resultScore: {
        fontSize: Typography.sizes.xxxl,
        fontWeight: "900",
        color: Colors.text.dark,
    },
    resultLabel: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "700", marginTop: 2 },
    resultTitle: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.text.dark },
    resultSubtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    section: { marginTop: Spacing.lg },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },
    explanationCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        borderLeftWidth: 4,
        borderLeftColor: Colors.accent,
    },
    explanationQuestion: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: Spacing.sm,
    },
    explanationYourAnswer: { fontSize: 12, color: Colors.danger, fontWeight: "600", marginBottom: 4 },
    explanationCorrect: { fontSize: 12, color: Colors.primary, fontWeight: "700", marginBottom: Spacing.sm },
    whyRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.sm,
    },
    explanationWhy: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 20,
    },
    resultActions: {
        marginTop: Spacing.xl,
        gap: Spacing.md,
    },
    retryBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.xl,
    },
    retryBtnText: { color: "#fff", fontWeight: "800" },
    academyBtn: {
        alignItems: "center",
        paddingVertical: Spacing.md,
    },
    academyBtnText: { color: Colors.primary, fontWeight: "700" },
});
