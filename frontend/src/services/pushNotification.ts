import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import axios from "axios";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestPermissionAndGetToken = async () => {
    try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const token = await getToken(messaging, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY // Get from Firebase Console
            });

            if (token) {
                console.log("FCM Web Token:", token);
                // Backend'e kaydet (Aşama 2'de hazırlanan endpoint)
                const userToken = localStorage.getItem('token');
                if (userToken) {
                    await axios.post(
                        `${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/notifications/fcm-token`,
                        { fcm_token: token },
                        { headers: { Authorization: `Bearer ${userToken}` } }
                    );
                }
                return token;
            }
        }
    } catch (error) {
        console.error("Bildirim izni alınırken hata:", error);
    }
    return null;
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
