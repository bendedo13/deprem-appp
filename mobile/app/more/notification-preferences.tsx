/**
 * Gelişmiş Bildirim Filtreleme — Premium özellik.
 * Şiddet, mesafe, zaman dilimi ve bildirim türü bazlı filtreleme.
 */

import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    Alert,
    ScrollView,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const PREFS_KEY = "quakesense_notification_prefs";

interface NotificationPrefs {
    is_enabled: boolean;
    min_magnitude: number;
    radius_km: number;
    night_mode: boolean;
    night_start: number; // 0-23
    night_end: number;   // 0-23
    night_min_magnitude: number;
    sound_enabled: boolean;
    vibration_enabled: boolean;
    critical_only_badge: boolean;
    show_aftershocks: boolean;
    daily_summary: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
    is_enabled: true,
    min_magnitude: 3.0,
    radius_km: 500,
    night_mode: true,
    night_start: 23,
    night_end: 7,
    night_min_magnitude: 5.0,
    sound_enabled: true,
    vibration_enabled: true,
    critical_only_badge: false,
    show_aftershocks: false,
    daily_summary: true,
};

const MAG_OPTIONS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0];
const NIGHT_MAG_OPTIONS = [4.0, 4.5, 5.0, 5.5, 6.0, 7.0];
const RADIUS_OPTIONS = [25, 50, 100, 200, 300, 500, 750, 1000];

export default function NotificationPreferencesScreen() {
    const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPrefs();
    }, []);

    async function loadPrefs() {
        try {
            const raw = await AsyncStorage.getItem(PREFS_KEY);
            if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
        } catch {}
        setLoading(false);
    }

    async function savePrefs() {
        setSaving(true);
        try {
            await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
            // Sync with backend
            try {
                const { api } = require("../../src/services/api");
                await api.put("/api/v1/notifications/preferences", {
                    min_magnitude: prefs.min_magnitude,
                    radius_km: prefs.radius_km,
                    is_enabled: prefs.is_enabled,
                });
            } catch {}

            Alert.alert("Kaydedildi", "Bildirim tercihleriniz güncellendi.", [
                { text: "Tamam", onPress: () => router.back() },
            ]);
        } catch {
            Alert.alert("Hata", "Kaydedilirken bir sorun oluştu.");
        } finally {
            setSaving(false);
        }
    }

    const update = (key: keyof NotificationPrefs, value: any) => {
        setPrefs((prev) => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} size="large" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Bildirim Tercihleri</Text>
                    <Text style={styles.subtitle}>Sadece önemli depremlerde bildirim alın</Text>
                </View>
            </View>

            {/* Premium Badge */}
            <View style={styles.premiumBadge}>
                <MaterialCommunityIcons name="crown" size={18} color="#eab308" />
                <Text style={styles.premiumText}>Gelişmiş Filtreleme</Text>
            </View>

            {/* Master Toggle */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: Colors.primary + "15" }]}>
                        <MaterialCommunityIcons name="bell-ring" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Push Bildirimleri</Text>
                        <Text style={styles.cardSub}>Önemli depremlerde anlık uyarı al</Text>
                    </View>
                    <Switch
                        value={prefs.is_enabled}
                        onValueChange={(val) => update("is_enabled", val)}
                        trackColor={{ false: Colors.border.dark, true: Colors.primary + "80" }}
                        thumbColor={prefs.is_enabled ? Colors.primary : "#888"}
                    />
                </View>
            </View>

            {/* Minimum Magnitude Filter */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: Colors.accent + "15" }]}>
                        <MaterialCommunityIcons name="sine-wave" size={22} color={Colors.accent} />
                    </View>
                    <Text style={styles.cardTitle}>Minimum Şiddet</Text>
                    <View style={styles.valuePill}>
                        <Text style={styles.valueText}>M{prefs.min_magnitude.toFixed(1)}</Text>
                    </View>
                </View>
                <Text style={styles.filterDesc}>
                    Bu değerin altındaki depremler için bildirim gönderilmez.
                </Text>
                <View style={styles.optionsRow}>
                    {MAG_OPTIONS.map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.chip, prefs.min_magnitude === m && styles.chipActive]}
                            onPress={() => update("min_magnitude", m)}
                        >
                            <Text style={[styles.chipText, prefs.min_magnitude === m && styles.chipTextActive]}>
                                {m.toFixed(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Distance Filter */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: Colors.status.info + "15" }]}>
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={22} color={Colors.status.info} />
                    </View>
                    <Text style={styles.cardTitle}>Mesafe Filtresi</Text>
                    <View style={styles.valuePill}>
                        <Text style={styles.valueText}>{prefs.radius_km} km</Text>
                    </View>
                </View>
                <Text style={styles.filterDesc}>
                    Sadece konumunuza bu mesafedeki depremler için bildirim alırsınız.
                </Text>
                <View style={styles.optionsRow}>
                    {RADIUS_OPTIONS.map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.chip, prefs.radius_km === r && styles.chipActive]}
                            onPress={() => update("radius_km", r)}
                        >
                            <Text style={[styles.chipText, prefs.radius_km === r && styles.chipTextActive]}>
                                {r >= 1000 ? `${r / 1000}K` : r}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Night Mode */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: "#8b5cf615" }]}>
                        <MaterialCommunityIcons name="weather-night" size={22} color="#8b5cf6" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Gece Modu</Text>
                        <Text style={styles.cardSub}>
                            {prefs.night_start}:00 – {prefs.night_end}:00 arası sadece büyük depremler
                        </Text>
                    </View>
                    <Switch
                        value={prefs.night_mode}
                        onValueChange={(val) => update("night_mode", val)}
                        trackColor={{ false: Colors.border.dark, true: "#8b5cf680" }}
                        thumbColor={prefs.night_mode ? "#8b5cf6" : "#888"}
                    />
                </View>

                {prefs.night_mode && (
                    <>
                        <Text style={styles.filterDesc}>
                            Gece saatlerinde sadece M{prefs.night_min_magnitude.toFixed(1)} ve üzeri depremler bildirilir.
                        </Text>
                        <View style={styles.optionsRow}>
                            {NIGHT_MAG_OPTIONS.map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.chip, prefs.night_min_magnitude === m && styles.chipActiveNight]}
                                    onPress={() => update("night_min_magnitude", m)}
                                >
                                    <Text style={[styles.chipText, prefs.night_min_magnitude === m && styles.chipTextActive]}>
                                        M{m.toFixed(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}
            </View>

            {/* Notification Behavior */}
            <View style={styles.sectionLabel}>
                <Text style={styles.sectionLabelText}>Bildirim Davranışı</Text>
            </View>

            <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                    <MaterialCommunityIcons name="volume-high" size={20} color={Colors.primary} />
                    <Text style={styles.toggleText}>Sesli Bildirim</Text>
                    <Switch
                        value={prefs.sound_enabled}
                        onValueChange={(val) => update("sound_enabled", val)}
                        trackColor={{ false: Colors.border.dark, true: Colors.primary + "80" }}
                        thumbColor={prefs.sound_enabled ? Colors.primary : "#888"}
                    />
                </View>
                <View style={styles.toggleDivider} />
                <View style={styles.toggleRow}>
                    <MaterialCommunityIcons name="vibrate" size={20} color={Colors.accent} />
                    <Text style={styles.toggleText}>Titreşim</Text>
                    <Switch
                        value={prefs.vibration_enabled}
                        onValueChange={(val) => update("vibration_enabled", val)}
                        trackColor={{ false: Colors.border.dark, true: Colors.accent + "80" }}
                        thumbColor={prefs.vibration_enabled ? Colors.accent : "#888"}
                    />
                </View>
                <View style={styles.toggleDivider} />
                <View style={styles.toggleRow}>
                    <MaterialCommunityIcons name="chart-timeline-variant" size={20} color={Colors.status.info} />
                    <Text style={styles.toggleText}>Artçı Sarsıntıları Göster</Text>
                    <Switch
                        value={prefs.show_aftershocks}
                        onValueChange={(val) => update("show_aftershocks", val)}
                        trackColor={{ false: Colors.border.dark, true: Colors.status.info + "80" }}
                        thumbColor={prefs.show_aftershocks ? Colors.status.info : "#888"}
                    />
                </View>
                <View style={styles.toggleDivider} />
                <View style={styles.toggleRow}>
                    <MaterialCommunityIcons name="file-document-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.toggleText}>Günlük Özet Rapor</Text>
                    <Switch
                        value={prefs.daily_summary}
                        onValueChange={(val) => update("daily_summary", val)}
                        trackColor={{ false: Colors.border.dark, true: "#8b5cf680" }}
                        thumbColor={prefs.daily_summary ? "#8b5cf6" : "#888"}
                    />
                </View>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoText}>
                    Konum bazlı filtreleme için uygulamanın konum iznine ihtiyacı vardır.
                    Konum izni yoksa tüm Türkiye genelinde bildirim alırsınız.
                </Text>
            </View>

            {/* Save */}
            <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={savePrefs}
                disabled={saving}
                activeOpacity={0.85}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
                        <Text style={styles.saveBtnText}>Tercihleri Kaydet</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark },

    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.md,
        marginTop: Spacing.lg,
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
    title: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.text.dark, letterSpacing: -0.5 },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    premiumBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        backgroundColor: "#eab30810",
        borderRadius: BorderRadius.full,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: "#eab30830",
        marginBottom: Spacing.lg,
    },
    premiumText: { fontSize: Typography.sizes.xs, fontWeight: "800", color: "#eab308", textTransform: "uppercase", letterSpacing: 0.5 },

    card: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        gap: Spacing.md,
        ...Shadows.sm,
    },
    row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    cardTitle: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    cardSub: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },
    valuePill: {
        backgroundColor: Colors.primary + "15",
        borderRadius: BorderRadius.full,
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    valueText: { fontSize: Typography.sizes.md, fontWeight: "900", color: Colors.primary },
    filterDesc: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", lineHeight: 18 },

    optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipActiveNight: { backgroundColor: "#8b5cf6", borderColor: "#8b5cf6" },
    chipText: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.muted },
    chipTextActive: { color: "#fff" },

    sectionLabel: { marginTop: Spacing.sm, marginBottom: Spacing.md },
    sectionLabelText: {
        fontSize: Typography.sizes.xs,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
    },

    toggleCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    toggleRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.sm,
    },
    toggleText: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "700", color: Colors.text.dark },
    toggleDivider: { height: 1, backgroundColor: Colors.border.glass, marginHorizontal: Spacing.sm },

    infoBox: {
        flexDirection: "row",
        gap: 8,
        backgroundColor: Colors.primary + "08",
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "20",
    },
    infoText: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", lineHeight: 18 },

    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        height: 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        ...Shadows.md,
        shadowColor: Colors.primary,
    },
    saveBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },
});
