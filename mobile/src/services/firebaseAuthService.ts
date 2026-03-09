/**
 * Firebase Authentication servisi.
 * Email/Şifre + Google Sign-In desteği.
 * Firebase Auth state yönetimi ve hata çevirisi.
 */

import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";

// Google Sign-In: Web Client ID (Firebase Console → Authentication → Google → Web client ID)
// Önce app.json extra'dan alınır; Expo Go veya bazı build'lerde extra boş gelebilir, bu yüzden yedek değer kullanılır.
const FALLBACK_WEB_CLIENT_ID = "775124568904-flr9bo452no12v9giofdlb743m8gvqk4.apps.googleusercontent.com";
const WEB_CLIENT_ID =
    (Constants.expoConfig?.extra?.googleWebClientId as string | undefined)?.trim() ||
    FALLBACK_WEB_CLIENT_ID;

let googleConfigured = false;

function ensureGoogleConfigured() {
    if (googleConfigured) return;
    if (!WEB_CLIENT_ID) {
        console.warn("[Firebase Auth] Google Web Client ID yok. app.json extra.googleWebClientId ayarlayın.");
        return;
    }
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: true });
    googleConfigured = true;
}

// ── Firebase Auth hata kodlarını i18n anahtarına çevir ──────────────────────

export function getFirebaseAuthErrorKey(error: unknown): string {
    const code = (error as { code?: string })?.code ?? "";

    switch (code) {
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "auth.error_wrong_password";
        case "auth/user-not-found":
            return "auth.error_user_not_found";
        case "auth/email-already-in-use":
            return "auth.error_email_in_use";
        case "auth/invalid-email":
            return "auth.error_invalid_email";
        case "auth/weak-password":
            return "auth.error_weak_password";
        case "auth/too-many-requests":
            return "auth.error_too_many_requests";
        case "auth/network-request-failed":
            return "auth.error_network";
        default:
            return "auth.error_login_generic";
    }
}

// ── Email / Şifre ──────────────────────────────────────────────────────────

/** Email + şifre ile yeni kullanıcı kaydı */
export async function firebaseRegister(
    email: string,
    password: string
): Promise<FirebaseAuthTypes.User> {
    const credential = await auth().createUserWithEmailAndPassword(email, password);
    return credential.user;
}

/** Email + şifre ile giriş */
export async function firebaseLogin(
    email: string,
    password: string
): Promise<FirebaseAuthTypes.User> {
    const credential = await auth().signInWithEmailAndPassword(email, password);
    return credential.user;
}

// ── Google Sign-In ─────────────────────────────────────────────────────────

/** Google ile giriş — native Google Sign-In → Firebase credential */
export async function googleSignIn(): Promise<FirebaseAuthTypes.User> {
    ensureGoogleConfigured();

    if (!WEB_CLIENT_ID) {
        throw new Error("Google Sign-In yapılandırılmamış. Lütfen app.json içinde extra.googleWebClientId tanımlayın.");
    }

    // Google Play Services kontrolü (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    // v12: idToken bazen response.data içinde, bazen doğrudan response'ta
    const idToken =
        (response as { data?: { idToken?: string }; idToken?: string }).data?.idToken ??
        (response as { idToken?: string }).idToken;

    if (!idToken) {
        throw new Error("Google'dan ID token alınamadı.");
    }

    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
    const firebaseResult = await auth().signInWithCredential(googleCredential);

    return firebaseResult.user;
}

// ── Oturum Yönetimi ────────────────────────────────────────────────────────

/** Çıkış yap */
export async function firebaseLogout(): Promise<void> {
    // Google Sign-In oturumunu da kapat
    try {
        const isSignedIn = await GoogleSignin.getCurrentUser();
        if (isSignedIn) {
            await GoogleSignin.signOut();
        }
    } catch {
        // Google Sign-In yoksa veya hata olduysa sessizce geç
    }

    await auth().signOut();
}

/** Mevcut kullanıcıyı döndür (null = giriş yapılmamış) */
export function getCurrentUser(): FirebaseAuthTypes.User | null {
    return auth().currentUser;
}

/** Auth state değişikliklerini dinle */
export function onAuthStateChanged(
    callback: (user: FirebaseAuthTypes.User | null) => void
): () => void {
    return auth().onAuthStateChanged(callback);
}

/** Firebase ID token al (backend API çağrıları için) */
export async function getIdToken(): Promise<string | null> {
    const user = auth().currentUser;
    if (!user) return null;
    return user.getIdToken();
}
