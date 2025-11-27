// Frontend/src/config/firebaseConfig.ts

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Native GA4 analytics (works with Expo Dev Client)
import analytics from "@react-native-firebase/analytics";

// -------------------------------------
// Firebase Web SDK (Auth + Firestore)
// -------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyCLQtjPbz__O49nFfwEKyzvf-hYUENsMnQ",
  authDomain: "staygenie-749de.firebaseapp.com",
  projectId: "staygenie-749de",
  storageBucket: "staygenie-749de.firebasestorage.app",
  messagingSenderId: "962898883484",
  appId: "1:962898883484:web:651374cdd684066941ce59",
  measurementId: "G-E4QYE8M1V3"
};

// Ensure Firebase app initialized once
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Export Firebase services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// -------------------------------------
// GA4 Analytics (Native)
// -------------------------------------

let analyticsInitialized = false;

export function initAnalytics() {
  console.log("🔵 ATTEMPTING TO INITIALIZE GA4...");
  
  if (analyticsInitialized) {
    console.log("🟢 GA4 Analytics already initialized");
    return;
  }

  try {
    console.log("🟡 Setting up analytics...");
    analytics()
      .setAnalyticsCollectionEnabled(true)
      .then(() => {
        analyticsInitialized = true;
        console.log("🟢 GA4 Analytics initialized successfully!");
      })
      .catch((err) => {
        console.log("🔴 Error initializing GA4:", err);
      });
  } catch (err) {
    console.log("🔴 Error setting up GA4:", err);
  }
}

export const logEvent = async (event: string, params?: object) => {
  console.log("📊 ATTEMPTING TO LOG EVENT:", event, params);
  try {
    await analytics().logEvent(event, params);
    console.log("✅ Event logged successfully:", event);
  } catch (err) {
    console.error("❌ Error logging GA4 event:", err);
  }
};

export default app;