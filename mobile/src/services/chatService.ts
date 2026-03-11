/**
 * Sohbet odası mesajları — yerel depolama (AsyncStorage).
 * Impact Map'ten "Gönder" ile gelen bildirimler ve kullanıcı mesajları burada tutulur.
 *
 * ChatMessage.userName boş olmamalı — undefined/null → "Kullanıcı" fallback.
 * ChatMessage.text boş olmamalı — undefined/null → "" fallback (undefined görünümü önlenir).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const CHAT_STORAGE_KEY = "quakesense_chat_messages_v2";

export interface ChatMessage {
    id: string;
    text: string;
    userName: string;
    userId?: string;            // Sahiplik kontrolü için (string email/id)
    createdAt: string;
    type?: "impact_report" | "user" | "system";
}

/** Gelen ham mesaj payload'ını temizler — undefined/null field'ları korur */
function sanitizeMessage(raw: unknown): ChatMessage | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    // text: çeşitli field adlarını dene
    const text =
        String(r.text ?? r.message ?? r.content ?? r.body ?? "").trim();
    const userName =
        String(r.userName ?? r.user_name ?? r.name ?? r.sender ?? "").trim() || "Kullanıcı";
    const id = String(r.id ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const createdAt = String(r.createdAt ?? r.created_at ?? new Date().toISOString());
    const type = (r.type ?? "user") as ChatMessage["type"];
    const userId = r.userId != null ? String(r.userId) : undefined;

    if (!text) return null; // Boş mesaj saklanmaz
    return { id, text, userName, userId, createdAt, type };
}

export async function getChatMessages(): Promise<ChatMessage[]> {
    try {
        const raw = await AsyncStorage.getItem(CHAT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(sanitizeMessage)
            .filter((m): m is ChatMessage => m !== null);
    } catch {
        return [];
    }
}

export async function addChatMessage(
    message: Omit<ChatMessage, "id" | "createdAt">
): Promise<ChatMessage[]> {
    const list = await getChatMessages();
    const newMsg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        text: message.text?.trim() || "",
        userName: message.userName?.trim() || "Kullanıcı",
        userId: message.userId,
        type: message.type ?? "user",
    };
    if (!newMsg.text) return list; // Boş mesaj ekleme
    const next = [...list, newMsg].slice(-200); // Max 200 mesaj
    await AsyncStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next));
    return next;
}

export async function clearChatMessages(): Promise<void> {
    await AsyncStorage.removeItem(CHAT_STORAGE_KEY);
}
