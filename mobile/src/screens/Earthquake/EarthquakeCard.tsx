import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../constants/theme";
import { magnitudeColor, SOURCE_META } from "../../types/earthquake";
import type { UnifiedEarthquake, EarthquakeSource } from "../../types/earthquake";

interface EarthquakeCardProps {
    item: UnifiedEarthquake;
    onPress?: () => void;
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export const EarthquakeCard = memo(function EarthquakeCard({ item, onPress }: EarthquakeCardProps) {
    const meta = SOURCE_META[item.source];
    const magColor = magnitudeColor(item.magnitude);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={[styles.magBadge, { backgroundColor: magColor + "30", borderColor: magColor }]}>
                <Text style={[styles.magText, { color: magColor }]}>
                    {item.magnitude.toFixed(1)}
                </Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                </Text>
                <View style={styles.meta}>
                    <Text style={styles.metaText}>{item.depth.toFixed(0)} km</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>{formatTime(item.date)}</Text>
                </View>
                {meta && (
                    <View style={[styles.sourceBadge, { backgroundColor: meta.bg }]}>
                        <Text style={[styles.sourceText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                )}
            </View>
            {onPress && (
                <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.text.muted} />
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    magBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
    },
    magText: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
    },
    info: { flex: 1 },
    title: {
        fontSize: Typography.sizes.md,
        fontWeight: "700",
        color: Colors.text.dark,
        marginBottom: 4,
    },
    meta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    metaText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "500",
    },
    metaDot: {
        color: Colors.text.muted,
        fontSize: 10,
    },
    sourceBadge: {
        alignSelf: "flex-start",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: BorderRadius.sm,
        marginTop: 6,
    },
    sourceText: {
        fontSize: 10,
        fontWeight: "700",
    },
});
