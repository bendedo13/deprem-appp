/**
 * Sismik Harita — Deprem işaretçileri + fay hatları.
 * Listeden tıklanınca AnimateToRegion ile odaklanır.
 */

import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEarthquakeData } from "../../hooks/useEarthquakeData";
import { Colors, Typography, Spacing } from "../../constants/theme";
import { magnitudeColor } from "../../types/earthquake";
import { TURKEY_FAULT_LINES } from "../../data/faultLines";
import type { UnifiedEarthquake } from "../../types/earthquake";

const TURKEY_REGION = {
    latitude: 39.0,
    longitude: 35.0,
    latitudeDelta: 8,
    longitudeDelta: 8,
};

export function EarthquakeMapScreen() {
    const params = useLocalSearchParams<{ focusLat?: string; focusLng?: string; focusId?: string }>();
    const mapRef = useRef<MapView>(null);
    const [faultsVisible, setFaultsVisible] = React.useState(true);

    const { filtered, refresh } = useEarthquakeData();

    const focusLat = params.focusLat ? parseFloat(params.focusLat) : null;
    const focusLng = params.focusLng ? parseFloat(params.focusLng) : null;

    useEffect(() => {
        if (focusLat != null && focusLng != null && mapRef.current && !isNaN(focusLat) && !isNaN(focusLng)) {
            mapRef.current.animateToRegion({
                latitude: focusLat,
                longitude: focusLng,
                latitudeDelta: 0.5,
                longitudeDelta: 0.5,
            }, 500);
        }
    }, [focusLat, focusLng]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Sismik Harita</Text>
                <Text style={styles.subtitle}>{filtered.length} deprem</Text>
                <TouchableOpacity
                    style={[styles.faultToggle, faultsVisible && styles.faultToggleActive]}
                    onPress={() => setFaultsVisible(!faultsVisible)}
                >
                    <MaterialCommunityIcons
                        name="vector-line"
                        size={18}
                        color={faultsVisible ? Colors.primary : Colors.text.muted}
                    />
                    <Text style={[styles.faultToggleText, faultsVisible && styles.faultToggleTextActive]}>
                        Fay hatları
                    </Text>
                </TouchableOpacity>
            </View>

            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={TURKEY_REGION}
                showsUserLocation
            >
                {faultsVisible &&
                    TURKEY_FAULT_LINES.map((fault, idx) => (
                        <Polyline
                            key={`fault-${idx}`}
                            coordinates={fault.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }))}
                            strokeColor="rgba(248, 113, 22, 0.7)"
                            strokeWidth={2}
                        />
                    ))}
                {filtered.map((eq) => (
                    <Marker
                        key={eq.id}
                        coordinate={{
                            latitude: eq.coordinates.latitude,
                            longitude: eq.coordinates.longitude,
                        }}
                        title={eq.title}
                        description={`M ${eq.magnitude.toFixed(1)} · ${eq.depth.toFixed(0)} km`}
                        pinColor={magnitudeColor(eq.magnitude)}
                    />
                ))}
            </MapView>

            <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
                <MaterialCommunityIcons name="refresh" size={22} color={Colors.primary} />
            </TouchableOpacity>
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
    faultToggle: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: Spacing.sm,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignSelf: "flex-start",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    faultToggleActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "15",
    },
    faultToggleText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    faultToggleTextActive: {
        color: Colors.primary,
    },
    map: {
        flex: 1,
        width: "100%",
    },
    refreshBtn: {
        position: "absolute",
        bottom: Spacing.xl,
        right: Spacing.lg,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.background.surface,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
});
