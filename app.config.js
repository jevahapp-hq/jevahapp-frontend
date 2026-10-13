try {
  require("dotenv/config");
} catch {
  // Expo CLI already loads .env / .env.local; dotenv may be absent while node_modules is repairing.
}

const appVariant =
  process.env.EXPO_PUBLIC_APP_VARIANT === "lite" ? "lite" : "full";
const isLiteVariant = appVariant === "lite";

const ANDROID_PACKAGE = {
  full: "com.italgyirhrudhdhd.jevahapp",
  lite: "com.italgyirhrudhdhd.jevahapp.lite",
};

/** White launch screen with the Jevah icon and app name in the center. */
const SPLASH_BACKGROUND = "#FFFFFF";
const SPLASH_IMAGE = "./assets/images/splash-logo.png";

/**
 * EAS profile can set ANDROID_BUILD_ARCHS=arm64-v8a, a comma list, or "all".
 * "all" leaves the ABI list unset so the APK is not limited to 32-bit or 64-bit.
 */
const requestedAndroidArchs = (process.env.ANDROID_BUILD_ARCHS || "arm64-v8a").trim();
const androidBuildArchs =
  requestedAndroidArchs === "all"
    ? null
    : requestedAndroidArchs
        .split(",")
        .map((arch) => arch.trim())
        .filter(Boolean);

export default {
  expo: {
    // Display name is always "Jevah App". Lite only changes package id / packaging
    // for 32-bit phones — not the home-screen label.
    name: "Jevah App",
    slug: "jevah-app",
    version: "1.0.2",
    orientation: "portrait",
    icon: "./assets/images/Jevah.png",
    scheme: ["jevahapp", "jevah"],
    userInterfaceStyle: "light",
    backgroundColor: "#FCFCFD",
    splash: {
      image: SPLASH_IMAGE,
      resizeMode: "contain",
      backgroundColor: SPLASH_BACKGROUND,
    },
    newArchEnabled: true,
    owner: "jevah_app",
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
        projectId: "327185a0-8fa5-4dd2-a762-0d5c86a9bb35",
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: isLiteVariant
        ? "com.italgyirhrudhdhd.jevahapp.lite"
        : "com.italgyirhrudhdhd.jevahapp",
      associatedDomains: ["applinks:jevahapp.com", "applinks:www.jevahapp.com"],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo and video library.",
        NSCameraUsageDescription:
          "This app needs access to your camera for media upload.",
        UIBackgroundModes: ["audio"],
      },
      splash: {
        image: SPLASH_IMAGE,
        resizeMode: "contain",
        backgroundColor: SPLASH_BACKGROUND,
      },
    },
    android: {
      package: ANDROID_PACKAGE[appVariant],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "jevahapp.com",
              pathPrefix: "/content",
            },
            {
              scheme: "https",
              host: "www.jevahapp.com",
              pathPrefix: "/content",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
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
      allowBackup: false,
      usesCleartextTraffic:
        process.env.EXPO_PUBLIC_API_ENV === "local" ||
        process.env.EXPO_PUBLIC_API_ENV === "dev" ||
        process.env.EXPO_PUBLIC_API_ENV === "development",
      softwareKeyboardLayoutMode: "pan",
      navigationBar: {
        backgroundColor: "#FCFCFD",
      },
      splash: {
        image: SPLASH_IMAGE,
        resizeMode: "contain",
        backgroundColor: SPLASH_BACKGROUND,
      },
    },
    web: {
      bundler: "metro",
      // Static SSR races Android HMR and OOMs Metro on this machine.
      // Keep single for day-to-day mobile; use "static" only for web export builds.
      output: process.env.EXPO_WEB_OUTPUT === "static" ? "static" : "single",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "./plugins/withAndroidNoDupResources",
      "./plugins/withAndroidMedia3",
      "./plugins/withAndroidLargeHeap",
      "./plugins/withScreensFabricGuard",
      [
        "expo-router",
        {
          // Expo Go refresh was evaluating every screen up front. Android
          // dev loads a route when it opens. iOS and release builds stay eager.
          asyncRoutes: {
            android: "development",
            default: false,
          },
        },
      ],
      "expo-secure-store",
      "expo-font",
      "expo-asset",
      "expo-media-library",
      "expo-audio",
      "expo-video",
      "expo-web-browser",
      "expo-sharing",
      [
        "expo-splash-screen",
        {
          backgroundColor: SPLASH_BACKGROUND,
          image: SPLASH_IMAGE,
          imageWidth: 190,
          resizeMode: "contain",
          dark: {
            backgroundColor: SPLASH_BACKGROUND,
            image: SPLASH_IMAGE,
          },
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            ...(androidBuildArchs ? { buildArchs: androidBuildArchs } : {}),
            // Minify/crunch/bundle-compress produce duplicate res/* names in the
            // APK zip. Tecno/HiOS PackageInstaller then fails ("package installer
            // failed") even when USB-sideloading a valid-looking file.
            enableMinifyInReleaseBuilds: !isLiteVariant,
            enableShrinkResourcesInReleaseBuilds: false,
            enablePngCrunchInReleaseBuilds: !isLiteVariant,
            enableBundleCompression: !isLiteVariant,
            useLegacyPackaging: isLiteVariant,
            extraProguardRules: [
              "-keep class com.facebook.hermes.** { *; }",
              "-keep class com.facebook.jni.** { *; }",
              "-keep class expo.modules.** { *; }",
              "-keep class androidx.media3.** { *; }",
              "-dontwarn expo.modules.**",
              "-dontwarn androidx.media3.**",
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
