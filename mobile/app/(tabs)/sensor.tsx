/**
 * Erken Uyarı Sensör Ekranı — Gelişmiş Dashboard
 *
 * Bölümler:
 *  1. Canlı STA/LTA Gauge (animasyonlu, simülasyon override destekli)
 *  2. İvmeölçer Alarm Ayarları (SecureStore'a kalıcı kayıt)
 *  3. Algoritma Parametreleri
 *  4. Tetikleme Tarihçesi
 *  5. Deprem Simülasyonu (M6.0 mock — tüm pipeline test edilir)
 *  6. Arka Plan Koruması & Konum Bilgisi
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Platform,
    Animated,
    Switch,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    Modal,
} from "react-native";
import * as Location from "expo-location";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";
import {
    TRIGGER_RATIO,
    DETRIGGER_RATIO,
    STA_WINDOW,
    LTA_WINDOW,
    SAMPLE_RATE_HZ,
    COOLDOWN_AFTER_TRIGGER_MS,
} from "../../src/constants/seismic";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import {
    loadSensorSettings,
    saveSensorSettings,
    SensorAlarmSettings,
    DEFAULT_SETTINGS,
    isSensorActive,
    type SensorMode,
} from "../../src/services/sensorSettings";
import {
    startTestAlarmSound,
    stopTestAlarmSound,
    startTestVibration,
    stopTestVibration,
    sendTestSOS,
    stopTestCompletely,
} from "../../src/services/testSimulationService";
import { startCriticalAlarm } from "../../src/services/criticalAlarmService";

// ─── Yardımcı Fonksiyonlar ────────────────────────────────────────────────────

function ratioColor(ratio: number): string {
    if (ratio >= TRIGGER_RATIO) return Colors.danger;
    if (ratio >= TRIGGER_RATIO * 0.7) return Colors.accent;
    if (ratio >= TRIGGER_RATIO * 0.4) return Colors.semantic?.warningAmber ?? Colors.status.warning;
    return Colors.primary;
}

function ratioToPercent(ratio: number): number {
    const max = TRIGGER_RATIO * 1.5;
    return Math.min((ratio / max) * 100, 100);
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function isValidTime(t: string): boolean {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
}

// ─── Ana Ekran ────────────────────────────────────────────────────────────────

export default function SensorScreen() {
    // Konum
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Tetikleme geçmişi
    const [lastTriggerHistory, setLastTriggerHistory] = useState<
        Array<{ time: Date; peak: number; ratio: number }>
    >([]);

    // Ayarlar (SecureStore'dan yüklenir)
    const [settings, setSettings] = useState<SensorAlarmSettings>(DEFAULT_SETTINGS);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    // Toast bildirimi
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const toastAnim = useRef(new Animated.Value(0)).current;

    // Simülasyon durumu (tek test butonu)
    const [simulating, setSimulating] = useState(false);
    const [simulatedRatio, setSimulatedRatio] = useState<number | null>(null);
    const [testSosResult, setTestSosResult] = useState<{ success: boolean; notifiedContacts: number; error?: string } | null>(null);

    // Gerçek ivmeölçer hook — 1.8G+ nükleer alarm tetiklemesi
    const handleCriticalTrigger = useCallback((lat: number | null, lng: number | null) => {
        startCriticalAlarm(
            lat != null ? String(lat) : undefined,
            lng != null ? String(lng) : undefined
        );
    }, []);
    const sensorActive = isSensorActive(settings);
    const { isMonitoring, isTriggered, peakAcceleration, staLtaRatio, triggerTime } =
        useShakeDetector(location?.lat ?? null, location?.lng ?? null, handleCriticalTrigger, sensorActive);

    // Animasyon referansları
    const gaugeAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const prevTriggered = useRef(false);

    // Ekranda gösterilecek değerler (simülasyon varsa override)
    const displayRatio = simulatedRatio ?? staLtaRatio;
    const displayTriggered =
        simulating || isTriggered || (simulatedRatio !== null && simulatedRatio >= TRIGGER_RATIO);

    // ── Konum izni ──────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== "granted") return;
            const pos = await Location.getCurrentPositionAsync({});
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        })();
    }, []);

    // ── Ayarları yükle (başlangıçta bir kez) ────────────────────────────────
    useEffect(() => {
        loadSensorSettings()
            .then((s) => {
                setSettings(s);
                setSettingsLoaded(true);
            })
            .catch(() => {
                setSettings(DEFAULT_SETTINGS);
                setSettingsLoaded(true);
            });
    }, []);

    // ── Gauge animasyonu ─────────────────────────────────────────────────────
    useEffect(() => {
        const pct = ratioToPercent(displayRatio);
        Animated.spring(gaugeAnim, {
            toValue: pct / 100,
            useNativeDriver: false,
            speed: 20,
            bounciness: 2,
        }).start();
    }, [displayRatio]);

    // ── Gerçek tetiklenme → tarihçe + pulse ─────────────────────────────────
    useEffect(() => {
        if (isTriggered && !prevTriggered.current && triggerTime) {
            setLastTriggerHistory((prev) =>
                [{ time: triggerTime, peak: peakAcceleration, ratio: staLtaRatio }, ...prev].slice(0, 5)
            );
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.08, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                ]),
                { iterations: 6 }
            ).start();
        }
        prevTriggered.current = isTriggered;
    }, [isTriggered, triggerTime]);


    // ── Toast göster ─────────────────────────────────────────────────────────
    const showToast = useCallback(
        (message: string, type: "success" | "error") => {
            setToast({ message, type });
            toastAnim.setValue(0);
            Animated.sequence([
                Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.delay(2800),
                Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setToast(null));
        },
        [toastAnim]
    );

    // ── Ayarları kaydet ──────────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!isValidTime(settings.workStart) || !isValidTime(settings.workEnd)) {
            showToast("Geçersiz saat formatı (HH:MM olmalı, ör: 08:00)", "error");
            return;
        }
        setSaving(true);
        try {
            await saveSensorSettings(settings);
            showToast("✓ Ayarlar başarıyla kaydedildi", "success");
        } catch (err) {
            console.error("[SensorSettings] Kayıt hatası:", err);
            showToast("Kaydedilemedi: " + String(err), "error");
        } finally {
            setSaving(false);
        }
    }, [settings, showToast]);

    // ── Sistemi Test Et (Simülasyon) — Tek buton, 15 sn akış ─────────────────
    const handleTestStart = useCallback(async () => {
        if (simulating) return;
        setSimulating(true);
        setTestSosResult(null);
        setSimulatedRatio(8.5);

        try {
            if (settings.loudAlarmEnabled) {
                try { await startTestAlarmSound(); } catch { /* ses başlatılamazsa devam */ }
            }
            if (settings.vibrationEnabled) {
                try { startTestVibration(); } catch { /* titreşim başlatılamazsa devam */ }
            }

            try {
                const res = await sendTestSOS();
                setTestSosResult(res);
                if (res.success) {
                    showToast(`${res.notifiedContacts} kişiye test mesajı gönderildi`, "success");
                } else if (res.error) {
                    Alert.alert("Test SMS'i gönderilemedi", res.error);
                }
            } catch {
                Alert.alert("Test SMS'i gönderilemedi", "Bağlantı hatası. Lütfen tekrar deneyin.");
            }
        } catch (err) {
            Alert.alert("Test hatası", err instanceof Error ? err.message : String(err));
            try { await stopTestCompletely(); } catch { /* ignore */ }
            setSimulating(false);
            setSimulatedRatio(null);
        }
    }, [simulating, settings, showToast]);

    const handleTestStop = useCallback(async () => {
        try {
            await stopTestCompletely();
        } catch { /* ignore */ }
        setSimulating(false);
        setSimulatedRatio(null);
        setTimeout(() => setTestSosResult(null), 3000);
    }, []);

    // Render değerleri
    const color = ratioColor(displayRatio);
    const gaugeWidth = gaugeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0%", "100%"],
    });

    return (
        <SafeAreaView style={styles.container}>

            {/* Test Simülasyonu — Kırmızı tam ekran overlay */}
            <Modal visible={simulating} transparent animationType="fade">
                <View style={styles.testOverlay}>
                    <View style={styles.testOverlayContent}>
                        <MaterialCommunityIcons name="alert-octagon" size={64} color="#fff" />
                        <Text style={styles.testOverlayTitle}>SİSTEM TESTİ</Text>
                        <Text style={styles.testOverlaySubtitle}>
                            Alarm · Titreşim · Twilio (SMS/WhatsApp)
                        </Text>
                        {testSosResult && (
                            <Text style={styles.testOverlayResult}>
                                {testSosResult.success
                                    ? `${testSosResult.notifiedContacts} kişiye mesaj gönderildi`
                                    : testSosResult.error ?? "SMS gönderilemedi"}
                            </Text>
                        )}
                        <TouchableOpacity
                            style={styles.testStopButton}
                            onPress={handleTestStop}
                            activeOpacity={0.8}
                        >
                            <MaterialCommunityIcons name="stop" size={24} color="#fff" />
                            <Text style={styles.testStopButtonText}>Testi Sonlandır / Sesi Kapat</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Toast Bildirimi */}
            {toast && (
                <Animated.View
                    style={[
                        styles.toast,
                        toast.type === "success" ? styles.toastSuccess : styles.toastError,
                        {
                            opacity: toastAnim,
                            transform: [
                                {
                                    translateY: toastAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-20, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <MaterialCommunityIcons
                        name={toast.type === "success" ? "check-circle" : "alert-circle"}
                        size={18}
                        color="#fff"
                    />
                    <Text style={styles.toastText}>{toast.message}</Text>
                </Animated.View>
            )}

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Başlık ── */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <MaterialCommunityIcons name="waveform" size={24} color={Colors.primary} />
                        <Text style={styles.headerTitle}>Erken Uyarı</Text>
                    </View>
                    <View
                        style={[
                            styles.statusPill,
                            {
                                backgroundColor: simulating
                                    ? Colors.danger + "20"
                                    : isMonitoring
                                    ? Colors.primary + "20"
                                    : Colors.text.muted + "20",
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                {
                                    backgroundColor: simulating
                                        ? Colors.danger
                                        : isMonitoring
                                        ? Colors.primary
                                        : Colors.text.muted,
                                },
                            ]}
                        />
                        <Text
                            style={[
                                styles.statusText,
                                {
                                    color: simulating
                                        ? Colors.danger
                                        : sensorActive && isMonitoring
                                        ? Colors.primary
                                        : Colors.text.muted,
                                },
                            ]}
                        >
                            {simulating
                                ? "Simülasyon"
                                : sensorActive && isMonitoring
                                ? "QuakeSense Sizi Koruyor"
                                : sensorActive
                                ? "Aktif"
                                : "Pasif (Gece dışı)"}
                        </Text>
                    </View>
                </View>

                {/* ── Canlı STA/LTA Gauge Kartı ── */}
                <Animated.View
                    style={[
                        styles.gaugeCard,
                        displayTriggered && styles.gaugeCardAlert,
                        { transform: [{ scale: pulseAnim }] },
                    ]}
                >
                    <View style={[styles.gaugeIcon, { backgroundColor: color + "15" }]}>
                        <MaterialCommunityIcons
                            name={displayTriggered ? "alert-octagon" : "radar"}
                            size={48}
                            color={color}
                        />
                    </View>

                    <Text style={[styles.gaugeStatus, { color }]}>
                        {simulating
                            ? "⚠ SİMÜLASYON — M6.0 Deprem Sinyali!"
                            : displayTriggered
                            ? "⚠ Sismik Sinyal Algılandı"
                            : displayRatio >= TRIGGER_RATIO * 0.7
                            ? "Anormal Titreşim"
                            : "Normal — İzleniyor"}
                    </Text>

                    <Text style={styles.ratioValue}>{displayRatio.toFixed(2)}</Text>
                    <Text style={styles.ratioLabel}>STA / LTA Oranı{simulatedRatio ? " (simüle)" : ""}</Text>

                    <View style={styles.gaugeBarBg}>
                        <Animated.View
                            style={[styles.gaugeBarFill, { width: gaugeWidth, backgroundColor: color }]}
                        />
                        <View style={[styles.gaugeThreshold, { left: `${(1 / 1.5) * 100}%` as any }]} />
                    </View>
                    <View style={styles.gaugeLabels}>
                        <Text style={styles.gaugeLabelText}>0</Text>
                        <Text style={[styles.gaugeLabelText, { color: Colors.danger }]}>
                            Eşik: {TRIGGER_RATIO}
                        </Text>
                        <Text style={styles.gaugeLabelText}>{(TRIGGER_RATIO * 1.5).toFixed(1)}+</Text>
                    </View>

                    {displayTriggered && (
                        <View style={styles.peakRow}>
                            <MaterialCommunityIcons name="speedometer" size={16} color={Colors.danger} />
                            <Text style={styles.peakText}>
                                Tepe İvme:{" "}
                                {simulating
                                    ? "4.200 m/s² (simüle)"
                                    : peakAcceleration > 0
                                    ? `${peakAcceleration.toFixed(3)} m/s²`
                                    : "—"}
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* ── İvmeölçer Alarm Ayarları ── */}
                <View style={styles.settingsCard}>
                    <View style={styles.settingsHeader}>
                        <MaterialCommunityIcons name="tune" size={20} color={Colors.primary} />
                        <Text style={styles.settingsTitle}>İvmeölçer Ayarları</Text>
                        {!settingsLoaded && (
                            <ActivityIndicator size="small" color={Colors.text.muted} />
                        )}
                    </View>

                    {/* 7/24 vs Gece Modu */}
                    <View style={styles.settingBlock}>
                        <View style={styles.settingLabelRow}>
                            <MaterialCommunityIcons name="shield-clock" size={20} color={Colors.text.muted} />
                            <View style={styles.settingInfo}>
                                <Text style={styles.settingLabel}>Çalışma Modu</Text>
                                <Text style={styles.settingDesc}>
                                    7/24: Her zaman aktif. Gece: Sadece 23:00-07:00 (pil tasarrufu)
                                </Text>
                            </View>
                        </View>
                        <View style={styles.modeRow}>
                            <TouchableOpacity
                                style={[
                                    styles.modeChip,
                                    settings.mode === "24_7" && styles.modeChipActive,
                                ]}
                                onPress={() =>
                                    setSettings((s) => ({ ...s, mode: "24_7" as SensorMode }))
                                }
                            >
                                <Text
                                    style={[
                                        styles.modeChipText,
                                        settings.mode === "24_7" && styles.modeChipTextActive,
                                    ]}
                                >
                                    7/24 Koruma
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modeChip,
                                    settings.mode === "night" && styles.modeChipActive,
                                ]}
                                onPress={() =>
                                    setSettings((s) => ({
                                        ...s,
                                        mode: "night" as SensorMode,
                                        workStart: "23:00",
                                        workEnd: "07:00",
                                    }))
                                }
                            >
                                <Text
                                    style={[
                                        styles.modeChipText,
                                        settings.mode === "night" && styles.modeChipTextActive,
                                    ]}
                                >
                                    Gece Modu (23-07)
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.timeRow}>
                            <TextInput
                                style={[
                                    styles.timeInput,
                                    !isValidTime(settings.workStart) && styles.timeInputError,
                                ]}
                                value={settings.workStart}
                                onChangeText={(v) => setSettings((s) => ({ ...s, workStart: v }))}
                                placeholder="00:00"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                            <Text style={styles.timeSeparator}>—</Text>
                            <TextInput
                                style={[
                                    styles.timeInput,
                                    !isValidTime(settings.workEnd) && styles.timeInputError,
                                ]}
                                value={settings.workEnd}
                                onChangeText={(v) => setSettings((s) => ({ ...s, workEnd: v }))}
                                placeholder="08:00"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="numeric"
                                maxLength={5}
                            />
                        </View>
                    </View>

                    {/* Flaş */}
                    <View style={styles.settingRow}>
                        <MaterialCommunityIcons name="flashlight" size={20} color={Colors.text.muted} />
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Flaş Açılsın</Text>
                            <Text style={styles.settingDesc}>Deprem anında kamera flaşı yanıp söner</Text>
                        </View>
                        <Switch
                            value={settings.flashEnabled}
                            onValueChange={(v) => setSettings((s) => ({ ...s, flashEnabled: v }))}
                            trackColor={{
                                false: Colors.background.elevated,
                                true: Colors.primary + "60",
                            }}
                            thumbColor={settings.flashEnabled ? Colors.primary : Colors.text.muted}
                        />
                    </View>

                    {/* Yüksek Sesli Alarm */}
                    <View style={styles.settingRow}>
                        <MaterialCommunityIcons name="volume-high" size={20} color={Colors.text.muted} />
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Yüksek Sesli Alarm</Text>
                            <Text style={styles.settingDesc}>
                                Telefon sessizde olsa bile alarm çalar (iOS + Android)
                            </Text>
                        </View>
                        <Switch
                            value={settings.loudAlarmEnabled}
                            onValueChange={(v) => setSettings((s) => ({ ...s, loudAlarmEnabled: v }))}
                            trackColor={{
                                false: Colors.background.elevated,
                                true: Colors.primary + "60",
                            }}
                            thumbColor={settings.loudAlarmEnabled ? Colors.primary : Colors.text.muted}
                        />
                    </View>

                    {/* Titreşim */}
                    <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                        <MaterialCommunityIcons name="vibrate" size={20} color={Colors.text.muted} />
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Titreşim</Text>
                            <Text style={styles.settingDesc}>Deprem anında titreşim motoru çalışır</Text>
                        </View>
                        <Switch
                            value={settings.vibrationEnabled}
                            onValueChange={(v) => setSettings((s) => ({ ...s, vibrationEnabled: v }))}
                            trackColor={{
                                false: Colors.background.elevated,
                                true: Colors.primary + "60",
                            }}
                            thumbColor={settings.vibrationEnabled ? Colors.primary : Colors.text.muted}
                        />
                    </View>

                    {/* Kaydet */}
                    <TouchableOpacity
                        style={[styles.saveButton, (saving || !settingsLoaded) && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving || !settingsLoaded}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
                                <Text style={styles.saveButtonText}>Ayarları Kaydet</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Algoritma Parametreleri ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Algoritma Parametreleri</Text>
                    <View style={styles.paramsGrid}>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{SAMPLE_RATE_HZ} Hz</Text>
                            <Text style={styles.paramLabel}>Örnekleme</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{STA_WINDOW / SAMPLE_RATE_HZ}s</Text>
                            <Text style={styles.paramLabel}>STA Penceresi</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{LTA_WINDOW / SAMPLE_RATE_HZ}s</Text>
                            <Text style={styles.paramLabel}>LTA Penceresi</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={[styles.paramValue, { color: Colors.danger }]}>{TRIGGER_RATIO}</Text>
                            <Text style={styles.paramLabel}>Tetik Eşiği</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{DETRIGGER_RATIO}</Text>
                            <Text style={styles.paramLabel}>Detrigger</Text>
                        </View>
                        <View style={styles.paramCard}>
                            <Text style={styles.paramValue}>{COOLDOWN_AFTER_TRIGGER_MS / 1000}s</Text>
                            <Text style={styles.paramLabel}>Bekleme</Text>
                        </View>
                    </View>
                </View>

                {/* ── Tetikleme Tarihçesi ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Son Tetiklemeler</Text>
                    {lastTriggerHistory.length === 0 ? (
                        <View style={styles.emptyHistory}>
                            <MaterialCommunityIcons
                                name="check-circle-outline"
                                size={32}
                                color={Colors.primary}
                            />
                            <Text style={styles.emptyHistoryText}>
                                Henüz tetikleme yok — bu iyi bir işaret!
                            </Text>
                        </View>
                    ) : (
                        lastTriggerHistory.map((item, i) => (
                            <View key={i} style={styles.historyItem}>
                                <View
                                    style={[
                                        styles.historyDot,
                                        { backgroundColor: ratioColor(item.ratio) },
                                    ]}
                                />
                                <View style={styles.historyInfo}>
                                    <Text style={styles.historyTime}>{formatTime(item.time)}</Text>
                                    <Text style={styles.historyDetail}>
                                        Oran: {item.ratio.toFixed(2)} · İvme: {item.peak.toFixed(3)} m/s²
                                    </Text>
                                </View>
                                <MaterialCommunityIcons
                                    name="alert-circle-outline"
                                    size={18}
                                    color={ratioColor(item.ratio)}
                                />
                            </View>
                        ))
                    )}
                </View>

                {/* ── Sistemi Test Et (Simülasyon) ── */}
                <View style={styles.simCard}>
                    <View style={styles.simHeader}>
                        <MaterialCommunityIcons name="lightning-bolt" size={20} color={Colors.danger} />
                        <Text style={styles.simTitle}>Sistemi Test Et</Text>
                        <View style={styles.simBadge}>
                            <Text style={styles.simBadgeText}>TEST</Text>
                        </View>
                    </View>

                    <Text style={styles.simDesc}>
                        Bu buton; yüksek sesli alarmı, kilit ekranı bildirimini ve Acil Kişilerinize giden Twilio (SMS/WP) altyapısını test eder.
                    </Text>

                    <TouchableOpacity
                        style={[styles.simButton, styles.simButtonLarge, simulating && styles.simButtonActive]}
                        onPress={handleTestStart}
                        disabled={simulating}
                        activeOpacity={0.8}
                    >
                        {simulating ? (
                            <>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={styles.simButtonText}>Test Çalışıyor...</Text>
                            </>
                        ) : (
                            <>
                                <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
                                <Text style={styles.simButtonText}>Sistemi Test Et (Simülasyon)</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {/* ── Arka Plan Koruması ── */}
                <View style={styles.infoCard}>
                    <MaterialCommunityIcons name="shield-check" size={20} color={Colors.primary} />
                    <View style={styles.infoText}>
                        <Text style={styles.infoTitle}>Arka Plan Koruması</Text>
                        <Text style={styles.infoBody}>
                            Uygulama kapalıyken sunucu AFAD/Kandilli/USGS verilerini izler ve M4.0+
                            depremde Firebase Cloud Messaging ile anında tam ekran alarm çalar.
                            İnternet bağlantısı gereklidir.
                        </Text>
                    </View>
                </View>

                {/* ── Konum ── */}
                <View style={[styles.infoCard, { marginBottom: Spacing.xxxl }]}>
                    <MaterialCommunityIcons
                        name={location ? "map-marker-check" : "map-marker-off"}
                        size={20}
                        color={location ? Colors.primary : Colors.text.muted}
                    />
                    <View style={styles.infoText}>
                        <Text style={styles.infoTitle}>Konum</Text>
                        <Text style={styles.infoBody}>
                            {location
                                ? `${location.lat.toFixed(4)}°N, ${location.lng.toFixed(4)}°E — Raporlar bu koordinatlarla gönderilir.`
                                : "Konum izni verilmedi. Sismik raporlar gönderilemiyor."}
                        </Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        paddingTop: Platform.OS === "android" ? 30 : 0,
    },
    scroll: { padding: Spacing.lg },

    // ── Toast ──
    toast: {
        position: "absolute",
        top: Platform.OS === "android" ? 50 : 60,
        left: Spacing.lg,
        right: Spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.xl,
        zIndex: 9999,
        ...Shadows.lg,
    },
    toastSuccess: { backgroundColor: Colors.semantic?.toastSuccess ?? Colors.status.success },
    toastError: { backgroundColor: Colors.semantic?.toastError ?? Colors.danger },
    toastText: { color: "#fff", fontSize: Typography.sizes.sm, fontWeight: "700", flex: 1 },

    // ── Header ──
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: Spacing.lg,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerTitle: { fontSize: Typography.sizes.xl, fontWeight: "800", color: Colors.text.dark },
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: BorderRadius.full,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: Typography.sizes.xs, fontWeight: "700" },

    // ── Gauge ──
    gaugeCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.xl,
        alignItems: "center",
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    gaugeCardAlert: {
        borderColor: Colors.danger + "60",
        backgroundColor: Colors.danger + "08",
    },
    gaugeIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: Spacing.md,
    },
    gaugeStatus: { fontSize: Typography.sizes.md, fontWeight: "800", marginBottom: Spacing.sm },
    ratioValue: { fontSize: 56, fontWeight: "900", color: Colors.text.dark, letterSpacing: -2 },
    ratioLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.lg,
    },
    gaugeBarBg: {
        width: "100%",
        height: 8,
        backgroundColor: Colors.background.elevated,
        borderRadius: 4,
        overflow: "hidden",
        position: "relative",
        marginBottom: 6,
    },
    gaugeBarFill: { height: "100%", borderRadius: 4 },
    gaugeThreshold: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: Colors.danger },
    gaugeLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: Spacing.md,
    },
    gaugeLabelText: { fontSize: 10, color: Colors.text.muted, fontWeight: "700" },
    peakRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: Colors.danger + "15",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.sm,
    },
    peakText: { color: Colors.danger, fontSize: Typography.sizes.sm, fontWeight: "700" },

    // ── Settings Card ──
    settingsCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    settingsHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: Spacing.lg,
    },
    settingsTitle: {
        flex: 1,
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    settingBlock: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.dark,
        paddingBottom: Spacing.md,
        marginBottom: Spacing.sm,
    },
    settingLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.dark,
    },
    settingInfo: { flex: 1 },
    settingLabel: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.dark },
    settingDesc: { fontSize: Typography.sizes.xs, color: Colors.text.muted, marginTop: 2 },
    timeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        paddingTop: Spacing.sm,
    },
    timeInput: {
        flex: 1,
        backgroundColor: Colors.background.elevated,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        color: Colors.text.dark,
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        textAlign: "center",
        letterSpacing: 2,
    },
    timeInputError: { borderColor: Colors.danger + "80" },
    timeSeparator: { fontSize: Typography.sizes.lg, color: Colors.text.muted, fontWeight: "700" },
    modeRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
    modeChip: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        backgroundColor: Colors.background.elevated,
        alignItems: "center",
    },
    modeChipActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + "15",
    },
    modeChipText: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.muted },
    modeChipTextActive: { color: Colors.primary },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        marginTop: Spacing.lg,
    },
    saveButtonDisabled: { backgroundColor: Colors.text.muted },
    saveButtonText: { color: "#fff", fontSize: Typography.sizes.sm, fontWeight: "800" },

    // ── Section (Params & History) ──
    section: { marginBottom: Spacing.lg },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },
    paramsGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
    paramCard: {
        flex: 1,
        minWidth: "30%",
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: "center",
    },
    paramValue: { fontSize: Typography.sizes.lg, fontWeight: "900", color: Colors.text.dark },
    paramLabel: {
        fontSize: 9,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginTop: 2,
        textAlign: "center",
    },
    emptyHistory: {
        alignItems: "center",
        gap: Spacing.sm,
        padding: Spacing.xl,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    emptyHistoryText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.sm,
        fontWeight: "600",
        textAlign: "center",
    },
    historyItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    historyDot: { width: 10, height: 10, borderRadius: 5 },
    historyInfo: { flex: 1 },
    historyTime: { fontSize: Typography.sizes.sm, fontWeight: "700", color: Colors.text.dark },
    historyDetail: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "500",
        marginTop: 2,
    },

    // ── Simulation Card ──
    simCard: {
        backgroundColor: Colors.danger + "10",
        borderRadius: BorderRadius.xxl,
        borderWidth: 1,
        borderColor: Colors.danger + "30",
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        ...Shadows.md,
    },
    simHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: Spacing.sm },
    simTitle: { flex: 1, fontSize: Typography.sizes.md, fontWeight: "800", color: Colors.text.dark },
    simBadge: {
        backgroundColor: Colors.danger + "30",
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: BorderRadius.sm,
    },
    simBadgeText: { color: Colors.danger, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
    simDesc: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "500",
        lineHeight: 18,
        marginBottom: Spacing.lg,
    },
    simResultBox: {
        backgroundColor: Colors.background.elevated,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        gap: 2,
    },
    simResultTitle: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
    },
    simError: {
        fontSize: Typography.sizes.xs,
        color: Colors.accent,
        fontWeight: "500",
        marginTop: Spacing.sm,
        fontStyle: "italic",
    },
    simButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: Colors.danger,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md + 4,
        ...Shadows.glow(Colors.danger),
    },
    simButtonLarge: { paddingVertical: Spacing.lg, minHeight: 56 },
    simButtonActive: { opacity: 0.8 },
    simButtonSecondary: { backgroundColor: Colors.accent },
    simButtonText: { color: "#fff", fontSize: Typography.sizes.md, fontWeight: "900", letterSpacing: 0.5 },

    // ── Test overlay (kırmızı tam ekran) ──
    testOverlay: {
        flex: 1,
        backgroundColor: "rgba(220, 38, 38, 0.95)",
        justifyContent: "center",
        alignItems: "center",
        padding: Spacing.xl,
    },
    testOverlayContent: {
        alignItems: "center",
        maxWidth: 320,
    },
    testOverlayTitle: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: "#fff",
        marginTop: Spacing.md,
        letterSpacing: 1,
    },
    testOverlaySubtitle: {
        fontSize: Typography.sizes.sm,
        color: "rgba(255,255,255,0.9)",
        marginTop: Spacing.sm,
        textAlign: "center",
    },
    testOverlayResult: {
        fontSize: Typography.sizes.sm,
        color: "#fff",
        marginTop: Spacing.lg,
        fontWeight: "700",
        textAlign: "center",
    },
    testStopButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        backgroundColor: "rgba(0,0,0,0.4)",
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        borderRadius: BorderRadius.xl,
        marginTop: Spacing.xxl,
        borderWidth: 2,
        borderColor: "#fff",
    },
    testStopButtonText: {
        color: "#fff",
        fontSize: Typography.sizes.md,
        fontWeight: "800",
    },
    simSectionLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "600",
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },

    // ── Info Cards ──
    infoCard: {
        flexDirection: "row",
        gap: Spacing.md,
        backgroundColor: Colors.background.surface,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        alignItems: "flex-start",
    },
    infoText: { flex: 1 },
    infoTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: Colors.text.dark,
        marginBottom: 4,
    },
    infoBody: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "500",
        lineHeight: 18,
    },
});
