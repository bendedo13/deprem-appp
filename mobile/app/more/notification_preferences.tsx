/**
 * Bildirim Tercihleri - Gelismis filtre ayarlari
 * Magnitude esigi, mesafe filtresi, sessiz saatler
 */

import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const PREFS_KEY = "quakesense_notification_prefs";

interface NotificationPrefs {
    minMagnitude: number;
    maxDistanceKm: number;
    silentHoursEnabled: boolean;
    criticalOverride: boolean;
    showMinor: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
    minMagnitude: 3.0,
    maxDistanceKm: 100,
    silentHoursEnabled: false,
    criticalOverride: true,
    showMinor: false,
};

const MAGNITUDE_OPTIONS = [
    { value: 2.0, label: "2.0+", desc: "Çok Küçük", color: Colors.text.muted },
    { value: 3.0, label: "3.0+", desc: "Küçük", color: Colors.primary },
    { value: 4.0, label: "4.0+", desc: "Orta", color: "#ca8a04" },
    { value: 5.0, label: "5.0+", desc: "Güçlü", color: Colors.accent },
    { value: 6.0, label: "6.0+", desc: "Kritik", color: Colors.danger },
];

const DISTANCE_OPTIONS = [
    { value: 25, label: "25 km", desc: "Çok Yakın" },
    { value: 50, label: "50 km", desc: "Yakın" },
    { value: 100, label: "100 km", desc: "Bölgesel" },
    { value: 200, label: "200 km", desc: "Geniş Alan" },
    { value: 0, label: "Tümü", desc: "Sınırsız" },
];

export default function NotificationPreferencesScreen() {
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPrefs();
    }, []);

    async function loadPrefs() {
        try {
            const stored = await SecureStore.getItemAsync(PREFS_KEY);
            if (stored) {
                setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
            }
        } catch {
            // use defaults
        }
    }

    async function savePrefs(newPrefs: NotificationPrefs) {
        setSaving(true);
        try {
            await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(newPrefs));
            setPrefs(newPrefs);
        } catch {
            Alert.alert("Hata", "Tercihler kaydedilemedi.");
        } finally {
            setSaving(false);
        }
    }

    function updatePref<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
        const updated = { ...prefs, [key]: value };
        savePrefs(updated);
    }

    const selectedMag = MAGNITUDE_OPTIONS.find((o) => o.value === prefs.minMagnitude) || MAGNITUDE_OPTIONS[1];
    const selectedDist = DISTANCE_OPTIONS.find((o) => o.value === prefs.maxDistanceKm) || DISTANCE_OPTIONS[2];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.text.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Bildirim Tercihleri</Text>
                <View style={[styles.savingBadge, { opacity: saving ? 1 : 0 }]}>
                    <Text style={styles.savingText}>Kaydediliyor...</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={Colors.status.info} />
                    <Text style={styles.infoText}>
                        Sadece belirlediğiniz kriterlere uyan depremler için bildirim alırsınız.
                    </Text>
                </View>

                {/* Magnitude Filter */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="arrow-up-bold-circle" size={20} color={Colors.accent} />
                        <View style={styles.sectionTitleBlock}>
                            <Text style={styles.sectionTitle}>Minimum Büyüklük</Text>
                            <Text style={styles.sectionSub}>Bu değerin altındaki depremler bildirilmez</Text>
                        </View>
                    </View>

                    <View style={styles.optionsGrid}>
                        {MAGNITUDE_OPTIONS.map((opt) => {
                            const selected = prefs.minMagnitude === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.optionCard,
                                        selected && { borderColor: opt.color, backgroundColor: opt.color + "10" },
                                    ]}
                                    onPress={() => updatePref("minMagnitude", opt.value)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.optionValue, { color: selected ? opt.color : Colors.text.dark }]}>
                                        {opt.label}
                                    </Text>
                                    <Text style={[styles.optionDesc, { color: selected ? opt.color : Colors.text.muted }]}>
                                        {opt.desc}
                                    </Text>
                                    {selected && (
                                        <View style={[styles.optionCheck, { backgroundColor: opt.color }]}>
                                            <MaterialCommunityIcons name="check" size={10} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Selected preview */}
                    <View style={[styles.selectedPreview, { borderColor: selectedMag.color + "30" }]}>
                        <MaterialCommunityIcons name="bell-ring" size={16} color={selectedMag.color} />
                        <Text style={[styles.selectedText, { color: selectedMag.color }]}>
                            {selectedMag.value}+ büyüklüğündeki depremler için bildirim alacaksınız
                        </Text>
                    </View>
                </View>

                {/* Distance Filter */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="map-marker-radius" size={20} color={Colors.primary} />
                        <View style={styles.sectionTitleBlock}>
                            <Text style={styles.sectionTitle}>Mesafe Filtresi</Text>
                            <Text style={styles.sectionSub}>Konumunuza olan maksimum deprem uzaklığı</Text>
                        </View>
                    </View>

                    <View style={styles.optionsGrid}>
                        {DISTANCE_OPTIONS.map((opt) => {
                            const selected = prefs.maxDistanceKm === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[
                                        styles.optionCard,
                                        selected && { borderColor: Colors.primary, backgroundColor: Colors.primary + "10" },
                                    ]}
                                    onPress={() => updatePref("maxDistanceKm", opt.value)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.optionValue, { color: selected ? Colors.primary : Colors.text.dark }]}>
                                        {opt.label}
                                    </Text>
                                    <Text style={[styles.optionDesc, { color: selected ? Colors.primary : Colors.text.muted }]}>
                                        {opt.desc}
                                    </Text>
                                    {selected && (
                                        <View style={[styles.optionCheck, { backgroundColor: Colors.primary }]}>
                                            <MaterialCommunityIcons name="check" size={10} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={[styles.selectedPreview, { borderColor: Colors.primary + "30" }]}>
                        <MaterialCommunityIcons name="radar" size={16} color={Colors.primary} />
                        <Text style={[styles.selectedText, { color: Colors.primary }]}>
                            {prefs.maxDistanceKm === 0
                                ? "Türkiye genelindeki tüm depremler bildirilecek"
                                : `${prefs.maxDistanceKm} km içindeki depremler bildirilecek`}
                        </Text>
                    </View>
                </View>

                {/* Toggle Options */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="tune-variant" size={20} color={Colors.status.info} />
                        <View style={styles.sectionTitleBlock}>
                            <Text style={styles.sectionTitle}>Gelişmiş Seçenekler</Text>
                            <Text style={styles.sectionSub}>Bildirim davranışını özelleştirin</Text>
                        </View>
                    </View>

                    <View style={styles.toggleCard}>
                        <View style={styles.toggleRow}>
                            <View style={[styles.toggleIcon, { backgroundColor: Colors.danger + "15" }]}>
                                <MaterialCommunityIcons name="alarm-light" size={20} color={Colors.danger} />
                            </View>
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleTitle}>Kritik Alarm Geçişi</Text>
                                <Text style={styles.toggleSub}>
                                    5.0+ depremlerde sessiz modu aşarak her zaman bildir
                                </Text>
                            </View>
                            <Switch
                                value={prefs.criticalOverride}
                                onValueChange={(v) => updatePref("criticalOverride", v)}
                                trackColor={{ false: Colors.background.elevated, true: Colors.danger + "60" }}
                                thumbColor={prefs.criticalOverride ? Colors.danger : Colors.text.muted}
                            />
                        </View>

                        <View style={styles.toggleDivider} />

                        <View style={styles.toggleRow}>
                            <View style={[styles.toggleIcon, { backgroundColor: Colors.primary + "15" }]}>
                                <MaterialCommunityIcons name="bell-sleep" size={20} color={Colors.primary} />
                            </View>
                            <View style={styles.toggleText}>
                                <Text style={styles.toggleTitle}>Sessiz Saatler</Text>
                                <Text style={styles.toggleSub}>
                                    Belirtilen saatler dışında bildirim alma (23:00 – 07:00)
                                </Text>
                            </View>
                            <Switch
                                value={prefs.silentHoursEnabled}
                                onValueChange={(v) => updatePref("silentHoursEnabled", v)}
                                trackColor={{ false: Colors.background.elevated, true: Colors.primary + "60" }}
                                thumbColor={prefs.silentHoursEnabled ? Colors.primary : Colors.text.muted}
                            />
                        </View>
                    </View>
                </View>

                {/* Reset */}
                <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => {
                        Alert.alert(
                            "Sıfırla",
                            "Tüm tercihleri varsayılana döndürmek istiyor musunuz?",
                            [
                                { text: "İptal", style: "cancel" },
                                { text: "Sıfırla", style: "destructive", onPress: () => savePrefs(DEFAULT_PREFS) },
                            ]
                        );
                    }}
                    activeOpacity={0.7}
                >
                    <MaterialCommunityIcons name="refresh" size={18} color={Colors.text.muted} />
                    <Text style={styles.resetText}>Varsayılana Sıfırla</Text>
                </TouchableOpacity>

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
        paddingHorizontal: Spacing.md,
        paddingTop: 54,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
        gap: Spacing.sm,
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
        flex: 1,
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    savingBadge: {
        backgroundColor: Colors.primary + "20",
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    savingText: { fontSize: 11, fontWeight: "700", color: Colors.primary },

    content: { padding: Spacing.md },

    infoBanner: {
        flexDirection: "row",
        gap: Spacing.sm,
        alignItems: "flex-start",
        backgroundColor: Colors.status.info + "10",
        borderWidth: 1,
        borderColor: Colors.status.info + "30",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.status.info,
        lineHeight: 20,
        fontWeight: "600",
    },

    section: { marginBottom: Spacing.xxl },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    sectionTitleBlock: { flex: 1 },
    sectionTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    sectionSub: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        marginTop: 2,
    },

    optionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    optionCard: {
        width: "30%",
        flexGrow: 1,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.sm,
        alignItems: "center",
        position: "relative",
        minHeight: 64,
        justifyContent: "center",
    },
    optionValue: {
        fontSize: Typography.sizes.md,
        fontWeight: "900",
        marginBottom: 2,
    },
    optionDesc: {
        fontSize: 10,
        fontWeight: "600",
        textAlign: "center",
    },
    optionCheck: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
    },

    selectedPreview: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm + 4,
    },
    selectedText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
    },

    toggleCard: {
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        overflow: "hidden",
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        padding: Spacing.md,
        gap: Spacing.md,
    },
    toggleIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    toggleText: { flex: 1 },
    toggleTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: "700",
        color: Colors.text.dark,
    },
    toggleSub: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        marginTop: 2,
        lineHeight: 18,
    },
    toggleDivider: {
        height: 1,
        backgroundColor: Colors.border.glass,
        marginHorizontal: Spacing.md,
    },

    resetBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: Spacing.md,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    resetText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "700",
    },
});
