/**
 * Abonelik (Subscription) Servisi — PRO plan yönetimi.
 * Trial aktivasyonu, plan kontrolü ve feature erişimi.
 */

import { api } from "./api";

export interface SubscriptionStatus {
    user_id: number;
    subscription_plan: string;
    subscription_expires_at: string | null;
    trial_used: boolean;
    is_pro: boolean;
    effective_plan: string;
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
    const { data } = await api.get("/api/v1/subscription/status");
    return data;
}

/**
 * 10 günlük ücretsiz deneme süresini başlatır.
 */
export async function activateTrial(): Promise<SubscriptionStatus> {
    const { data } = await api.post("/api/v1/subscription/activate-trial");
    return data;
}

/**
 * PRO plan satın alır (monthly_pro | yearly_pro).
 */
export async function subscribe(plan: "monthly_pro" | "yearly_pro"): Promise<SubscriptionStatus> {
    const { data } = await api.post("/api/v1/subscription/subscribe", { plan });
    return data;
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
