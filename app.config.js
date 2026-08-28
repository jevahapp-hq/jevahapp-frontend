import "dotenv/config";

const appVariant =
  process.env.EXPO_PUBLIC_APP_VARIANT === "lite" ? "lite" : "full";
const isLiteVariant = appVariant === "lite";

const ANDROID_PACKAGE = {
  full: "com.italgyirhrudhdhd.jevahapp",
  lite: "com.italgyirhrudhdhd.jevahapp.lite",
};

/** EAS profile can set ANDROID_BUILD_ARCHS=arm64-v8a (smallest sideload) or armeabi-v7a,arm64-v8a (Play). */
const androidBuildArchs = (process.env.ANDROID_BUILD_ARCHS || "arm64-v8a")
  .split(",")
  .map((arch) => arch.trim())
  .filter(Boolean);

export default {
  expo: {
    name: isLiteVariant ? "Jevah Lite" : "jevah-app",
    slug: "jevah-app",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/images/Jevah.png",
    scheme: isLiteVariant ? ["jevahlite", "jevah"] : ["jevahapp", "jevah"],
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    owner: "bldlne",
    extra: {
      appVariant,
      API_URL:
        process.env.EXPO_PUBLIC_API_ENV === "local" ||
        process.env.EXPO_PUBLIC_API_ENV === "dev" ||
        process.env.EXPO_PUBLIC_API_ENV === "development"
          ? process.env.EXPO_PUBLIC_API_URL_LOCAL ||
            "http://localhost:4000"
          : process.env.EXPO_PUBLIC_API_URL_PRODUCTION ||
            process.env.EXPO_PUBLIC_API_URL ||
            "https://api.jevahapp.com",
      API_ENV: process.env.EXPO_PUBLIC_API_ENV || "production",
      CLERK_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      eas: {
        projectId: "214e1ad5-a38e-4f00-89e9-d034797bc9c8",
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: isLiteVariant
        ? "com.italgyirhrudhdhd.jevahapp.lite"
        : "com.italgyirhrudhdhd.jevahapp",
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo and video library.",
        NSCameraUsageDescription:
          "This app needs access to your camera for media upload.",
        UIBackgroundModes: ["audio"],
      },
    },
    android: {
      package: ANDROID_PACKAGE[appVariant],
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
      networkSecurityConfig: "./config/network_security_config.xml",
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
        "expo-build-properties",
        {
          android: {
            buildArchs: androidBuildArchs,
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: false,
            enableBundleCompression: true,
            useLegacyPackaging: isLiteVariant,
            extraProguardRules: [
              "-keep class com.facebook.hermes.** { *; }",
              "-keep class com.facebook.jni.** { *; }",
            ].join("\n"),
          },
        },
      ],
      [
        "@sentry/react-native",
        {
          url: "https://sentry.io/",
          organization: "jevah-app",
          project: "jevah-app",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
