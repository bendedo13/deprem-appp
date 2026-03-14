/**
 * Patron Paneli (Native Admin Dashboard)
 * 4 Sekme: Dashboard, Kullanıcılar, Bildirimler, Şablonlar
 * Sadece is_admin=true kullanıcılar erişebilir.
 */

import { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    FlatList,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { getMe } from "../../src/services/authService";
import {
    getAdminStats,
    getUsers,
    toggleUserActive,
    toggleUserSubscription,
    sendBroadcast,
    getSettings,
    updateSetting,
    type AdminStats,
    type AdminUser,
    type AppSetting,
} from "../../src/services/adminService";

// ── Tab Yapısı ──────────────────────────────────────────────────────────────

type TabKey = "dashboard" | "users" | "notifications" | "templates";

const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: "dashboard", label: "Dashboard", icon: "view-dashboard" },
    { key: "users", label: "Kullanıcılar", icon: "account-group" },
    { key: "notifications", label: "Bildirim", icon: "bell-ring" },
    { key: "templates", label: "Şablonlar", icon: "file-document-edit" },
];

// ── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        getMe()
            .then((user) => {
                if (user?.is_admin) {
                    setAuthorized(true);
                } else {
                    Alert.alert("Yetkisiz Erişim", "Bu sayfaya erişim yetkiniz yok.");
                    router.back();
                }
            })
            .catch(() => {
                Alert.alert("Hata", "Yetki kontrolü başarısız.");
                router.back();
            });
    }, []);

    if (!authorized) {
        return (
            <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#FFD700" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Tab Bar */}
            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                        activeOpacity={0.7}
                    >
                        <MaterialCommunityIcons
                            name={tab.icon as any}
                            size={20}
                            color={activeTab === tab.key ? "#FFD700" : Colors.text.muted}
                        />
                        <Text
                            style={[
                                styles.tabLabel,
                                activeTab === tab.key && styles.tabLabelActive,
                            ]}
                            numberOfLines={1}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* İçerik */}
            {activeTab === "dashboard" && <DashboardTab />}
            {activeTab === "users" && <UsersTab />}
            {activeTab === "notifications" && <NotificationsTab />}
            {activeTab === "templates" && <TemplatesTab />}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardTab() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await getAdminStats();
            setStats(data);
        } catch {
            Alert.alert("Hata", "İstatistikler yüklenemedi.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading && !stats) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#FFD700" /></View>;
    }

    const cards: { label: string; value: number; icon: string; color: string }[] = stats
        ? [
            { label: "Toplam Kullanıcı", value: stats.total_users, icon: "account-multiple", color: "#3B82F6" },
            { label: "Aktif Kullanıcı", value: stats.active_users, icon: "account-check", color: "#10B981" },
            { label: "PRO Kullanıcı", value: stats.pro_users, icon: "crown", color: "#F59E0B" },
            { label: "Admin Sayısı", value: stats.admin_users, icon: "shield-crown", color: "#FFD700" },
            { label: "Toplam Deprem", value: stats.total_earthquakes, icon: "pulse", color: "#DC2626" },
            { label: "Son 24 Saat", value: stats.earthquakes_last_24h, icon: "clock-alert", color: "#EF4444" },
            { label: "Son 7 Gün", value: stats.earthquakes_last_7d, icon: "calendar-week", color: "#F97316" },
            { label: "FCM Kayıtlı", value: stats.users_with_fcm, icon: "cellphone-message", color: "#8B5CF6" },
            { label: "Konum Paylaşan", value: stats.users_with_location, icon: "map-marker-account", color: "#06B6D4" },
            { label: "Bildirim Gönderilen", value: stats.total_notifications_sent, icon: "bell-check", color: "#EC4899" },
            { label: "Sismik Rapor", value: stats.seismic_reports_total, icon: "chart-line", color: "#14B8A6" },
            { label: "Deneme Kullanıcı", value: stats.trial_users, icon: "account-clock", color: "#A855F7" },
        ]
        : [];

    return (
        <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.dashboardGrid}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#FFD700" />}
        >
            <Text style={styles.sectionHeader}>Sistem Durumu</Text>
            <View style={styles.cardGrid}>
                {cards.map((c) => (
                    <View key={c.label} style={[styles.statCard, { borderLeftColor: c.color }]}>
                        <View style={[styles.statIconBox, { backgroundColor: c.color + "20" }]}>
                            <MaterialCommunityIcons name={c.icon as any} size={22} color={c.color} />
                        </View>
                        <Text style={styles.statValue}>{c.value.toLocaleString("tr-TR")}</Text>
                        <Text style={styles.statLabel}>{c.label}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 USERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function UsersTab() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await getUsers(0, 200, search || undefined);
            setUsers(data);
        } catch {
            Alert.alert("Hata", "Kullanıcılar yüklenemedi.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [search]);

    useEffect(() => { load(); }, [load]);

    const handleToggleBan = async (user: AdminUser) => {
        const action = user.is_active ? "engellemek" : "aktif etmek";
        Alert.alert(
            "Onay",
            `${user.email} kullanıcısını ${action} istediğinize emin misiniz?`,
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Evet",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const updated = await toggleUserActive(user.id, !user.is_active);
                            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
                            Alert.alert("Başarılı", `${user.email} ${updated.is_active ? "aktif edildi" : "engellendi"}.`);
                        } catch {
                            Alert.alert("Hata", "İşlem başarısız.");
                        }
                    },
                },
            ]
        );
    };

    const handleTogglePro = async (user: AdminUser) => {
        const isPro = user.subscription_plan !== "free";
        const action = isPro ? "FREE'ye düşürmek" : "PRO yapmak";
        Alert.alert(
            "Onay",
            `${user.email} kullanıcısını ${action} istediğinize emin misiniz?`,
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Evet",
                    onPress: async () => {
                        try {
                            const newPlan = isPro ? "free" : "yearly_pro";
                            const updated = await toggleUserSubscription(user.id, newPlan);
                            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
                            Alert.alert("Başarılı", `${user.email} → ${updated.subscription_plan}`);
                        } catch {
                            Alert.alert("Hata", "İşlem başarısız.");
                        }
                    },
                },
            ]
        );
    };

    const renderUser = ({ item }: { item: AdminUser }) => (
        <View style={styles.userCard}>
            <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                    {item.is_admin && (
                        <View style={styles.adminBadge}>
                            <Text style={styles.adminBadgeText}>ADMIN</Text>
                        </View>
                    )}
                </View>
                <View style={styles.userMeta}>
                    <Text style={styles.userMetaText}>
                        {item.subscription_plan.toUpperCase()} · {item.is_active ? "Aktif" : "Engelli"}
                    </Text>
                    <Text style={styles.userDate}>
                        {new Date(item.created_at).toLocaleDateString("tr-TR")}
                    </Text>
                </View>
            </View>
            <View style={styles.userActions}>
                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        { backgroundColor: item.is_active ? "#DC262620" : "#10B98120" },
                    ]}
                    onPress={() => handleToggleBan(item)}
                >
                    <MaterialCommunityIcons
                        name={item.is_active ? "account-cancel" : "account-check"}
                        size={18}
                        color={item.is_active ? "#DC2626" : "#10B981"}
                    />
                    <Text style={[styles.actionText, { color: item.is_active ? "#DC2626" : "#10B981" }]}>
                        {item.is_active ? "Engelle" : "Aç"}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.actionBtn,
                        {
                            backgroundColor:
                                item.subscription_plan !== "free" ? "#6B728020" : "#F59E0B20",
                        },
                    ]}
                    onPress={() => handleTogglePro(item)}
                >
                    <MaterialCommunityIcons
                        name={item.subscription_plan !== "free" ? "crown-circle-outline" : "crown"}
                        size={18}
                        color={item.subscription_plan !== "free" ? "#6B7280" : "#F59E0B"}
                    />
                    <Text
                        style={[
                            styles.actionText,
                            {
                                color:
                                    item.subscription_plan !== "free" ? "#6B7280" : "#F59E0B",
                            },
                        ]}
                    >
                        {item.subscription_plan !== "free" ? "İptal" : "PRO"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.tabContent}>
            {/* Arama */}
            <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={20} color={Colors.text.muted} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="E-posta ile ara..."
                    placeholderTextColor={Colors.text.muted}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => load()}
                    returnKeyType="search"
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(""); }}>
                        <MaterialCommunityIcons name="close-circle" size={18} color={Colors.text.muted} />
                    </TouchableOpacity>
                )}
            </View>

            <Text style={styles.countText}>{users.length} kullanıcı</Text>

            {loading && !refreshing ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#FFD700" /></View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderUser}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#FFD700" />
                    }
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📢 NOTIFICATIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function NotificationsTab() {
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [targetId, setTargetId] = useState("");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            Alert.alert("Uyarı", "Başlık ve içerik boş olamaz.");
            return;
        }

        const target = targetId.trim() ? parseInt(targetId, 10) : null;
        const targetLabel = target ? `ID: ${target}` : "Tüm kullanıcılar";

        Alert.alert(
            "Bildirim Gönder",
            `Hedef: ${targetLabel}\nBaşlık: ${title}\n\nGöndermek istediğinize emin misiniz?`,
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Gönder",
                    onPress: async () => {
                        setSending(true);
                        try {
                            const result = await sendBroadcast({
                                title: title.trim(),
                                body: body.trim(),
                                target_user_id: target,
                            });
                            Alert.alert(
                                "Başarılı!",
                                `${result.sent}/${result.total_targets} kişiye gönderildi. (${result.type})`
                            );
                            setTitle("");
                            setBody("");
                            setTargetId("");
                        } catch {
                            Alert.alert("Hata", "Bildirim gönderilemedi.");
                        } finally {
                            setSending(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: Spacing.md }}>
            <Text style={styles.sectionHeader}>Push Bildirim Gönder</Text>

            <Text style={styles.inputLabel}>Hedef Kullanıcı ID (boş = herkese)</Text>
            <TextInput
                style={styles.input}
                placeholder="Opsiyonel: kullanıcı ID"
                placeholderTextColor={Colors.text.muted}
                value={targetId}
                onChangeText={setTargetId}
                keyboardType="number-pad"
            />

            <Text style={styles.inputLabel}>Başlık</Text>
            <TextInput
                style={styles.input}
                placeholder="Bildirim başlığı..."
                placeholderTextColor={Colors.text.muted}
                value={title}
                onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>İçerik</Text>
            <TextInput
                style={[styles.input, styles.inputMulti]}
                placeholder="Bildirim mesajı..."
                placeholderTextColor={Colors.text.muted}
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
            />

            <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={sending}
                activeOpacity={0.7}
            >
                {sending ? (
                    <ActivityIndicator color="#000" />
                ) : (
                    <>
                        <MaterialCommunityIcons name="send" size={20} color="#000" />
                        <Text style={styles.sendBtnText}>Gönder</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ⚙️ TEMPLATES TAB (S.O.S Şablonları)
// ═══════════════════════════════════════════════════════════════════════════════

function TemplatesTab() {
    const [settings, setSettings] = useState<AppSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getSettings();
            setSettings(data);
            const vals: Record<string, string> = {};
            data.forEach((s) => { vals[s.key] = s.value; });
            setEditValues(vals);
        } catch {
            Alert.alert("Hata", "Ayarlar yüklenemedi.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (key: string) => {
        const value = editValues[key];
        if (value === undefined) return;
        setSaving(key);
        try {
            const updated = await updateSetting(key, value);
            setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
            Alert.alert("Başarılı", `"${key}" güncellendi.`);
        } catch {
            Alert.alert("Hata", "Kaydetme başarısız.");
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#FFD700" /></View>;
    }

    return (
        <ScrollView style={styles.tabContent} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>
            <Text style={styles.sectionHeader}>Uygulama Ayarları & S.O.S Şablonları</Text>
            <Text style={styles.helperText}>
                SMS/WhatsApp mesaj şablonlarında {"{user}"} değişkenini kullanabilirsiniz.
            </Text>

            {settings.map((s) => (
                <View key={s.key} style={styles.templateCard}>
                    <Text style={styles.templateKey}>{s.key}</Text>
                    {s.description && (
                        <Text style={styles.templateDesc}>{s.description}</Text>
                    )}
                    <TextInput
                        style={[styles.input, styles.inputMulti]}
                        value={editValues[s.key] ?? ""}
                        onChangeText={(val) =>
                            setEditValues((prev) => ({ ...prev, [s.key]: val }))
                        }
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                    <TouchableOpacity
                        style={[styles.saveBtn, saving === s.key && { opacity: 0.5 }]}
                        onPress={() => handleSave(s.key)}
                        disabled={saving === s.key}
                        activeOpacity={0.7}
                    >
                        {saving === s.key ? (
                            <ActivityIndicator color="#000" size="small" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="content-save" size={16} color="#000" />
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 STİLLER
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },

    // ── Tab Bar ─────────────────────────────────────────────────────────────
    tabBar: {
        flexDirection: "row",
        backgroundColor: Colors.background.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border.glass,
        paddingTop: Spacing.xs,
    },
    tab: {
        flex: 1,
        alignItems: "center",
        paddingVertical: Spacing.sm + 2,
        gap: 2,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: "#FFD700",
    },
    tabLabel: {
        fontSize: Typography.sizes.xs,
        fontWeight: "600",
        color: Colors.text.muted,
    },
    tabLabelActive: {
        color: "#FFD700",
        fontWeight: "800",
    },

    // ── Ortak ───────────────────────────────────────────────────────────────
    tabContent: { flex: 1 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: Spacing.xl },
    sectionHeader: {
        fontSize: Typography.sizes.lg,
        fontWeight: "900",
        color: "#FFD700",
        marginBottom: Spacing.md,
        letterSpacing: -0.3,
    },

    // ── Dashboard ───────────────────────────────────────────────────────────
    dashboardGrid: { padding: Spacing.md, paddingBottom: 100 },
    cardGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: Spacing.sm,
    },
    statCard: {
        width: "47.5%" as any,
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        borderLeftWidth: 3,
        gap: Spacing.xs,
    },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    statValue: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.text.dark,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: Typography.sizes.xs,
        fontWeight: "600",
        color: Colors.text.muted,
    },

    // ── Users ───────────────────────────────────────────────────────────────
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        margin: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        gap: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        color: Colors.text.dark,
        fontSize: Typography.sizes.md,
        paddingVertical: Spacing.sm + 4,
    },
    countText: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "700",
        paddingHorizontal: Spacing.md + 4,
        marginBottom: Spacing.xs,
    },
    userCard: {
        backgroundColor: Colors.background.surface,
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.sm,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    userInfo: { marginBottom: Spacing.sm },
    userHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.sm,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: Typography.sizes.md,
        fontWeight: "700",
        color: Colors.text.dark,
        flex: 1,
    },
    adminBadge: {
        backgroundColor: "#FFD70030",
        borderRadius: BorderRadius.full,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    adminBadgeText: {
        fontSize: 9,
        fontWeight: "900",
        color: "#FFD700",
    },
    userMeta: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    userMetaText: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    userDate: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
    },
    userActions: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    actionBtn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
    },
    actionText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
    },

    // ── Notifications ───────────────────────────────────────────────────────
    inputLabel: {
        fontSize: Typography.sizes.sm,
        fontWeight: "700",
        color: Colors.text.muted,
        marginBottom: Spacing.xs,
        marginTop: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        fontSize: Typography.sizes.md,
        color: Colors.text.dark,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    inputMulti: {
        minHeight: 90,
        textAlignVertical: "top",
    },
    sendBtn: {
        backgroundColor: "#FFD700",
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: Spacing.sm,
        marginTop: Spacing.lg,
        ...Shadows.md,
    },
    sendBtnText: {
        fontSize: Typography.sizes.md,
        fontWeight: "900",
        color: "#000",
    },

    // ── Templates ───────────────────────────────────────────────────────────
    helperText: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        marginBottom: Spacing.md,
        fontStyle: "italic",
    },
    templateCard: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
    templateKey: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: "#FFD700",
        marginBottom: 4,
    },
    templateDesc: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        marginBottom: Spacing.sm,
    },
    saveBtn: {
        backgroundColor: "#FFD700",
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        marginTop: Spacing.sm,
        alignSelf: "flex-end",
    },
    saveBtnText: {
        fontSize: Typography.sizes.sm,
        fontWeight: "800",
        color: "#000",
    },
    emptyText: {
        color: Colors.text.muted,
        fontSize: Typography.sizes.md,
    },
});
