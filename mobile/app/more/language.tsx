/**
 * Dil Seçimi Ekranı
 * Kullanıcının uygulama dilini manuel olarak değiştirmesini sağlar.
 * i18next üzerinden anlık dil değişimi + AsyncStorage'a kalıcı kayıt.
 */

import { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as SecureStore from "expo-secure-store";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

const LANGUAGES = [
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
    { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
    { code: "pt", label: "Português", flag: "🇵🇹" },
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "zh", label: "中文", flag: "🇨🇳" },
    { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
    { code: "ne", label: "नेपाली", flag: "🇳🇵" },
];

const LANG_STORAGE_KEY = "quakesense_lang";

export default function LanguageScreen() {
    const { i18n } = useTranslation();
    const [selected, setSelected] = useState<string>(i18n.language?.slice(0, 2) ?? "en");
    const [saving, setSaving] = useState(false);

    async function handleSelect(code: string) {
        setSelected(code);
        setSaving(true);
        try {
            await i18n.changeLanguage(code);
            await SecureStore.setItemAsync(LANG_STORAGE_KEY, code);
            // Give user feedback then go back
            Alert.alert("✅ Dil Değiştirildi", LANGUAGES.find(l => l.code === code)?.label ?? code, [
                { text: "Tamam", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert("Hata", "Dil değiştirilemedi.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Dil Seçimi</Text>
                    <Text style={styles.subtitle}>Language / Langue / Lingua</Text>
                </View>
            </View>

            {/* Language List */}
            <View style={styles.list}>
                {LANGUAGES.map((lang) => {
                    const isActive = selected === lang.code;
                    return (
                        <TouchableOpacity
                            key={lang.code}
                            style={[styles.item, isActive && styles.itemActive]}
                            onPress={() => handleSelect(lang.code)}
                            disabled={saving}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.flag}>{lang.flag}</Text>
                            <Text style={[styles.label, isActive && styles.labelActive]}>
                                {lang.label}
                            </Text>
                            {isActive && (
                                <MaterialCommunityIcons
                                    name="check-circle"
                                    size={22}
                                    color={Colors.primary}
                                />
                            )}
                        </TouchableOpacity>
                    );
                })}
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
    list: { gap: Spacing.sm },
    item: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        padding: Spacing.lg,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    itemActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "05",
    },
    flag: { fontSize: 24 },
    label: {
        flex: 1,
        fontSize: Typography.sizes.md,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    labelActive: { color: Colors.text.dark },
});
