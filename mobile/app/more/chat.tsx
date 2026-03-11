/**
 * Sohbet Odası — WhatsApp/Telegram kalitesinde mesajlaşma.
 *
 * Özellikler:
 *  - Kendi mesajları → sağda, yeşil baloncuk
 *  - Diğerleri → solda, gri baloncuk
 *  - Avatar: İsmin ilk harfi (renkli daire)
 *  - Zaman damgası: 14:05 formatı
 *  - undefined/null mesaj metni güvenli ayrıştırma
 *  - Kullanıcı adı: email prefix veya name (asla "Kullanıcı" anonim değil)
 *  - Impact report mesajları → turuncu sol şerit ile işaretlenir
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { getChatMessages, addChatMessage, type ChatMessage } from "../../src/services/chatService";
import { getMe } from "../../src/services/authService";

// ── Avatar renk paleti ────────────────────────────────────────────────────────

const AVATAR_COLORS = [
    "#10B981", "#3B82F6", "#F97316", "#8B5CF6",
    "#EC4899", "#06B6D4", "#EAB308", "#EF4444",
];

function avatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return "";
    }
}

// ── Kullanıcı adı çözümleyici ─────────────────────────────────────────────────

function resolveDisplayName(user: Awaited<ReturnType<typeof getMe>> | null): string {
    if (!user) return "Sen";
    const name = user.name?.trim();
    if (name) return name;
    const email = user.email?.trim();
    if (email) return email.split("@")[0];
    return "Sen";
}

// ── Baloncuk Bileşeni ─────────────────────────────────────────────────────────

interface BubbleProps {
    item: ChatMessage;
    isOwn: boolean;
}

function Bubble({ item, isOwn }: BubbleProps) {
    const color = avatarColor(item.userName || "?");
    const isReport = item.type === "impact_report";

    return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
            {/* Avatar — sadece karşı taraf için */}
            {!isOwn && (
                <View style={[styles.avatar, { backgroundColor: color }]}>
                    <Text style={styles.avatarText}>{initials(item.userName || "?")}</Text>
                </View>
            )}

            <View style={[
                styles.bubble,
                isOwn ? styles.bubbleOwn : styles.bubbleOther,
                isReport && styles.bubbleReport,
            ]}>
                {/* Gönderici adı (kendi mesajlarında gösterilmez) */}
                {!isOwn && (
                    <Text style={[styles.senderName, { color }]}>{item.userName}</Text>
                )}

                {/* İmpact report etiketi */}
                {isReport && (
                    <View style={styles.reportTag}>
                        <MaterialCommunityIcons name="map-marker-alert" size={11} color={Colors.accent} />
                        <Text style={styles.reportTagText}>Konum Bildirimi</Text>
                    </View>
                )}

                {/* Mesaj metni — boş veya undefined durumu güvenli */}
                <Text style={[styles.msgText, isOwn && styles.msgTextOwn]}>
                    {item.text?.trim() || ""}
                </Text>

                {/* Saat + Tik */}
                <View style={[styles.metaRow, isOwn && styles.metaRowOwn]}>
                    <Text style={[styles.timeText, isOwn && styles.timeTextOwn]}>
                        {formatTime(item.createdAt)}
                    </Text>
                    {isOwn && (
                        <MaterialCommunityIcons name="check-all" size={12} color="rgba(255,255,255,0.6)" />
                    )}
                </View>
            </View>

            {/* Kendi mesajımız için sağda mini avatar */}
            {isOwn && (
                <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
                    <MaterialCommunityIcons name="account" size={14} color="#fff" />
                </View>
            )}
        </View>
    );
}

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ initialMessage?: string }>();
    const flatListRef = useRef<FlatList>(null);
    const inputAnim = useRef(new Animated.Value(0)).current;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<Awaited<ReturnType<typeof getMe>> | null>(null);
    const [displayName, setDisplayName] = useState("Sen");
    const [userId, setUserId] = useState<string>("");

    // Kullanıcı bilgilerini ve mesajları yükle
    useEffect(() => {
        let mounted = true;
        setLoading(true);

        Promise.all([
            getMe().catch(() => null),
            getChatMessages(),
        ]).then(([user, msgs]) => {
            if (!mounted) return;
            setCurrentUser(user);
            const name = resolveDisplayName(user);
            setDisplayName(name);
            setUserId(user ? String(user.id ?? user.email ?? name) : name);
            setMessages(msgs);
        }).finally(() => {
            if (mounted) setLoading(false);
        });

        return () => { mounted = false; };
    }, []);

    // Impact Map'ten gelen mesajı ekle
    useEffect(() => {
        const initial = params.initialMessage?.trim();
        if (!initial || !userId) return;
        let mounted = true;
        addChatMessage({ text: initial, userName: displayName, userId, type: "impact_report" })
            .then((next) => { if (mounted) setMessages(next); });
        router.setParams({ initialMessage: undefined } as Record<string, string | undefined>);
        return () => { mounted = false; };
    }, [params.initialMessage, userId, displayName]);

    // Gönder butonu animasyonu
    const handleInputChange = useCallback((val: string) => {
        setInput(val);
        Animated.timing(inputAnim, {
            toValue: val.trim().length > 0 ? 1 : 0,
            duration: 180,
            useNativeDriver: true,
        }).start();
    }, [inputAnim]);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text || sending) return;
        setInput("");
        inputAnim.setValue(0);
        setSending(true);
        try {
            const next = await addChatMessage({ text, userName: displayName, userId, type: "user" });
            setMessages(next);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } finally {
            setSending(false);
        }
    }, [input, sending, displayName, userId, inputAnim]);

    const renderItem = useCallback(({ item }: { item: ChatMessage }) => (
        <Bubble item={item} isOwn={item.userId === userId} />
    ), [userId]);

    const sendBtnScale = inputAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
    const sendBtnOpacity = inputAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
        <>
            <Stack.Screen
                options={{
                    title: "Sohbet Odası",
                    headerStyle: { backgroundColor: Colors.background.surface },
                    headerTintColor: Colors.text.dark,
                    headerTitleStyle: { fontWeight: "800" },
                }}
            />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={90}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={Colors.primary} size="large" />
                        <Text style={styles.loadingText}>Yükleniyor...</Text>
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={20}
                        maxToRenderPerBatch={15}
                        windowSize={9}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MaterialCommunityIcons name="chat-outline" size={56} color={Colors.text.muted + "60"} />
                                <Text style={styles.emptyTitle}>Henüz mesaj yok</Text>
                                <Text style={styles.emptySubtitle}>
                                    İlk mesajı gönder veya Impact Map'ten konum paylaş.
                                </Text>
                            </View>
                        }
                    />
                )}

                {/* Mesaj Giriş Alanı */}
                <View style={styles.inputBar}>
                    <TextInput
                        style={styles.input}
                        placeholder="Bir şeyler yaz..."
                        placeholderTextColor={Colors.text.muted + "70"}
                        value={input}
                        onChangeText={handleInputChange}
                        multiline
                        maxLength={500}
                        returnKeyType="default"
                    />
                    <Animated.View style={{ transform: [{ scale: sendBtnScale }], opacity: sendBtnOpacity }}>
                        <TouchableOpacity
                            style={styles.sendBtn}
                            onPress={handleSend}
                            disabled={!input.trim() || sending}
                            activeOpacity={0.85}
                        >
                            {sending
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <MaterialCommunityIcons name="send" size={20} color="#fff" />
                            }
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </>
    );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.dark,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: Spacing.md,
    },
    loadingText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        fontWeight: "600",
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.lg,
    },
    empty: {
        alignItems: "center",
        paddingVertical: 60,
        paddingHorizontal: Spacing.xxl,
    },
    emptyTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: "800",
        color: Colors.text.dark,
        marginTop: Spacing.md,
    },
    emptySubtitle: {
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        marginTop: Spacing.sm,
        lineHeight: 20,
    },

    // ── Baloncuk Satırı ──────────────────────────────────────────────────────
    bubbleRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        marginBottom: Spacing.sm,
        gap: 8,
    },
    bubbleRowLeft: { justifyContent: "flex-start" },
    bubbleRowRight: { justifyContent: "flex-end" },

    // ── Avatar ───────────────────────────────────────────────────────────────
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        flexShrink: 0,
    },
    avatarText: {
        fontSize: 11,
        fontWeight: "900",
        color: "#fff",
    },

    // ── Balon ────────────────────────────────────────────────────────────────
    bubble: {
        maxWidth: "72%",
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.md,
        gap: 3,
    },
    bubbleOwn: {
        backgroundColor: Colors.primary,
        borderBottomRightRadius: 4,
    },
    bubbleOther: {
        backgroundColor: Colors.background.elevated,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: Colors.border.dark,
    },
    bubbleReport: {
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
    },

    // ── Balon İçi ────────────────────────────────────────────────────────────
    senderName: {
        fontSize: 11,
        fontWeight: "800",
        marginBottom: 2,
    },
    reportTag: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginBottom: 4,
    },
    reportTagText: {
        fontSize: 10,
        fontWeight: "700",
        color: Colors.accent,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    msgText: {
        fontSize: Typography.sizes.sm + 1,
        color: Colors.text.dark,
        fontWeight: "500",
        lineHeight: 20,
    },
    msgTextOwn: {
        color: "#fff",
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 2,
        justifyContent: "flex-start",
    },
    metaRowOwn: {
        justifyContent: "flex-end",
    },
    timeText: {
        fontSize: 10,
        color: Colors.text.muted,
        fontWeight: "500",
    },
    timeTextOwn: {
        color: "rgba(255,255,255,0.6)",
    },

    // ── Input Alanı ──────────────────────────────────────────────────────────
    inputBar: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: Spacing.md,
        paddingBottom: Platform.OS === "ios" ? Spacing.lg : Spacing.md,
        backgroundColor: Colors.background.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border.dark,
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing.md,
        paddingVertical: 10,
        paddingTop: 10,
        fontSize: Typography.sizes.md,
        color: Colors.text.dark,
        maxHeight: 110,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        lineHeight: 20,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
});
