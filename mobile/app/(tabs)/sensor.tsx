/**
 * İvmeölçer / Erken Uyarı Ayarları — P/S dalgası bilgi kartı,
 * zamanlama ayarı, aksiyon toggle'ları (flaş, titreşim, alarm).
 */

import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    Animated,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as SecureStore from "expo-secure-store";
import { useShakeDetector } from "../../src/hooks/useShakeDetector";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";

const STORAGE_KEY = "sensor_settings";

interface SensorSettings {
    enabled: boolean;
    startHour: number;
    endHour: number;
    flashEnabled: boolean;
    vibrationEnabled: boolean;
    alarmEnabled: boolean;
}

const DEFAULT_SETTINGS: SensorSettings = {
    enabled: true,
    startHour: 0,
    endHour: 8,
    flashEnabled: true,
    vibrationEnabled: true,
    alarmEnabled: true,
};

export default function SensorScreen() {
    const { t } = useTranslation();
    const [settings, setSettings] = useState<SensorSettings>(DEFAULT_SETTINGS);
    const { isMonitoring, isTriggered, peakAcceleration, staLtaRatio } = useShakeDetector(null, null);

    useEffect(() => {
        SecureStore.getItemAsync(STORAGE_KEY).then((val) => {
            if (val) setSettings(JSON.parse(val));
        });
    }, []);

    function updateSetting<K extends keyof SensorSettings>(key: K, value: SensorSettings[K]) {
        setSettings((prev) => {
            const next = { ...prev, [key]: value };
            SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }

    function cycleHour(key: "startHour" | "endHour", direction: 1 | -1) {
        const current = settings[key];
        const next = (current + direction + 24) % 24;
        updateSetting(key, next);
    }

    const formatHour = (h: number) => `${h.toString().padStart(2, "0")}:00`;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconBox, isMonitoring && styles.iconBoxActive]}>
                            <MaterialCommunityIcons
                                name="vibrate"
                                size={20}
                                color={isMonitoring ? "#fff" : Colors.text.muted}
                            />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>{t("sensor.title")}</Text>
                            <Text style={styles.headerSub}>{t("sensor.subtitle")}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, isMonitoring && styles.statusBadgeActive]}>
                        <View style={[styles.statusDot, { backgroundColor: isMonitoring ? Colors.primary : Colors.text.muted }]} />
                        <Text style={[styles.statusText, isMonitoring && { color: Colors.primary }]}>
                            {isMonitoring ? t("sensor.active") : t("sensor.inactive")}
                        </Text>
                    </View>
                </View>

                {/* Real-time Status Card */}
                {isMonitoring && (
                    <View style={[styles.liveCard, isTriggered && styles.liveCardTriggered]}>
                        <View style={styles.liveRow}>
                            <View style={styles.liveItem}>
                                <Text style={styles.liveLabel}>STA/LTA</Text>
                                <Text style={[styles.liveValue, isTriggered && { color: Colors.danger }]}>
                                    {staLtaRatio.toFixed(2)}
                                </Text>
                            </View>
                            <View style={styles.liveDivider} />
                            <View style={styles.liveItem}>
                                <Text style={styles.liveLabel}>{t("sensor.peak_accel")}</Text>
                                <Text style={[styles.liveValue, isTriggered && { color: Colors.danger }]}>
                                    {peakAcceleration.toFixed(3)} m/s²
                                </Text>
                            </View>
                        </View>
                        {isTriggered && (
                            <View style={styles.triggerBanner}>
                                <MaterialCommunityIcons name="alert-circle" size={16} color="#fff" />
                                <Text style={styles.triggerText}>{t("sensor.triggered_alert")}</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* P/S Wave Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoHeader}>
                        <MaterialCommunityIcons name="information-outline" size={20} color={Colors.primary} />
                        <Text style={styles.infoTitle}>{t("sensor.how_it_works")}</Text>
                    </View>
                    <Text style={styles.infoText}>{t("sensor.info_description")}</Text>

                    <View style={styles.waveRow}>
                        <View style={styles.waveCard}>
                            <View style={[styles.waveBadge, { backgroundColor: Colors.accent + "20" }]}>
                                <Text style={[styles.waveLabel, { color: Colors.accent }]}>P</Text>
                            </View>
                            <Text style={styles.waveName}>{t("sensor.p_wave")}</Text>
                            <Text style={styles.waveDesc}>{t("sensor.p_wave_desc")}</Text>
                        </View>
                        <View style={styles.waveArrow}>
                            <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.text.muted} />
                        </View>
                        <View style={styles.waveCard}>
                            <View style={[styles.waveBadge, { backgroundColor: Colors.danger + "20" }]}>
                                <Text style={[styles.waveLabel, { color: Colors.danger }]}>S</Text>
                            </View>
                            <Text style={styles.waveName}>{t("sensor.s_wave")}</Text>
                            <Text style={styles.waveDesc}>{t("sensor.s_wave_desc")}</Text>
                        </View>
                    </View>

                    <View style={styles.tipBox}>
                        <MaterialCommunityIcons name="lightbulb-outline" size={16} color={Colors.accent} />
                        <Text style={styles.tipText}>{t("sensor.tip_flat_surface")}</Text>
                    </View>
                </View>

                {/* Master Toggle */}
                <View style={styles.section}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <MaterialCommunityIcons name="shield-check" size={22} color={Colors.primary} />
                            <View style={styles.settingTexts}>
                                <Text style={styles.settingTitle}>{t("sensor.enable_detection")}</Text>
                                <Text style={styles.settingDesc}>{t("sensor.enable_desc")}</Text>
                            </View>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={(v) => updateSetting("enabled", v)}
                            trackColor={{ false: Colors.border.dark, true: Colors.primary + "50" }}
                            thumbColor={settings.enabled ? Colors.primary : Colors.text.muted}
                        />
                    </View>
                </View>

                {/* Time Schedule */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t("sensor.schedule")}</Text>
                    <Text style={styles.sectionDesc}>{t("sensor.schedule_desc")}</Text>

                    <View style={styles.timeRow}>
                        <View style={styles.timeBlock}>
                            <Text style={styles.timeLabel}>{t("sensor.start_time")}</Text>
                            <View style={styles.timePicker}>
                                <TouchableOpacity onPress={() => cycleHour("startHour", -1)} style={styles.timeBtn}>
                                    <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.text.dark} />
                                </TouchableOpacity>
                                <Text style={styles.timeValue}>{formatHour(settings.startHour)}</Text>
                                <TouchableOpacity onPress={() => cycleHour("startHour", 1)} style={styles.timeBtn}>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.text.dark} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.timeArrow}>
                            <MaterialCommunityIcons name="arrow-right" size={20} color={Colors.text.muted} />
                        </View>

                        <View style={styles.timeBlock}>
                            <Text style={styles.timeLabel}>{t("sensor.end_time")}</Text>
                            <View style={styles.timePicker}>
                                <TouchableOpacity onPress={() => cycleHour("endHour", -1)} style={styles.timeBtn}>
                                    <MaterialCommunityIcons name="chevron-left" size={24} color={Colors.text.dark} />
                                </TouchableOpacity>
                                <Text style={styles.timeValue}>{formatHour(settings.endHour)}</Text>
                                <TouchableOpacity onPress={() => cycleHour("endHour", 1)} style={styles.timeBtn}>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color={Colors.text.dark} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Toggles */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t("sensor.actions")}</Text>
                    <Text style={styles.sectionDesc}>{t("sensor.actions_desc")}</Text>

                    <View style={styles.toggleCard}>
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.toggleIcon, { backgroundColor: Colors.accent + "15" }]}>
                                    <MaterialCommunityIcons name="flashlight" size={18} color={Colors.accent} />
                                </View>
                                <View style={styles.settingTexts}>
                                    <Text style={styles.settingTitle}>{t("sensor.flash")}</Text>
                                    <Text style={styles.settingDesc}>{t("sensor.flash_desc")}</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.flashEnabled}
                                onValueChange={(v) => updateSetting("flashEnabled", v)}
                                trackColor={{ false: Colors.border.dark, true: Colors.accent + "50" }}
                                thumbColor={settings.flashEnabled ? Colors.accent : Colors.text.muted}
                            />
                        </View>

                        <View style={styles.toggleDivider} />

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.toggleIcon, { backgroundColor: Colors.status.info + "15" }]}>
                                    <MaterialCommunityIcons name="vibrate" size={18} color={Colors.status.info} />
                                </View>
                                <View style={styles.settingTexts}>
                                    <Text style={styles.settingTitle}>{t("sensor.vibration")}</Text>
                                    <Text style={styles.settingDesc}>{t("sensor.vibration_desc")}</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.vibrationEnabled}
                                onValueChange={(v) => updateSetting("vibrationEnabled", v)}
                                trackColor={{ false: Colors.border.dark, true: Colors.status.info + "50" }}
                                thumbColor={settings.vibrationEnabled ? Colors.status.info : Colors.text.muted}
                            />
                        </View>

                        <View style={styles.toggleDivider} />

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={[styles.toggleIcon, { backgroundColor: Colors.danger + "15" }]}>
                                    <MaterialCommunityIcons name="volume-high" size={18} color={Colors.danger} />
                                </View>
                                <View style={styles.settingTexts}>
                                    <Text style={styles.settingTitle}>{t("sensor.alarm")}</Text>
                                    <Text style={styles.settingDesc}>{t("sensor.alarm_desc")}</Text>
                                </View>
                            </View>
                            <Switch
                                value={settings.alarmEnabled}
                                onValueChange={(v) => updateSetting("alarmEnabled", v)}
                                trackColor={{ false: Colors.border.dark, true: Colors.danger + "50" }}
                                thumbColor={settings.alarmEnabled ? Colors.danger : Colors.text.muted}
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark, paddingTop: Platform.OS === "android" ? 30 : 0 },
    scroll: { padding: Spacing.md, paddingBottom: 40 },

    // Header
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: Spacing.lg,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    iconBox: {
        width: 40, height: 40, borderRadius: BorderRadius.lg,
        backgroundColor: Colors.background.surface,
        justifyContent: "center", alignItems: "center",
        borderWidth: 1, borderColor: Colors.border.glass,
    },
    iconBoxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    headerTitle: { color: Colors.text.dark, fontSize: Typography.sizes.lg, fontWeight: "800" },
    headerSub: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: "500", marginTop: 1 },
    statusBadge: {
        flexDirection: "row", alignItems: "center", gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.background.surface,
        borderWidth: 1, borderColor: Colors.border.glass,
    },
    statusBadgeActive: { borderColor: Colors.primary + "40", backgroundColor: Colors.primary + "10" },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: "800", color: Colors.text.muted, letterSpacing: 0.5 },

    // Live Status
    liveCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1, borderColor: Colors.border.glass,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    liveCardTriggered: { borderColor: Colors.danger + "60", backgroundColor: Colors.danger + "08" },
    liveRow: { flexDirection: "row", alignItems: "center" },
    liveItem: { flex: 1, alignItems: "center" },
    liveLabel: { fontSize: 10, fontWeight: "700", color: Colors.text.muted, textTransform: "uppercase", letterSpacing: 0.5 },
    liveValue: { fontSize: Typography.sizes.xl, fontWeight: "900", color: Colors.primary, marginTop: 4 },
    liveDivider: { width: 1, height: 40, backgroundColor: Colors.border.glass },
    triggerBanner: {
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        marginTop: Spacing.sm,
        paddingVertical: 8,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.danger,
    },
    triggerText: { color: "#fff", fontSize: Typography.sizes.sm, fontWeight: "800" },

    // Info Card
    infoCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1, borderColor: Colors.primary + "20",
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    infoHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.sm },
    infoTitle: { color: Colors.text.dark, fontSize: Typography.sizes.md, fontWeight: "700" },
    infoText: { color: Colors.text.muted, fontSize: Typography.sizes.sm, lineHeight: 20, marginBottom: Spacing.md },
    waveRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md },
    waveCard: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: "center",
        gap: 6,
    },
    waveBadge: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: "center", alignItems: "center",
    },
    waveLabel: { fontSize: 16, fontWeight: "900" },
    waveName: { color: Colors.text.dark, fontSize: Typography.sizes.sm, fontWeight: "700" },
    waveDesc: { color: Colors.text.muted, fontSize: 10, fontWeight: "500", textAlign: "center" },
    waveArrow: { marginTop: 10 },
    tipBox: {
        flexDirection: "row", alignItems: "center", gap: 8,
        backgroundColor: Colors.accent + "10",
        borderRadius: BorderRadius.lg,
        padding: Spacing.sm + 2,
    },
    tipText: { flex: 1, color: Colors.accent, fontSize: Typography.sizes.xs, fontWeight: "600" },

    // Sections
    section: { marginBottom: Spacing.lg },
    sectionTitle: { color: Colors.text.dark, fontSize: Typography.sizes.md, fontWeight: "700", marginBottom: 4 },
    sectionDesc: { color: Colors.text.muted, fontSize: Typography.sizes.xs, fontWeight: "500", marginBottom: Spacing.md },

    // Setting Row
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: Spacing.sm,
    },
    settingInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    settingTexts: { flex: 1 },
    settingTitle: { color: Colors.text.dark, fontSize: Typography.sizes.sm, fontWeight: "700" },
    settingDesc: { color: Colors.text.muted, fontSize: 11, fontWeight: "500", marginTop: 2 },

    // Time Schedule
    timeRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
    timeBlock: { flex: 1, alignItems: "center" },
    timeLabel: { color: Colors.text.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
    timePicker: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 1, borderColor: Colors.border.glass,
        overflow: "hidden",
    },
    timeBtn: { padding: 10 },
    timeValue: { color: Colors.text.dark, fontSize: Typography.sizes.xl, fontWeight: "900", paddingHorizontal: 8 },
    timeArrow: { marginTop: 20 },

    // Toggle Card
    toggleCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        borderWidth: 1, borderColor: Colors.border.glass,
        paddingHorizontal: Spacing.md,
    },
    toggleIcon: {
        width: 36, height: 36, borderRadius: BorderRadius.lg,
        justifyContent: "center", alignItems: "center",
    },
    toggleDivider: { height: 1, backgroundColor: Colors.border.glass },
});
