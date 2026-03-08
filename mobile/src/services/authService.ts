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
    is_admin?: boolean;
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
export async function iAmSafe(params?: {
    includeLocation?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    customMessage?: string | null;
    contactIds?: number[] | null;
}): Promise<{ status: string; notified_contacts: number }> {
    const includeLocation = params?.includeLocation ?? true;

    const payload = {
        include_location: includeLocation,
        custom_message: params?.customMessage ?? null,
        contact_ids: params?.contactIds ?? null,
        latitude: includeLocation && params?.latitude != null ? params.latitude : null,
        longitude: includeLocation && params?.longitude != null ? params.longitude : null,
    };

    const { data } = await api.post("/api/v1/users/i-am-safe", payload);
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

/**
 * Firebase ID token ile backend'den JWT alır ve SecureStore'a kaydeder.
 * Google Sign-In ve Firebase Email/Password girişlerinden sonra çağrılmalıdır.
 */
export async function syncFirebaseToken(firebaseIdToken: string): Promise<UserOut> {
    const { data } = await api.post<TokenOut>("/api/v1/users/auth/firebase", {
        firebase_token: firebaseIdToken,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    return data.user;
}

