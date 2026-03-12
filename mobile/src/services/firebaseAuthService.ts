/**
 * Firebase Authentication servisi.
 * Email/Şifre + Google Sign-In desteği.
 * Firebase Auth state yönetimi ve hata çevirisi.
 */

import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";

// Google Sign-In: Web Client ID (Firebase Console → Authentication → Google → Web client ID)
// client_type: 3 olan OAuth client'ın ID'sidir.
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
    // offlineAccess: false → sadece idToken alınır, serverAuthCode gerekmez.
    // forceCodeForRefreshToken: false → her seferinde yeniden onay istenmez.
    GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        offlineAccess: false,
        forceCodeForRefreshToken: false,
    });
    googleConfigured = true;
}

export { statusCodes as GoogleSignInStatusCodes };

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
        throw new Error("GOOGLE_NOT_CONFIGURED");
    }

    // Google Play Services kontrolü (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();

    /*
     * @react-native-google-signin v12 API değişikliği:
     *   - Başarılı yanıt: { type: "success", data: { idToken, user, ... } }
     *   - İptal:          { type: "cancelled" }
     * Eski v10 compat: doğrudan { idToken, user } olarak da gelebilir.
     */
    const typedResponse = response as {
        type?: string;
        data?: { idToken?: string | null };
        idToken?: string | null;
    };

    if (typedResponse.type === "cancelled") {
        const err = new Error("SIGN_IN_CANCELLED");
        (err as { code?: string }).code = statusCodes.SIGN_IN_CANCELLED;
        throw err;
    }

    const idToken =
        typedResponse.data?.idToken ??
        typedResponse.idToken ??
        null;

    if (!idToken) {
        console.error("[Firebase Auth] Google Sign-In response:", JSON.stringify(response));
        throw new Error("Google'dan ID token alınamadı. Lütfen tekrar deneyin.");
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
