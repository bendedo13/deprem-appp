/**
 * S.O.S Sesli Mesaj Detay Ekranı
 *
 * Bu ekran daha detaylı ses kaydı arayüzü sunar.
 * Kullanıcı mesajını net anlatabilmek için ipuçları ve
 * manuel kontrollü kayıt imkânı sağlar.
 *
 * Zincir: expo-av ses → /api/v1/sos/audio → Groq Whisper → Twilio Şelale
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Linking,
    Animated,
    ActivityIndicator,
    Platform,
    Vibration,
} from "react-native";
import { Stack, router } from "expo-router";
import { Audio } from "expo-av";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { uploadSOSAudio, sendIAmSafe } from "../../src/services/sosService";

const MAX_RECORD_MS = 30_000;

type Phase = "idle" | "recording" | "uploading" | "done" | "error";

const TIPS = [
    { icon: "map-marker" as const, text: "Konumunuzu söyleyin: Mahalle, sokak, bina no" },
    { icon: "account-group" as const, text: "Kaç kişi olduğunuzu bildirin" },
    { icon: "alert-circle" as const, text: "Durumunuzu tarif edin: 'Enkaz altındayım, ayağım kırık'" },
    { icon: "clock" as const, text: "Net ve yavaş konuşun — AI sizi daha iyi anlasın" },
];

export default function SOSDetailScreen() {
    const [phase, setPhase] = useState<Phase>("idle");
    const [recordSec, setRecordSec] = useState(0);
    const [resultText, setResultText] = useState("");
    const [transcription, setTranscription] = useState("");

    const recordingRef = useRef<Audio.Recording | null>(null);
    const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const waveAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        (async () => {
            await Audio.requestPermissionsAsync();
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === "granted") {
                    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                }
            } catch { /* Konum olmadan devam */ }
        })();
    }, []);

    useEffect(() => {
        if (phase === "recording") {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
            Animated.loop(
                Animated.sequence([
                    Animated.timing(waveAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.timing(waveAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            waveAnim.setValue(0);
        }
    }, [phase]);

    const startRecording = useCallback(async () => {
        if (phase !== "idle") return;
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
            Vibration.vibrate([0, 80, 60, 80]);

            recordIntervalRef.current = setInterval(() => setRecordSec((s) => s + 1), 1000);
            autoStopRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS);

        } catch (err) {
            console.error("[SOSDetail] Kayıt hatası:", err);
            Alert.alert("Mikrofon Hatası", "Ses kaydı başlatılamadı. Mikrofon iznini kontrol edin.");
        }
    }, [phase]);

    const stopRecording = useCallback(async () => {
        clearInterval(recordIntervalRef.current!);
        clearTimeout(autoStopRef.current!);

        const rec = recordingRef.current;
        if (!rec) { setPhase("idle"); return; }

        try {
            setPhase("uploading");
            await rec.stopAndUnloadAsync();
            const uri = rec.getURI();
            recordingRef.current = null;
            if (!uri) throw new Error("Kayıt URI boş");

            if (!locationRef.current) {
                try {
                    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
                    locationRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                } catch { /* ignore */ }
            }

            const result = await uploadSOSAudio(
                uri,
                locationRef.current?.latitude ?? null,
                locationRef.current?.longitude ?? null,
            );

            if (result.success) {
                setTranscription(result.transcription);
                setResultText(
                    `${result.notifiedContacts} kişiye ulaştı\nWhatsApp: ${result.whatsappSent}  SMS: ${result.smsSent}`
                    + (result.fallbackUsed ? "\n(WhatsApp→SMS fallback kullanıldı)" : "")
                );
                setPhase("done");
                Vibration.vibrate([0, 200, 100, 200]);
            } else {
                throw new Error(result.error ?? result.message);
            }

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            setResultText(msg);
            setPhase("error");
            Alert.alert("⚠ Gönderilemedi", `${msg}\n\nGerçek acil durumlarda 112'yi arayın.`, [
                { text: "112 Ara", onPress: () => Linking.openURL("tel:112") },
                { text: "Tekrar Dene", onPress: () => setPhase("idle") },
            ]);
        }
    }, []);

    const handleIAmSafe = useCallback(async () => {
        const result = await sendIAmSafe();
        if (result.success && result.notifiedContacts > 0) {
            Alert.alert("✅ Güvende Bildirimi Gönderildi", `${result.notifiedContacts} kişi bilgilendirildi.`);
        } else {
            Alert.alert("Acil Kişi Yok", result.message || "Lütfen acil kişi listesine numara ekleyin.", [
                { text: "Acil Kişi Ekle", onPress: () => router.push("/more/contacts") },
                { text: "Tamam" },
            ]);
        }
    }, []);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    const wavyOpacity = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

    return (
        <>
            <Stack.Screen
                options={{
                    title: "S.O.S Sesli Mesaj",
                    headerStyle: { backgroundColor: Colors.background.surface },
                    headerTintColor: Colors.danger,
                    headerTitleStyle: { fontWeight: "900", color: Colors.text.dark },
                }}
            />
            <ScrollView
                style={s.container}
                contentContainerStyle={s.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* Başlık Kartı */}
                <View style={s.heroCard}>
                    <View style={s.heroIcon}>
                        <MaterialCommunityIcons name="microphone-message" size={36} color={Colors.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.heroTitle}>Sesli S.O.S</Text>
                        <Text style={s.heroSub}>AI ile analiz → Acil kişilerinize iletilir</Text>
                    </View>
                </View>

                {/* Kayıt Butonu */}
                <View style={s.recArea}>
                    {/* Dalga animasyonu */}
                    {phase === "recording" && (
                        <>
                            <Animated.View style={[s.wave, s.wave1, { opacity: wavyOpacity }]} />
                            <Animated.View style={[s.wave, s.wave2, { opacity: waveAnim }]} />
                        </>
                    )}

                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        {phase === "uploading" ? (
                            <View style={[s.recBtn, s.recBtnUploading]}>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={s.recBtnText}>Gönderiliyor...</Text>
                            </View>
                        ) : phase === "done" ? (
                            <TouchableOpacity style={[s.recBtn, s.recBtnDone]} onPress={() => setPhase("idle")} activeOpacity={0.85}>
                                <MaterialCommunityIcons name="check-circle" size={44} color="#fff" />
                                <Text style={s.recBtnText}>Gönderildi!</Text>
                                <Text style={s.recBtnSub}>Tekrar kayıt için dokun</Text>
                            </TouchableOpacity>
                        ) : phase === "recording" ? (
                            <TouchableOpacity style={[s.recBtn, s.recBtnActive]} onPress={stopRecording} activeOpacity={0.85}>
                                <MaterialCommunityIcons name="stop-circle" size={44} color="#fff" />
                                <Text style={s.recBtnText}>{formatTime(recordSec)}</Text>
                                <Text style={s.recBtnSub}>Durdurmak için dokun</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={s.recBtn} onPress={startRecording} activeOpacity={0.85}>
                                <MaterialCommunityIcons name="microphone" size={44} color="#fff" />
                                <Text style={s.recBtnText}>Kayıt Başlat</Text>
                                <Text style={s.recBtnSub}>Maks. 30 saniye</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </View>

                {/* Transkripsiyon Sonucu */}
                {(phase === "done" || phase === "error") && (
                    <View style={[s.resultCard, phase === "error" ? s.resultError : s.resultSuccess]}>
                        {transcription ? (
                            <>
                                <Text style={s.resultLabel}>🤖 AI Transkripsiyon:</Text>
                                <Text style={s.resultTranscription}>"{transcription}"</Text>
                            </>
                        ) : null}
                        <Text style={s.resultDetail}>{resultText}</Text>
                    </View>
                )}

                {/* Ben İyiyim */}
                <TouchableOpacity style={s.safeBtn} onPress={handleIAmSafe} activeOpacity={0.85}>
                    <MaterialCommunityIcons name="shield-check" size={22} color="#fff" />
                    <Text style={s.safeBtnText}>✅ Ben İyiyim — Acil Kişilere Bildir</Text>
                </TouchableOpacity>

                {/* 112 */}
                <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL("tel:112")} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="phone" size={20} color={Colors.primary} />
                    <Text style={s.callBtnText}>📞 112 Acil Servisi Ara</Text>
                </TouchableOpacity>

                {/* İpuçları */}
                <View style={s.tipsCard}>
                    <Text style={s.tipsTitle}>💡 Nasıl Konuşmalıyım?</Text>
                    {TIPS.map((t, i) => (
                        <View key={i} style={s.tipRow}>
                            <MaterialCommunityIcons name={t.icon} size={16} color={Colors.primary} />
                            <Text style={s.tipText}>{t.text}</Text>
                        </View>
                    ))}
                </View>

                {/* Uyarı */}
                <View style={s.warnCard}>
                    <MaterialCommunityIcons name="alert-triangle" size={16} color="#92400E" />
                    <Text style={s.warnText}>Gerçek bir acil durumda mutlaka 112'yi arayın.</Text>
                </View>
            </ScrollView>
        </>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.lg, paddingBottom: 60, gap: Spacing.md },

    heroCard: { flexDirection: "row", alignItems: "center", gap: Spacing.md, backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.danger + "25" },
    heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.danger + "18", justifyContent: "center", alignItems: "center" },
    heroTitle: { fontSize: Typography.sizes.xl, fontWeight: "900", color: Colors.text.dark },
    heroSub: { fontSize: Typography.sizes.sm, color: Colors.text.muted, marginTop: 2 },

    recArea: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.xl, position: "relative" },
    wave: { position: "absolute", borderRadius: 9999, borderWidth: 1, borderColor: Colors.danger + "30" },
    wave1: { width: 200, height: 200 },
    wave2: { width: 160, height: 160, borderColor: Colors.danger + "50" },

    recBtn: {
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: Colors.danger, justifyContent: "center", alignItems: "center", gap: 4,
        ...Shadows.lg, shadowColor: Colors.danger,
    },
    recBtnActive: { backgroundColor: "#B91C1C" },
    recBtnUploading: { backgroundColor: Colors.dangerDark, opacity: 0.85 },
    recBtnDone: { backgroundColor: Colors.primary, shadowColor: Colors.primary },
    recBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },
    recBtnSub: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "600" },

    resultCard: { borderRadius: BorderRadius.xl, padding: Spacing.md, borderWidth: 1, gap: 6 },
    resultSuccess: { backgroundColor: Colors.primary + "10", borderColor: Colors.primary + "35" },
    resultError: { backgroundColor: Colors.danger + "10", borderColor: Colors.danger + "35" },
    resultLabel: { fontSize: Typography.sizes.xs, fontWeight: "800", color: Colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5 },
    resultTranscription: { fontSize: Typography.sizes.sm, color: Colors.text.dark, fontStyle: "italic", lineHeight: 20 },
    resultDetail: { fontSize: Typography.sizes.sm, color: Colors.text.muted, fontWeight: "600" },

    safeBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, ...Shadows.md, shadowColor: Colors.primary },
    safeBtnText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "800" },

    callBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl, height: 50, borderWidth: 1, borderColor: Colors.primary + "40" },
    callBtnText: { color: Colors.primary, fontSize: Typography.sizes.md, fontWeight: "700" },

    tipsCard: { backgroundColor: Colors.background.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border.glass, gap: 10 },
    tipsTitle: { fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark, marginBottom: 4 },
    tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    tipText: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.text.muted, lineHeight: 20 },

    warnCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FEF3C7", borderRadius: BorderRadius.lg, padding: Spacing.md },
    warnText: { flex: 1, fontSize: Typography.sizes.sm, color: "#92400E", lineHeight: 18 },
});
