/**
 * S.O.S Tab Ekranı — Acil Durum Merkezi
 *
 * 3 Ana Eylem:
 *  1. SOS (Basılı tut → Ses kaydı → Groq → Twilio Şelale)
 *  2. Ben İyiyim (Tek dokunuş → Twilio Şelale)
 *  3. 112 Ara
 *
 * SOS Akışı:
 *  - 2 sn basılı tut → titreşim → ses kaydı başlar
 *  - 15 sn sonra veya parmak kaldırınca kayıt durur
 *  - uploadSOSAudio() → backend → Groq Whisper → Twilio
 *  - Sonuç Alert ile gösterilir
 */

import { useState, useRef, useCallback, useEffect } from "react";
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
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { uploadSOSAudio, sendIAmSafe } from "../../src/services/sosService";
import { isOnline, triggerOfflineSOS, cacheLastLocation, cacheEmergencyContacts } from "../../src/services/offlineSosService";

const HOLD_MS = 2000;
const MAX_RECORD_MS = 15_000;

type Phase =
    | "idle"
    | "holding"
    | "recording"
    | "uploading"
    | "done"
    | "safe_sending"
    | "safe_done";

const SOS_COOLDOWN_SEC = 60;
const SAFE_COOLDOWN_SEC = 30;

export default function SOSTabScreen() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [holdProgress, setHoldProgress] = useState(0);
    const [recordSec, setRecordSec] = useState(0);
    const [resultMsg, setResultMsg] = useState("");

    // Cooldown — art arda basımı hem frontend hem backend engeller
    const [sosCooldown, setSosCooldown] = useState(0);
    const [safeCooldown, setSafeCooldown] = useState(0);
    const [networkOnline, setNetworkOnline] = useState(true);

    const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recordingRef = useRef<Audio.Recording | null>(null);
    const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const sosAnim = useRef(new Animated.Value(1)).current;
    const safeAnim = useRef(new Animated.Value(1)).current;

    // SOS cooldown geri sayım
    useEffect(() => {
        if (sosCooldown <= 0) return;
        const t = setInterval(() => setSosCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(t);
    }, [sosCooldown > 0]);

    // Safe cooldown geri sayım
    useEffect(() => {
        if (safeCooldown <= 0) return;
        const t = setInterval(() => setSafeCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(t);
    }, [safeCooldown > 0]);

    // Network durumu takibi
    useEffect(() => {
        isOnline().then(setNetworkOnline).catch(() => {});
        const interval = setInterval(() => {
            isOnline().then(setNetworkOnline).catch(() => {});
        }, 10_000);
        return () => clearInterval(interval);
    }, []);

    // Mikrofon + konum izinleri + offline cache
    useEffect(() => {
        (async () => {
            try {
                await Audio.requestPermissionsAsync();
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    cacheLastLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
                }
            } catch { /* Konum olmasa da SOS çalışır */ }

            // Acil kişi listesini offline cache'e al
            try {
                const { api } = require("../../src/services/api");
                const { data } = await api.get("/api/v1/users/me/contacts");
                if (Array.isArray(data)) {
                    const mapped = data
                        .filter((c: { phone_number?: string; is_active?: boolean }) => c.phone_number && c.is_active !== false)
                        .map((c: { name?: string; phone_number: string }) => ({
                            name: c.name || "Acil Kişi",
                            phone: c.phone_number,
                        }));
                    await cacheEmergencyContacts(mapped);
                }
            } catch { /* Cache yapılamazsa online akışta sorun yok */ }
        })();
    }, []);

    // Kayıt pulse animasyonu
    useEffect(() => {
        if (phase === "recording") {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.12, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [phase]);

    // ── Basılı Tutma Başla ────────────────────────────────────────────────────
    const onPressIn = useCallback(() => {
        if (phase !== "idle") return;
        if (sosCooldown > 0) {
            Alert.alert("Bekleme Süresi", `Yeni SOS gönderebilmek için ${sosCooldown} saniye bekleyin.`);
            return;
        }
        setPhase("holding");
        setHoldProgress(0);
        Vibration.vibrate(30);

        Animated.timing(progressAnim, { toValue: 1, duration: HOLD_MS, useNativeDriver: false }).start();

        const start = Date.now();
        holdTimerRef.current = setInterval(() => {
            const p = Math.min((Date.now() - start) / HOLD_MS, 1);
            setHoldProgress(p);
            if (p >= 1) {
                clearInterval(holdTimerRef.current!);
                startRecording();
            }
        }, 40);
    }, [phase, sosCooldown]);

    // ── Parmak Kaldırma ───────────────────────────────────────────────────────
    const onPressOut = useCallback(() => {
        if (phase === "holding") {
            clearInterval(holdTimerRef.current!);
            progressAnim.setValue(0);
            setHoldProgress(0);
            setPhase("idle");
            return;
        }
        if (phase === "recording") {
            stopAndUpload();
        }
    }, [phase, safeCooldown]);

    // ── Ses Kaydı Başlat ──────────────────────────────────────────────────────
    const startRecording = useCallback(async () => {
        try {
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: false,
            });

            const { recording } = await Audio.Recording.createAsync({
                android: {
                    extension: ".m4a",
                    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
                    audioEncoder: Audio.AndroidAudioEncoder.AAC,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 64000,
                },
                ios: {
                    extension: ".m4a",
                    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
                    audioQuality: Audio.IOSAudioQuality.MEDIUM,
                    sampleRate: 16000,
                    numberOfChannels: 1,
                    bitRate: 64000,
                    linearPCMBitDepth: 16,
                    linearPCMIsBigEndian: false,
                    linearPCMIsFloat: false,
                },
                web: {},
            });

            recordingRef.current = recording;
            setPhase("recording");
            setRecordSec(0);
            Vibration.vibrate([0, 100, 80, 100]);

            // Saniyeyi güncelle
            recordIntervalRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);

            // 15 sn sonra otomatik durdur
            recordTimerRef.current = setTimeout(() => stopAndUpload(), MAX_RECORD_MS);

        } catch (err) {
            console.error("[SOS] Kayıt başlatma hatası:", err);
            setPhase("idle");
            Alert.alert("Mikrofon Hatası", "Ses kaydı başlatılamadı. Mikrofon iznini kontrol edin.");
        }
    }, []);

    // ── Ses Kaydı Durdur ve Yükle ─────────────────────────────────────────────
    const stopAndUpload = useCallback(async () => {
        clearTimeout(recordTimerRef.current!);
        clearInterval(recordIntervalRef.current!);

        const rec = recordingRef.current;
        if (!rec) { setPhase("idle"); return; }

        try {
            await rec.stopAndUnloadAsync();
            const uri = rec.getURI();
            recordingRef.current = null;

            if (!uri) throw new Error("Kayıt URI bulunamadı");

            setPhase("uploading");

            // Konum yenile (son bilinen yoksa tekrar dene)
            if (!locationRef.current) {
                try {
                    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
                    locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    cacheLastLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {});
                } catch { /* Konum olmadan devam */ }
            }

            // Offline kontrolü — internet yoksa SMS fallback
            const online = await isOnline();
            if (!online) {
                const sent = await triggerOfflineSOS();
                setPhase(sent ? "done" : "idle");
                if (sent) {
                    setResultMsg("📴 İnternetsiz S.O.S\nSMS uygulaması ile acil kişilerinize mesaj gönderildi.");
                    setSosCooldown(SOS_COOLDOWN_SEC);
                }
                return;
            }

            const result = await uploadSOSAudio(
                uri,
                locationRef.current?.latitude ?? null,
                locationRef.current?.longitude ?? null,
            );

            if (result.success) {
                setResultMsg(`✅ SOS İletildi\n${result.transcription ? `"${result.transcription.slice(0, 80)}..."` : ""}\n${result.notifiedContacts} kişiye ulaştı.`);
                setPhase("done");
                setSosCooldown(SOS_COOLDOWN_SEC);
                Vibration.vibrate([0, 200, 100, 200]);
            } else {
                throw new Error(result.error ?? result.message ?? "Gönderilemedi");
            }

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[SOS] Upload hatası:", msg);
            setPhase("idle");
            Alert.alert(
                "⚠ SOS Gönderilemedi",
                `${msg}\n\nLütfen 112'yi arayın.`,
                [{ text: "112 Ara", onPress: () => Linking.openURL("tel:112") }, { text: "Tamam" }]
            );
        }
    }, []);

    // ── Ben İyiyim ────────────────────────────────────────────────────────────
    const handleIAmSafe = useCallback(async () => {
        if (phase !== "idle" && phase !== "done") return;
        if (safeCooldown > 0) {
            Alert.alert("Bekleme Süresi", `Yeni bildirim gönderebilmek için ${safeCooldown} saniye bekleyin.`);
            return;
        }
        setPhase("safe_sending");

        Animated.sequence([
            Animated.timing(safeAnim, { toValue: 0.93, duration: 100, useNativeDriver: true }),
            Animated.timing(safeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        // Offline kontrolü
        const online = await isOnline();
        if (!online) {
            const sent = await triggerOfflineSOS();
            if (sent) {
                setResultMsg("📴 İnternetsiz Bildirim\nSMS uygulaması ile güvenlik mesajı gönderildi.");
                setPhase("safe_done");
                setSafeCooldown(SAFE_COOLDOWN_SEC);
            } else {
                setPhase("idle");
            }
            return;
        }

        const result = await sendIAmSafe();

        if (result.success && result.notifiedContacts > 0) {
            setResultMsg(`✅ Güvenlik Bildirimi Gönderildi\n${result.notifiedContacts} kişi bilgilendirildi.`);
            setPhase("safe_done");
            setSafeCooldown(SAFE_COOLDOWN_SEC);
        } else if (result.success && result.notifiedContacts === 0) {
            Alert.alert("Acil Kişi Yok", "Lütfen Acil Kişiler listesine numara ekleyin.", [
                { text: "Ekle", onPress: () => router.push("/more/contacts") },
                { text: "Tamam", onPress: () => setPhase("idle") },
            ]);
        } else {
            Alert.alert("⚠ Gönderilemedi", result.message || "Lütfen tekrar deneyin.", [
                { text: "Tamam", onPress: () => setPhase("idle") },
            ]);
        }
    }, [phase, safeCooldown]);

    const resetPhase = useCallback(() => {
        setPhase("idle");
        setResultMsg("");
        setHoldProgress(0);
        progressAnim.setValue(0);
        setRecordSec(0);
    }, []);

    const call112 = useCallback(() => {
        Alert.alert("Acil Arama", "112 Acil servislerini aramak istiyor musunuz?", [
            { text: "İptal", style: "cancel" },
            { text: "112 Ara", style: "destructive", onPress: () => Linking.openURL("tel:112") },
        ]);
    }, []);

    const isActive = phase !== "idle" && phase !== "done" && phase !== "safe_done";
    const isSosCooling = sosCooldown > 0;
    const isSafeCooling = safeCooldown > 0;
    const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

    // ── Sonuç Ekranı ──────────────────────────────────────────────────────────
    if (phase === "done" || phase === "safe_done") {
        const isSafe = phase === "safe_done";
        return (
            <SafeAreaView style={s.container}>
                <View style={s.resultScreen}>
                    <View style={[s.resultIcon, { backgroundColor: isSafe ? Colors.primary + "20" : Colors.danger + "20" }]}>
                        <MaterialCommunityIcons
                            name={isSafe ? "shield-check" : "check-circle"}
                            size={64}
                            color={isSafe ? Colors.primary : Colors.danger}
                        />
                    </View>
                    <Text style={[s.resultTitle, { color: isSafe ? Colors.primary : Colors.danger }]}>
                        {isSafe ? "Bildirim Gönderildi" : "SOS Gönderildi"}
                    </Text>
                    <Text style={s.resultMsg}>{resultMsg}</Text>
                    <TouchableOpacity style={s.resetBtn} onPress={resetPhase} activeOpacity={0.8}>
                        <Text style={s.resetBtnText}>Tamam</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.callBtn} onPress={call112} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="phone" size={18} color="#fff" />
                        <Text style={s.callBtnText}>112 Ara</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <MaterialCommunityIcons name="alert-octagon" size={22} color={Colors.danger} />
                <Text style={s.headerTitle}>Acil Durum</Text>
            </View>

            {/* Offline Banner */}
            {!networkOnline && (
                <View style={s.offlineBanner}>
                    <MaterialCommunityIcons name="wifi-off" size={16} color="#fff" />
                    <Text style={s.offlineBannerText}>Çevrimdışı — SOS, SMS ile gönderilecek</Text>
                </View>
            )}

            {/* Bilgi Kartı */}
            <View style={s.infoCard}>
                <MaterialCommunityIcons name="microphone" size={16} color={Colors.accent} />
                <Text style={s.infoText}>
                    SOS butonuna <Text style={{ fontWeight: "900" }}>2 sn basılı tutun</Text> — sesli mesajınız AI ile analiz edilip acil kişilerinize iletilir.
                </Text>
            </View>

            {/* SOS Buton Alanı */}
            <View style={s.sosArea}>
                <View style={[s.ring, s.ringOuter, isActive && s.ringActive]} />
                <View style={[s.ring, s.ringMid, isActive && s.ringActive]} />

                <Animated.View style={{ transform: [{ scale: phase === "recording" ? pulseAnim : sosAnim }] }}>
                    <TouchableOpacity
                        style={[
                            s.sosBtn,
                            phase === "recording" && s.sosBtnRecording,
                            phase === "uploading" && s.sosBtnUploading,
                            isSosCooling && s.sosBtnCooldown,
                        ]}
                        onPressIn={onPressIn}
                        onPressOut={onPressOut}
                        activeOpacity={1}
                        disabled={phase === "uploading" || phase === "safe_sending" || isSosCooling}
                    >
                        {phase === "uploading" ? (
                            <>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={s.sosBtnText}>Gönderiliyor</Text>
                            </>
                        ) : phase === "recording" ? (
                            <>
                                <MaterialCommunityIcons name="microphone" size={44} color="#fff" />
                                <Text style={s.sosBtnText}>S.O.S</Text>
                                <Text style={s.sosBtnSub}>{recordSec}s / 15s</Text>
                            </>
                        ) : isSosCooling ? (
                            <>
                                <MaterialCommunityIcons name="timer-sand" size={36} color="rgba(255,255,255,0.7)" />
                                <Text style={s.sosBtnText}>{sosCooldown}s</Text>
                                <Text style={s.sosBtnSub}>Bekleniyor</Text>
                            </>
                        ) : (
                            <>
                                <MaterialCommunityIcons name="alert-circle" size={44} color="#fff" />
                                <Text style={s.sosBtnText}>S.O.S</Text>
                                <Text style={s.sosBtnSub}>
                                    {phase === "holding"
                                        ? `${Math.ceil((1 - holdProgress) * 2)}s...`
                                        : "Basılı Tut"}
                                </Text>
                            </>
                        )}

                        {/* İlerleme Çubuğu */}
                        {phase === "holding" && (
                            <View style={s.progressBar}>
                                <Animated.View style={[s.progressFill, { width: progressWidth }]} />
                            </View>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Ben İyiyim Butonu */}
            <Animated.View style={[s.safeArea, { transform: [{ scale: safeAnim }] }]}>
                <TouchableOpacity
                    style={[s.safeBtn, (phase === "safe_sending") && s.safeBtnLoading, isSafeCooling && s.safeBtnCooldown]}
                    onPress={handleIAmSafe}
                    activeOpacity={0.85}
                    disabled={isActive || isSafeCooling}
                >
                    {phase === "safe_sending" ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : isSafeCooling ? (
                        <MaterialCommunityIcons name="timer-sand" size={20} color="rgba(255,255,255,0.6)" />
                    ) : (
                        <MaterialCommunityIcons name="shield-check" size={24} color="#fff" />
                    )}
                    <Text style={s.safeBtnText}>
                        {phase === "safe_sending" ? "Gönderiliyor..." : isSafeCooling ? `Bekleniyor (${safeCooldown}s)` : "Ben İyiyim"}
                    </Text>
                </TouchableOpacity>
                <Text style={s.safeBtnHint}>Acil kişilere güvenlik bildirimi gönderir</Text>
            </Animated.View>

            {/* Hızlı Eylemler */}
            <View style={s.actions}>
                <TouchableOpacity style={s.actionCard} onPress={call112} activeOpacity={0.8}>
                    <View style={[s.actionIcon, { backgroundColor: Colors.primary + "15" }]}>
                        <MaterialCommunityIcons name="phone" size={22} color={Colors.primary} />
                    </View>
                    <Text style={s.actionLabel}>112 Ara</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.actionCard} onPress={() => router.push("/more/contacts")} activeOpacity={0.8}>
                    <View style={[s.actionIcon, { backgroundColor: Colors.status.info + "15" }]}>
                        <MaterialCommunityIcons name="account-group" size={22} color={Colors.status.info} />
                    </View>
                    <Text style={s.actionLabel}>Acil Kişiler</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.actionCard} onPress={() => router.push("/more/sos")} activeOpacity={0.8}>
                    <View style={[s.actionIcon, { backgroundColor: Colors.accent + "15" }]}>
                        <MaterialCommunityIcons name="microphone-message" size={22} color={Colors.accent} />
                    </View>
                    <Text style={s.actionLabel}>Sesli SOS</Text>
                </TouchableOpacity>
            </View>

            <Text style={s.footer}>Gerçek acil durumlarda 112'yi arayın</Text>
        </SafeAreaView>
    );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === "android" ? 30 : 0 },

    header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border.glass },
    headerTitle: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },

    offlineBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#D97706", paddingVertical: 10, paddingHorizontal: Spacing.lg, marginHorizontal: Spacing.lg, marginTop: Spacing.sm, borderRadius: BorderRadius.lg },
    offlineBannerText: { color: "#fff", fontSize: Typography.sizes.sm, fontWeight: "700" },

    infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.accent + "10", borderWidth: 1, borderColor: Colors.accent + "25", borderRadius: BorderRadius.xl, padding: Spacing.md, margin: Spacing.lg, marginBottom: 0 },
    infoText: { flex: 1, color: Colors.accent, fontSize: Typography.sizes.sm, lineHeight: 20 },

    // SOS Alanı
    sosArea: { flex: 1, justifyContent: "center", alignItems: "center" },
    ring: { position: "absolute", borderRadius: 9999, borderWidth: 1 },
    ringOuter: { width: 220, height: 220, borderColor: Colors.danger + "18" },
    ringMid: { width: 180, height: 180, borderColor: Colors.danger + "25" },
    ringActive: { borderColor: Colors.danger + "55", borderWidth: 2 },

    sosBtn: {
        width: 148, height: 148, borderRadius: 74,
        backgroundColor: Colors.danger,
        justifyContent: "center", alignItems: "center",
        gap: 2,
        ...Shadows.lg,
        shadowColor: Colors.danger,
        overflow: "hidden",
    },
    sosBtnRecording: { backgroundColor: "#B91C1C" },
    sosBtnUploading: { backgroundColor: Colors.dangerDark, opacity: 0.9 },
    sosBtnCooldown: { backgroundColor: Colors.text.muted, opacity: 0.5 },
    sosBtnText: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 2 },
    sosBtnSub: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600" },

    progressBar: { position: "absolute", bottom: 0, left: 0, right: 0, height: 5, backgroundColor: "rgba(0,0,0,0.3)" },
    progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 2 },

    // Ben İyiyim
    safeArea: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, alignItems: "center", gap: 6 },
    safeBtn: {
        width: "100%", height: 58, borderRadius: BorderRadius.xl,
        backgroundColor: Colors.primary,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
        ...Shadows.md, shadowColor: Colors.primary,
    },
    safeBtnLoading: { opacity: 0.8 },
    safeBtnCooldown: { backgroundColor: Colors.text.muted, opacity: 0.5 },
    safeBtnText: { color: "#fff", fontSize: Typography.sizes.md + 1, fontWeight: "900" },
    safeBtnHint: { fontSize: Typography.sizes.xs, color: Colors.text.muted, fontWeight: "500", textAlign: "center" },

    // Hızlı Eylemler
    actions: { flexDirection: "row", gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
    actionCard: { flex: 1, backgroundColor: Colors.background.surface, borderWidth: 1, borderColor: Colors.border.glass, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: "center", gap: 6 },
    actionIcon: { width: 42, height: 42, borderRadius: BorderRadius.lg, justifyContent: "center", alignItems: "center" },
    actionLabel: { fontSize: Typography.sizes.xs + 1, fontWeight: "700", color: Colors.text.dark, textAlign: "center" },

    // Sonuç Ekranı
    resultScreen: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xxl, gap: Spacing.lg },
    resultIcon: { width: 110, height: 110, borderRadius: 55, justifyContent: "center", alignItems: "center" },
    resultTitle: { fontSize: Typography.sizes.xxl, fontWeight: "900", textAlign: "center" },
    resultMsg: { fontSize: Typography.sizes.sm, color: Colors.text.muted, textAlign: "center", lineHeight: 22 },
    resetBtn: { width: "100%", height: 52, borderRadius: BorderRadius.xl, backgroundColor: Colors.background.elevated, justifyContent: "center", alignItems: "center" },
    resetBtnText: { fontSize: Typography.sizes.md, fontWeight: "700", color: Colors.text.dark },
    callBtn: { width: "100%", height: 52, borderRadius: BorderRadius.xl, backgroundColor: Colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    callBtnText: { fontSize: Typography.sizes.md, fontWeight: "700", color: "#fff" },

    footer: { textAlign: "center", color: Colors.text.muted, fontSize: Typography.sizes.xs, paddingBottom: Spacing.lg },
});
