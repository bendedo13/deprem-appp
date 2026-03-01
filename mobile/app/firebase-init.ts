/**
 * Firebase initialization for React Native.
 * @react-native-firebase/app otomatik olarak google-services.json'dan
 * default app'i başlatır. Bu dosya sadece import tetikleyici olarak kullanılır.
 */

import firebase from "@react-native-firebase/app";

// Firebase default app zaten google-services.json'dan otomatik başlatılır.
// Manuel initializeApp() çağrısı yapmaya GEREK YOK — çakışma riski yaratır.
if (firebase.apps.length) {
    console.log("[Firebase] Default app hazır:", firebase.app().name);
}

export default firebase;
