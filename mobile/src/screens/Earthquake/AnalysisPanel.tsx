/**
 * AnalysisPanel — Gelişmiş Deprem Analitik Dashboard
 *
 * Bileşenler:
 *  - Sparkline: Son 24 saatin saatlik deprem dağılımı (mini bar grafik)
 *  - Risk Seviyesi: Yeşil / Sarı / Kırmızı renk kodlaması
 *  - Risk Trendi: Son 12h vs önceki 12h karşılaştırması (↑ Artış / ↓ Azalış / = Stabil)
 *  - Animated entrance: Kart mount olurken yukarıdan kayarak gelir
 */

import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../constants/theme";
import type { UnifiedEarthquake } from "../../types/earthquake";

// ── Renk Sabitleri ────────────────────────────────────────────────────────────

function riskColor(maxMag: number): string {
    if (maxMag >= 5.5) return Colors.danger;
    if (maxMag >= 4.0) return Colors.accent;
    return Colors.primary;
}

function riskLabel(maxMag: number): string {
    if (maxMag >= 5.5) return "Yüksek Risk";
    if (maxMag >= 4.0) return "Orta Risk";
    return "Düşük Risk";
}

function riskIcon(maxMag: number): "shield-alert" | "shield-half-full" | "shield-check" {
    if (maxMag >= 5.5) return "shield-alert";
    if (maxMag >= 4.0) return "shield-half-full";
    return "shield-check";
}

// ── Trend Hesabı ──────────────────────────────────────────────────────────────

interface TrendResult {
    label: string;
    icon: "trending-up" | "trending-down" | "trending-neutral";
    color: string;
    delta: number;
}

function computeTrend(earthquakes: UnifiedEarthquake[]): TrendResult {
    const now = Date.now();
    const h12 = 12 * 3600 * 1000;
    const recent = earthquakes.filter((e) => e.date.getTime() >= now - h12).length;
    const prev = earthquakes.filter(
        (e) => e.date.getTime() >= now - 2 * h12 && e.date.getTime() < now - h12
    ).length;

    if (prev === 0 && recent === 0) {
        return { label: "Stabil", icon: "trending-neutral", color: Colors.status.info, delta: 0 };
    }
    const delta = prev === 0 ? 100 : Math.round(((recent - prev) / prev) * 100);

    if (delta > 15) return { label: `+${delta}% Artış`, icon: "trending-up", color: Colors.danger, delta };
    if (delta < -15) return { label: `${delta}% Azalış`, icon: "trending-down", color: Colors.primary, delta };
    return { label: "Stabil", icon: "trending-neutral", color: Colors.status.info, delta };
}

// ── Saatlik Dağılım ───────────────────────────────────────────────────────────

function computeHourlyBuckets(earthquakes: UnifiedEarthquake[]): number[] {
    const buckets = new Array<number>(24).fill(0);
    const now = Date.now();
    for (const eq of earthquakes) {
        const hoursAgo = Math.floor((now - eq.date.getTime()) / 3600000);
        if (hoursAgo >= 0 && hoursAgo < 24) {
            // 0 = en eski, 23 = en yeni
            buckets[23 - hoursAgo]++;
        }
    }
    return buckets;
}

// ── Sparkline Bileşeni ────────────────────────────────────────────────────────

interface SparklineProps {
    buckets: number[];
    accentColor: string;
}

function Sparkline({ buckets, accentColor }: SparklineProps) {
    const max = Math.max(...buckets, 1);
    const BAR_H = 36;

    return (
        <View style={sparkStyles.container}>
            {buckets.map((v, i) => {
                const heightPct = v / max;
                const barColor =
                    heightPct > 0.75 ? Colors.danger :
                    heightPct > 0.4 ? Colors.accent :
                    accentColor;

                return (
                    <View key={i} style={sparkStyles.barWrapper}>
                        <View
                            style={[
                                sparkStyles.bar,
                                {
                                    height: Math.max(2, heightPct * BAR_H),
                                    backgroundColor: barColor,
                                    opacity: 0.7 + heightPct * 0.3,
                                },
                            ]}
                        />
                    </View>
                );
            })}
        </View>
    );
}

const sparkStyles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "flex-end",
        height: 40,
        gap: 2,
        marginTop: Spacing.md,
    },
    barWrapper: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: 40 },
    bar: { width: "100%", borderRadius: 2 },
});

// ── Props ─────────────────────────────────────────────────────────────────────

interface AnalysisPanelProps {
    count24h: number;
    maxMag24h: number;
    earthquakes?: UnifiedEarthquake[];
}

// ── Ana Bileşen ───────────────────────────────────────────────────────────────

export function AnalysisPanel({ count24h, maxMag24h, earthquakes = [] }: AnalysisPanelProps) {
    const slideAnim = useRef(new Animated.Value(-20)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const color = riskColor(maxMag24h);
    const trend = useMemo(() => computeTrend(earthquakes), [earthquakes]);
    const buckets = useMemo(() => computeHourlyBuckets(earthquakes), [earthquakes]);
    const avgMag = useMemo(() => {
        if (!earthquakes.length) return 0;
        return earthquakes.reduce((s, e) => s + e.magnitude, 0) / earthquakes.length;
    }, [earthquakes]);

    return (
        <Animated.View
            style={[
                styles.panel,
                { borderColor: color + "35" },
                {
                    opacity: opacityAnim,
                    transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
            ]}
        >
            {/* Başlık Satırı */}
            <View style={styles.headerRow}>
                <View style={styles.titleGroup}>
                    <MaterialCommunityIcons name="chart-bar" size={18} color={color} />
                    <Text style={styles.panelTitle}>Son 24 Saat</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
                    <MaterialCommunityIcons name={riskIcon(maxMag24h)} size={13} color={color} />
                    <Text style={[styles.riskBadgeText, { color }]}>{riskLabel(maxMag24h)}</Text>
                </View>
            </View>

            {/* İstatistik Satırı */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color }]}>{count24h}</Text>
                    <Text style={styles.statLabel}>Toplam</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color }]}>M{maxMag24h.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>En Büyük</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: Colors.status.info }]}>M{avgMag.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Ortalama</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name={trend.icon} size={20} color={trend.color} />
                    <Text style={[styles.trendLabel, { color: trend.color }]}>{trend.label}</Text>
                </View>
            </View>

            {/* Sparkline */}
            <Sparkline buckets={buckets} accentColor={color} />

            {/* Sparkline alt etiketler */}
            <View style={styles.sparkLabels}>
                <Text style={styles.sparkLabelText}>24 saat önce</Text>
                <Text style={styles.sparkLabelText}>Şu an</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    panel: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xxl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        ...Shadows.md,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.md,
    },
    titleGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    panelTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.dark,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    riskBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
    },
    riskBadgeText: {
        fontSize: 11,
        fontWeight: "800",
    },
    statsRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: Colors.border.dark,
    },
    statValue: {
        fontSize: Typography.sizes.xl,
        fontWeight: "900",
    },
    statLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        marginTop: 2,
    },
    trendLabel: {
        fontSize: 10,
        fontWeight: "800",
        marginTop: 2,
    },
    sparkLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 4,
    },
    sparkLabelText: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "600",
    },
});
