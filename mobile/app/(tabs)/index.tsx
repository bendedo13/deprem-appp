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
    SafeAreaView,
    Platform,
} from "react-native";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getBannerId } from "../../src/services/adService";
import { api } from "../../src/services/api";
import { iAmSafe } from "../../src/services/authService";
import { useWebSocket, EarthquakeEvent } from "../../src/hooks/useWebSocket";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";

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
    if (mag >= 6) return Colors.primary;
    if (mag >= 5) return Colors.status.warning;
    if (mag >= 4) return "#ca8a04";
    if (mag >= 3) return Colors.status.success;
    return Colors.text.muted;
}

function timeAgo(isoStr: string): string {
    const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
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

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const pos = await Location.getCurrentPositionAsync({});
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        })();
    }, []);

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
    }, [t]);

    useEffect(() => {
        fetchQuakes();
    }, [fetchQuakes]);

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

    const renderItem = ({ item }: { item: Earthquake }) => {
        const color = magnitudeColor(item.magnitude);
        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                <View style={[styles.magBadge, { backgroundColor: color }]}>
                    <Text style={styles.magText}>{item.magnitude.toFixed(1)}</Text>
                    <Text style={styles.magUnit}>{item.source.toUpperCase() === 'AFAD' ? 'Mw' : 'Ml'}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.location} numberOfLines={1}>
                        {item.location || t("home.unknown_location")}
                    </Text>
                    <View style={styles.detailRow}>
                        <MaterialCommunityIcons name="arrow-down" size={12} color={Colors.text.muted} />
                        <Text style={styles.details}>
                            {item.depth ? t("home.depth_km", { depth: item.depth.toFixed(1) }) : "—"}
                        </Text>
                        <View style={styles.dotSep} />
                        <MaterialCommunityIcons name="clock-outline" size={12} color={Colors.text.muted} />
                        <Text style={styles.details}>{timeAgo(item.occurred_at)}</Text>
                    </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.border.dark} />
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.brandContainer}>
                    <View style={styles.logoBox}>
                        <MaterialCommunityIcons name="security" size={20} color="#fff" />
                    </View>
                    <Text style={styles.brandTitle}>QuakeSense</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerBtn}>
                        <MaterialCommunityIcons name="bell-outline" size={24} color={Colors.text.dark} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.statusBar}>
                <View style={styles.statusInfo}>
                    <View style={[styles.dot, { backgroundColor: isConnected ? Colors.status.success : Colors.text.muted }]} />
                    <Text style={styles.statusText}>
                        {isConnected ? t("home.live") : t("home.disconnected")}
                    </Text>
                </View>

                <View style={[
                    styles.sensorBadge,
                    { backgroundColor: isTriggered ? Colors.primary : isMonitoring ? Colors.status.success + '20' : Colors.background.surface }
                ]}>
                    <Text style={[styles.sensorText, { color: isTriggered ? '#fff' : isMonitoring ? Colors.status.success : Colors.text.muted }]}>
                        {isTriggered ? t("home.sensor_triggered") : isMonitoring ? t("home.sensor_active") : t("home.sensor_passive")}
                    </Text>
                </View>
            </View>

            <FlatList
                data={quakes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchQuakes(); }}
                        tintColor={Colors.primary}
                    />
                }
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>{t("home.recent_earthquakes")}</Text>
                        <TouchableOpacity>
                            <Text style={styles.filterText}>{t("home.filter")} <MaterialCommunityIcons name="filter-variant" size={14} /></Text>
                        </TouchableOpacity>
                    </View>
                }
                ListFooterComponent={
                    <View style={styles.adContainer}>
                        <BannerAd
                            unitId={getBannerId()}
                            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                            requestOptions={{
                                requestNonPersonalizedAdsOnly: true,
                            }}
                        />
                    </View>
                }
            />

            <View style={styles.safeBtnContainer}>
                <TouchableOpacity
                    style={[styles.safeBtn, safeLoading && styles.safeBtnDisabled]}
                    onPress={handleSafe}
                    disabled={safeLoading}
                    activeOpacity={0.9}
                >
                    {safeLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="shield-check" size={20} color="#fff" />
                            <Text style={styles.safeBtnText}>{t("home.i_am_safe")}</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === 'android' ? 30 : 0 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background.dark },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.background.surface,
    },
    brandContainer: { flexDirection: "row", alignItems: "center", gap: 10 },
    logoBox: { backgroundColor: Colors.primary, padding: 6, borderRadius: BorderRadius.md },
    brandTitle: { color: Colors.text.dark, fontSize: Typography.sizes.xl, fontWeight: "800", trackingTight: -0.5 },
    headerActions: { flexDirection: "row", gap: 8 },
    headerBtn: { padding: 8 },
    statusBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    statusInfo: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: "600", textTransform: "uppercase" },
    sensorBadge: {
        borderRadius: BorderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    sensorText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
    list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
    listHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    listTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "700" },
    filterText: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: "600" },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(224, 7, 0, 0.1)',
    },
    magBadge: {
        width: 54,
        height: 54,
        borderRadius: BorderRadius.lg,
        justifyContent: "center",
        alignItems: "center",
    },
    magText: { color: "#fff", fontSize: 20, fontWeight: "800" },
    magUnit: { color: "rgba(255,255,255,0.7)", fontSize: 8, fontWeight: "700", marginTop: 2 },
    info: { flex: 1, marginLeft: Spacing.md },
    location: { color: Colors.text.dark, fontSize: Typography.sizes.md, fontWeight: "700" },
    detailRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    details: { color: Colors.text.muted, fontSize: Typography.sizes.sm },
    dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.text.muted, marginHorizontal: 2 },
    adContainer: {
        alignItems: "center",
        marginVertical: Spacing.md,
    },
    safeBtnContainer: {
        position: "absolute",
        bottom: 20,
        left: Spacing.md,
        right: Spacing.md,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    safeBtn: {
        backgroundColor: Colors.status.success,
        borderRadius: BorderRadius.xl,
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    safeBtnDisabled: { opacity: 0.6 },
    safeBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },
});
