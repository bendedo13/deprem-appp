/**
 * Sohbet odası mesajları — yerel depolama (AsyncStorage).
 * Impact Map'ten "Gönder" ile gelen bildirimler ve kullanıcı mesajları burada tutulur.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_STORAGE_KEY = "quakesense_chat_messages_v1";

export interface ChatMessage {
    id: string;
    text: string;
    userName: string;
    userId?: number;
    createdAt: string;
    type?: "impact_report" | "user";
}

export async function getChatMessages(): Promise<ChatMessage[]> {
    try {
        const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as ChatMessage[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export async function addChatMessage(message: Omit<ChatMessage, "id" | "createdAt">): Promise<ChatMessage[]> {
    const list = await getChatMessages();
    const newMsg: ChatMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
    };
    const next = [...list, newMsg];
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next));
    return next;
}

export async function clearChatMessages(): Promise<void> {
    await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
}
