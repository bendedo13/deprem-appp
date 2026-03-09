/**
 * Sismik Harita — Leaflet.js + OpenStreetMap (WebView)
 * Deprem işaretçileri + fay hatları. react-native-maps kaldırıldı.
 */

import React, { useRef, useMemo, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useEarthquakeData } from "../../hooks/useEarthquakeData";
import { Colors, Typography, Spacing } from "../../constants/theme";
import { magnitudeColor } from "../../types/earthquake";
import { TURKEY_FAULT_LINES } from "../../data/faultLines";
import type { UnifiedEarthquake } from "../../types/earthquake";

const TURKEY_CENTER = { lat: 39.0, lng: 35.0 };
const INITIAL_ZOOM = 6;

function buildLeafletHtml(
    earthquakes: UnifiedEarthquake[],
    faultsVisible: boolean,
    focusLat: number | null,
    focusLng: number | null
): string {
    const eqData = earthquakes.map((eq) => ({
        id: eq.id,
        lat: eq.coordinates.latitude,
        lng: eq.coordinates.longitude,
        mag: eq.magnitude,
        depth: eq.depth,
        title: eq.title.replace(/'/g, "\\'"),
        color: magnitudeColor(eq.magnitude),
    }));
    const faultData = faultsVisible
        ? TURKEY_FAULT_LINES.map((f) =>
              f.coordinates.map(([lon, lat]) => [lat, lon])
          )
        : [];

    const focusScript =
        focusLat != null && focusLng != null && !isNaN(focusLat) && !isNaN(focusLng)
            ? `map.setView([${focusLat}, ${focusLng}], 10);`
            : "";

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0a0e17; }
    .leaflet-container { background: #0a0e17 !important; font-family: system-ui, sans-serif; }
    .leaflet-popup-content-wrapper { background: #111827; color: #F1F5F9; border-radius: 12px; border: 1px solid #1f2937; }
    .leaflet-popup-tip { background: #111827; }
    .leaflet-popup-content { margin: 12px 16px; font-size: 14px; }
    .eq-mag { font-weight: 700; font-size: 16px; }
    .eq-depth { color: #6B7280; font-size: 12px; margin-top: 4px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([${TURKEY_CENTER.lat}, ${TURKEY_CENTER.lng}], ${INITIAL_ZOOM});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19
    }).addTo(map);

    var eqData = ${JSON.stringify(eqData)};
    var faultData = ${JSON.stringify(faultData)};

    eqData.forEach(function(eq) {
      var marker = L.circleMarker([eq.lat, eq.lng], {
        radius: Math.max(6, Math.min(14, eq.mag * 2.5)),
        fillColor: eq.color,
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);
      marker.bindPopup(
        '<div class="eq-mag" style="color:' + eq.color + '">M ' + eq.mag.toFixed(1) + '</div>' +
        '<div>' + (eq.title || 'Deprem') + '</div>' +
        '<div class="eq-depth">Derinlik: ' + eq.depth.toFixed(0) + ' km</div>'
      );
    });

    faultData.forEach(function(fault) {
      if (fault.length < 2) return;
      L.polyline(fault, {
        color: 'rgba(248, 113, 22, 0.7)',
        weight: 2
      }).addTo(map);
    });

    ${focusScript}
  </script>
</body>
</html>`;
}

export function EarthquakeMapScreen() {
    const params = useLocalSearchParams<{
        focusLat?: string;
        focusLng?: string;
        focusId?: string;
    }>();
    const webViewRef = useRef<WebView>(null);
    const [faultsVisible, setFaultsVisible] = React.useState(true);

    const { filtered, refresh, loading } = useEarthquakeData();

    const focusLat = params.focusLat ? parseFloat(params.focusLat) : null;
    const focusLng = params.focusLng ? parseFloat(params.focusLng) : null;

    const html = useMemo(
        () => buildLeafletHtml(filtered, faultsVisible, focusLat, focusLng),
        [filtered, faultsVisible, focusLat, focusLng]
    );

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
                    <Text
                        style={[
                            styles.faultToggleText,
                            faultsVisible && styles.faultToggleTextActive,
                        ]}
                    >
                        Fay hatları
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.mapWrapper}>
                {loading && filtered.length === 0 && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                )}
                <WebView
                    ref={webViewRef}
                    source={{ html }}
                    originWhitelist={["*"]}
                    style={styles.map}
                    scrollEnabled={true}
                    bounces={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mixedContentMode="compatibility"
                    allowFileAccess={true}
                />
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
                <MaterialCommunityIcons
                    name="refresh"
                    size={22}
                    color={Colors.primary}
                />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    header: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
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
    mapWrapper: {
        flex: 1,
        width: "100%",
        position: "relative",
    },
    map: {
        flex: 1,
        width: "100%",
        backgroundColor: Colors.background.dark,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background.dark,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
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
