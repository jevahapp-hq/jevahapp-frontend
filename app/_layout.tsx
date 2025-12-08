import { ClerkProvider } from "@clerk/clerk-expo";
import {
    Rubik_400Regular,
    Rubik_600SemiBold,
    Rubik_700Bold,
    useFonts,
} from "@expo-google-fonts/rubik";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { Slot, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Alert, BackHandler, Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import CommentModalV2 from "./components/CommentModalV2";
import ErrorBoundary from "./components/ErrorBoundary";
import FloatingAudioPlayer from "./components/FloatingAudioPlayer";
import MiniAudioPlayer from "./components/MiniAudioPlayer";
import ServerUnavailableModalWrapper from "./components/ServerUnavailableModalWrapper";
import { CommentModalProvider } from "./context/CommentModalContext";
import { NotificationProvider } from "./context/NotificationContext";
import { PersistentNotificationProvider } from "./context/PersistentNotificationContext";
import { useAuth } from "./hooks/useAuth";
import { useDownloadStore } from "./store/useDownloadStore";
import { useLibraryStore } from "./store/useLibraryStore";
import { useMediaStore } from "./store/useUploadStore";
import { warmupBackend } from "./utils/apiWarmup";
import { PerformanceOptimizer } from "./utils/performance";

// ✅ Initialize Sentry
Sentry.init({
  dsn: "https://70c2253e1290544381fe6dae9bfdd172@o4509865295020032.ingest.us.sentry.io/4509865711763457",
  debug: __DEV__, // only log in development

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [
    Sentry.mobileReplayIntegration(),
    Sentry.feedbackIntegration(),
  ],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  "https://jevahapp-backend-rped.onrender.com";

const publishableKey =
  Constants.expoConfig?.extra?.CLERK_KEY ||
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_ZWxlZ2FudC10aWdlci0zNi5jbGVyay5hY2NvdW50cy5kZXYk"; // fallback

// ✅ Clerk token cache
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error("Error getting token:", err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error("Error saving token:", err);
    }
  },
};

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  // Suppress Clerk telemetry errors, video URL errors, and network failures
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0]?.toString() || "";
      
      // Suppress non-critical errors that don't affect functionality
      if (
        args[0]?.includes?.("clerk/telemetry") ||
        args[0]?.includes?.("Clerk hooks not available") ||
        args[0]?.includes?.("Video error for") ||
        args[0]?.includes?.("AVPlayerItem instance has failed") ||
        args[0]?.includes?.("error code -11819") ||
        args[0]?.includes?.("AVFoundationErrorDomain") ||
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("TypeError: Network request failed")
      ) {
        // Only log network errors in development
        if (__DEV__ && (errorMessage.includes("Network request failed") || errorMessage.includes("TypeError: Network request failed"))) {
          // Log once per error type to avoid spam
          const errorKey = `network_error_${Date.now()}`;
          if (!(global as any).__loggedNetworkErrors) {
            (global as any).__loggedNetworkErrors = new Set();
          }
          if (!(global as any).__loggedNetworkErrors.has(errorKey)) {
            (global as any).__loggedNetworkErrors.add(errorKey);
            // Clear the set after 5 seconds to allow new logs
            setTimeout(() => {
              (global as any).__loggedNetworkErrors?.delete(errorKey);
            }, 5000);
            originalError.apply(console, args);
          }
        }
        return; // Suppress these specific errors in production
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadPersistedMedia = useMediaStore((state) => state.loadPersistedMedia);
  const loadDownloadedItems = useDownloadStore(
    (state) => state.loadDownloadedItems
  );
  const loadSavedItems = useLibraryStore((state) => state.loadSavedItems);
  const { signOut } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log("🚀 App initializing...");
        console.log("✅ API_URL =", API_BASE_URL);
        console.log("✅ CLERK_KEY =", publishableKey ? "Present" : "Missing");
        console.log("🔧 Environment:", __DEV__ ? "Development" : "Production");

        // Try to load persisted media
        try {
          await loadPersistedMedia();
          console.log("✅ Media loaded successfully");
        } catch (mediaErr) {
          console.warn(
            "⚠️ Media loading failed (continuing anyway):",
            mediaErr
          );
        }

        // Try to load downloaded items
        try {
          await loadDownloadedItems();
          console.log("✅ Downloads loaded successfully");
        } catch (downloadErr) {
          console.warn(
            "⚠️ Downloads loading failed (continuing anyway):",
            downloadErr
          );
        }

        // Try to load saved library items
        try {
          await loadSavedItems();
          console.log("✅ Library items loaded successfully");
        } catch (libraryErr) {
          console.warn(
            "⚠️ Library items loading failed (continuing anyway):",
            libraryErr
          );
        }

        // Preload critical data for better performance
        try {
          await PerformanceOptimizer.getInstance().preloadCriticalData();
          console.log("✅ Critical data preloaded successfully");
        } catch (preloadErr) {
          console.warn(
            "⚠️ Critical data preloading failed (continuing anyway):",
            preloadErr
          );
        }

        // Warm up backend to prevent Render cold starts
        try {
          console.log("🔥 Warming up backend...");
          warmupBackend().catch((warmupErr) => {
            console.warn("⚠️ Backend warmup failed:", warmupErr);
          });
        } catch (warmupErr) {
          console.warn("⚠️ Backend warmup error (continuing anyway):", warmupErr);
        }

        console.log("✅ App initialization complete");
        setIsInitialized(true);
      } catch (err) {
        console.error("❌ App initialization failed:", err);
        setError("Initialization failed");
        setIsInitialized(true);
      }
    };

    if (fontsLoaded && !isInitialized) {
      initializeApp();
    }
  }, [
    fontsLoaded,
    loadPersistedMedia,
    loadDownloadedItems,
    loadSavedItems,
    isInitialized,
  ]);

  // Intercept Android hardware back to properly exit app instead of logging out
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = () => {
      Alert.alert("Exit App?", "Do you want to exit the app?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => {
            // Properly exit the app without logging out
            BackHandler.exitApp();
          },
        },
      ]);
      return true; // prevent default exit
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, []);

  // ✅ Fonts not loaded
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  // ✅ Missing Clerk key
  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: "red", textAlign: "center" }}>
          ❌ Clerk key missing. Please configure EAS secrets.
        </Text>
      </View>
    );
  }

  // ✅ Initialization error
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 20 }}>
          App initialization failed
        </Text>
        <Text style={{ fontSize: 14, textAlign: "center", color: "red" }}>
          {error}
        </Text>
      </View>
    );
  }

  // ✅ Normal app rendering
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ClerkProvider
          publishableKey={publishableKey}
          tokenCache={tokenCache}
          afterSignInUrl="/"
          afterSignUpUrl="/"
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <PersistentNotificationProvider>
              <NotificationProvider>
                <CommentModalProvider>
                  <Slot />
                  <CommentModalV2 />
                  <FloatingAudioPlayer />
                  <MiniAudioPlayer />
                  <ServerUnavailableModalWrapper />
                </CommentModalProvider>
              </NotificationProvider>
            </PersistentNotificationProvider>
          </GestureHandlerRootView>
        </ClerkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
