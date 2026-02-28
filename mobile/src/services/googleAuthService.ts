/**
 * Google Sign-In servisi.
 * @react-native-google-signin/google-signin ile Google hesabı doğrulama.
 * Başarılı giriş sonrasında backend'e token gönderilir.
 */

import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import { api, TOKEN_KEY } from "./api";
import type { TokenOut, UserOut } from "./authService";

// Google Sign-In yapılandırması
GoogleSignin.configure({
    webClientId: "775124568904-flr9bo452no12v9giofdlb743m8gvqk4.apps.googleusercontent.com",
    offlineAccess: true,
});

/**
 * Google ile giriş yapar.
 * Google ID token'ı backend'e gönderilir, backend JWT döner.
 */
export async function signInWithGoogle(): Promise<UserOut> {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    const idToken = response.data?.idToken;

    if (!idToken) {
        throw new Error("Google Sign-In: idToken alınamadı");
    }

    // Backend'e Google token gönder
    const { data } = await api.post<TokenOut>("/api/v1/users/google-login", {
        id_token: idToken,
    });

    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    return data.user;
}

/**
 * Google Sign-In hata kodlarını kontrol eder.
 */
export function isSignInCancelled(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === statusCodes.SIGN_IN_CANCELLED
    );
}

export { statusCodes };
