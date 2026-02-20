/**
 * Deprem listesi ana ekranı.
 * API'dan son depremleri çeker, WebSocket ile canlı günceller.
 * "Ben İyiyim" butonu acil kişilere bildirim gönderir.
 * Sensör STA/LTA algoritması ile yer titreşimi algılar.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    RefreshControl,
} from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { api } from "../../src/services/api";
import { iAmSafe } from "../../src/services/authService";
import { useWebSocket, EarthquakeEvent } from "../../src/hooks/useWebSocket";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";

interface Earthquake {
    id: string;
    source: string;
    magnitude: number;
    depth: number;
    latitude: number;
    longitude: number;
    location: string;
    occurred_at: string;
}

function magnitudeColor(mag: number): string {
    if (mag >= 6) return "#dc2626";   // Kırmızı — tehlikeli
    if (mag >= 5) return "#ea580c";   // Turuncu
    if (mag >= 4) return "#ca8a04";   // Sarı
    if (mag >= 3) return "#16a34a";   // Yeşil
    return "#475569";                  // Gri
}

function timeAgo(isoStr: string): string {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return `${diff}sn önce`;
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
    return `${Math.floor(diff / 86400)}g önce`;
}

export default function EarthquakesScreen() {
    const [quakes, setQuakes] = useState<Earthquake[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [safeLoading, setSafeLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const { t } = useTranslation();
    const { isConnected, lastEvent } = useWebSocket();
    const { isMonitoring, isTriggered, peakAcceleration, staLtaRatio } = useShakeDetector(
        location?.lat ?? null,
        location?.lng ?? null
    );
    const prevTriggered = useRef(false);

    // Konum al
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const pos = await Location.getCurrentPositionAsync({});
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        })();
    }, []);

    // Trigger → kullanıcıya alert
    useEffect(() => {
        if (isTriggered && !prevTriggered.current) {
            Alert.alert(
                t("home.vibration_title"),
                t("home.vibration_body", { ratio: staLtaRatio.toFixed(1), peak: peakAcceleration.toFixed(2) })
            );
        }
        prevTriggered.current = isTriggered;
    }, [isTriggered]);


    const fetchQuakes = useCallback(async () => {
        try {
            const { data } = await api.get<Earthquake[]>("/api/v1/earthquakes?limit=50");
            setQuakes(data);
        } catch {
            Alert.alert(t("home.error_load"));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchQuakes();
    }, [fetchQuakes]);

    // WebSocket'ten gelen yeni deprem → listeye ekle
    useEffect(() => {
        if (!lastEvent) return;
        setQuakes((prev) => {
            const exists = prev.find((q) => q.id === lastEvent.id);
            if (exists) return prev;
            return [lastEvent as Earthquake, ...prev].slice(0, 100);
        });
    }, [lastEvent]);

    async function handleSafe() {
        setSafeLoading(true);
        try {
            const res = await iAmSafe();
            Alert.alert(
                t("safe.sent_title"),
                t("safe.sent_body", { count: res.notified_contacts })
            );
        } catch {
            Alert.alert(t("safe.error"));
        } finally {
            setSafeLoading(false);
        }
    }

    function renderItem({ item }: { item: Earthquake }) {
        const color = magnitudeColor(item.magnitude);
        return (
            <View style={styles.card}>
                <View style={[styles.magBadge, { backgroundColor: color }]}>
                    <Text style={styles.magText}>{item.magnitude.toFixed(1)}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.location} numberOfLines={1}>
                        {item.location || t("home.unknown_location")}
                    </Text>
                    <Text style={styles.details}>
                        {item.depth ? t("home.depth_km", { depth: item.depth.toFixed(0) }) : "—"} · {item.source.toUpperCase()}
                    </Text>
                    <Text style={styles.time}>{timeAgo(item.occurred_at)}</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#ef4444" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Durum çubuğu */}
            <View style={styles.statusBar}>
                <View style={[styles.dot, { backgroundColor: isConnected ? "#22c55e" : "#64748b" }]} />
                <Text style={styles.statusText}>
                    {isConnected ? t("home.live") : t("home.disconnected")} · {t("home.n_earthquakes", { count: quakes.length })}
                </Text>

                {/* Sensör badge */}
                <View style={[
                    styles.sensorBadge,
                    { backgroundColor: isTriggered ? "#dc2626" : isMonitoring ? "#064e3b" : "#1e293b" }
                ]}>
                    <Text style={styles.sensorText}>
                        {isTriggered ? t("home.sensor_triggered") : isMonitoring ? t("home.sensor_active") : t("home.sensor_passive")}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.safeBtn, safeLoading && styles.safeBtnDisabled]}
                    onPress={handleSafe}
                    disabled={safeLoading}
                    activeOpacity={0.8}
                >
                    {safeLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.safeBtnText}>{t("home.i_am_safe")}</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Liste */}
            <FlatList
                data={quakes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchQuakes(); }}
                        tintColor="#ef4444"
                    />
                }
                contentContainerStyle={styles.list}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                ListEmptyComponent={
                    <Text style={styles.empty}>{t("home.no_data")}</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f172a" },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
    statusBar: {
        flexDirection: "row",
        alignItems: "center",
        padding: 12,
        backgroundColor: "#1e293b",
        gap: 8,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { flex: 1, color: "#94a3b8", fontSize: 12 },
    safeBtn: {
        backgroundColor: "#16a34a",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
        minWidth: 80,
        alignItems: "center",
    },
    safeBtnDisabled: { opacity: 0.6 },
    safeBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
    sensorBadge: {
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    sensorText: { color: "#fff", fontSize: 11, fontWeight: "600" },
    list: { paddingVertical: 8, paddingHorizontal: 12 },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1e293b",
        borderRadius: 12,
        padding: 14,
        gap: 14,
    },
    magBadge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
    },
    magText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    info: { flex: 1 },
    location: { color: "#f8fafc", fontSize: 15, fontWeight: "600" },
    details: { color: "#94a3b8", fontSize: 12, marginTop: 3 },
    time: { color: "#64748b", fontSize: 11, marginTop: 2 },
    sep: { height: 8 },
    empty: { textAlign: "center", color: "#64748b", marginTop: 60, fontSize: 15 },
});
