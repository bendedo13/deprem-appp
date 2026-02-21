import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

interface KitItem {
    id: string;
    icon: string;
    label: string;
    checked: boolean;
}

export default function SurvivalKitScreen() {
    const { t } = useTranslation();
    const [items, setItems] = useState<KitItem[]>([
        { id: "1", icon: "water", label: "Su (Kişi başı 3 litre/gün)", checked: false },
        { id: "2", icon: "food-apple", label: "Dayanıklı Gıdalar (Konserve, bisküvi vb.)", checked: false },
        { id: "3", icon: "medical-bag", label: "İlk Yardım Çantası", checked: false },
        { id: "4", icon: "flashlight", label: "El Feneri ve Yedek Piller", checked: false },
        { id: "5", icon: "radio-handheld", label: "Radyo ve Yedek Piller", checked: false },
        { id: "6", icon: "whistle", label: "Düdük", checked: false },
        { id: "7", icon: "tools", label: "Çok Amaçlı Çakı", checked: false },
        { id: "8", icon: "soap", label: "Hijyen Malzemeleri (Sabun, maske vb.)", checked: false },
        { id: "9", icon: "bed", label: "Acil Durum Battaniyesi", checked: false },
        { id: "10", icon: "file-document-outline", label: "Önemli Belgelerin Fotokopileri", checked: false },
        { id: "11", icon: "pill", label: "Düzenli Kullanılan İlaçlar", checked: false },
        { id: "12", icon: "cash-multiple", label: "Bir Miktar Nakit Para", checked: false }
    ]);

    const toggleItem = (id: string) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const progress = (items.filter(i => i.checked).length / items.length) * 100;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Deprem Çantası</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Hazır Mısınız?</Text>
                    <Text style={styles.infoDesc}>
                        Deprem sonrası ilk 72 saat hayati önem taşır. Bu süre zarfında dış yardıma ihtiyaç duymadan hayatta kalabilmeniz için çantanızın tam olması gerekir.
                    </Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Hazırlık Durumu</Text>
                        <Text style={styles.progressValue}>%{Math.round(progress)}</Text>
                    </View>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                </View>

                <View style={styles.list}>
                    {items.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.item, item.checked && styles.itemChecked]}
                            onPress={() => toggleItem(item.id)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconBox, item.checked && styles.iconBoxChecked]}>
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={24}
                                    color={item.checked ? "#fff" : Colors.primary}
                                />
                            </View>
                            <Text style={[styles.itemLabel, item.checked && styles.itemLabelChecked]}>
                                {item.label}
                            </Text>
                            <MaterialCommunityIcons
                                name={item.checked ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                                size={24}
                                color={item.checked ? Colors.status.success : Colors.border.dark}
                            />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footerInfo}>
                    <MaterialCommunityIcons name="information-outline" size={16} color={Colors.text.muted} />
                    <Text style={styles.footerText}>Çantanızı her 6 ayda bir kontrol edip SKT'si geçen ürünleri yenileyin.</Text>
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
    content: { padding: Spacing.xl, paddingBottom: 40 },
    infoBox: { marginBottom: Spacing.xl },
    infoTitle: { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 8 },
    infoDesc: { fontSize: Typography.sizes.md, color: Colors.text.muted, lineHeight: 22, fontWeight: "500" },
    progressContainer: {
        backgroundColor: Colors.background.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        marginBottom: Spacing.xl
    },
    progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
    progressLabel: { color: Colors.text.dark, fontWeight: "700", fontSize: Typography.sizes.sm },
    progressValue: { color: Colors.primary, fontWeight: "900", fontSize: Typography.sizes.sm },
    progressBar: { height: 8, backgroundColor: Colors.background.dark, borderRadius: 4, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: Colors.primary },
    list: { gap: Spacing.md },
    item: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    itemChecked: { borderColor: Colors.status.success + '40', opacity: 0.9 },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.primary + '15',
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md
    },
    iconBoxChecked: { backgroundColor: Colors.status.success },
    itemLabel: { flex: 1, fontSize: Typography.sizes.md, color: Colors.text.dark, fontWeight: "600" },
    itemLabelChecked: { color: Colors.text.muted, textDecorationLine: "line-through" },
    footerInfo: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: Spacing.xxl,
        gap: 8,
        paddingHorizontal: Spacing.md
    },
    footerText: { fontSize: 12, color: Colors.text.muted, fontWeight: "500", flex: 1 },
});
