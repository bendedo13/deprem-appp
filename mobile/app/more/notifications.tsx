/**
 * Bildirim Ayarları Ekranı
 * Kullanıcının min. deprem şiddeti, yarıçap ve aktif/pasif tercihlerini yönetir.
 * Backend: PUT /api/v1/notifications/preferences
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
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

interface NotificationPrefs {
    min_magnitude: number;
    radius_km: number;
    is_enabled: boolean;
}

const MAG_OPTIONS = [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0];
const RADIUS_OPTIONS = [50, 100, 200, 300, 500, 750, 1000, 2000];

export default function NotificationsScreen() {
    const [prefs, setPrefs] = useState<NotificationPrefs>({
        min_magnitude: 3.0,
        radius_km: 500,
        is_enabled: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPrefs();
    }, []);

    async function loadPrefs() {
        try {
            const { data } = await api.get<NotificationPrefs>("/api/v1/notifications/preferences");
            setPrefs(data);
        } catch (e) {
            console.error("Tercihler yüklenemedi:", e);
        } finally {
            setLoading(false);
        }
    }

    async function savePrefs() {
        setSaving(true);
        try {
            await api.put("/api/v1/notifications/preferences", prefs);
            Alert.alert("✅ Kaydedildi", "Bildirim tercihleriniz güncellendi.", [
                { text: "Tamam", onPress: () => router.back() },
            ]);
        } catch (e) {
            Alert.alert("Hata", "Kaydedilirken bir sorun oluştu.");
        } finally {
            setSaving(false);
        }
    }

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
                <Text style={styles.title}>Bildirim Ayarları</Text>
            </View>

            {/* Enable / Disable toggle */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.iconBox}>
                        <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>Push Bildirimleri</Text>
                        <Text style={styles.cardSub}>Önemli depremlerde anlık uyarı al.</Text>
                    </View>
                    <Switch
                        value={prefs.is_enabled}
                        onValueChange={(val) => setPrefs({ ...prefs, is_enabled: val })}
                        trackColor={{ false: Colors.border.dark, true: Colors.primary + "80" }}
                        thumbColor={prefs.is_enabled ? Colors.primary : "#888"}
                    />
                </View>
            </View>

            {/* Minimum Magnitude */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: "#f59e0b15" }]}>
                        <MaterialCommunityIcons name="sine-wave" size={22} color="#f59e0b" />
                    </View>
                    <Text style={styles.cardTitle}>Minimum Şiddet</Text>
                    <Text style={styles.valueLabel}>M{prefs.min_magnitude.toFixed(1)}</Text>
                </View>
                <View style={styles.optionsRow}>
                    {MAG_OPTIONS.map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.chip, prefs.min_magnitude === m && styles.chipActive]}
                            onPress={() => setPrefs({ ...prefs, min_magnitude: m })}
                        >
                            <Text style={[styles.chipText, prefs.min_magnitude === m && styles.chipTextActive]}>
                                M{m.toFixed(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hint}>
                    Bu değerin altındaki depremler için bildirim gönderilmez.
                </Text>
            </View>

            {/* Radius */}
            <View style={styles.card}>
                <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: "#3b82f615" }]}>
                        <MaterialCommunityIcons name="map-marker-radius-outline" size={22} color="#3b82f6" />
                    </View>
                    <Text style={styles.cardTitle}>Bildirim Yarıçapı</Text>
                    <Text style={styles.valueLabel}>{prefs.radius_km} km</Text>
                </View>
                <View style={styles.optionsRow}>
                    {RADIUS_OPTIONS.map((r) => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.chip, prefs.radius_km === r && styles.chipActive]}
                            onPress={() => setPrefs({ ...prefs, radius_km: r })}
                        >
                            <Text style={[styles.chipText, prefs.radius_km === r && styles.chipTextActive]}>
                                {r} km
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.hint}>
                    Konumunuza bu mesafedeki depremler için bildirim alırsınız.
                </Text>
            </View>

            {/* Info box */}
            <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoText}>
                    Konum bazlı filtreleme için uygulamanın konum iznine ihtiyacı vardır.
                    Konum izni yoksa tüm Türkiye genelinde bildirim alırsınız.
                </Text>
            </View>

            {/* Save Button */}
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
                        <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>
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
    card: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        gap: Spacing.md,
    },
    row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.primary + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    cardTitle: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "700", color: Colors.text.dark },
    cardSub: { fontSize: Typography.sizes.sm, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },
    valueLabel: { fontSize: Typography.sizes.lg, fontWeight: "800", color: Colors.primary },
    optionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    chipActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    chipText: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.muted },
    chipTextActive: { color: "#fff" },
    hint: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500" },
    infoBox: {
        flexDirection: "row",
        gap: 8,
        backgroundColor: Colors.primary + "10",
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "30",
    },
    infoText: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", lineHeight: 18 },
    saveBtn: {
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.lg,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    saveBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },
});
