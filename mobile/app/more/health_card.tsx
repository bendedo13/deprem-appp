/**
 * Sağlık Kartım — Tıbbi bilgilerin acil durum kartı.
 * Kan grubu, alerjiler, ilaçlar ve kronik hastalıklar.
 * Backend API veya AsyncStorage ile senkronize edilir.
 */

import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { api } from "../../src/services/api";

const STORAGE_KEY = "quakesense_health_card";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-", "Bilinmiyor"];

interface HealthCard {
    bloodType: string;
    allergies: string;
    medications: string;
    conditions: string;
    emergencyNote: string;
}

const DEFAULT_CARD: HealthCard = {
    bloodType: "Bilinmiyor",
    allergies: "",
    medications: "",
    conditions: "",
    emergencyNote: "",
};

export default function HealthCardScreen() {
    const [card, setCard] = useState<HealthCard>(DEFAULT_CARD);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        (async () => {
            // Önce backend'den oku, başarısızsa yerel depolamadan oku
            try {
                const { data } = await api.get<{
                    blood_type: string;
                    allergies: string;
                    medications: string;
                    conditions: string;
                    emergency_note: string;
                }>("/api/v1/health-card");
                if (data && data.blood_type) {
                    const mapped: HealthCard = {
                        bloodType: data.blood_type,
                        allergies: data.allergies ?? "",
                        medications: data.medications ?? "",
                        conditions: data.conditions ?? "",
                        emergencyNote: data.emergency_note ?? "",
                    };
                    setCard(mapped);
                    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
                    setLoading(false);
                    return;
                }
            } catch {
                // Backend erişilemiyorsa yerel depoya düş
            }
            try {
                const raw = await AsyncStorage.getItem(STORAGE_KEY);
                if (raw) setCard(JSON.parse(raw));
            } catch { /* */ }
            setLoading(false);
        })();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Yerel kaydet
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(card));

            // Backend'e senkronize et
            try {
                await api.put("/api/v1/health-card", {
                    blood_type: card.bloodType,
                    allergies: card.allergies,
                    medications: card.medications,
                    conditions: card.conditions,
                    emergency_note: card.emergencyNote,
                });
            } catch {
                // Backend erişilemiyorsa sadece yerel kaydedilir
                console.warn("[HealthCard] Backend sync başarısız, sadece yerel kaydedildi.");
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            Alert.alert("Hata", "Kaydedilemedi. Lütfen tekrar deneyin.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Sağlık Kartım</Text>
                        <Text style={styles.subtitle}>Acil durumda hayat kurtarır.</Text>
                    </View>
                </View>

                {/* Info banner */}
                <View style={styles.infoBanner}>
                    <MaterialCommunityIcons name="shield-heart-outline" size={20} color={Colors.danger} />
                    <Text style={styles.infoBannerText}>
                        Bilgileriniz cihazınızda ve güvenli sunucumuzda saklanır. Acil durumda kurtarma ekiplerine iletilebilir.
                    </Text>
                </View>

                {/* Kan Grubu */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>🩸 Kan Grubu</Text>
                    <View style={styles.bloodTypeGrid}>
                        {BLOOD_TYPES.map((bt) => (
                            <TouchableOpacity
                                key={bt}
                                style={[styles.bloodTypeBtn, card.bloodType === bt && styles.bloodTypeBtnActive]}
                                onPress={() => setCard((c) => ({ ...c, bloodType: bt }))}
                            >
                                <Text style={[styles.bloodTypeBtnText, card.bloodType === bt && styles.bloodTypeBtnTextActive]}>
                                    {bt}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Alerjiler */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionLabel}>⚠️ Alerjiler</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={card.allergies}
                        onChangeText={(v) => setCard((c) => ({ ...c, allergies: v }))}
                        placeholder="Penisilin, fıstık, latex, vs. (yoksa boş bırakın)"
                        placeholderTextColor={Colors.text.muted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        maxLength={500}
                    />
                </View>

                {/* Süregelen ilaçlar */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionLabel}>💊 Süregelen İlaçlar</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={card.medications}
                        onChangeText={(v) => setCard((c) => ({ ...c, medications: v }))}
                        placeholder="İlaç adı ve dozu (örn: Metformin 500mg, günde 2)"
                        placeholderTextColor={Colors.text.muted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        maxLength={500}
                    />
                </View>

                {/* Kronik hastalıklar */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionLabel}>🏥 Kronik Hastalıklar</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={card.conditions}
                        onChangeText={(v) => setCard((c) => ({ ...c, conditions: v }))}
                        placeholder="Diyabet, hipertansiyon, astım, epilepsi, vs."
                        placeholderTextColor={Colors.text.muted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        maxLength={500}
                    />
                </View>

                {/* Acil not */}
                <View style={styles.inputSection}>
                    <Text style={styles.sectionLabel}>📝 Acil Durum Notu</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={card.emergencyNote}
                        onChangeText={(v) => setCard((c) => ({ ...c, emergencyNote: v }))}
                        placeholder="Sağlık personeline iletilmesini istediğiniz ek bilgiler..."
                        placeholderTextColor={Colors.text.muted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        maxLength={500}
                    />
                </View>

                {/* Save button */}
                <TouchableOpacity
                    style={[styles.saveBtn, (saving || saved) && styles.saveBtnActive]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : saved ? (
                        <>
                            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>Kaydedildi!</Text>
                        </>
                    ) : (
                        <>
                            <MaterialCommunityIcons name="content-save-outline" size={20} color="#fff" />
                            <Text style={styles.saveBtnText}>KAYDET</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Preview card */}
                {(card.bloodType !== "Bilinmiyor" || card.allergies || card.medications || card.conditions) && (
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>🆘 Acil Durum Kartı Önizlemesi</Text>
                        <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Kan Grubu:</Text>
                            <Text style={[styles.previewValue, { color: Colors.danger, fontWeight: "900" }]}>{card.bloodType}</Text>
                        </View>
                        {card.allergies ? (
                            <View style={styles.previewRow}>
                                <Text style={styles.previewLabel}>Alerjiler:</Text>
                                <Text style={styles.previewValue}>{card.allergies}</Text>
                            </View>
                        ) : null}
                        {card.medications ? (
                            <View style={styles.previewRow}>
                                <Text style={styles.previewLabel}>İlaçlar:</Text>
                                <Text style={styles.previewValue}>{card.medications}</Text>
                            </View>
                        ) : null}
                        {card.conditions ? (
                            <View style={styles.previewRow}>
                                <Text style={styles.previewLabel}>Kronik:</Text>
                                <Text style={styles.previewValue}>{card.conditions}</Text>
                            </View>
                        ) : null}
                        {card.emergencyNote ? (
                            <View style={styles.previewRow}>
                                <Text style={styles.previewLabel}>Not:</Text>
                                <Text style={styles.previewValue}>{card.emergencyNote}</Text>
                            </View>
                        ) : null}
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
    header: {
        flexDirection: "row", alignItems: "center", gap: Spacing.md,
        marginBottom: Spacing.xl, marginTop: Spacing.lg,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.background.surface, justifyContent: "center", alignItems: "center",
        borderWidth: 1, borderColor: Colors.border.dark,
    },
    title: { fontSize: Typography.sizes.xxl, fontWeight: "800", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    infoBanner: {
        flexDirection: "row", alignItems: "flex-start", gap: 10,
        backgroundColor: Colors.danger + "08", borderWidth: 1, borderColor: Colors.danger + "20",
        borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.xl,
    },
    infoBannerText: { flex: 1, fontSize: 11, color: Colors.text.muted, lineHeight: 16, fontWeight: "500" },

    section: { marginBottom: Spacing.xl },
    sectionLabel: {
        fontSize: 12, fontWeight: "800", color: Colors.text.muted,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: Spacing.md,
    },

    bloodTypeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    bloodTypeBtn: {
        paddingHorizontal: 16, paddingVertical: 10, borderRadius: BorderRadius.md,
        backgroundColor: Colors.background.surface, borderWidth: 1.5, borderColor: Colors.border.dark,
    },
    bloodTypeBtnActive: { backgroundColor: Colors.danger + "15", borderColor: Colors.danger },
    bloodTypeBtnText: { fontSize: 13, fontWeight: "800", color: Colors.text.muted },
    bloodTypeBtnTextActive: { color: Colors.danger },

    inputSection: { marginBottom: Spacing.lg },
    input: {
        backgroundColor: Colors.background.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, color: Colors.text.dark, fontWeight: "600",
        borderWidth: 1, borderColor: Colors.border.dark, fontSize: Typography.sizes.sm,
    },
    textarea: { minHeight: 88, textAlignVertical: "top", paddingTop: Spacing.md },

    saveBtn: {
        backgroundColor: Colors.primary, padding: Spacing.lg, borderRadius: BorderRadius.xl,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4, marginBottom: Spacing.xl,
    },
    saveBtnActive: { backgroundColor: "#10B981" },
    saveBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },

    previewCard: {
        backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl,
        padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.danger + "30",
    },
    previewTitle: { fontSize: 13, fontWeight: "900", color: Colors.text.dark, marginBottom: Spacing.md },
    previewRow: { flexDirection: "row", marginBottom: 6, gap: 8 },
    previewLabel: { fontSize: 11, fontWeight: "800", color: Colors.text.muted, width: 70 },
    previewValue: { flex: 1, fontSize: 11, color: Colors.text.dark, fontWeight: "600", lineHeight: 16 },
});
