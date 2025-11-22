// app.config.ts
import 'dotenv/config';
import type { ExpoConfig } from '@expo/config';

const config: ExpoConfig = {
  name: "StayGenie",
  slug: "staygenie",
  scheme: "staygenie",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/logo.png",
  userInterfaceStyle: "light",
  newArchEnabled: false,

  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.colinps.staygenie",
    runtimeVersion: "1.0.0",
    googleServicesFile: "./GoogleService-Info.plist"
  },

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    runtimeVersion: { policy: "appVersion" },
    googleServicesFile: "./google-services.json"
  },

  web: { 
    favicon: "./assets/favicon.png" 
  },

  extra: {
    eas: { projectId: "391713d4-1f73-45c0-a82e-e4ad89ac6f20" },
  },

  updates: {
    url: "https://u.expo.dev/391713d4-1f73-45c0-a82e-e4ad89ac6f20"
  },

  plugins: [
    "@react-native-firebase/app",
    "expo-web-browser",
    "expo-speech-recognition",

    // -------- MAPBOX PLUGIN (IMPORTANT) --------
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN
      }
    ]
    // -------------------------------------------
  ]
};

export default config;
