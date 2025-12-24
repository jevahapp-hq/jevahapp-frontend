import "dotenv/config";

export default {
  expo: {
    name: "jevah-app",
    slug: "jevah-app",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/images/Jevah.png",
    scheme: "jevahapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    extra: {
      API_URL:
        process.env.EXPO_PUBLIC_API_URL ||
        "https://jevahapp-backend.onrender.com",
      CLERK_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      eas: {
        projectId: "9ccc6cfe-5736-477b-b6d6-801debb2a124",
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.italgyirhrudhdhd.jevahapp",
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo and video library.",
        NSCameraUsageDescription:
          "This app needs access to your camera for media upload.",
        UIBackgroundModes: ["audio"], // Enable background audio playback
      },
    },
    android: {
      package: "com.italgyirhrudhdhd.jevahapp",
      edgeToEdgeEnabled: true,
      adaptiveIcon: {
        foregroundImage: "./assets/images/Jevah.png",
        backgroundColor: "#ffffff",
      },
      permissions: [
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_VIDEO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
      ],
      // Play Store specific configurations
      allowBackup: true,
      softwareKeyboardLayoutMode: "pan",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-font",
      "expo-asset",
      "expo-media-library",

      [
        "@sentry/react-native",
        {
          url: "https://sentry.io/",
          organization: "jevah-app", // from Sentry dashboard
          project: "jevah-app", // from Sentry dashboard
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
