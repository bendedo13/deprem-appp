import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

export default function AboutScreen() {
    const { t } = useTranslation();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("about.title")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.logoSection}>
                    <View style={styles.logoBox}>
                        <MaterialCommunityIcons name="earth" size={60} color="#fff" />
                    </View>
                    <Text style={styles.appName}>QuakeSense</Text>
                    <Text style={styles.version}>{t("menu.version")}</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.text}>{t("about.content")}</Text>
                    <Text style={[styles.text, { marginTop: Spacing.md }]}>
                        Misyonumuz, en güvenilir sismik verileri, en hızlı şekilde son kullanıcıya ulaştırmak ve olası felaketlere karşı toplumsal farkındalığı artırmaktır.
                    </Text>
                </View>

                <View style={styles.branding}>
                    <MaterialCommunityIcons name="code-tags" size={16} color={Colors.text.muted} />
                    <Text style={styles.brandingText}>{t("menu.developed_by")}</Text>
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
    content: { padding: Spacing.xl },
    logoSection: { alignItems: "center", marginBottom: Spacing.xxl },
    logoBox: {
        width: 100,
        height: 100,
        borderRadius: 25,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    appName: { fontSize: 24, fontWeight: "800", color: Colors.text.dark, letterSpacing: -0.5 },
    version: { fontSize: 13, color: Colors.text.muted, fontWeight: "700", marginTop: 4 },
    card: {
        backgroundColor: Colors.background.surface,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        marginBottom: Spacing.xl,
    },
    text: { fontSize: Typography.sizes.md, lineHeight: 24, color: Colors.text.dark, textAlign: "center" },
    branding: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: Spacing.xl,
        gap: 8,
        opacity: 0.5,
    },
    brandingText: { fontSize: 12, fontWeight: "800", color: Colors.text.muted, textTransform: "uppercase" },
});
