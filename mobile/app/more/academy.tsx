/**
 * Deprem Akademisi — Eğitim kartları + 10 soruluk interaktif test.
 */

import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Animated,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

// ─── Content ──────────────────────────────────────────────────────────────────

const TOPICS = [
    {
        id: 1,
        icon: "alert-circle-outline",
        color: "#ef4444",
        title: "Deprem Nedir?",
        summary: "Yer kabuğundaki kırılmalar.",
        content: [
            "🌍 Deprem, yer kabuğundaki plakaların hareketiyle oluşan titreşimlerdir.",
            "⚡ P dalgaları (birincil) önce gelir — daha az hasar verir.",
            "🌊 S dalgaları (ikincil) sonra gelir — asıl yıkım bunlardan olur.",
            "📏 Büyüklük (Mw) ve Şiddet (MMI) farklı ölçütlerdir.",
            "🏔️ Türkiye, Anadolu plakasının hareketleri nedeniyle aktif sismik bölgedir.",
            "🔴 Kuzey Anadolu Fayı (KAF) Marmara'dan Doğu Anadolu'ya uzanır.",
        ],
    },
    {
        id: 2,
        icon: "run-fast",
        color: "#f97316",
        title: "Deprem Anında Ne Yapmalı?",
        summary: "Çök-Kapan-Tutun tekniği.",
        content: [
            "🟡 ÇÖK: Yere çömelin — ayakta kalmaya çalışmayın.",
            "🟡 KAPAN: Başınızı ve boynunuzu kollarınızla koruyun.",
            "🟡 TUTUN: Sağlam bir masaya veya duvara tutunun.",
            "❌ ASLA koşmayın, merdivene çıkmayın, asansör kullanmayın.",
            "🏠 Bina içindeyseniz içeride kalın — kapı çerçevesi güvenilir DEĞİLDİR.",
            "🌳 Dışarıdaysanız bina ve ağaçlardan uzak açık alanlara gidin.",
            "🚗 Araç içindeyseniz güvenli bir yere çekin, araçta kalın.",
        ],
    },
    {
        id: 3,
        icon: "home-clock-outline",
        color: "#eab308",
        title: "Deprem Sonrası Güvenlik",
        summary: "İlk 72 saat kritik!",
        content: [
            "🔍 Önce kendinizi ve yanınızdakileri kontrol edin.",
            "🔥 Gaz kaçağına dikkat — tüm gaz vanalarını kapatın.",
            "⚡ Elektrik panosunu kapatın — elektrik kıvılcımı yangın çıkarabilir.",
            "🚪 Binayı terk etmeden önce çatlak ve hasar kontrol edin.",
            "📻 Acil durum yayınlarını (radyo/112) takip edin.",
            "💧 Musluk suyunun güvenli olduğu teyit edilene kadar içmeyin.",
            "⏰ İlk 72 saat boyunca artçı sarsıntılara hazırlıklı olun.",
        ],
    },
    {
        id: 4,
        icon: "bag-personal-outline",
        color: "#10B981",
        title: "Deprem Çantası",
        summary: "72 saatlik hayatta kalma kiti.",
        content: [
            "💧 En az 3 günlük su (kişi başı 3 litre/gün).",
            "🥫 3 günlük uzun raf ömürlü yiyecek.",
            "🔋 El feneri + yedek pil (şarjlı tercih edin).",
            "🩹 İlk yardım çantası + kişisel ilaçlar (en az 7 günlük).",
            "📱 Fiziki kopyalı önemli belgeler (nüfus cüzdanı, tapu, sigorta).",
            "🔑 Yedek anahtar + nakit para.",
            "👕 Mevsime uygun kıyafet + battaniye.",
            "📻 Pilli radyo + düdük + not defteri + kalem.",
        ],
    },
    {
        id: 5,
        icon: "shield-star-outline",
        color: "#6366f1",
        title: "Bina Güvenliği & DASK",
        summary: "Bina risk değerlendirmesi.",
        content: [
            "🏗️ 1999 öncesi inşaatlar genellikle deprem yönetmeliğine uymaz.",
            "🔬 Zemin sınıfı (Z1-Z4) bina güvenliğini doğrudan etkiler.",
            "📋 DASK (Doğal Afet Sigortaları Kurumu) zorunlu bir sigorta türüdür.",
            "💰 DASK olmadan devlet yardımı alamayabilirsiniz.",
            "🏛️ Bina güçlendirme (retrofit) hasar riskini %60-80 azaltabilir.",
            "⚙️ Temel sağlamlama, kolon güçlendirme, bölme duvar analizi yapılmalıdır.",
            "📞 Üniversite inşaat mühendislerinden ücretsiz bina risk danışmanlığı alabilirsiniz.",
        ],
    },
];

const QUIZ: Array<{ q: string; options: string[]; correct: number; explanation: string }> = [
    {
        q: "Deprem anında binada bulunuyorsanız ne yapmalısınız?",
        options: ["Hemen koşarak binadan çıkın", "Çök-Kapan-Tutun tekniğini uygulayın", "Merdivene çıkın", "Asansörü kullanın"],
        correct: 1,
        explanation: "Çök-Kapan-Tutun en güvenli tekniktir. Binadan koşarak çıkmak çöken enkaza yakalanma riskini artırır.",
    },
    {
        q: "DASK nedir?",
        options: ["Deprem araştırma kurumu", "Zorunlu deprem sigortası sistemi", "AFAD'ın bir kolu", "İtfaiye birimi"],
        correct: 1,
        explanation: "DASK (Doğal Afet Sigortaları Kurumu) konutlar için zorunlu bir deprem sigortasıdır.",
    },
    {
        q: "Deprem çantasında kaç günlük su bulundurulmalıdır?",
        options: ["1 gün", "3 gün", "7 gün", "14 gün"],
        correct: 1,
        explanation: "Standart deprem çantası 72 saat (3 gün) için hazırlanır. Kişi başı günde 3 litre su gerekir.",
    },
    {
        q: "P ve S dalgaları arasındaki fark nedir?",
        options: [
            "P dalgaları daha yavaş gelir ve daha tehlikelidir",
            "P dalgaları önce gelir ve daha az hasar verir",
            "İkisi aynı anda gelir",
            "S dalgaları önce gelir",
        ],
        correct: 1,
        explanation: "P (birincil) dalgaları önce ulaşır ve daha az hasar verir. S (ikincil) dalgaları sonra gelir ve asıl yıkıma neden olur.",
    },
    {
        q: "Deprem sonrası gaz kaçağı şüphesinde ne yapmalısınız?",
        options: [
            "Işık açıp kontrol edin",
            "Ana gaz vanasını kapatıp binadan uzaklaşın",
            "Telefon açın",
            "Doğalgaz bacasını kontrol edin",
        ],
        correct: 1,
        explanation: "Gaz kaçağında elektrik kıvılcımı yangına yol açabilir. Ana vanayı kapatıp binadan çıkın ve 187'yi arayın.",
    },
    {
        q: "Kuzey Anadolu Fayı (KAF) hangi bölgeden geçer?",
        options: ["Ege kıyıları", "İç Anadolu bozkırı", "Marmara'dan Doğu Anadolu'ya", "Akdeniz kıyısı"],
        correct: 2,
        explanation: "KAF, Marmara Denizi'nden başlayıp Doğu Anadolu'ya kadar uzanan aktif bir faydır.",
    },
    {
        q: "Deprem sırasında araç içindeyseniz ne yapmalısınız?",
        options: ["Arabadan atlamaya çalışın", "Araçta kalın, güvenli bir yere çekin", "Hızlanıp bölgeden çıkın", "Arabayı terk edip koşun"],
        correct: 1,
        explanation: "Araç içindeyseniz güvenli, açık bir alana çekin ve sarsıntı geçene kadar araçta kalın. Köprü veya üstgeçit altına girmeyin.",
    },
    {
        q: "1999 Marmara Depremi'nin büyüklüğü neydi?",
        options: ["Mw 6.2", "Mw 7.4", "Mw 8.1", "Mw 5.9"],
        correct: 1,
        explanation: "17 Ağustos 1999 Marmara Depremi Mw 7.4 büyüklüğünde olup 17.000'den fazla kişi hayatını kaybetmiştir.",
    },
    {
        q: "Depremde 'üçgen hayat üçgeni' teorisi hakkında doğru olan nedir?",
        options: [
            "En güvenli korunma yöntemidir",
            "Bilimsel olarak kanıtlanmış değildir, Çök-Kapan-Tutun tercih edilmeli",
            "AFAD tarafından önerilmektedir",
            "Sadece yüksek katlı binalar için geçerlidir",
        ],
        correct: 1,
        explanation: "Hayat üçgeni teorisi bilimsel olarak desteklenmemektedir. AFAD ve uluslararası kuruluşlar Çök-Kapan-Tutun yöntemini önermektedir.",
    },
    {
        q: "Bina zemin sınıfı Z4 ne anlama gelir?",
        options: ["Kaya zemin — en güvenli", "Sert zemin", "Orta sert zemin", "Yumuşak kil zemin — en riskli"],
        correct: 3,
        explanation: "Z4 zemin sınıfı yumuşak kil zeminleri temsil eder ve deprem sırasında sıvılaşma riski taşır. En yüksek risk sınıfıdır.",
    },
];

// ─── Quiz Component ───────────────────────────────────────────────────────────

function QuizScreen({ onFinish }: { onFinish: (score: number, wrong: number[]) => void }) {
    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [answers, setAnswers] = useState<(number | null)[]>(Array(QUIZ.length).fill(null));
    const [showExplanation, setShowExplanation] = useState(false);

    const question = QUIZ[currentQ];
    const isCorrect = selected === question.correct;

    const handleSelect = (idx: number) => {
        if (selected !== null) return;
        setSelected(idx);
        setShowExplanation(true);
        const newAnswers = [...answers];
        newAnswers[currentQ] = idx;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQ + 1 < QUIZ.length) {
            setCurrentQ(currentQ + 1);
            setSelected(null);
            setShowExplanation(false);
        } else {
            const wrongIndices = answers.reduce<number[]>((acc, a, i) => {
                if (a !== QUIZ[i].correct) acc.push(i);
                return acc;
            }, []);
            const score = QUIZ.length - wrongIndices.length;
            onFinish(score, wrongIndices);
        }
    };

    const progress = ((currentQ) / QUIZ.length) * 100;

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg }}>
            {/* Progress */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>Soru {currentQ + 1} / {QUIZ.length}</Text>

            {/* Question */}
            <Text style={styles.questionText}>{question.q}</Text>

            {/* Options */}
            {question.options.map((opt, idx) => {
                let bgColor = Colors.background.surface;
                let borderColor = Colors.border.dark;
                let textColor = Colors.text.dark;

                if (selected !== null) {
                    if (idx === question.correct) {
                        bgColor = "#10B98115";
                        borderColor = "#10B981";
                        textColor = "#10B981";
                    } else if (idx === selected && selected !== question.correct) {
                        bgColor = "#ef444415";
                        borderColor = "#ef4444";
                        textColor = "#ef4444";
                    }
                }

                return (
                    <TouchableOpacity
                        key={idx}
                        style={[styles.optionBtn, { backgroundColor: bgColor, borderColor }]}
                        onPress={() => handleSelect(idx)}
                        activeOpacity={selected !== null ? 1 : 0.7}
                    >
                        <View style={[styles.optionCircle, { borderColor }]}>
                            {selected !== null && idx === question.correct && (
                                <MaterialCommunityIcons name="check" size={14} color="#10B981" />
                            )}
                            {selected !== null && idx === selected && selected !== question.correct && (
                                <MaterialCommunityIcons name="close" size={14} color="#ef4444" />
                            )}
                            {(selected === null || (idx !== selected && idx !== question.correct)) && (
                                <Text style={[styles.optionLetter, { color: textColor }]}>{String.fromCharCode(65 + idx)}</Text>
                            )}
                        </View>
                        <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                    </TouchableOpacity>
                );
            })}

            {/* Explanation */}
            {showExplanation && (
                <View style={[styles.explanationBox, { backgroundColor: isCorrect ? "#10B98110" : "#ef444410", borderColor: isCorrect ? "#10B98140" : "#ef444440" }]}>
                    <MaterialCommunityIcons
                        name={isCorrect ? "check-circle-outline" : "information-outline"}
                        size={18}
                        color={isCorrect ? "#10B981" : "#ef4444"}
                    />
                    <Text style={[styles.explanationText, { color: isCorrect ? "#10B981" : Colors.text.muted }]}>
                        {question.explanation}
                    </Text>
                </View>
            )}

            {selected !== null && (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                    <Text style={styles.nextBtnText}>
                        {currentQ + 1 < QUIZ.length ? "Sonraki Soru →" : "Testi Bitir"}
                    </Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

// ─── Score Component ──────────────────────────────────────────────────────────

function ScoreScreen({ score, wrong, onRestart }: { score: number; wrong: number[]; onRestart: () => void }) {
    const percent = Math.round((score / QUIZ.length) * 100);
    const scoreColor = percent >= 80 ? "#10B981" : percent >= 60 ? "#f97316" : "#ef4444";
    const grade = percent >= 80 ? "Mükemmel!" : percent >= 60 ? "İyi Gidiyor" : "Tekrar Çalış";

    return (
        <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: Spacing.xxxl }}>
            <LinearGradient
                colors={[scoreColor + "20", Colors.background.dark]}
                style={styles.scoreCard}
            >
                <Text style={[styles.scoreEmoji]}>{percent >= 80 ? "🏆" : percent >= 60 ? "👍" : "📚"}</Text>
                <Text style={[styles.scorePercent, { color: scoreColor }]}>{percent}%</Text>
                <Text style={[styles.scoreGrade, { color: scoreColor }]}>{grade}</Text>
                <Text style={styles.scoreDetail}>{score} / {QUIZ.length} doğru cevap</Text>
            </LinearGradient>

            {wrong.length > 0 && (
                <View style={{ marginTop: Spacing.xl }}>
                    <Text style={styles.sectionLabel}>📝 Gözden Geçir</Text>
                    {wrong.map((idx) => (
                        <View key={idx} style={styles.reviewCard}>
                            <Text style={styles.reviewQ}>{QUIZ[idx].q}</Text>
                            <Text style={styles.reviewA}>
                                ✅ Doğru: {QUIZ[idx].options[QUIZ[idx].correct]}
                            </Text>
                            <Text style={styles.reviewExp}>{QUIZ[idx].explanation}</Text>
                        </View>
                    ))}
                </View>
            )}

            <TouchableOpacity style={styles.restartBtn} onPress={onRestart}>
                <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
                <Text style={styles.restartBtnText}>Testi Tekrarla</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Screen = "topics" | "topic_detail" | "quiz" | "score";

export default function AcademyScreen() {
    const [screen, setScreen] = useState<Screen>("topics");
    const [selectedTopic, setSelectedTopic] = useState<typeof TOPICS[0] | null>(null);
    const [viewedTopics, setViewedTopics] = useState<Set<number>>(new Set());
    const [quizScore, setQuizScore] = useState(0);
    const [quizWrong, setQuizWrong] = useState<number[]>([]);

    const markViewed = (id: number) => {
        setViewedTopics((prev) => new Set([...prev, id]));
    };

    if (screen === "topic_detail" && selectedTopic) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { setScreen("topics"); }} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{selectedTopic.title}</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ScrollView contentContainerStyle={styles.topicContent}>
                    <View style={[styles.topicIconBox, { backgroundColor: selectedTopic.color + "15" }]}>
                        <MaterialCommunityIcons name={selectedTopic.icon as any} size={48} color={selectedTopic.color} />
                    </View>
                    {selectedTopic.content.map((line, i) => (
                        <View key={i} style={styles.contentLine}>
                            <Text style={styles.contentText}>{line}</Text>
                        </View>
                    ))}
                    <TouchableOpacity
                        style={[styles.doneBtn, { backgroundColor: selectedTopic.color }]}
                        onPress={() => { markViewed(selectedTopic.id); setScreen("topics"); }}
                    >
                        <MaterialCommunityIcons name="check" size={18} color="#fff" />
                        <Text style={styles.doneBtnText}>Konuyu Tamamladım</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    if (screen === "quiz") {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setScreen("topics")} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Deprem Testi</Text>
                    <View style={{ width: 40 }} />
                </View>
                <QuizScreen
                    onFinish={(score, wrong) => {
                        setQuizScore(score);
                        setQuizWrong(wrong);
                        setScreen("score");
                    }}
                />
            </View>
        );
    }

    if (screen === "score") {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setScreen("topics")} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Test Sonucu</Text>
                    <View style={{ width: 40 }} />
                </View>
                <ScoreScreen
                    score={quizScore}
                    wrong={quizWrong}
                    onRestart={() => setScreen("quiz")}
                />
            </View>
        );
    }

    // Topics list
    const allViewed = TOPICS.every((t) => viewedTopics.has(t.id));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Deprem Akademisi</Text>
                    <Text style={styles.subtitle}>{viewedTopics.size} / {TOPICS.length} konu tamamlandı</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.topicList}>
                {/* Progress row */}
                <View style={styles.progressBarWrapper}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${(viewedTopics.size / TOPICS.length) * 100}%` }]} />
                    </View>
                </View>

                <Text style={styles.sectionLabel}>📚 Konular</Text>
                {TOPICS.map((topic) => (
                    <TouchableOpacity
                        key={topic.id}
                        style={[styles.topicCard, viewedTopics.has(topic.id) && styles.topicCardDone]}
                        onPress={() => { setSelectedTopic(topic); setScreen("topic_detail"); }}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.topicIconSmall, { backgroundColor: topic.color + "15" }]}>
                            <MaterialCommunityIcons name={topic.icon as any} size={24} color={topic.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.topicTitle}>{topic.title}</Text>
                            <Text style={styles.topicSummary}>{topic.summary}</Text>
                        </View>
                        {viewedTopics.has(topic.id) ? (
                            <MaterialCommunityIcons name="check-circle" size={22} color="#10B981" />
                        ) : (
                            <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.text.muted} />
                        )}
                    </TouchableOpacity>
                ))}

                {/* Start Quiz button */}
                <TouchableOpacity
                    style={[styles.startQuizBtn, !allViewed && styles.startQuizBtnDisabled]}
                    onPress={() => setScreen("quiz")}
                    disabled={false} // Allow even without viewing all topics
                >
                    <MaterialCommunityIcons name="brain" size={22} color="#fff" />
                    <View>
                        <Text style={styles.startQuizBtnText}>Testi Başlat</Text>
                        {!allViewed && (
                            <Text style={styles.startQuizSubtext}>{TOPICS.length - viewedTopics.size} konu henüz okunmadı</Text>
                        )}
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    header: {
        flexDirection: "row", alignItems: "center", gap: Spacing.md,
        paddingHorizontal: Spacing.md, paddingTop: 50, paddingBottom: Spacing.lg,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.background.surface, justifyContent: "center", alignItems: "center",
        borderWidth: 1, borderColor: Colors.border.dark,
    },
    title: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    // Topics
    topicList: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    progressBarWrapper: { marginBottom: Spacing.xl },
    progressBar: { height: 6, backgroundColor: Colors.background.elevated, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: Colors.primary, borderRadius: 3 },
    sectionLabel: {
        fontSize: 12, fontWeight: "800", color: Colors.text.muted,
        textTransform: "uppercase", letterSpacing: 1, marginBottom: Spacing.md,
    },
    topicCard: {
        flexDirection: "row", alignItems: "center", gap: Spacing.md,
        backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.dark,
        marginBottom: Spacing.sm,
    },
    topicCardDone: { borderColor: "#10B98130", backgroundColor: "#10B98108" },
    topicIconSmall: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
    topicTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark, marginBottom: 2 },
    topicSummary: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500" },

    startQuizBtn: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.xl,
        marginTop: Spacing.xl,
    },
    startQuizBtnDisabled: { backgroundColor: Colors.primary + "80" },
    startQuizBtnText: { color: "#fff", fontSize: Typography.sizes.lg, fontWeight: "900" },
    startQuizSubtext: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "600", marginTop: 1 },

    // Topic detail
    topicContent: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    topicIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: Spacing.xl },
    contentLine: {
        backgroundColor: Colors.background.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border.dark,
    },
    contentText: { fontSize: 14, color: Colors.text.dark, lineHeight: 22, fontWeight: "500" },
    doneBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        padding: Spacing.lg, borderRadius: BorderRadius.xl, marginTop: Spacing.xl,
    },
    doneBtnText: { color: "#fff", fontWeight: "900", fontSize: Typography.sizes.md },

    // Quiz
    progressText: { fontSize: 11, color: Colors.text.muted, fontWeight: "600", textAlign: "center", marginBottom: Spacing.lg, marginTop: 4 },
    questionText: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark, lineHeight: 28, marginBottom: Spacing.xl },
    optionBtn: {
        flexDirection: "row", alignItems: "center", gap: Spacing.md,
        padding: Spacing.md, borderRadius: BorderRadius.xl, borderWidth: 1.5,
        marginBottom: Spacing.sm,
    },
    optionCircle: {
        width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
        justifyContent: "center", alignItems: "center",
    },
    optionLetter: { fontSize: 13, fontWeight: "800" },
    optionText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
    explanationBox: {
        flexDirection: "row", alignItems: "flex-start", gap: 8,
        padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 1,
        marginBottom: Spacing.md,
    },
    explanationText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: "500" },
    nextBtn: {
        backgroundColor: Colors.primary, padding: Spacing.lg,
        borderRadius: BorderRadius.xl, alignItems: "center", marginTop: Spacing.sm,
    },
    nextBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },

    // Score
    scoreCard: {
        borderRadius: BorderRadius.xl, padding: Spacing.xxxl,
        alignItems: "center", borderWidth: 1, borderColor: Colors.border.dark,
    },
    scoreEmoji: { fontSize: 64, marginBottom: Spacing.md },
    scorePercent: { fontSize: 72, fontWeight: "900", lineHeight: 80 },
    scoreGrade: { fontSize: Typography.sizes.xxl, fontWeight: "800", marginBottom: Spacing.sm },
    scoreDetail: { fontSize: Typography.sizes.md, color: Colors.text.muted, fontWeight: "600" },
    reviewCard: {
        backgroundColor: Colors.background.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: "#ef444420",
    },
    reviewQ: { fontSize: 13, fontWeight: "700", color: Colors.text.dark, marginBottom: 6 },
    reviewA: { fontSize: 12, fontWeight: "700", color: "#10B981", marginBottom: 4 },
    reviewExp: { fontSize: 11, color: Colors.text.muted, lineHeight: 16 },
    restartBtn: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.xl,
        marginTop: Spacing.xl,
    },
    restartBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
