/**
 * Abonelik (Subscription) Servisi — PRO plan yönetimi.
 * Trial aktivasyonu, plan kontrolü ve feature erişimi.
 */

import { api } from "./api";

export interface SubscriptionStatus {
    /** Kaydedilen plan: free | trial | monthly_pro | yearly_pro */
    plan: string;
    /** Süresi dolmuşsa bile fiili plan (örn. free) */
    effective_plan: string;
    /** Şu anda Pro özelliklere erişebiliyor mu? */
    is_pro: boolean;
    /** 10 günlük deneme daha önce kullanıldı mı? */
    trial_used: boolean;
    /** Abonelik bitiş tarihi (UTC ISO) */
    expires_at: string | null;
    /** Kalan gün sayısı (yoksa null) */
    days_remaining: number | null;
}

export interface FeatureCheck {
    feature: string;
    allowed: boolean;
    reason: string;
}

export const PRO_FEATURES = {
    priority_notifications: "Öncelikli Bildirimler",
    advanced_analysis: "Detaylı Sismik Analiz",
    ad_free: "Reklamsız Deneyim",
    detailed_risk_report: "Detaylı Risk Raporu",
    custom_alerts: "Özel Alarm Eşikleri",
    historical_data: "Geçmiş Deprem Verileri",
} as const;

/**
 * Kullanıcının abonelik durumunu getirir.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
    const { data } = await api.get<SubscriptionStatus>("/api/v1/subscription/status");
    return data;
}

/**
 * 10 günlük ücretsiz deneme süresini başlatır ve güncel durumu döner.
 */
export async function activateTrial(): Promise<SubscriptionStatus> {
    await api.post("/api/v1/subscription/activate-trial");
    // Trial sonrası güncel durumu tekrar çek
    return getSubscriptionStatus();
}

/**
 * PRO plan satın alır (monthly_pro | yearly_pro) ve güncel durumu döner.
 */
export async function subscribe(plan: "monthly_pro" | "yearly_pro"): Promise<SubscriptionStatus> {
    await api.post("/api/v1/subscription/subscribe", { plan });
    return getSubscriptionStatus();
}

/**
 * Aboneliği iptal eder (free plana dönüş).
 */
export async function cancelSubscription(): Promise<{ message: string }> {
    const { data } = await api.post("/api/v1/subscription/cancel");
    return data;
}

/**
 * Belirli bir özelliğe erişim kontrolü yapar.
 */
export async function checkFeature(feature: string): Promise<FeatureCheck> {
    const { data } = await api.get(`/api/v1/subscription/check-feature/${feature}`);
    return data;
}
