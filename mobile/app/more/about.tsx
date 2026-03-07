/**
 * Hakkımızda — Profesyonel SaaS kurumsal kimlik sayfası.
 * Misyon, Vizyon, Değerlerimiz ve Ekip bilgileri.
 */

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const VALUES = [
    {
        icon: "shield-check",
        color: Colors.primary,
        title: "Güvenilirlik",
        desc: "Verilerimiz resmi kurumlardan anlık olarak alınır ve bağımsız doğrulamadan geçirilir.",
    },
    {
        icon: "lightning-bolt",
        color: Colors.accent,
        title: "Hız",
        desc: "Saniyeler hayat kurtarır. Erken uyarı sistememiz milisaniye hassasiyetinde çalışır.",
    },
    {
        icon: "eye",
        color: Colors.status.info,
        title: "Şeffaflık",
        desc: "Açık veri politikamız ile tüm algoritmalarımız ve veri kaynaklarımız şeffaftır.",
    },
    {
        icon: "account-group",
        color: "#8b5cf6",
        title: "Toplumsal Etki",
        desc: "Teknolojiyi toplumsal faydaya dönüştürmek ve hayat kurtarmak temel motivasyonumuzdur.",
    },
];

const STATS = [
    { value: "7/24", label: "Kesintisiz\nKoruma", color: Colors.primary },
    { value: "<1s", label: "Uyarı\nGecikmesi", color: Colors.accent },
    { value: "81+", label: "İl\nKapsaması", color: Colors.status.info },
    { value: "100K+", label: "Aktif\nKullanıcı", color: "#8b5cf6" },
];

export default function AboutScreen() {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Hakkımızda</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Logo & Brand */}
                <View style={styles.brandSection}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoOuter}>
                            <View style={styles.logoInner}>
                                <MaterialCommunityIcons name="shield-check" size={40} color="#fff" />
                            </View>
                        </View>
                    </View>
                    <View style={styles.brandTextRow}>
                        <Text style={styles.brandName}>Quake</Text>
                        <Text style={styles.brandNameAccent}>Sense</Text>
                    </View>
                    <Text style={styles.brandSlogan}>Hayat Kurtaran Erken Uyarı Sistemi</Text>
                    <Text style={styles.version}>{t("menu.version")}</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    {STATS.map((stat, i) => (
                        <View key={i} style={styles.statCard}>
                            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Mission */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: Colors.primary + "15" }]}>
                            <MaterialCommunityIcons name="rocket-launch" size={22} color={Colors.primary} />
                        </View>
                        <Text style={styles.sectionTitle}>Misyonumuz</Text>
                    </View>
                    <Text style={styles.sectionText}>
                        QuakeSense olarak misyonumuz, ileri teknoloji ve yapay zeka destekli sismik analiz ile toplumu olası deprem felaketlerine karşı en erken şekilde uyarmaktır. Resmi kurumların verilerini anlık olarak işleyerek, her bireyin cebindeki telefonu bir erken uyarı istasyonuna dönüştürüyoruz.
                    </Text>
                    <Text style={styles.sectionText}>
                        Amacımız, deprem sonrası can kayıplarını minimuma indirmek, toplumsal farkındalığı artırmak ve her vatandaşın depreme hazırlıklı olmasını sağlamaktır.
                    </Text>
                </View>

                {/* Vision */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <View style={[styles.sectionIcon, { backgroundColor: Colors.status.info + "15" }]}>
                            <MaterialCommunityIcons name="telescope" size={22} color={Colors.status.info} />
                        </View>
                        <Text style={styles.sectionTitle}>Vizyonumuz</Text>
                    </View>
                    <Text style={styles.sectionText}>
                        Dünyanın en güvenilir ve en hızlı sivil deprem erken uyarı platformu olmak. Gelişmiş sensör füzyonu, makine öğrenmesi ve topluluk odaklı veri doğrulama teknolojileri ile sismolojinin geleceğini şekillendirmek istiyoruz.
                    </Text>
                    <Text style={styles.sectionText}>
                        Vizyonumuz, deprem kuşağındaki her ülkede milyonlarca insanın hayatını koruyacak global bir güvenlik ağı oluşturmaktır.
                    </Text>
                </View>

                {/* Values */}
                <View style={styles.valuesSection}>
                    <Text style={styles.valuesSectionTitle}>Değerlerimiz</Text>
                    <View style={styles.valuesGrid}>
                        {VALUES.map((val, i) => (
                            <View key={i} style={styles.valueCard}>
                                <View style={[styles.valueIcon, { backgroundColor: val.color + "15" }]}>
                                    <MaterialCommunityIcons name={val.icon as any} size={24} color={val.color} />
                                </View>
                                <Text style={styles.valueTitle}>{val.title}</Text>
                                <Text style={styles.valueDesc}>{val.desc}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Data Source Trust */}
                <View style={styles.trustCard}>
                    <View style={styles.trustHeader}>
                        <MaterialCommunityIcons name="shield-lock" size={24} color={Colors.primary} />
                        <Text style={styles.trustTitle}>Veri Güvenliği ve Kaynaklar</Text>
                    </View>
                    <View style={styles.trustItem}>
                        <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.primary} />
                        <Text style={styles.trustText}>AFAD (T.C. Afet ve Acil Durum Yönetimi Başkanlığı) resmi API entegrasyonu</Text>
                    </View>
                    <View style={styles.trustItem}>
                        <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.primary} />
                        <Text style={styles.trustText}>Kandilli Rasathanesi ve Deprem Araştırma Enstitüsü veri bağlantısı</Text>
                    </View>
                    <View style={styles.trustItem}>
                        <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.primary} />
                        <Text style={styles.trustText}>Uçtan uca şifreleme ile kişisel veri koruması (KVKK uyumlu)</Text>
                    </View>
                    <View style={styles.trustItem}>
                        <MaterialCommunityIcons name="check-decagram" size={16} color={Colors.primary} />
                        <Text style={styles.trustText}>Bağımsız çapraz doğrulama ve anomali tespit sistemi</Text>
                    </View>
                </View>

                {/* Technology Stack */}
                <View style={styles.techCard}>
                    <View style={styles.techHeader}>
                        <MaterialCommunityIcons name="chip" size={20} color={Colors.status.info} />
                        <Text style={styles.techTitle}>Teknolojimiz</Text>
                    </View>
                    <Text style={styles.techText}>
                        STA/LTA (Short-Term Average / Long-Term Average) sismik analiz algoritması, 50 Hz ivmeölçer örneklemesi, yüksek geçirgen filtre ile yürüme gürültüsü eliminasyonu ve yapay zeka destekli doğrulama sistemi kullanılmaktadır.
                    </Text>
                </View>

                {/* Copyright */}
                <View style={styles.copyrightSection}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.copyrightText}>developed by Alan 2017-2026 ©</Text>
                    <Text style={styles.copyrightSub}>Tüm hakları saklıdır.</Text>
                </View>
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
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: Colors.background.dark,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    headerTitle: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },

    // Brand
    brandSection: { alignItems: "center", marginBottom: Spacing.xxl },
    logoContainer: { marginBottom: Spacing.lg },
    logoOuter: {
        width: 110,
        height: 110,
        borderRadius: 30,
        backgroundColor: Colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    logoInner: {
        width: 80,
        height: 80,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.lg,
        shadowColor: Colors.primary,
    },
    brandTextRow: { flexDirection: "row", alignItems: "baseline" },
    brandName: { fontSize: 32, fontWeight: "900", color: Colors.text.dark, letterSpacing: -1 },
    brandNameAccent: { fontSize: 32, fontWeight: "900", color: Colors.primary, letterSpacing: -1 },
    brandSlogan: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.muted,
        marginTop: 6,
        textTransform: "uppercase",
        letterSpacing: 1.5,
    },
    version: { fontSize: 12, color: Colors.text.muted, fontWeight: "600", marginTop: 4, opacity: 0.6 },

    // Stats
    statsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.xxl },
    statCard: {
        flex: 1,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    statValue: { fontSize: Typography.sizes.xl, fontWeight: "900", marginBottom: 4 },
    statLabel: { fontSize: 9, fontWeight: "700", color: Colors.text.muted, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5, lineHeight: 13 },

    // Section cards
    sectionCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: Spacing.md },
    sectionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
    sectionTitle: { fontSize: Typography.sizes.xl, fontWeight: "900", color: Colors.text.dark, letterSpacing: -0.5 },
    sectionText: {
        fontSize: Typography.sizes.md,
        lineHeight: 26,
        color: Colors.text.muted,
        marginBottom: Spacing.sm,
        fontWeight: "500",
    },

    // Values
    valuesSection: { marginBottom: Spacing.xl },
    valuesSectionTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: Spacing.md,
        marginLeft: 4,
    },
    valuesGrid: { gap: Spacing.sm },
    valueCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    valueIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: Spacing.sm },
    valueTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    valueDesc: { fontSize: Typography.sizes.sm, color: Colors.text.muted, lineHeight: 20, fontWeight: "500" },

    // Trust
    trustCard: {
        backgroundColor: Colors.primary + "06",
        borderRadius: BorderRadius.xxl,
        padding: Spacing.xl,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.primary + "15",
        gap: Spacing.md,
    },
    trustHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
    trustTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.primary },
    trustItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    trustText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text.muted, lineHeight: 20, fontWeight: "500" },

    // Tech
    techCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
        marginBottom: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    techHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.sm },
    techTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.status.info },
    techText: { fontSize: Typography.sizes.sm, color: Colors.text.muted, lineHeight: 22, fontWeight: "500" },

    // Copyright
    copyrightSection: { alignItems: "center", gap: Spacing.sm },
    dividerLine: { width: 60, height: 1, backgroundColor: Colors.border.glass },
    copyrightText: { fontSize: 11, fontWeight: "700", color: Colors.text.muted, letterSpacing: 0.5, opacity: 0.7 },
    copyrightSub: { fontSize: 10, fontWeight: "500", color: Colors.text.muted, opacity: 0.5 },
});
