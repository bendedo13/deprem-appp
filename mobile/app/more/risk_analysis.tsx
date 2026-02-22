import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    TextInput,
    Alert,
} from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { calculateRiskScore, RiskResult } from "../../src/services/riskService";

const SOIL_CLASSES = [
    { label: "Bilinmiyor", value: "UNKNOWN" },
    { label: "Z1 (Kaya / Çok Sert)", value: "Z1" },
    { label: "Z2 (Sert)", value: "Z2" },
    { label: "Z3 (Orta Sert)", value: "Z3" },
    { label: "Z4 (Yumuşak / Kil)", value: "Z4" },
];

const YEAR_RANGES = [
    { label: "2007 Sonrası", value: 2020 },
    { label: "2000 - 2007", value: 2003 },
    { label: "1975 - 1999", value: 1990 },
    { label: "1975 Öncesi", value: 1970 },
];

export default function RiskAnalysisScreen() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<RiskResult | null>(null);
    const [buildingYear, setBuildingYear] = useState(2020);
    const [soilClass, setSoilClass] = useState("UNKNOWN");
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;
            let pos = await Location.getCurrentPositionAsync({});
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        })();
    }, []);

    const handleCalculate = async () => {
        if (!location) {
            Alert.alert("Hata", "Konum bilgisi alınamadı. Lütfen izin verin.");
            return;
        }

        setLoading(true);
        try {
            const data = await calculateRiskScore({
                latitude: location.lat,
                longitude: location.lng,
                building_year: buildingYear,
                soil_class: soilClass,
            });
            setResult(data);
        } catch (error) {
            Alert.alert("Hata", "Risk analizi yapılamadı. Lütfen tekrar deneyin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Risk Analizi</Text>
                    <Text style={styles.subtitle}>Konum ve bina verilerine göre sismik risk ölçümü.</Text>
                </View>
            </View>

            {/* Input Card */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Bina Bilgileri</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Yapım Yılı</Text>
                    <View style={styles.selectorRow}>
                        {YEAR_RANGES.map((y) => (
                            <TouchableOpacity
                                key={y.value}
                                style={[styles.option, buildingYear === y.value && styles.optionSelected]}
                                onPress={() => setBuildingYear(y.value)}
                            >
                                <Text style={[styles.optionText, buildingYear === y.value && styles.optionTextSelected]}>{y.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Zemin Sınıfı</Text>
                    <View style={styles.soilGrid}>
                        {SOIL_CLASSES.map((s) => (
                            <TouchableOpacity
                                key={s.value}
                                style={[styles.soilOption, soilClass === s.value && styles.soilOptionSelected]}
                                onPress={() => setSoilClass(s.value)}
                            >
                                <Text style={[styles.soilOptionText, soilClass === s.value && styles.soilOptionTextSelected]}>{s.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.calculateBtn}
                    onPress={handleCalculate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="shield-search" size={20} color="#fff" />
                            <Text style={styles.calculateBtnText}>RİSKİ HESAPLA</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Result Area */}
            {result && (
                <View style={styles.resultCard}>
                    <View style={styles.scoreHeader}>
                        <View>
                            <Text style={styles.scoreLabel}>RİSK SKORU</Text>
                            <Text style={[styles.scoreLevel, { color: result.level === 'Çok Yüksek' ? '#ef4444' : result.level === 'Yüksek' ? '#f97316' : '#10b981' }]}>
                                {result.level}
                            </Text>
                        </View>
                        <View style={styles.scoreCircle}>
                            <Text style={styles.scoreMain}>{result.score.toFixed(1)}</Text>
                            <Text style={styles.scoreSub}>/ 10</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.faultInfo}>
                        <MaterialCommunityIcons name="map-marker-distance" size={24} color={Colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.faultTitle}>En Yakın Fay Hattı</Text>
                            <Text style={styles.faultName}>{result.nearest_fault} ({result.fault_distance_km.toFixed(1)} km)</Text>
                        </View>
                    </View>

                    <View style={styles.recommendations}>
                        {result.recommendations.map((rec, i) => (
                            <View key={i} style={styles.recItem}>
                                <MaterialCommunityIcons name="information-outline" size={16} color={Colors.text.muted} />
                                <Text style={styles.recText}>{rec}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            <View style={styles.disclaimer}>
                <Text style={styles.disclaimerText}>
                    * Bu analiz bilgilendirme amaçlıdır ve resmi bir rapor değildir.
                    Kesin sonuç için yetkili kuruluşlara başvurunuz.
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
    card: {
        backgroundColor: Colors.background.surface,
        padding: Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.sizes.xs,
        fontWeight: "900",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: Spacing.lg,
    },
    inputGroup: { marginBottom: Spacing.xl },
    label: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.dark, marginBottom: 12 },
    selectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    option: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        backgroundColor: Colors.background.dark,
    },
    optionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    optionText: { color: Colors.text.muted, fontWeight: "600", fontSize: 12 },
    optionTextSelected: { color: "#fff" },
    soilGrid: { gap: 8 },
    soilOption: {
        padding: 12,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        backgroundColor: Colors.background.dark,
    },
    soilOptionSelected: { borderColor: Colors.primary + "50", backgroundColor: Colors.primary + "10" },
    soilOptionText: { color: Colors.text.muted, fontWeight: "600", fontSize: 13 },
    soilOptionTextSelected: { color: Colors.primary },
    calculateBtn: {
        backgroundColor: Colors.primary,
        height: 54,
        borderRadius: BorderRadius.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    calculateBtnText: { color: "#fff", fontWeight: "900", letterSpacing: 1 },
    resultCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.primary + "30",
        padding: Spacing.xl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    scoreHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    scoreLabel: { fontSize: 10, fontWeight: "900", color: Colors.text.muted, letterSpacing: 2 },
    scoreLevel: { fontSize: Typography.sizes.xxl, fontWeight: "900" },
    scoreCircle: { alignItems: "flex-end" },
    scoreMain: { fontSize: 48, fontWeight: "900", color: Colors.primary, includeFontPadding: false },
    scoreSub: { fontSize: 12, color: Colors.text.muted, fontWeight: "900", marginTop: -10 },
    divider: { height: 1, backgroundColor: Colors.border.dark, marginVertical: Spacing.xl },
    faultInfo: { flexDirection: "row", alignItems: "center", gap: Spacing.md, marginBottom: Spacing.xl },
    faultTitle: { fontSize: 10, fontWeight: "900", color: Colors.text.muted, textTransform: "uppercase" },
    faultName: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    recommendations: { gap: 10 },
    recItem: { flexDirection: "row", gap: 10, backgroundColor: Colors.background.dark, padding: 12, borderRadius: BorderRadius.md },
    recText: { flex: 1, fontSize: 12, color: Colors.text.muted, lineHeight: 18, fontWeight: "500" },
    disclaimer: { marginTop: Spacing.xl, paddingHorizontal: Spacing.md },
    disclaimerText: { fontSize: 10, color: Colors.text.muted, textAlign: "center", fontStyle: "italic", lineHeight: 16 },
});
