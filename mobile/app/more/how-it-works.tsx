/**
 * Nasıl Çalışır? — QuakeSense'in çalışma mantığını anlatan step-by-step rehber.
 */

import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

interface StepCardProps {
    step: number;
    icon: string;
    iconColor: string;
    title: string;
    description: string;
}

function StepCard({ step, icon, iconColor, title, description }: StepCardProps) {
    return (
        <View style={styles.stepCard}>
            <View style={styles.stepLeft}>
                <View style={[styles.stepNumber, { backgroundColor: iconColor + "15" }]}>
                    <Text style={[styles.stepNumberText, { color: iconColor }]}>{step}</Text>
                </View>
                {step < 6 && <View style={[styles.stepLine, { backgroundColor: iconColor + "20" }]} />}
            </View>
            <View style={styles.stepContent}>
                <View style={[styles.stepIconBox, { backgroundColor: iconColor + "15" }]}>
                    <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
                </View>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepDesc}>{description}</Text>
            </View>
        </View>
    );
}

interface FeatureCardProps {
    icon: string;
    color: string;
    title: string;
    description: string;
}

function FeatureCard({ icon, color, title, description }: FeatureCardProps) {
    return (
        <View style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: color + "15" }]}>
                <MaterialCommunityIcons name={icon as any} size={22} color={color} />
            </View>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{description}</Text>
        </View>
    );
}

export default function HowItWorksScreen() {
    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Nasıl Çalışır?</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroCard}>
                    <View style={styles.heroIconBox}>
                        <MaterialCommunityIcons name="shield-check" size={40} color="#fff" />
                    </View>
                    <Text style={styles.heroTitle}>QuakeSense Erken Uyarı</Text>
                    <Text style={styles.heroDesc}>
                        Gelişmiş sensör teknolojisi ve yapay zeka ile deprem dalgalarını
                        analiz ederek saniyeler içinde uyarı verir.
                    </Text>
                </View>

                {/* Step by Step */}
                <Text style={styles.sectionHeader}>Adım Adım Çalışma Mantığı</Text>

                <StepCard
                    step={1}
                    icon="access-point"
                    iconColor={Colors.status.info}
                    title="Veri Toplama"
                    description="AFAD, Kandilli Rasathanesi ve uluslararası sismoloji merkezlerinden anlık deprem verileri toplanır."
                />
                <StepCard
                    step={2}
                    icon="vibrate"
                    iconColor={Colors.primary}
                    title="Sensör İzleme"
                    description="Telefonunuzun ivmeölçer sensörü sürekli aktif kalarak yer hareketlerini milisaniye hassasiyetinde izler."
                />
                <StepCard
                    step={3}
                    icon="chart-timeline-variant"
                    iconColor={Colors.accent}
                    title="P Dalgası Algılama"
                    description="STA/LTA algoritması ile deprem P dalgasını (birincil dalga) tespit eder. P dalgası hızlı ancak hafiftir."
                />
                <StepCard
                    step={4}
                    icon="brain"
                    iconColor="#8B5CF6"
                    title="AI Doğrulama"
                    description="Yapay zeka modeli, algılanan sinyali analiz ederek yanlış alarmları filtreler (yürüme, araç titreşimi vb.)."
                />
                <StepCard
                    step={5}
                    icon="bell-ring"
                    iconColor={Colors.danger}
                    title="Erken Uyarı"
                    description="S dalgası (yıkıcı dalga) gelmeden 3-15 saniye önce sesli alarm, titreşim ve flaş ile uyarı verilir."
                />
                <StepCard
                    step={6}
                    icon="account-group"
                    iconColor={Colors.primary}
                    title="Acil Bildirim"
                    description="'Ben İyiyim' butonuyla acil durum kişilerinize konumunuzla birlikte otomatik bildirim gönderilir."
                />

                {/* SOS Feature Section */}
                <Text style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>S.O.S Sistemi</Text>

                <View style={styles.sosCard}>
                    <View style={styles.sosIconOuter}>
                        <MaterialCommunityIcons name="alert-circle" size={32} color="#fff" />
                    </View>
                    <Text style={styles.sosTitle}>Sesli S.O.S Mesajı</Text>
                    <Text style={styles.sosDesc}>
                        S.O.S butonuna 2 saniye basılı tutarak sesli mesaj kaydedebilirsiniz.
                        AI mesajınızı analiz eder ve acil kişilerinize konumunuzla birlikte iletir.
                        Gerçek acil durumlarda mutlaka 112'yi arayın.
                    </Text>
                </View>

                {/* Key Features Grid */}
                <Text style={[styles.sectionHeader, { marginTop: Spacing.xl }]}>Temel Özellikler</Text>

                <View style={styles.featuresGrid}>
                    <FeatureCard
                        icon="map-marker-radius"
                        color={Colors.primary}
                        title="Konum Bazlı"
                        description="Yakınınızdaki depremleri öncelikli bildirir"
                    />
                    <FeatureCard
                        icon="clock-fast"
                        color={Colors.accent}
                        title="Anlık Veri"
                        description="WebSocket ile gerçek zamanlı güncelleme"
                    />
                    <FeatureCard
                        icon="shield-lock"
                        color={Colors.status.info}
                        title="Güvenli"
                        description="Verileriniz şifreli ve güvendedir"
                    />
                    <FeatureCard
                        icon="earth"
                        color="#8B5CF6"
                        title="Resmi Kaynak"
                        description="Devlet kurumu API'lerinden veri"
                    />
                </View>

                {/* Trust Footer */}
                <View style={styles.trustFooter}>
                    <MaterialCommunityIcons name="shield-check" size={16} color={Colors.primary} />
                    <Text style={styles.trustText}>
                        Deprem verileri resmi devlet kurumu API'lerinden anlık olarak sağlanmaktadır.
                    </Text>
                </View>

                <Text style={styles.copyrightText}>developed by Alan 2017-2026 ©</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        paddingTop: Platform.OS === "android" ? 30 : 0,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark },
    content: { padding: Spacing.md, paddingBottom: Spacing.xxxl },

    // Hero
    heroCard: {
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "20",
        padding: Spacing.xl,
        marginBottom: Spacing.xl,
        gap: Spacing.md,
    },
    heroIconBox: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.md,
    },
    heroTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: "800",
        color: Colors.text.dark,
        textAlign: "center",
    },
    heroDesc: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 20,
    },

    // Section Header
    sectionHeader: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: Spacing.md,
        marginLeft: 4,
    },

    // Step Card
    stepCard: {
        flexDirection: "row",
        marginBottom: 4,
    },
    stepLeft: {
        alignItems: "center",
        width: 36,
        marginRight: Spacing.md,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    stepNumberText: {
        fontSize: 12,
        fontWeight: "900",
    },
    stepLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
    },
    stepContent: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        gap: 6,
    },
    stepIconBox: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "flex-start",
    },
    stepTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: "700",
        color: Colors.text.dark,
    },
    stepDesc: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 18,
    },

    // SOS Card
    sosCard: {
        alignItems: "center",
        backgroundColor: Colors.danger + "08",
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.danger + "20",
        padding: Spacing.xl,
        gap: Spacing.md,
    },
    sosIconOuter: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.danger,
        justifyContent: "center",
        alignItems: "center",
    },
    sosTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.danger,
    },
    sosDesc: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 20,
    },

    // Features Grid
    featuresGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
    },
    featureCard: {
        width: "48%",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.md,
        gap: 6,
    },
    featureIconBox: {
        width: 40,
        height: 40,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    featureTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.dark,
    },
    featureDesc: {
        fontSize: 11,
        color: Colors.text.muted,
        lineHeight: 16,
    },

    // Trust Footer
    trustFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: Colors.primary + "08",
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginTop: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "15",
    },
    trustText: {
        flex: 1,
        fontSize: 11,
        fontWeight: "600",
        color: Colors.primary,
        lineHeight: 16,
    },
    copyrightText: {
        textAlign: "center",
        fontSize: 11,
        fontWeight: "600",
        color: Colors.text.muted,
        opacity: 0.6,
        marginTop: Spacing.lg,
    },
});
