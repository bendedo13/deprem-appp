/**
 * Toplanma Alanları — 81 il toplanma noktası + Google Maps/Apple Maps yön tarifi.
 */

import { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Linking,
    Platform,
    Alert,
    ScrollView,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { ASSEMBLY_AREAS, IL_LIST, type AssemblyArea } from "../../src/data/assemblyAreas";
import * as Location from "expo-location";

async function navigateTo(area: AssemblyArea) {
    const { latitude, longitude } = area;
    const label = encodeURIComponent(area.ad);

    try {
        // Get current location for directions
        const { status } = await Location.getForegroundPermissionsAsync();
        let origin = "";
        if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        }

        let url: string;
        if (Platform.OS === "ios") {
            if (origin) {
                url = `maps://maps.apple.com/?saddr=${origin}&daddr=${latitude},${longitude}&q=${label}`;
            } else {
                url = `maps://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`;
            }
            const canOpen = await Linking.canOpenURL(url);
            if (!canOpen) {
                url = origin
                    ? `https://www.google.com/maps/dir/${origin}/${latitude},${longitude}`
                    : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            }
        } else {
            if (origin) {
                url = `https://www.google.com/maps/dir/${origin}/${latitude},${longitude}`;
            } else {
                url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}`;
            }
        }

        await Linking.openURL(url);
    } catch {
        Alert.alert("Hata", "Harita uygulaması açılamadı.");
    }
}

export default function AssemblyAreasScreen() {
    const [search, setSearch] = useState("");
    const [selectedIl, setSelectedIl] = useState<string | null>(null);

    const filtered = useMemo(() => {
        let list = ASSEMBLY_AREAS;
        if (selectedIl) {
            list = list.filter((a) => a.il === selectedIl);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (a) =>
                    a.ad.toLowerCase().includes(q) ||
                    a.il.toLowerCase().includes(q) ||
                    a.ilce.toLowerCase().includes(q) ||
                    a.adres.toLowerCase().includes(q)
            );
        }
        return list;
    }, [search, selectedIl]);

    const renderArea = ({ item }: { item: AssemblyArea }) => (
        <View style={styles.areaCard}>
            <View style={styles.areaLeft}>
                <View style={styles.areaIconBox}>
                    <MaterialCommunityIcons name="map-marker-check" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.areaName} numberOfLines={1}>{item.ad}</Text>
                    <Text style={styles.areaLocation}>
                        {item.ilce} · {item.il}
                    </Text>
                    <Text style={styles.areaAddress} numberOfLines={1}>{item.adres}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.navBtn}
                onPress={() => navigateTo(item)}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name="navigation" size={18} color="#fff" />
                <Text style={styles.navBtnText}>Yol Tarifi</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.text.dark} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Toplanma Alanları</Text>
                    <Text style={styles.subtitle}>{ASSEMBLY_AREAS.length} alan · 81 il</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <MaterialCommunityIcons name="magnify" size={18} color={Colors.text.muted} style={{ marginLeft: Spacing.md }} />
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="İl, ilçe veya alan adı ara..."
                    placeholderTextColor={Colors.text.muted}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")} style={{ marginRight: Spacing.md }}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={Colors.text.muted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Province filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.ilRow}
            >
                <TouchableOpacity
                    style={[styles.ilChip, !selectedIl && styles.ilChipActive]}
                    onPress={() => setSelectedIl(null)}
                >
                    <Text style={[styles.ilChipText, !selectedIl && styles.ilChipTextActive]}>Tüm İller</Text>
                </TouchableOpacity>
                {IL_LIST.map((il) => (
                    <TouchableOpacity
                        key={il}
                        style={[styles.ilChip, selectedIl === il && styles.ilChipActive]}
                        onPress={() => setSelectedIl(selectedIl === il ? null : il)}
                    >
                        <Text style={[styles.ilChipText, selectedIl === il && styles.ilChipTextActive]}>{il}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Count */}
            <View style={styles.countRow}>
                <Text style={styles.countText}>{filtered.length} toplanma alanı listeleniyor</Text>
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="information-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoBannerText}>
                    "Yol Tarifi" butonuna basarak Google/Apple Maps üzerinden navigasyonu başlatın.
                </Text>
            </View>

            {/* List */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                renderItem={renderArea}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="map-marker-off" size={48} color={Colors.text.muted} />
                        <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    header: {
        flexDirection: "row", alignItems: "center", gap: Spacing.md,
        paddingHorizontal: Spacing.md, paddingTop: 50, paddingBottom: Spacing.lg,
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.background.surface, justifyContent: "center", alignItems: "center",
        borderWidth: 1, borderColor: Colors.border.dark,
    },
    title: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },
    subtitle: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    searchRow: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.background.surface, marginHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border.dark,
        marginBottom: Spacing.sm,
    },
    searchInput: {
        flex: 1, paddingVertical: 12, paddingHorizontal: Spacing.sm,
        color: Colors.text.dark, fontWeight: "600", fontSize: Typography.sizes.sm,
    },

    ilRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 8 },
    ilChip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface, borderWidth: 1, borderColor: Colors.border.dark,
    },
    ilChipActive: { backgroundColor: Colors.primary + "15", borderColor: Colors.primary },
    ilChipText: { fontSize: 11, fontWeight: "700", color: Colors.text.muted },
    ilChipTextActive: { color: Colors.primary },

    countRow: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
    countText: { fontSize: 11, color: Colors.text.muted, fontWeight: "600" },

    infoBanner: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: Colors.primary + "10", borderWidth: 1, borderColor: Colors.primary + "20",
        marginHorizontal: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    infoBannerText: { flex: 1, fontSize: 11, color: Colors.text.muted, fontWeight: "500", lineHeight: 16 },

    listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxxl },

    areaCard: {
        backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl,
        padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.dark,
        flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    },
    areaLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    areaIconBox: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: Colors.primary + "12", justifyContent: "center", alignItems: "center",
    },
    areaName: { fontSize: 13, fontWeight: "800", color: Colors.text.dark, marginBottom: 2 },
    areaLocation: { fontSize: 11, color: Colors.primary, fontWeight: "700" },
    areaAddress: { fontSize: 10, color: Colors.text.muted, fontWeight: "500", marginTop: 2 },

    navBtn: {
        flexDirection: "row", alignItems: "center", gap: 4,
        backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: BorderRadius.md,
    },
    navBtnText: { fontSize: 11, fontWeight: "800", color: "#fff" },

    emptyBox: { alignItems: "center", paddingTop: 60, gap: 12 },
    emptyText: { color: Colors.text.muted, fontSize: 15, fontWeight: "500" },
});
