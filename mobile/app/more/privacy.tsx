import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

export default function PrivacyScreen() {
    const { t } = useTranslation();

    const Section = ({ title, content }: { title: string, content: string }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionText}>{content}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("privacy.title")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={48} color={Colors.primary} style={{ alignSelf: "center", marginBottom: Spacing.md }} />
                    <Text style={styles.introText}>{t("privacy.content")}</Text>
                </View>

                <Section
                    title="1. Toplanan Veriler"
                    content="QuakeSense, size en doğru deprem uyarılarını sunabilmek için konum verilerinize (arka planda dahil) erişim talep edebilir. Bu veriler asla üçüncü taraflarla reklam amacıyla paylaşılmaz."
                />

                <Section
                    title="2. Veri Güvenliği"
                    content="Toplanan tüm veriler endüstri standardı şifreleme yöntemleriyle korunmakta ve güvenli sunucularımızda saklanmaktadır."
                />

                <Section
                    title="3. Kullanıcı Hakları"
                    content="İstediğiniz zaman hesabınızı silebilir ve paylaştığınız verilerin sistemimizden temizlenmesini talep edebilirsiniz."
                />

                <Section
                    title="4. Politika Güncellemeleri"
                    content="Gizlilik politikamızda yapılan değişiklikler uygulama üzerinden size bildirilecektir. Gizliliğinizi korumak bizim önceliğimizdir."
                />

                <View style={styles.branding}>
                    <Text style={styles.brandingText}>Last Updated: February 2026</Text>
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
        paddingBottom: 20,
        backgroundColor: Colors.background.dark,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.text.dark },
    content: { padding: Spacing.xl, paddingBottom: 100 },
    card: {
        backgroundColor: Colors.background.surface,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        marginBottom: Spacing.xl,
    },
    introText: { fontSize: Typography.sizes.md, lineHeight: 24, color: Colors.text.dark, textAlign: "center", fontStyle: "italic" },
    section: { marginBottom: Spacing.xl },
    sectionTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark, marginBottom: Spacing.xs },
    sectionText: { fontSize: Typography.sizes.sm, lineHeight: 22, color: Colors.text.muted, fontWeight: "500" },
    branding: { alignItems: "center", marginTop: Spacing.xl },
    brandingText: { fontSize: 11, fontWeight: "700", color: Colors.text.muted, textTransform: "uppercase" },
});
