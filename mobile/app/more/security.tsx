import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

export default function SecurityScreen() {
    const { t } = useTranslation();

    const SecurityItem = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
        <View style={styles.item}>
            <View style={styles.iconCircle}>
                <MaterialCommunityIcons name={icon} size={24} color={Colors.primary} />
            </View>
            <View style={styles.itemContent}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemDesc}>{desc}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("menu.security")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.intro}>
                    Güvenliğiniz bizim için teknik bir gereklilikten ötesidir. QuakeSense, en yüksek güvenlik standartlarını uygulamaktadır.
                </Text>

                <SecurityItem
                    icon="lock-check"
                    title="Uçtan Uca Şifreleme"
                    desc="Sunucularımızla kurulan tüm bağlantılar TLS 1.3 protokolü ile en üst düzeyde şifrelenmektedir."
                />

                <SecurityItem
                    icon="account-shield"
                    title="Kimlik Doğrulama"
                    desc="Kullanıcı verileriniz JWT (JSON Web Token) altyapısı ile güvenli bir şekilde doğrulanır."
                />

                <SecurityItem
                    icon="database-lock"
                    title="Veri İzolasyonu"
                    desc="FCM tokenları ve acil durum rehberi gibi kritik verileriniz izole ve şifreli veritabanlarında saklanır."
                />

                <SecurityItem
                    icon="alert-decagram"
                    title="Anlık Risk İzleme"
                    desc="Sistem altyapımız olası siber saldırılara karşı 7/24 otomatik olarak izlenmektedir."
                />

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="information-variant" size={20} color={Colors.text.muted} />
                    <Text style={styles.infoText}>
                        Zafiyet bildirimleri için lütfen iletişim sayfamızdan bizimle irtibata geçin.
                    </Text>
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
    intro: {
        fontSize: Typography.sizes.md,
        color: Colors.text.muted,
        lineHeight: 24,
        marginBottom: Spacing.xxl,
        textAlign: "center",
        fontWeight: "500"
    },
    item: {
        flexDirection: "row",
        backgroundColor: Colors.background.surface,
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.background.dark,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    itemContent: { flex: 1 },
    itemTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    itemDesc: { fontSize: Typography.sizes.sm, color: Colors.text.muted, lineHeight: 20, fontWeight: "500" },
    infoBox: {
        flexDirection: "row",
        padding: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.xl,
        alignItems: "center",
        gap: 10,
    },
    infoText: { flex: 1, fontSize: 12, color: Colors.text.muted, fontWeight: "600" },
});
