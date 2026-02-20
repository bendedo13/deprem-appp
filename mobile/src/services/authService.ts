/**
 * Auth servisi — register, login, getMe, logout.
 * JWT token'ı expo-secure-store ile güvenli saklama.
 */

import * as SecureStore from "expo-secure-store";
import { api, TOKEN_KEY } from "./api";

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface UserOut {
    id: number;
    email: string;
    fcm_token: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
}

export interface TokenOut {
    access_token: string;
    token_type: string;
    user: UserOut;
}

// ── Servis Fonksiyonları ──────────────────────────────────────────────────────

/** Yeni kullanıcı kaydı yapar, token'ı saklar ve kullanıcıyı döner. */
export async function register(email: string, password: string): Promise<UserOut> {
    const { data } = await api.post<TokenOut>("/api/v1/users/register", { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    return data.user;
}

/** Mevcut kullanıcı girişi, token'ı saklar ve kullanıcıyı döner. */
export async function login(email: string, password: string): Promise<UserOut> {
    const { data } = await api.post<TokenOut>("/api/v1/users/login", { email, password });
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    return data.user;
}

/** Token ile mevcut kullanıcı profilini döner. */
export async function getMe(): Promise<UserOut> {
    const { data } = await api.get<UserOut>("/api/v1/users/me");
    return data;
}

/** FCM token ve/veya konum günceller. */
export async function updateProfile(params: {
    fcm_token?: string;
    latitude?: number;
    longitude?: number;
}): Promise<UserOut> {
    const { data } = await api.patch<UserOut>("/api/v1/users/me", params);
    return data;
}

/** "Ben İyiyim" — acil kişilere bildirim gönder. */
export async function iAmSafe(): Promise<{ status: string; notified_contacts: number }> {
    const { data } = await api.post("/api/v1/users/me/safe");
    return data;
}

/** Token'ı silerek çıkış yapar. */
export async function logout(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/** Saklanmış token var mı kontrol eder. */
export async function hasToken(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return !!token;
}
