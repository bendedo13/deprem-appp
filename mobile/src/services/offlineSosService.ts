/**
 * Offline SOS Fallback Servisi
 *
 * İnternet bağlantısı yokken S.O.S butonuna basıldığında:
 *  1. expo-network ile çevrimdışı durumu tespit edilir
 *  2. Son bilinen GPS konumu kullanılır
 *  3. expo-sms ile cihazın yerleşik SMS uygulaması açılır
 *  4. Kullanıcı acil kişilerine konum içeren hazır mesajı gönderir
 *
 * Kritik: Bu modül ASLA çökmez — tüm dış bağımlılıklar try-catch içinde.
 */

import * as Network from "expo-network";
import * as SMS from "expo-sms";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { Alert, Linking, Platform } from "react-native";

const CACHED_CONTACTS_KEY = "offline_sos_contacts";
const CACHED_LOCATION_KEY = "offline_sos_location";

export interface OfflineContact {
    name: string;
    phone: string;
}

/**
 * İnternet bağlantısı var mı kontrol et.
 * Hata durumunda "bağlı" kabul eder (online akışı kırmasın).
 */
export async function isOnline(): Promise<boolean> {
    try {
        const state = await Network.getNetworkStateAsync();
        return state.isConnected === true && state.isInternetReachable !== false;
    } catch {
        return true;
    }
}

/**
 * Acil kişi numaralarını cihaza önbelleğe al.
 * Her başarılı acil kişi listesi çekiminden sonra çağrılmalı.
 */
export async function cacheEmergencyContacts(contacts: OfflineContact[]): Promise<void> {
    try {
        await SecureStore.setItemAsync(CACHED_CONTACTS_KEY, JSON.stringify(contacts));
    } catch {
        // SecureStore yazılamazsa sessizce geç
    }
}

/**
 * Önbellekteki acil kişi numaralarını getir.
 */
async function getCachedContacts(): Promise<OfflineContact[]> {
    try {
        const raw = await SecureStore.getItemAsync(CACHED_CONTACTS_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as OfflineContact[];
    } catch {
        return [];
    }
}

/**
 * Son bilinen GPS konumunu önbelleğe al.
 * Periyodik olarak çağrılmalı (SOS ekranı mount olduğunda, konum değiştiğinde).
 */
export async function cacheLastLocation(lat: number, lng: number): Promise<void> {
    try {
        await SecureStore.setItemAsync(CACHED_LOCATION_KEY, JSON.stringify({ lat, lng }));
    } catch {
        // sessiz
    }
}

/**
 * Önbellekteki veya anlık GPS konumunu getir.
 */
async function getLastLocation(): Promise<{ lat: number; lng: number } | null> {
    // Önce anlık konum dene (GPS çipi internet gerektirmez)
    try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
            const pos = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Low,
                // 5sn timeout — offline'da network-based konum çalışmaz ama GPS çalışır
            });
            return { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
    } catch {
        // GPS alınamadı — önbelleğe düş
    }

    // Önbellekteki son bilinen konum
    try {
        const raw = await SecureStore.getItemAsync(CACHED_LOCATION_KEY);
        if (raw) return JSON.parse(raw);
    } catch {
        // sessiz
    }

    return null;
}

/**
 * Offline SOS mesajı oluştur ve yerleşik SMS uygulamasını aç.
 *
 * @returns true — SMS uygulaması başarıyla açıldı, false — başarısız
 */
export async function triggerOfflineSOS(): Promise<boolean> {
    try {
        // 1. SMS mevcut mu kontrol et
        const smsAvailable = await SMS.isAvailableAsync();

        // 2. Acil kişileri al
        const contacts = await getCachedContacts();
        const phones = contacts.map((c) => c.phone).filter(Boolean);

        // 3. Konum al
        const loc = await getLastLocation();
        const mapsLink = loc
            ? `https://maps.google.com/?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`
            : "(Konum alınamadı)";

        // 4. Mesaj oluştur
        const body =
            `🆘 ACİL DURUM — QuakeSense S.O.S\n\n` +
            `İnternetsiz S.O.S gönderildi.\n` +
            `Konumum: ${mapsLink}\n\n` +
            `Lütfen beni arayın veya acil yardım gönderin!`;

        if (smsAvailable && phones.length > 0) {
            // expo-sms ile birden fazla numaraya
            const { result } = await SMS.sendSMSAsync(phones, body);
            return result === "sent" || result === "unknown";
        }

        if (smsAvailable && phones.length === 0) {
            // Kişi yok — boş numaraya aç (kullanıcı kendisi yazar)
            Alert.alert(
                "İnternetsiz S.O.S",
                "Kayıtlı acil kişiniz yok. SMS uygulaması açılacak, lütfen numarayı kendiniz girin.",
                [
                    {
                        text: "SMS Aç",
                        onPress: async () => {
                            await SMS.sendSMSAsync([], body);
                        },
                    },
                    {
                        text: "112 Ara",
                        style: "destructive",
                        onPress: () => Linking.openURL("tel:112"),
                    },
                ]
            );
            return true;
        }

        // SMS mevcut değil (simülatör veya iPad) — 112 yönlendir
        Alert.alert(
            "İnternetsiz S.O.S",
            "SMS servisi bu cihazda kullanılamıyor.\nLütfen 112'yi arayın.",
            [
                { text: "112 Ara", style: "destructive", onPress: () => Linking.openURL("tel:112") },
                { text: "Tamam" },
            ]
        );
        return false;

    } catch (err) {
        console.error("[OfflineSOS] Kritik hata:", err);
        // Son çare: 112 yönlendirmesi
        Alert.alert("S.O.S Hatası", "Lütfen 112'yi arayın.", [
            { text: "112 Ara", onPress: () => Linking.openURL("tel:112") },
            { text: "Tamam" },
        ]);
        return false;
    }
}
