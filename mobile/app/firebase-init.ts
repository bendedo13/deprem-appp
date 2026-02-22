/**
 * Firebase initialization for React Native
 * Must be imported before any Firebase usage
 */

import firebase from '@react-native-firebase/app';

// Firebase config from google-services.json
const firebaseConfig = {
  apiKey: 'AIzaSyCDqiBMaJd5g4FjAxWTpmJQe2tQX66dBoY',
  projectId: 'depremapp-29518',
  storageBucket: 'depremapp-29518.firebasestorage.app',
  appId: '1:775124568904:android:037a7b1e889d368349417d',
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default firebase;
