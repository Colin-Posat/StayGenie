// Frontend/src/config/firebaseConfig.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Your Firebase configuration
// Replace these values with your actual Firebase config from the console
const firebaseConfig = {
  apiKey: "AIzaSyCLQtjPbz__O49nFfwEKyzvf-hYUENsMnQ",
  authDomain: "staygenie-749de.firebaseapp.com",
  projectId: "staygenie-749de",
  storageBucket: "staygenie-749de.firebasestorage.app",
  messagingSenderId: "962898883484",
  appId: "1:962898883484:web:651374cdd684066941ce59",
  measurementId: "G-E4QYE8M1V3"
};

// Initialize Firebase (only once)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export default app;