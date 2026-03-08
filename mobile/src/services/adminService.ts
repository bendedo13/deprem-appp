/**
 * Admin Servisi — Patron Paneli için backend API bağlantıları.
 * Sadece is_admin=true kullanıcılar bu endpoint'lere erişebilir.
 */

import { api } from "./api";

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface AdminStats {
    total_users: number;
    active_users: number;
    admin_users: number;
    pro_users: number;
    trial_users: number;
    free_users: number;
    total_earthquakes: number;
    earthquakes_last_24h: number;
    earthquakes_last_7d: number;
    seismic_reports_total: number;
    users_with_fcm: number;
    users_with_location: number;
    total_notifications_sent: number;
}

export interface AdminUser {
    id: number;
    email: string;
    name: string | null;
    phone: string | null;
    plan: string;
    subscription_plan: string;
    subscription_expires_at: string | null;
    trial_used: boolean;
    is_active: boolean;
    is_admin: boolean;
    fcm_token: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
}

export interface AppSetting {
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
}

// ── Dashboard İstatistikleri ──────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
    const { data } = await api.get<AdminStats>("/api/v1/admin/stats");
    return data;
}

// ── Kullanıcı Yönetimi ──────────────────────────────────────────────────────

export async function getUsers(skip = 0, limit = 50, search?: string): Promise<AdminUser[]> {
    const params: Record<string, any> = { skip, limit };
    if (search) params.search = search;
    const { data } = await api.get<AdminUser[]>("/api/v1/admin/users", { params });
    return data;
}

export async function toggleUserActive(userId: number, isActive: boolean): Promise<AdminUser> {
    const { data } = await api.patch<AdminUser>(`/api/v1/admin/users/${userId}`, {
        is_active: isActive,
    });
    return data;
}

export async function toggleUserSubscription(userId: number, plan: string): Promise<AdminUser> {
    const expiresAt = plan !== "free"
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        : null;
    const { data } = await api.patch<AdminUser>(`/api/v1/admin/users/${userId}`, {
        subscription_plan: plan,
        subscription_expires_at: expiresAt,
    });
    return data;
}

// ── Push Bildirimler ────────────────────────────────────────────────────────

export async function sendBroadcast(params: {
    title: string;
    body: string;
    target_user_id?: number | null;
}): Promise<{ sent: number; total_targets: number; type: string }> {
    const { data } = await api.post("/api/v1/admin/broadcast", {
        title: params.title,
        body: params.body,
        target_user_id: params.target_user_id ?? null,
    });
    return data;
}

// ── Uygulama Ayarları (S.O.S Şablonları dahil) ─────────────────────────────

export async function getSettings(): Promise<AppSetting[]> {
    const { data } = await api.get<AppSetting[]>("/api/v1/admin/settings");
    return data;
}

export async function updateSetting(key: string, value: string): Promise<AppSetting> {
    const { data } = await api.put<AppSetting>(`/api/v1/admin/settings/${key}`, { value });
    return data;
}
