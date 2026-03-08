/**
 * Sohbet Odası — kullanıcıların mesajlaştığı ekran.
 * Impact Map'ten "Gönder" ile gelen konum bildirimleri burada paylaşılır.
 */

import { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { getChatMessages, addChatMessage, type ChatMessage } from "../../src/services/chatService";
import { getMe } from "../../src/services/authService";

export default function ChatScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ initialMessage?: string }>();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState<string>("Kullanıcı");

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getMe()
            .then((u) => {
                if (mounted) setUserName(u?.name?.trim() || u?.email?.split("@")[0] || "Kullanıcı");
            })
            .catch(() => {
                if (mounted) setUserName("Kullanıcı");
            });
        getChatMessages().then((list) => {
            if (mounted) setMessages(list);
        }).finally(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    // Impact Map'ten gelen ilk mesajı ekle
    useEffect(() => {
        const initial = params.initialMessage?.trim();
        if (!initial) return;
        let mounted = true;
        (async () => {
            const name = await getMe().then((u) => u?.name?.trim() || u?.email?.split("@")[0] || "Kullanıcı").catch(() => "Kullanıcı");
            const next = await addChatMessage({
                text: initial,
                userName: name,
                type: "impact_report",
            });
            if (mounted) setMessages(next);
            router.setParams({ initialMessage: undefined } as Record<string, string | undefined>);
        })();
        return () => { mounted = false; };
    }, [params.initialMessage]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;
        setInput("");
        const next = await addChatMessage({ text, userName, type: "user" });
        setMessages(next);
    };

    const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
        const isReport = item.type === "impact_report";
        return (
            <View style={[styles.bubble, isReport && styles.bubbleReport]}>
                <Text style={styles.bubbleUser}>{item.userName}</Text>
                <Text style={styles.bubbleText}>{item.text}</Text>
                <Text style={styles.bubbleTime}>
                    {new Date(item.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </Text>
            </View>
        );
    }, []);

    return (
        <>
            <Stack.Screen options={{ title: "Sohbet Odası" }} />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={90}
            >
                {loading ? (
                    <View style={styles.loading}>
                        <ActivityIndicator color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={7}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <MaterialCommunityIcons name="chat-outline" size={48} color={Colors.text.muted} />
                                <Text style={styles.emptyText}>Henüz mesaj yok. Impact Map'ten bildirim gönderin veya aşağıdan yazın.</Text>
                            </View>
                        }
                    />
                )}
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        placeholder="Mesajınızı yazın..."
                        placeholderTextColor={Colors.text.muted + "80"}
                        value={input}
                        onChangeText={setInput}
                        multiline
                        maxLength={500}
                        onSubmitEditing={handleSend}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim()}
                    >
                        <MaterialCommunityIcons name="send" size={22} color={Colors.background.onPrimary} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background.dark },
    loading: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { padding: Spacing.md, paddingBottom: Spacing.lg },
    empty: {
        alignItems: "center",
        paddingVertical: Spacing.xxl,
        paddingHorizontal: Spacing.xl,
    },
    emptyText: {
        marginTop: Spacing.md,
        fontSize: Typography.sizes.sm,
        color: Colors.text.muted,
        textAlign: "center",
        fontWeight: "500",
    },
    bubble: {
        backgroundColor: Colors.background.surface,
        borderRadius: BorderRadius.xl,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border.dark,
        maxWidth: "90%",
        alignSelf: "flex-start",
    },
    bubbleReport: {
        borderLeftWidth: 4,
        borderLeftColor: Colors.accent,
    },
    bubbleUser: {
        fontSize: 11,
        fontWeight: "800",
        color: Colors.primary,
        marginBottom: 4,
        textTransform: "uppercase",
    },
    bubbleText: { fontSize: Typography.sizes.sm, color: Colors.text.dark, fontWeight: "500" },
    bubbleTime: { fontSize: 10, color: Colors.text.muted, marginTop: 6 },
    inputRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        padding: Spacing.md,
        paddingBottom: Spacing.lg,
        backgroundColor: Colors.background.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border.dark,
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: Colors.background.dark,
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: 12,
        fontSize: Typography.sizes.md,
        color: Colors.text.dark,
        maxHeight: 100,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: "center",
        alignItems: "center",
    },
    sendBtnDisabled: { opacity: 0.5 },
});
