import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import axios from "axios";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Lazy-initialized Firebase instances
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

const getFirebaseApp = () => {
    if (!app && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        try {
            app = initializeApp(firebaseConfig);
        } catch (e) {
            console.error("Firebase App initialization failed:", e);
        }
    }
    return app;
};

const getFirebaseMessaging = () => {
    const firebaseApp = getFirebaseApp();
    if (!messaging && firebaseApp) {
        try {
            // Check if messaging is supported (it needs HTTPS and Service Workers)
            messaging = getMessaging(firebaseApp);
        } catch (e) {
            console.warn("Firebase Messaging is not supported in this environment/browser.");
        }
    }
    return messaging;
};

export const requestPermissionAndGetToken = async () => {
    // Basic browser support check
    if (!('Notification' in window)) {
        console.warn("This browser does not support notifications.");
        return null;
    }

    try {
        const msg = getFirebaseMessaging();
        if (!msg) return null;

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const token = await getToken(msg, {
                vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
            });

            if (token) {
                console.log("FCM Web Token:", token);
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
        console.error("Error while getting notification token:", error);
    }
    return null;
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        try {
            const msg = getFirebaseMessaging();
            if (!msg) return;
            onMessage(msg, (payload) => {
                resolve(payload);
            });
        } catch (e) {
            console.error("onMessageListener setup failed:", e);
        }
    });
