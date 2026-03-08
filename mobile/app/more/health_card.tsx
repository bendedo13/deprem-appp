import { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Vibration,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import QRCode from "react-native-qrcode-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { getMe, type UserOut } from "../../src/services/authService";

const STORAGE_KEY = "quakesense_health_card_v1";

type HealthData = {
    bloodType: string;
    chronic: string;
    allergies: string;
};

export default function HealthCardScreen() {
    const [user, setUser] = useState<UserOut | null>(null);
    const [health, setHealth] = useState<HealthData>({
        bloodType: "",
        chronic: "",
        allergies: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [u, raw] = await Promise.all([
                    getMe().catch(() => null),
                    AsyncStorage.getItem(STORAGE_KEY),
                ]);
                if (u) setUser(u);
                if (raw) {
                    const stored = JSON.parse(raw) as HealthData;
                    setHealth((prev) => ({ ...prev, ...stored }));
                }
            } catch {
                // ignore
            }
        })();
    }, []);

    const handleChange = (field: keyof HealthData, value: string) => {
        setHealth((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        Vibration.vibrate(20);
        setSaving(true);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(health));
        } finally {
            setSaving(false);
        }
    };

    const qrPayload = JSON.stringify({
        name: user?.name ?? user?.email ?? "",
        email: user?.email ?? "",
        bloodType: health.bloodType,
        chronic: health.chronic,
        allergies: health.allergies,
        emergencyContacts: undefined,
    });

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <MaterialCommunityIcons name="medical-bag" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Kurtarma QR & Sağlık Kartı</Text>
                    <Text style={styles.headerSubtitle}>
                        Enkaz altında size ulaşan ekipler için hayati sağlık bilgilerinizin yer aldığı dijital kart.
                    </Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
                <View style={styles.profileRow}>
                    <View style={styles.avatar}>
                        <MaterialCommunityIcons name="account-heart" size={26} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.nameText}>
                            {user?.name ?? user?.email ?? "Misafir Kullanıcı"}
                        </Text>
                        <Text style={styles.emailText}>{user?.email}</Text>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kan Grubu</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Örn: 0 Rh(+)"
                        placeholderTextColor={Colors.text.muted + "80"}
                        value={health.bloodType}
                        onChangeText={(v) => handleChange("bloodType", v)}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kronik Hastalıklar</Text>
                    <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Örn: Diyabet, hipertansiyon..."
                        placeholderTextColor={Colors.text.muted + "80"}
                        value={health.chronic}
                        onChangeText={(v) => handleChange("chronic", v)}
                        multiline
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Alerjiler</Text>
                    <TextInput
                        style={[styles.input, styles.multilineInput]}
                        placeholder="Örn: Penisilin, yer fıstığı..."
                        placeholderTextColor={Colors.text.muted + "80"}
                        value={health.allergies}
                        onChangeText={(v) => handleChange("allergies", v)}
                        multiline
                    />
                </View>

                <TouchableOpacity
                    style={styles.saveBtn}
                    activeOpacity={0.9}
                    onPress={handleSave}
                    disabled={saving}
                >
                    <Text style={styles.saveText}>
                        {saving ? "Kaydediliyor..." : "Sağlık Kartını Güncelle"}
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Kurtarma QR Kodu</Text>
                <Text style={styles.helperText}>
                    Bu kod, sağlık bilgilerinizin hızlıca okunabilmesi için kullanılır. Ekran görüntüsünü alıp
                    cüzdanınıza veya acil durum kartınıza ekleyebilirsiniz.
                </Text>
                <View style={styles.qrBox}>
                    <View style={styles.qrInner}>
                        <QRCode value={qrPayload} size={180} backgroundColor="transparent" color="#f97316" />
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginTop: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    headerIcon: {
        width: 44,
        height: 44,
        borderRadius: 18,
        backgroundColor: Colors.danger,
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.md,
    },
    headerTitle: {
        fontSize: Typography.sizes.xxl,
        fontWeight: "900",
        color: Colors.text.dark,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        fontWeight: "500",
        marginTop: 2,
    },
    card: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border.glass,
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        color: Colors.text.muted,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },
    profileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    nameText: {
        fontSize: Typography.sizes.md,
        fontWeight: "800",
        color: Colors.text.dark,
    },
    emailText: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        marginTop: 2,
    },
    inputGroup: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.text.muted,
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.6,
    },
    input: {
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        color: Colors.text.dark,
        fontSize: Typography.sizes.sm,
        fontWeight: "600",
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    multilineInput: {
        minHeight: 60,
        textAlignVertical: "top",
    },
    saveBtn: {
        marginTop: Spacing.sm,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.md,
        alignItems: "center",
        ...Shadows.lg,
    },
    saveText: {
        color: "#fff",
        fontSize: Typography.sizes.sm,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
    helperText: {
        fontSize: Typography.sizes.xs,
        color: Colors.text.muted,
        marginBottom: Spacing.md,
    },
    qrBox: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.lg,
    },
    qrInner: {
        padding: Spacing.lg,
        borderRadius: BorderRadius.xl,
        backgroundColor: Colors.background.dark,
        borderWidth: 1,
        borderColor: Colors.border.glass,
    },
});

