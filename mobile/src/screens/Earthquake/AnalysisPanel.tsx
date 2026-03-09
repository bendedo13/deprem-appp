import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../constants/theme";

interface AnalysisPanelProps {
    count24h: number;
    maxMag24h: number;
}

export function AnalysisPanel({ count24h, maxMag24h }: AnalysisPanelProps) {
    return (
        <View style={styles.panel}>
            <View style={styles.row}>
                <View style={styles.stat}>
                    <MaterialCommunityIcons name="pulse" size={20} color={Colors.primary} />
                    <Text style={styles.statValue}>{count24h}</Text>
                    <Text style={styles.statLabel}>Son 24 saat</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.stat}>
                    <MaterialCommunityIcons name="chart-line" size={20} color={Colors.accent} />
                    <Text style={styles.statValue}>{maxMag24h.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>En büyük (M)</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    panel: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },
    stat: {
        alignItems: "center",
        flex: 1,
    },
    statValue: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.text.dark,
        marginTop: 4,
    },
    statLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "600",
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.border.dark,
    },
});
