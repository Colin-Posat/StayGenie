// Frontend/src/config/firebaseConfig.ts

// Native Firebase modules
import auth from "@react-native-firebase/auth";
import analytics from "@react-native-firebase/analytics";
import firestore from "@react-native-firebase/firestore";

// Export services - all native now
export { auth };
export const db = firestore(); // RN Firebase Firestore instead of Web SDK

// Analytics setup (same as before)
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