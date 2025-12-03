// Frontend/src/config/firebaseConfig.ts
import { Platform } from "react-native";

// Native Firebase (iOS/Android)
import nativeAuth from "@react-native-firebase/auth";
import nativeAnalytics from "@react-native-firebase/analytics";
import nativeFirestore from "@react-native-firebase/firestore";

// -------------------------------------------------------
// WEB MOCKS — prevents crashes when testing in browser
// -------------------------------------------------------
const webAuth = {
  currentUser: null,
  onAuthStateChanged: (cb: any) => {
    cb(null);
    return () => {};
  },
  createUserWithEmailAndPassword: async () => {
    throw new Error("Auth not available on web (mock).");
  },
  signInWithEmailAndPassword: async () => {
    throw new Error("Auth not available on web (mock).");
  },
  signOut: async () => {},
  sendPasswordResetEmail: async () => {},
  GoogleAuthProvider: { credential: () => ({}) },
};

const webFirestore = {
  collection: () => ({
    doc: () => ({
      set: async () => {},
      update: async () => {},
      get: async () => ({ exists: false, data: () => ({}) }),
      collection: () => ({
        add: async () => {},
        get: async () => ({ forEach: () => {} }),
        where: () => ({ get: async () => ({ forEach: () => {} }) }),
        orderBy: () => ({ get: async () => ({ forEach: () => {} }) }),
      }),
    }),
  }),
  FieldValue: {
    arrayUnion: () => {},
    arrayRemove: () => {},
  },
};

const webAnalytics = {
  logEvent: async () => {},
  setAnalyticsCollectionEnabled: async () => {},
};

// -------------------------------------------------------
// EXPORTS (Auto-switch based on platform)
// -------------------------------------------------------
export const auth = Platform.OS === "web" ? webAuth : nativeAuth();
export const db = Platform.OS === "web" ? webFirestore : nativeFirestore();

let analyticsInitialized = false;

export function initAnalytics() {
  if (Platform.OS === "web") {
    console.log("ℹ️ Web mock analytics enabled.");
    return;
  }

  if (!analyticsInitialized) {
    nativeAnalytics()
      .setAnalyticsCollectionEnabled(true)
      .then(() => {
        analyticsInitialized = true;
        console.log("🟢 Analytics initialized");
      });
  }
}

export const logEvent = async (event: string, params?: object) => {
  if (Platform.OS === "web") {
    console.log("📊 (web mock) Event logged:", event, params);
    return;
  }
  await nativeAnalytics().logEvent(event, params);
};
