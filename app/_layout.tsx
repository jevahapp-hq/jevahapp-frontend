import { ClerkProvider } from "@clerk/clerk-expo";
import {
  Rubik_400Regular,
  Rubik_600SemiBold,
  Rubik_700Bold,
  useFonts,
} from "@expo-google-fonts/rubik";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Slot, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Alert, BackHandler, InteractionManager, Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { fetchAllContentPublic } from "../src/shared/hooks/useMedia";
import CommentModalV2 from "./components/CommentModalV2";
import ErrorBoundary from "./components/ErrorBoundary";
import FloatingAudioPlayer from "./components/FloatingAudioPlayer";
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
  // Perf: 1.0 = 100% sampling causes significant overhead; use 0.1 in prod
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  profilesSampleRate: __DEV__ ? 1.0 : 0.1,

  // Configure Session Replay
  replaysSessionSampleRate: __DEV__ ? 0.1 : 0.01,
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
  "https://api.jevahapp.com";

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
      // console.error("Error getting token:", err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      // console.error("Error saving token:", err);
    }
  },
};

// Keep native splash visible until we're ready (fonts + critical init)
SplashScreen.preventAutoHideAsync().catch(() => { });

// Create React Query client with cache settings matching backend (15 minutes)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - matches backend cache
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache after stale
      retry: 1, // Retry once on failure
      refetchOnWindowFocus: false, // Don't refetch on app focus (React Native)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: false, // Use cache if available, don't refetch on mount
    },
  },
});

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  // Suppress Clerk telemetry errors, video URL errors, network failures, and expected auth errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0]?.toString() || "";

      // Suppress non-critical errors that don't affect functionality
      if (
        args[0]?.includes?.("clerk/telemetry") ||
        args[0]?.includes?.("Clerk hooks not available") ||
        args[0]?.includes?.("Video error for") ||
        args[0]?.includes?.("Video load error") ||
        args[0]?.includes?.("AVPlayerItem instance has failed") ||
        args[0]?.includes?.("error code -11819") ||
        args[0]?.includes?.("error code -1001") ||
        args[0]?.includes?.("NSURLErrorDomain") ||
        args[0]?.includes?.("NSURLErrorTimedOut") ||
        args[0]?.includes?.("AVFoundationErrorDomain") ||
        args[0]?.includes?.("Audio sermon error") ||
        args[0]?.includes?.("Failed to load audio") ||
        args[0]?.includes?.("Failed to load the player item") ||
        args[0]?.includes?.("request timed out") ||
        errorMessage.includes("Network request failed") ||
        errorMessage.includes("TypeError: Network request failed") ||
        errorMessage.includes("The request timed out") ||
        errorMessage.includes("NSURLErrorTimedOut") ||
        errorMessage.includes("error code -1001") ||
        // Suppress "User not found" errors from password reset (expected behavior for security)
        errorMessage.includes("User not found") ||
        errorMessage.includes("Email not found") ||
        errorMessage.includes("Forgot password failed: User not found") ||
        // Suppress categories API errors (graceful degradation - app works without categories)
        errorMessage.includes("Error fetching categories")
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

  // Critical path: only persisted media (current playback). Show app shell ASAP.
  useEffect(() => {
    if (!fontsLoaded || isInitialized) return;

    let cancelled = false;

    const runCriticalInit = async () => {
      try {
        await loadPersistedMedia();
      } catch {
        // Non-blocking; app works without it
      }
      if (!cancelled) {
        setIsInitialized(true);
      }
    };

    runCriticalInit();
    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, loadPersistedMedia, isInitialized]);

  // Deferred init: run after first paint so content appears faster
  useEffect(() => {
    if (!fontsLoaded || !isInitialized) return;

    const task = InteractionManager.runAfterInteractions(() => {
      (async () => {
        try {
          await loadDownloadedItems();
        } catch { }
        try {
          await loadSavedItems();
        } catch { }
        try {
          await PerformanceOptimizer.getInstance().preloadCriticalData();
        } catch { }
        // Stagger requests to avoid 429 - warmup first, then prefetch after longer delay
        await warmupBackend().catch(() => { });
        await new Promise((r) => setTimeout(r, 2500));
        queryClient.prefetchQuery({
          queryKey: ["all-content", "ALL", 1, 50, false],
          queryFn: () => fetchAllContentPublic("ALL"),
        }).catch(() => { });
      })();
    });

    return () => task.cancel();
  }, [fontsLoaded, isInitialized, loadDownloadedItems, loadSavedItems]);

  // Hide splash when app is ready to show (fonts + critical init done)
  useEffect(() => {
    if (fontsLoaded && isInitialized && !error) {
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded, isInitialized, error]);

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
      <QueryClientProvider client={queryClient}>
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
                    <ServerUnavailableModalWrapper />
                  </CommentModalProvider>
                </NotificationProvider>
              </PersistentNotificationProvider>
            </GestureHandlerRootView>
          </ClerkProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
