/**
 * S.O.S Tab Screen - Profesyonel acil durum modulu.
 * Kazayla basilmayacak ama ihtiyac aninda en hizli ulasilan buton.
 * Long-press aktivasyon + kayan timer + 112 hizli arama.
 *
 * Gorev 3: Cevrimdisi S.O.S. ve Otomatik SMS (Yedek Sistem)
 */

import { useState, useRef, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Linking,
    Animated,
    SafeAreaView,
    Platform,
    Vibration,
    ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { sendSosFallback, SosFallbackResult } from "../../src/services/smsService";

export default function SOSTabScreen() {
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [isActivated, setIsActivated] = useState(false);
    const [sosSending, setSosSending] = useState(false);
    const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const { t } = useTranslation();

    const HOLD_DURATION = 2000; // 2 saniye basili tutma

    const startHold = useCallback(() => {
        setIsHolding(true);
        Vibration.vibrate(50);

        Animated.timing(progressAnim, {
            toValue: 1,
            duration: HOLD_DURATION,
            useNativeDriver: false,
        }).start();

        const startTime = Date.now();
        holdTimer.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / HOLD_DURATION, 1);
            setHoldProgress(progress);

            if (progress >= 1) {
                clearInterval(holdTimer.current!);
                activateSOS();
            }
        }, 50);
    }, []);

    const cancelHold = useCallback(() => {
        if (holdTimer.current) clearInterval(holdTimer.current);
        setIsHolding(false);
        setHoldProgress(0);
        progressAnim.setValue(0);
    }, []);

    // ── Gorev 3: SOS Aktivasyonu — API + SMS Fallback ──────────────────────
    const activateSOS = useCallback(async () => {
        setIsActivated(true);
        setIsHolding(false);
        setSosSending(true);
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);

        // Pulse animation
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            ])
        );
        pulseAnimation.start();

        try {
            const result: SosFallbackResult = await sendSosFallback();

            switch (result.method) {
                case "api":
                    Alert.alert(
                        "S.O.S. Gonderildi",
                        "Acil durum sinyaliniz sunucuya iletildi. Acil kisilerinize bildirim gonderilecek.",
                        [
                            {
                                text: "Sesli Mesaj Gonder",
                                onPress: () => router.push("/more/sos"),
                            },
                            { text: "Tamam" },
                        ]
                    );
                    break;

                case "sms":
                case "sms_url":
                    Alert.alert(
                        "SMS ile Gonderildi",
                        `Internet baglantisi kurulamadi. ${result.contactCount} acil durum kisisine SMS gonderildi.\n\n` +
                        (result.location
                            ? `Konum: ${result.location.latitude.toFixed(5)}, ${result.location.longitude.toFixed(5)}`
                            : "Konum bilgisi alinamadi."),
                        [{ text: "Tamam" }]
                    );
                    break;

                case "failed":
                    Alert.alert(
                        "Gonderilemedi",
                        result.error || "S.O.S. sinyali gonderilemedi. Lutfen 112'yi arayin.",
                        [
                            {
                                text: "112 Ara",
                                style: "destructive",
                                onPress: () => Linking.openURL("tel:112"),
                            },
                            { text: "Tamam" },
                        ]
                    );
                    break;
            }
        } catch {
            Alert.alert(
                "Hata",
                "Beklenmeyen bir hata olustu. Lutfen 112'yi arayin.",
                [
                    {
                        text: "112 Ara",
                        style: "destructive",
                        onPress: () => Linking.openURL("tel:112"),
                    },
                    { text: "Tamam" },
                ]
            );
        }

        pulseAnimation.stop();
        setSosSending(false);
        setIsActivated(false);
    }, []);

    const call112 = useCallback(() => {
        Alert.alert(
            "Acil Arama",
            "112 Acil servisleri aramak istiyor musunuz?",
            [
                { text: "Iptal", style: "cancel" },
                {
                    text: "112 Ara",
                    style: "destructive",
                    onPress: () => Linking.openURL("tel:112"),
                },
            ]
        );
    }, []);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <MaterialCommunityIcons name="alert-octagon" size={24} color={Colors.danger} />
                <Text style={styles.headerTitle}>Acil Durum</Text>
            </View>

            <View style={styles.content}>
                {/* Warning Info */}
                <View style={styles.warningCard}>
                    <MaterialCommunityIcons name="information-outline" size={20} color={Colors.accent} />
                    <Text style={styles.warningText}>
                        SOS butonuna 2 saniye basili tutun. Internet yoksa acil kisilerinize konumunuzla birlikte otomatik SMS gonderilir.
                    </Text>
                </View>

                {/* Gorev 3: Offline bilgi karti */}
                <View style={styles.offlineInfoCard}>
                    <View style={styles.offlineInfoRow}>
                        <MaterialCommunityIcons name="wifi-off" size={16} color={Colors.status.info} />
                        <Text style={styles.offlineInfoTitle}>Cevrimdisi Yedek Sistem</Text>
                    </View>
                    <Text style={styles.offlineInfoText}>
                        Internet kesilirse GPS konumunuz alinip acil kisilerinize SMS gonderilir. SMS kanalini "Acil Kisiler" ekranindan aktif edin.
                    </Text>
                </View>

                {/* Main SOS Button Area */}
                <View style={styles.sosArea}>
                    {/* Outer rings */}
                    <View style={[styles.outerRing, isHolding && styles.outerRingActive]} />
                    <View style={[styles.middleRing, isHolding && styles.middleRingActive]} />

                    {/* SOS Button */}
                    <Animated.View style={[styles.sosButtonOuter, { transform: [{ scale: isHolding ? 0.95 : 1 }] }]}>
                        <TouchableOpacity
                            style={[styles.sosButton, isHolding && styles.sosButtonHolding]}
                            onPressIn={sosSending ? undefined : startHold}
                            onPressOut={sosSending ? undefined : cancelHold}
                            activeOpacity={1}
                            disabled={sosSending}
                        >
                            {sosSending ? (
                                <>
                                    <ActivityIndicator size="large" color="#fff" />
                                    <Text style={styles.sosHint}>Gonderiliyor...</Text>
                                </>
                            ) : (
                                <>
                                    <MaterialCommunityIcons
                                        name="alert-circle"
                                        size={48}
                                        color="#fff"
                                    />
                                    <Text style={styles.sosButtonText}>S.O.S</Text>
                                    <Text style={styles.sosHint}>
                                        {isHolding ? `${Math.ceil((1 - holdProgress) * 2)}s...` : "Basili Tut"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Progress Ring */}
                        {isHolding && (
                            <View style={styles.progressOverlay}>
                                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
                            </View>
                        )}
                    </Animated.View>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.actionCard} onPress={call112}>
                        <View style={[styles.actionIcon, { backgroundColor: Colors.primary + "15" }]}>
                            <MaterialCommunityIcons name="phone" size={24} color={Colors.primary} />
                        </View>
                        <Text style={styles.actionTitle}>112 Ara</Text>
                        <Text style={styles.actionSub}>Acil servis</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/more/contacts")}>
                        <View style={[styles.actionIcon, { backgroundColor: Colors.status.info + "15" }]}>
                            <MaterialCommunityIcons name="account-group" size={24} color={Colors.status.info} />
                        </View>
                        <Text style={styles.actionTitle}>Acil Kisiler</Text>
                        <Text style={styles.actionSub}>Yonet</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/more/survival_kit")}>
                        <View style={[styles.actionIcon, { backgroundColor: Colors.accent + "15" }]}>
                            <MaterialCommunityIcons name="bag-personal" size={24} color={Colors.accent} />
                        </View>
                        <Text style={styles.actionTitle}>Deprem Cantasi</Text>
                        <Text style={styles.actionSub}>Kontrol</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Footer Branding */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Gercek acil durumlarda 112'yi arayin</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === "android" ? 30 : 0 },

    header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.glass },
    headerTitle: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },

    content: { flex: 1, paddingHorizontal: Spacing.lg },

    warningCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.accent + "10", borderWidth: 1, borderColor: Colors.accent + "25", borderRadius: BorderRadius.xl, padding: Spacing.md, marginTop: Spacing.md },
    warningText: { flex: 1, color: Colors.accent, fontSize: Typography.sizes.sm, lineHeight: 20, fontWeight: "500" },

    offlineInfoCard: { backgroundColor: Colors.status.info + "08", borderWidth: 1, borderColor: Colors.status.info + "20", borderRadius: BorderRadius.lg, padding: Spacing.md, marginTop: Spacing.sm },
    offlineInfoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
    offlineInfoTitle: { fontSize: Typography.sizes.xs, fontWeight: "800", color: Colors.status.info, textTransform: "uppercase", letterSpacing: 0.5 },
    offlineInfoText: { fontSize: 11, color: Colors.text.muted, fontWeight: "500", lineHeight: 16 },

    sosArea: { flex: 1, justifyContent: "center", alignItems: "center", position: "relative" },
    outerRing: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 1, borderColor: Colors.danger + "15" },
    outerRingActive: { borderColor: Colors.danger + "40", borderWidth: 2 },
    middleRing: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 1, borderColor: Colors.danger + "20" },
    middleRingActive: { borderColor: Colors.danger + "60", borderWidth: 2 },

    sosButtonOuter: { position: "relative", overflow: "hidden" },
    sosButton: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.danger, justifyContent: "center", alignItems: "center", ...Shadows.lg },
    sosButtonHolding: { backgroundColor: Colors.dangerDark },
    sosButtonText: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: 2, marginTop: 2 },
    sosHint: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600", marginTop: 2 },

    progressOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 2 },
    progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 2 },

    quickActions: { flexDirection: "row", gap: Spacing.sm, paddingBottom: Spacing.lg },
    actionCard: { flex: 1, backgroundColor: Colors.background.surface, borderWidth: 1, borderColor: Colors.border.glass, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: "center", gap: 6 },
    actionIcon: { width: 44, height: 44, borderRadius: BorderRadius.lg, justifyContent: "center", alignItems: "center" },
    actionTitle: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.dark },
    actionSub: { fontSize: Typography.sizes.xs, fontWeight: "500", color: Colors.text.muted },

    footer: { alignItems: "center", paddingBottom: Spacing.lg },
    footerText: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: "500" },
});
