/**
 * Hakkimizda - SaaS kurumsal kimlik sayfasi
 * Misyon, Vizyon, Degerler ve Istatistikler
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const STATS = [
    { value: "500K+", label: "Aktif Kullanıcı", icon: "account-group", color: Colors.primary },
    { value: "3", label: "Resmi Veri Kaynağı", icon: "database-check", color: Colors.status.info },
    { value: "0.3s", label: "Uyarı Hızı", icon: "lightning-bolt", color: Colors.accent },
    { value: "%99.7", label: "Doğruluk", icon: "chart-arc", color: Colors.status.success },
];

const VALUES = [
    {
        icon: "shield-check",
        color: Colors.primary,
        title: "Güvenlik Önce Gelir",
        desc: "Her kararımızda kullanıcı güvenliği en üst önceliktir. Veri doğruluğundan ödün vermeyiz.",
    },
    {
        icon: "flash",
        color: Colors.accent,
        title: "Hız Hayat Kurtarır",
        desc: "Milisaniyeler önemlidir. Sistemlerimiz 7/24 kesintisiz çalışarak anlık uyarı üretir.",
    },
    {
        icon: "eye-check",
        color: Colors.status.info,
        title: "Şeffaf ve Güvenilir",
        desc: "Veri kaynaklarımızı, algoritmalarımızı ve metodolojimizi kamuoyuyla paylaşıyoruz.",
    },
];

export default function AboutScreen() {
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hakkımızda</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Hero */}
                <View style={styles.hero}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoBg}>
                            <MaterialCommunityIcons name="shield-check" size={44} color="#fff" />
                        </View>
                        <View style={[styles.logoPulse, { borderColor: Colors.primary + "20" }]} />
                    </View>
                    <Text style={styles.brandName}>QuakeSense</Text>
                    <View style={styles.taglineBadge}>
                        <View style={[styles.taglineDot, { backgroundColor: Colors.primary }]} />
                        <Text style={styles.taglineText}>YAPAY ZEKA DESTEKLİ ERKEN UYARI</Text>
                    </View>
                    <Text style={styles.heroSubtitle}>
                        Türkiye'nin en gelişmiş deprem erken uyarı platformu. Resmi kurumların verileriyle güçlendirilmiş, yapay zeka destekli teknoloji.
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {STATS.map((stat, i) => (
                        <View key={i} style={[styles.statCard, { borderColor: stat.color + "25" }]}>
                            <View style={[styles.statIconBox, { backgroundColor: stat.color + "15" }]}>
                                <MaterialCommunityIcons name={stat.icon as any} size={22} color={stat.color} />
                            </View>
                            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Mission */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: Colors.primary + "15" }]}>
                            <MaterialCommunityIcons name="rocket-launch" size={20} color={Colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Misyonumuz</Text>
                    </View>
                    <View style={[styles.sectionCard, { borderLeftColor: Colors.primary }]}>
                        <Text style={styles.sectionText}>
                            QuakeSense'in misyonu; sismik teknoloji ile yapay zekayı birleştirerek Türkiye'deki her bireye, kuruma ve yerel yönetime anlık, güvenilir ve hayat kurtaran deprem uyarıları sunmaktır.
                        </Text>
                        <Text style={[styles.sectionText, { marginTop: Spacing.md }]}>
                            AFAD, Kandilli Rasathanesi ve USGS'den gelen resmi verileri saniyeler içinde işleyerek size ulaştırıyoruz. Amacımız, bir deprem anında karar verme sürenizi kısaltmak ve tahliye olasılığınızı maksimize etmektir.
                        </Text>
                    </View>
                </View>

                {/* Vision */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: Colors.status.info + "15" }]}>
                            <MaterialCommunityIcons name="telescope" size={20} color={Colors.status.info} />
                        </View>
                        <Text style={styles.sectionTitle}>Vizyonumuz</Text>
                    </View>
                    <View style={[styles.sectionCard, { borderLeftColor: Colors.status.info }]}>
                        <Text style={styles.sectionText}>
                            2030 yılına kadar Türkiye'deki tüm akıllı cihazlarda varsayılan deprem erken uyarı çözümü olmayı hedefliyoruz. Bunu yaparken ulusal sismik altyapıyı güçlendiren bir paydaş olarak devlet kurumları ve üniversitelerle iş birlikleri geliştirmeyi önceliklendiriyoruz.
                        </Text>
                        <Text style={[styles.sectionText, { marginTop: Spacing.md }]}>
                            Küresel ölçekte ise deprem riski yüksek her ülkeye lokalize edilmiş çözümler sunarak "sıfır önlenebilir kayıp" vizyonunu gerçeğe dönüştürmeye çalışıyoruz.
                        </Text>
                    </View>
                </View>

                {/* Values */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: Colors.accent + "15" }]}>
                            <MaterialCommunityIcons name="star-four-points" size={20} color={Colors.accent} />
                        </View>
                        <Text style={styles.sectionTitle}>Değerlerimiz</Text>
                    </View>
                    {VALUES.map((val, i) => (
                        <View key={i} style={styles.valueCard}>
                            <View style={[styles.valueIcon, { backgroundColor: val.color + "15" }]}>
                                <MaterialCommunityIcons name={val.icon as any} size={22} color={val.color} />
                            </View>
                            <View style={styles.valueText}>
                                <Text style={styles.valueTitle}>{val.title}</Text>
                                <Text style={styles.valueDesc}>{val.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Data Sources */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: Colors.primary + "15" }]}>
                            <MaterialCommunityIcons name="source-branch" size={20} color={Colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Veri Kaynaklarımız</Text>
                    </View>
                    <View style={styles.sourcesRow}>
                        {[
                            { name: "AFAD", desc: "T.C. Afet ve Acil\nDurum Yönetimi", icon: "flag", color: "#DC2626" },
                            { name: "Kandilli", desc: "Boğaziçi Üni.\nRasathanesi", icon: "telescope", color: Colors.accent },
                            { name: "USGS", desc: "ABD Jeolojik\nKurum", icon: "earth", color: Colors.status.info },
                        ].map((src, i) => (
                            <View key={i} style={[styles.sourceCard, { borderColor: src.color + "25" }]}>
                                <View style={[styles.sourceIcon, { backgroundColor: src.color + "15" }]}>
                                    <MaterialCommunityIcons name={src.icon as any} size={20} color={src.color} />
                                </View>
                                <Text style={[styles.sourceName, { color: src.color }]}>{src.name}</Text>
                                <Text style={styles.sourceDesc}>{src.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Branding */}
                <View style={styles.branding}>
                    <MaterialCommunityIcons name="code-tags" size={14} color={Colors.text.muted} />
                    <Text style={styles.brandingText}>Developed with ❤️ for a safer Türkiye</Text>
                </View>

                <View style={{ height: Spacing.xxl }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingTop: 54,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    headerTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
    },

    content: { padding: Spacing.md, paddingTop: Spacing.xl },

    // Hero
    hero: { alignItems: "center", marginBottom: Spacing.xxl },
    logoContainer: {
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: Spacing.lg,
    },
    logoBg: {
        width: 100,
        height: 100,
        borderRadius: 28,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.lg,
    },
    logoPulse: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 34,
        borderWidth: 1,
    },
    brandName: {
        fontSize: Typography.sizes.xxxl,
        fontWeight: "900",
        color: Colors.text.dark,
        letterSpacing: -1,
        marginBottom: Spacing.sm,
    },
    taglineBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.primary + "10",
        borderWidth: 1,
        borderColor: Colors.primary + "30",
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
        marginBottom: Spacing.md,
    },
    taglineDot: { width: 5, height: 5, borderRadius: 2.5 },
    taglineText: {
        fontSize: 9,
        fontWeight: "800",
        color: Colors.primary,
        textTransform: "uppercase",
        letterSpacing: 1.5,
    },
    heroSubtitle: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        textAlign: "center",
        lineHeight: 24,
        maxWidth: 340,
    },

    // Stats
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        marginBottom: Spacing.xxl,
    },
    statCard: {
        width: "47.5%",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
        gap: 6,
    },
    statIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 2,
    },
    statValue: { fontSize: Typography.sizes.xxl, fontWeight: "900" },
    statLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "600",
        textAlign: "center",
    },

    // Sections
    section: { marginBottom: Spacing.xxl },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    sectionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    sectionTitle: {
        fontSize: Typography.sizes.xl,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    sectionCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderLeftWidth: 3,
    },
    sectionText: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        lineHeight: 25,
    },

    // Values
    valueCard: {
        flexDirection: "row",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        gap: Spacing.md,
        alignItems: "flex-start",
    },
    valueIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    valueText: { flex: 1 },
    valueTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: 4,
    },
    valueDesc: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        lineHeight: 20,
    },

    // Sources
    sourcesRow: { flexDirection: "row", gap: Spacing.sm },
    sourceCard: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
        gap: 6,
    },
    sourceIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    sourceName: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
    sourceDesc: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "600",
        textAlign: "center",
        lineHeight: 14,
    },

    // Branding
    branding: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        opacity: 0.5,
        marginTop: Spacing.lg,
    },
    brandingText: {
        fontSize: 12,
        color: Colors.text.muted,
        fontWeight: "600",
    },
});
