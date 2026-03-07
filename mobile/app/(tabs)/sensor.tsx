/**
 * Erken Uyarı Sensör Ekranı — Canlı STA/LTA sismik izleme.
 *
 * Özellikler:
 *  - Gerçek zamanlı STA/LTA oran göstergesi (animasyonlu gauge)
 *  - İzleme durumu (aktif / pasif / tetiklendi)
 *  - Cooldown sayacı (tetiklemeden sonra kaç saniye kaldı)
 *  - Arka plan FCM desteği açıklaması
 *  - Algoritma bilgisi (eşik, pencere boyutları)
 */

import { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Platform,
    Animated,
} from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";
import {
    TRIGGER_RATIO,
    DETRIGGER_RATIO,
    STA_WINDOW,
    LTA_WINDOW,
    SAMPLE_RATE_HZ,
    COOLDOWN_AFTER_TRIGGER_MS,
} from "../../src/constants/seismic";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

/** STA/LTA oranını renk koduna çevirir */
function ratioColor(ratio: number): string {
    if (ratio >= TRIGGER_RATIO) return Colors.danger;
    if (ratio >= TRIGGER_RATIO * 0.7) return Colors.accent;
    if (ratio >= TRIGGER_RATIO * 0.4) return "#ca8a04";
    return Colors.primary;
}

/** Oranı 0–100 yüzdesine çevirir (gauge için) */
function ratioToPercent(ratio: number): number {
    const max = TRIGGER_RATIO * 1.5;
    return Math.min((ratio / max) * 100, 100);
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SensorScreen() {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [lastTriggerHistory, setLastTriggerHistory] = useState<
        Array<{ time: Date; peak: number; ratio: number }>
    >([]);

    const { isMonitoring, isTriggered, peakAcceleration, staLtaRatio, triggerTime } =
        useShakeDetector(location?.lat ?? null, location?.lng ?? null);

    const gaugeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const prevTriggered = useRef(false);

    // Konum izni
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const pos = await Location.getCurrentPositionAsync({});
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        })();
    }, []);

    // Gauge animasyonu — STA/LTA oranına göre
    useEffect(() => {
        const pct = ratioToPercent(staLtaRatio);
        Animated.spring(gaugeAnim, {
            toValue: pct / 100,
            useNativeDriver: false,
            speed: 20,
            bounciness: 2,
        }).start();
    }, [staLtaRatio]);

    // Tetiklenme olduğunda tarihçeye ekle + pulse animasyonu
    useEffect(() => {
        if (isTriggered && !prevTriggered.current && triggerTime) {
            setLastTriggerHistory((prev) =>
                [{ time: triggerTime, peak: peakAcceleration, ratio: staLtaRatio }, ...prev].slice(0, 5)
            );
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                ]),
                { iterations: 6 }
            ).start();
        }
        prevTriggered.current = isTriggered;
    }, [isTriggered, triggerTime]);

    const color = ratioColor(staLtaRatio);
    const gaugeWidth = gaugeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* Başlık */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <MaterialCommunityIcons name="waveform" size={24} color={Colors.primary} />
                        <Text style={styles.headerTitle}>Erken Uyarı</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: isMonitoring ? Colors.primary + "20" : Colors.text.muted + "20" }]}>
                        <View style={[styles.statusDot, { backgroundColor: isMonitoring ? Colors.primary : Colors.text.muted }]} />
                        <Text style={[styles.statusText, { color: isMonitoring ? Colors.primary : Colors.text.muted }]}>
                            {isMonitoring ? "Aktif" : "Pasif"}
                        </Text>
                    </View>
                </View>

                {/* Ana Gauge Kartı */}
                <Animated.View style={[styles.gaugeCard, isTriggered && styles.gaugeCardAlert, { transform: [{ scale: pulseAnim }] }]}>
                    {/* Büyük ikon */}
                    <View style={[styles.gaugeIcon, { backgroundColor: color + "15" }]}>
                        <MaterialCommunityIcons
                            name={isTriggered ? "alert-octagon" : "radar"}
                            size={48}
                            color={color}
                        />
                    </View>

                    {/* Durum metni */}
                    <Text style={[styles.gaugeStatus, { color }]}>
                        {isTriggered
                            ? "⚠ Sismik Sinyal Algılandı"
                            : staLtaRatio >= TRIGGER_RATIO * 0.7
                            ? "Anormal Titreşim"
                            : "Normal — İzleniyor"}
                    </Text>

                    {/* STA/LTA Oranı */}
                    <Text style={styles.ratioValue}>{staLtaRatio.toFixed(2)}</Text>
                    <Text style={styles.ratioLabel}>STA / LTA Oranı</Text>

                    {/* Gauge bar */}
                    <View style={styles.gaugeBarBg}>
                        <Animated.View
                            style={[
                                styles.gaugeBarFill,
                                { width: gaugeWidth, backgroundColor: color },
                            ]}
                        />
                        {/* Eşik işareti */}
                        <View
                            style={[
                                styles.gaugeThreshold,
                                { left: `${(1 / 1.5) * 100}%` as any },
                            ]}
                        />
                    </View>
                    <View style={styles.gaugeLabels}>
                        <Text style={styles.gaugeLabelText}>0</Text>
                        <Text style={[styles.gaugeLabelText, { color: Colors.danger }]}>
                            Eşik: {TRIGGER_RATIO}
                        </Text>
                        <Text style={styles.gaugeLabelText}>{(TRIGGER_RATIO * 1.5).toFixed(1)}+</Text>
                    </View>

                    {/* Tepe ivme */}
                    {isTriggered && peakAcceleration > 0 && (
                        <View style={styles.peakRow}>
                            <MaterialCommunityIcons name="speedometer" size={16} color={Colors.danger} />
                            <Text style={styles.peakText}>
                                Tepe İvme: {peakAcceleration.toFixed(3)} m/s²
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* Algoritma Parametreleri */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Algoritma Parametreleri</Text>
                    <View style={styles.paramsGrid}>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{SAMPLE_RATE_HZ} Hz</Text>
                            <Text style={styles.paramLabel}>Örnekleme</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{STA_WINDOW / SAMPLE_RATE_HZ}s</Text>
                            <Text style={styles.paramLabel}>STA Penceresi</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{LTA_WINDOW / SAMPLE_RATE_HZ}s</Text>
                            <Text style={styles.paramLabel}>LTA Penceresi</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={[styles.paramValue, { color: Colors.danger }]}>{TRIGGER_RATIO}</Text>
                            <Text style={styles.paramLabel}>Tetik Eşiği</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{DETRIGGER_RATIO}</Text>
                            <Text style={styles.paramLabel}>Detrigger</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{COOLDOWN_AFTER_TRIGGER_MS / 1000}s</Text>
                            <Text style={styles.paramLabel}>Bekleme</Text>
                        </View>
                    </View>
                </View>

                {/* Tetikleme Tarihçesi */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Son Tetiklemeler</Text>
                    {lastTriggerHistory.length === 0 ? (
                        <View style={styles.emptyHistory}>
                            <MaterialCommunityIcons name="check-circle-outline" size={32} color={Colors.primary} />
                            <Text style={styles.emptyHistoryText}>Henüz tetikleme yok — bu iyi bir işaret!</Text>
                        </View>
                    ) : (
                        lastTriggerHistory.map((item, i) => (
                            <View key={i} style={styles.historyItem}>
                                <View style={[styles.historyDot, { backgroundColor: ratioColor(item.ratio) }]} />
                                <View style={styles.historyInfo}>
                                    <Text style={styles.historyTime}>{formatTime(item.time)}</Text>
                                    <Text style={styles.historyDetail}>
                                        Oran: {item.ratio.toFixed(2)} · İvme: {item.peak.toFixed(3)} m/s²
                                    </Text>
                                </View>
                                <MaterialCommunityIcons name="alert-circle-outline" size={18} color={ratioColor(item.ratio)} />
                            </View>
                        ))
                    )}
                </View>

                {/* Arka Plan Koruması Bilgisi */}
                <View style={styles.infoCard}>
                    <MaterialCommunityIcons name="shield-check" size={20} color={Colors.primary} />
                    <View style={styles.infoText}>
                        <Text style={styles.infoTitle}>Arka Plan Koruması</Text>
                        <Text style={styles.infoBody}>
                            Uygulama kapalıyken sunucu, AFAD/Kandilli/USGS verilerini izler ve M4.0+ depremde
                            Firebase Cloud Messaging ile anında tam ekran alarm çalar. İnternet bağlantısı gereklidir.
                        </Text>
                    </View>
                </View>

                {/* Lokasyon durumu */}
                <View style={[styles.infoCard, { marginBottom: Spacing.xxxl }]}>
                    <MaterialCommunityIcons
                        name={location ? "map-marker-check" : "map-marker-off"}
                        size={20}
                        color={location ? Colors.primary : Colors.text.muted}
                    />
                    <View style={styles.infoText}>
                        <Text style={styles.infoTitle}>Konum</Text>
                        <Text style={styles.infoBody}>
                            {location
                                ? `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E — Raporlar bu koordinatlarla gönderilir.`
                                : "Konum izni verilmedi. Sismik raporlar gönderilemiyor."}
                        </Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === "android" ? 30 : 0 },
    scroll: { padding: Spacing.lg },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerTitle: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: Typography.sizes.xs, fontWeight: "700" },

    gaugeCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.xl,
        alignItems: "center",
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    gaugeCardAlert: {
        borderColor: Colors.danger + "60",
        backgroundColor: Colors.danger + "08",
    },
    gaugeIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    gaugeStatus: { fontSize: Typography.sizes.md, fontWeight: "800", marginBottom: Spacing.sm },
    ratioValue: {
        fontSize: 56,
        fontWeight: "900",
        color: Colors.text.dark,
        letterSpacing: -2,
    },
    ratioLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.lg,
    },

    gaugeBarBg: {
        width: "100%",
        height: 8,
        backgroundColor: Colors.background.elevated,
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
        marginBottom: 6,
    },
    gaugeBarFill: { height: "100%", borderRadius: 4 },
    gaugeThreshold: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 2,
        backgroundColor: Colors.danger,
    },
    gaugeLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: Spacing.md,
    },
    gaugeLabelText: { fontSize: 10, color: Colors.text.muted, fontWeight: "700" },

    peakRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.danger + "15",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.sm,
    },
    peakText: { color: Colors.danger, fontSize: Typography.sizes.sm, fontWeight: "700" },

    section: { marginBottom: Spacing.lg },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },

    paramsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    paramCard: {
        flex: 1,
        minWidth: "30%",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: "center",
    },
    paramValue: {
        fontSize: Typography.sizes.lg,
        fontWeight: "900",
        color: Colors.text.dark,
    },
    paramLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 2,
        textAlign: "center",
    },

    emptyHistory: {
        alignItems: "center",
        gap: Spacing.sm,
        padding: Spacing.xl,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    emptyHistoryText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "600",
        textAlign: "center",
    },
    historyItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    historyDot: { width: 10, height: 10, borderRadius: 5 },
    historyInfo: { flex: 1 },
    historyTime: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.dark },
    historyDetail: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    infoCard: {
        flexDirection: "row",
        gap: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        alignItems: "flex-start",
    },
    infoText: { flex: 1 },
    infoTitle: { fontSize: Typography.sizes.sm, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    infoBody: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", lineHeight: 18 },
});
