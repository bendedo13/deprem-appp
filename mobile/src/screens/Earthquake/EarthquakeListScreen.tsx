/**
 * Deprem Listesi — Ülke filtresi + Kaynak filtresi + Analytics Dashboard
 */

import React, { useCallback, useState } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    SafeAreaView,
    Modal,
    ScrollView,
    Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEarthquakeData, type SourceFilter } from "../../hooks/useEarthquakeData";
import { EarthquakeCard } from "./EarthquakeCard";
import { AnalysisPanel } from "./AnalysisPanel";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../constants/theme";
import { SOURCE_META } from "../../types/earthquake";
import type { UnifiedEarthquake, EarthquakeSource } from "../../types/earthquake";
import type { CountryCode } from "../../data/countryPresets";

const FILTER_OPTIONS: { key: SourceFilter; label: string }[] = [
    { key: "ALL", label: "Tümü" },
    { key: "AFAD", label: "AFAD" },
    { key: "KANDILLI", label: "Kandilli" },
    { key: "EMSC", label: "EMSC" },
    { key: "USGS", label: "USGS" },
];

// ── Ülke Seçici Modal ─────────────────────────────────────────────────────────

interface CountryModalProps {
    visible: boolean;
    onClose: () => void;
    currentCountry: CountryCode;
    onSelect: (code: CountryCode) => void;
    presets: ReturnType<typeof useEarthquakeData>["countryPresets"];
}

function CountryModal({ visible, onClose, currentCountry, onSelect, presets }: CountryModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <TouchableOpacity style={modalS.backdrop} activeOpacity={1} onPress={onClose} />
            <View style={modalS.sheet}>
                <View style={modalS.handle} />
                <Text style={modalS.title}>Ülke / Bölge Seç</Text>
                <Text style={modalS.subtitle}>Seçilen ülkeye göre kaynak otomatik değişir</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={modalS.list}>
                    {presets.map((preset) => {
                        const active = currentCountry === preset.code;
                        return (
                            <TouchableOpacity
                                key={preset.code}
                                style={[modalS.row, active && modalS.rowActive]}
                                onPress={() => { onSelect(preset.code); onClose(); }}
                                activeOpacity={0.75}
                            >
                                <Text style={modalS.flag}>{preset.flag}</Text>
                                <View style={modalS.rowInfo}>
                                    <Text style={[modalS.countryName, active && { color: Colors.primary }]}>
                                        {preset.name}
                                    </Text>
                                    <Text style={modalS.sources}>
                                        {preset.sources.join(" + ")}
                                    </Text>
                                </View>
                                {active && (
                                    <MaterialCommunityIcons name="check-circle" size={20} color={Colors.primary} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        </Modal>
    );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export function EarthquakeListScreen() {
    const {
        earthquakes,
        filtered,
        loading,
        error,
        activeSources,
        sourceFilter,
        setSourceFilter,
        refresh,
        last24hCount,
        last24hMaxMag,
        country,
        setCountry,
        countryPresets,
    } = useEarthquakeData();

    const [countryModalOpen, setCountryModalOpen] = useState(false);

    const handleRefresh = useCallback(async () => { await refresh(); }, [refresh]);

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

    const activePreset = countryPresets.find((p) => p.code === country);

    const ListHeader = (
        <>
            <AnalysisPanel
                count24h={last24hCount}
                maxMag24h={last24hMaxMag}
                earthquakes={earthquakes}
            />

            {/* Kaynak Filtresi */}
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
            {/* Üst Başlık */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Son Depremler</Text>
                    <Text style={styles.subtitle}>
                        {activePreset?.flag} {activePreset?.name ?? "Türkiye"}
                    </Text>
                </View>
                {/* Ülke Seçici Butonu */}
                <TouchableOpacity
                    style={styles.countryBtn}
                    onPress={() => setCountryModalOpen(true)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.countryBtnFlag}>{activePreset?.flag ?? "🇹🇷"}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={16} color={Colors.text.muted} />
                </TouchableOpacity>
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
                        <Text style={styles.emptyText}>{error ?? "Deprem verisi yok"}</Text>
                    </View>
                }
                initialNumToRender={12}
                maxToRenderPerBatch={10}
                windowSize={7}
            />

            {/* Ülke Seçici Modal */}
            <CountryModal
                visible={countryModalOpen}
                onClose={() => setCountryModalOpen(false)}
                currentCountry={country}
                onSelect={setCountry}
                presets={countryPresets}
            />
        </SafeAreaView>
    );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    header: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: { fontSize: Typography.sizes.xxl, fontWeight: "900", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 2 },
    countryBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: Colors.background.surface,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        ...Shadows.sm,
    },
    countryBtnFlag: { fontSize: 20 },
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
    filterText: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.muted },
    list: { padding: Spacing.lg, paddingTop: 0 },
    loading: { flex: 1, justifyContent: "center", alignItems: "center" },
    empty: { alignItems: "center", paddingVertical: Spacing.xxl },
    emptyText: { marginTop: Spacing.md, fontSize: Typography.sizes.sm, color: Colors.text.muted },
});

const modalS = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    sheet: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.background.surface,
        borderTopLeftRadius: BorderRadius.xxl,
        borderTopRightRadius: BorderRadius.xxl,
        paddingBottom: Platform.OS === "ios" ? 34 : 24,
        maxHeight: "75%",
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.border.dark,
        borderRadius: 2,
        alignSelf: "center",
        marginTop: 12,
        marginBottom: 4,
    },
    title: {
        fontSize: Typography.sizes.xl,
        fontWeight: "900",
        color: Colors.text.dark,
        textAlign: "center",
        marginTop: Spacing.md,
    },
    subtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        marginBottom: Spacing.md,
    },
    list: { paddingHorizontal: Spacing.lg },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.dark,
        gap: Spacing.md,
    },
    rowActive: { backgroundColor: Colors.primary + "08" },
    flag: { fontSize: 28, width: 36, textAlign: "center" },
    rowInfo: { flex: 1 },
    countryName: {
        fontSize: Typography.sizes.md,
        fontWeight: "700",
        color: Colors.text.dark,
    },
    sources: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        marginTop: 2,
        fontWeight: "600",
    },
});
