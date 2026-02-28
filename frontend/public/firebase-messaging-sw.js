// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCDqiBMaJd5g4FjAxWTpmJQe2tQX66dBoY",
    authDomain: "depremapp-29518.firebaseapp.com",
    projectId: "depremapp-29518",
    storageBucket: "depremapp-29518.firebasestorage.app",
    messagingSenderId: "775124568904",
    appId: "1:775124568904:android:037a7b1e889d368349417d"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pwa-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
