/**
 * Deprem Listesi — 4 kaynak filtre, 24h panel, modern kartlar.
 */

import React, { useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEarthquakeData, type SourceFilter } from "../../hooks/useEarthquakeData";
import { EarthquakeCard } from "./EarthquakeCard";
import { AnalysisPanel } from "./AnalysisPanel";
import { Colors, Typography, Spacing } from "../../constants/theme";
import { SOURCE_META } from "../../types/earthquake";
import type { UnifiedEarthquake, EarthquakeSource } from "../../types/earthquake";

const FILTER_OPTIONS: { key: SourceFilter; label: string }[] = [
    { key: "ALL", label: "Tümü" },
    { key: "AFAD", label: "AFAD" },
    { key: "KANDILLI", label: "Kandilli" },
    { key: "EMSC", label: "EMSC" },
    { key: "USGS", label: "USGS" },
];

export function EarthquakeListScreen() {
    const {
        filtered,
        loading,
        error,
        activeSources,
        sourceFilter,
        setSourceFilter,
        refresh,
        last24hCount,
        last24hMaxMag,
    } = useEarthquakeData();

    const handleRefresh = useCallback(async () => {
        await refresh();
    }, [refresh]);

    const handleCardPress = useCallback((item: UnifiedEarthquake) => {
        router.push({
            pathname: "/(tabs)/map",
            params: {
                focusLat: String(item.coordinates.latitude),
                focusLng: String(item.coordinates.longitude),
                focusId: item.id,
            },
        });
    }, []);

    const renderItem = useCallback(
        ({ item }: { item: UnifiedEarthquake }) => (
            <EarthquakeCard item={item} onPress={() => handleCardPress(item)} />
        ),
        [handleCardPress]
    );

    const keyExtractor = useCallback((item: UnifiedEarthquake) => item.id, []);

    const ListHeader = (
        <>
            <AnalysisPanel count24h={last24hCount} maxMag24h={last24hMaxMag} />
            <View style={styles.filterRow}>
                {FILTER_OPTIONS.filter(
                    (f) => f.key === "ALL" || activeSources.includes(f.key as EarthquakeSource)
                ).map((f) => {
                    const meta = f.key !== "ALL" ? SOURCE_META[f.key as EarthquakeSource] : null;
                    const color = meta?.color ?? Colors.primary;
                    const active = sourceFilter === f.key;
                    return (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterChip,
                                active && { backgroundColor: color + "25", borderColor: color + "70" },
                            ]}
                            onPress={() => setSourceFilter(f.key)}
                        >
                            <Text style={[styles.filterText, active && { color }]}>{f.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </>
    );

    if (loading && filtered.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Son Depremler</Text>
                </View>
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Son Depremler</Text>
                <Text style={styles.subtitle}>Türkiye ve dünya</Text>
            </View>

            <FlatList
                data={filtered}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[Colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons name="earth-off" size={48} color={Colors.text.muted} />
                        <Text style={styles.emptyText}>
                            {error ?? "Deprem verisi yok"}
                        </Text>
                    </View>
                }
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={7}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    header: { padding: Spacing.lg, paddingBottom: Spacing.sm },
    title: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.text.dark,
    },
    subtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        marginTop: 2,
    },
    filterRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    filterText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.muted,
    },
    list: { padding: Spacing.lg, paddingTop: 0 },
    loading: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: {
        alignItems: "center",
        paddingVertical: Spacing.xxl,
    },
    emptyText: {
        marginTop: Spacing.md,
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
    },
});
