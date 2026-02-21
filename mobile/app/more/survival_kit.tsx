import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as SecureStore from "expo-secure-store";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

const KIT_ITEMS = [
    { id: "water", icon: "water", title: "Su", desc: "Kişi başı günlük 4 litre" },
    { id: "food", icon: "food-apple", title: "Gıda", desc: "Konserve ve yüksek enerjili yiyecekler" },
    { id: "firstaid", icon: "medical-bag", title: "İlk Yardım Çantası", desc: "İlaçlar, sargı bezi, dezenfektan" },
    { id: "flashlight", icon: "flashlight", title: "Fener", desc: "Yedek pilleri ile birlikte" },
    { id: "radio", icon: "radio", title: "Radyo", desc: "Haber alabilmek için pilli radyo" },
    { id: "powerbank", icon: "battery-charging-100", title: "Powerbank", desc: "Telefon şarjı için" },
    { id: "whistle", icon: "whistle", title: "Düdük", desc: "Ses duyurmak için çok kritik" },
    { id: "money", icon: "cash", title: "Nakit Para", desc: "Küçük banknotlar halinde" },
    { id: "docs", icon: "file-document-outline", title: "Evraklar", desc: "Tapu, kimlik fotokopileri, DOS" },
    { id: "clothes", icon: "tshirt-crew", title: "Giysi", desc: "Mevsime uygun yedek kıyafet" },
];

const STORAGE_KEY = "quakesense_survival_items";

export default function SurvivalKitScreen() {
    const { t } = useTranslation();
    const [checked, setChecked] = useState<string[]>([]);

    useEffect(() => {
        loadChecked();
    }, []);

    const loadChecked = async () => {
        try {
            const stored = await SecureStore.getItemAsync(STORAGE_KEY);
            if (stored) setChecked(JSON.parse(stored));
        } catch (e) {
            console.error(e);
        }
    };

    const toggleItem = async (id: string) => {
        const newChecked = checked.includes(id)
            ? checked.filter(i => i !== id)
            : [...checked, id];

        setChecked(newChecked);
        try {
            await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(newChecked));
        } catch (e) {
            console.error(e);
        }
    };

    const progress = Math.round((checked.length / KIT_ITEMS.length) * 100);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Deprem Çantası</Text>
                    <Text style={styles.subtitle}>Enkaz altında veya sonrasında hayatta kalmak için.</Text>
                </View>
            </View>

            {/* Progress Card */}
            <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>Hazırlık Durumu</Text>
                    <Text style={styles.progressValue}>%{progress}</Text>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressHint}>
                    {checked.length} / {KIT_ITEMS.length} ürün tamamlandı
                </Text>
            </View>

            {/* Items List */}
            <View style={styles.list}>
                {KIT_ITEMS.map((item) => {
                    const isChecked = checked.includes(item.id);
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.item, isChecked && styles.itemChecked]}
                            onPress={() => toggleItem(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, { backgroundColor: isChecked ? Colors.primary : Colors.background.dark }]}>
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={24}
                                    color={isChecked ? "#fff" : Colors.text.muted}
                                />
                            </View>
                            <View style={styles.itemText}>
                                <Text style={[styles.itemTitle, isChecked && styles.itemTitleChecked]}>{item.title}</Text>
                                <Text style={styles.itemDesc}>{item.desc}</Text>
                            </View>
                            <MaterialCommunityIcons
                                name={isChecked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                                size={24}
                                color={isChecked ? Colors.primary : Colors.border.dark}
                            />
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.footerInfo}>
                <MaterialCommunityIcons name="alert-decagram-outline" size={24} color="#f59e0b" />
                <Text style={styles.footerText}>
                    Deprem çantanızı her 6 ayda bir kontrol edin. Son kullanma tarihi geçen gıdaları ve pilleri yenileyin.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
        marginTop: Spacing.lg,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    title: { fontSize: Typography.sizes.xxl, fontWeight: "800", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },
    progressCard: {
        backgroundColor: Colors.background.surface,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
    progressTitle: { fontSize: Typography.sizes.sm, fontWeight: "800", color: Colors.text.dark },
    progressValue: { fontSize: Typography.sizes.xl, fontWeight: "900", color: Colors.primary, fontStyle: "italic" },
    progressBarBg: { height: 8, backgroundColor: Colors.background.dark, borderRadius: 4, overflow: "hidden" },
    progressBarFill: { height: "100%", backgroundColor: Colors.primary },
    progressHint: { fontSize: 11, color: Colors.text.muted, marginTop: 8, fontWeight: "600" },
    list: { gap: Spacing.sm },
    item: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    itemChecked: { borderColor: Colors.primary + "30", backgroundColor: Colors.primary + "05" },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    itemText: { flex: 1 },
    itemTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    itemTitleChecked: { color: Colors.primary },
    itemDesc: { fontSize: 11, color: Colors.text.muted, marginTop: 2, fontWeight: "500" },
    footerInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginTop: Spacing.xxl,
        padding: Spacing.lg,
        backgroundColor: "#f59e0b10",
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: "#f59e0b30",
    },
    footerText: { flex: 1, fontSize: 12, color: "#f59e0b", fontWeight: "600", lineHeight: 18 },
});
