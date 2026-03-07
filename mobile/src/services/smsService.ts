/**
 * SMS Fallback Service — Çevrimdışı S.O.S. ve otomatik SMS gönderimi.
 *
 * İnternet bağlantısı kesildiğinde (deprem sonrası senaryo):
 * 1. API'ye ulaşılıp ulaşılamadığını kontrol eder
 * 2. API ulaşılamıyorsa GPS konumunu alır
 * 3. Acil durum kişilerine SMS gönderir
 *
 * Kullanılan kütüphaneler:
 *   - expo-sms (SMS gönderimi)
 *   - expo-location (GPS konum)
 *   - @react-native-async-storage/async-storage (acil kişiler cache)
 */

import * as SMS from "expo-sms";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import { api } from "./api";

const CONTACTS_STORAGE_KEY = "emergency_contacts";

interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    channel: "sms" | "push" | "both";
}

/**
 * API'ye ulaşılabilir mi kontrol et.
 * 3 saniye timeout ile health check yapar.
 */
async function isApiReachable(): Promise<boolean> {
    try {
        await api.get("/api/v1/health", { timeout: 3000 });
        return true;
    } catch {
        return false;
    }
}

/**
 * Yerel depodan acil durum kişilerini yükle.
 */
async function loadLocalContacts(): Promise<EmergencyContact[]> {
    try {
        const raw = await AsyncStorage.getItem(CONTACTS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Mevcut GPS konumunu al (hızlı mod).
 */
async function getCurrentLocation(): Promise<{
    latitude: number;
    longitude: number;
} | null> {
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return null;

        const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
        });
        return {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
        };
    } catch {
        return null;
    }
}

/**
 * Google Maps linki oluştur.
 */
function buildMapsLink(lat: number, lng: number): string {
    return `https://maps.google.com/?q=${lat},${lng}`;
}

/**
 * SMS mesaj içeriği oluştur.
 */
function buildSmsBody(
    location: { latitude: number; longitude: number } | null
): string {
    const header = "ACIL DURUM! Guvende olmayabilirim.";

    if (location) {
        const link = buildMapsLink(location.latitude, location.longitude);
        return `${header}\n\nKonumum: ${link}\n\nKoordinatlar: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}\n\n(QuakeSense S.O.S.)`;
    }

    return `${header}\n\nKonum bilgisi alinamadi. Lutfen iletisime gecin.\n\n(QuakeSense S.O.S.)`;
}

/**
 * expo-sms ile toplu SMS gönder.
 * @returns Gönderilmeye çalışılan kişi sayısı
 */
async function sendSmsViaExpo(
    phones: string[],
    body: string
): Promise<number> {
    const isAvailable = await SMS.isAvailableAsync();
    if (!isAvailable) return 0;

    try {
        await SMS.sendSMSAsync(phones, body);
        return phones.length;
    } catch {
        return 0;
    }
}

/**
 * Fallback: Tek tek SMS URL scheme ile gönder.
 * expo-sms çalışmazsa her kişi için ayrı SMS uygulaması aç.
 */
async function sendSmsViaUrl(
    phones: string[],
    body: string
): Promise<number> {
    let sent = 0;
    for (const phone of phones) {
        try {
            const encodedBody = encodeURIComponent(body);
            const url =
                Platform.OS === "ios"
                    ? `sms:${phone}&body=${encodedBody}`
                    : `sms:${phone}?body=${encodedBody}`;
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
                sent++;
            }
        } catch {
            // Bu kişiye gönderilemedi — sonrakine geç
        }
    }
    return sent;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface SosFallbackResult {
    method: "api" | "sms" | "sms_url" | "failed";
    contactCount: number;
    location: { latitude: number; longitude: number } | null;
    error?: string;
}

/**
 * S.O.S. Fallback sistemi — Ana fonksiyon.
 *
 * 1. API'ye ulaşılırsa normal SOS gönderir (method: "api")
 * 2. API ulaşılamıyorsa:
 *    a. GPS konumu alır
 *    b. Acil kişilere SMS gönderir (expo-sms veya URL scheme)
 *
 * @returns Sonuç bilgisi
 */
export async function sendSosFallback(): Promise<SosFallbackResult> {
    // 1. Konum al (paralel olarak başlat)
    const locationPromise = getCurrentLocation();

    // 2. API kontrol et
    const apiOk = await isApiReachable();

    if (apiOk) {
        // API çalışıyor — normal SOS gönder
        try {
            await api.post("/api/v1/users/me/sos");
            const loc = await locationPromise;
            return { method: "api", contactCount: 0, location: loc };
        } catch {
            // API çağrısı başarısız — SMS fallback'e düş
        }
    }

    // 3. Offline mod — SMS fallback
    const contacts = await loadLocalContacts();
    if (contacts.length === 0) {
        return {
            method: "failed",
            contactCount: 0,
            location: null,
            error: "Acil durum kişisi bulunamadı. Lütfen önce kişi ekleyin.",
        };
    }

    // SMS gönderilebilecek kişileri filtrele
    const smsContacts = contacts.filter(
        (c) => c.channel === "sms" || c.channel === "both"
    );
    if (smsContacts.length === 0) {
        return {
            method: "failed",
            contactCount: 0,
            location: null,
            error:
                "SMS kanalı seçili acil durum kişisi bulunamadı. Kişi ayarlarından SMS kanalını etkinleştirin.",
        };
    }

    const location = await locationPromise;
    const smsBody = buildSmsBody(location);
    const phones = smsContacts.map((c) => c.phone);

    // expo-sms ile dene
    let sentCount = await sendSmsViaExpo(phones, smsBody);

    if (sentCount === 0) {
        // Fallback: URL scheme ile dene
        sentCount = await sendSmsViaUrl(phones, smsBody);
        if (sentCount > 0) {
            return {
                method: "sms_url",
                contactCount: sentCount,
                location,
            };
        }
    }

    if (sentCount > 0) {
        return { method: "sms", contactCount: sentCount, location };
    }

    return {
        method: "failed",
        contactCount: 0,
        location,
        error: "SMS gönderilemedi. Cihazınızda SMS servisi aktif değil olabilir.",
    };
}

/**
 * SMS gönderimi mümkün mü kontrol et.
 */
export async function isSmsAvailable(): Promise<boolean> {
    try {
        return await SMS.isAvailableAsync();
    } catch {
        return false;
    }
}
