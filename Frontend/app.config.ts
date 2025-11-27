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
    image: "./assets/images/logo.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },

  ios: {
  supportsTablet: true,
  bundleIdentifier: "com.colinps.staygenie",
  runtimeVersion: "1.0.0",
  googleServicesFile: "./GoogleService-Info.plist",
  infoPlist: {
    CFBundleURLTypes: [
      {
        CFBundleURLSchemes: [
          "com.googleusercontent.apps.962898883484-q94pa2l7olvh9c8jj4iee3fvni9rnedm"
        ]
      }
    ]
  }
},

  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/images/logo.png",
      backgroundColor: "#ffffff"
    },
    package: "com.colinps.staygenie",
    runtimeVersion: { policy: "appVersion" },
    googleServicesFile: "./google-services.json"
  },

  web: {
    favicon: "./assets/images/logo.png"
  },

  extra: {
    eas: { projectId: "391713d4-1f73-45c0-a82e-e4ad89ac6f20" }
  },

  updates: {
    url: "https://u.expo.dev/391713d4-1f73-45c0-a82e-e4ad89ac6f20"
  },

  plugins: [
    "@react-native-firebase/app",
    // Removed analytics plugin - it auto-configures when @react-native-firebase/app is present
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static"
        }
      }
    ],
    "expo-web-browser",
    "expo-speech-recognition",
    [
      "@rnmapbox/maps",
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN
      }
    ]
  ]
};

export default config;