import { ClerkProvider } from "@clerk/clerk-expo";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  Rubik_400Regular,
  Rubik_600SemiBold,
  Rubik_700Bold,
  useFonts,
} from "@expo-google-fonts/rubik";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Slot } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Alert, BackHandler, InteractionManager, Platform, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics as safeAreaInitialMetrics,
} from "react-native-safe-area-context";
import { CommentMediaShift } from "./components/CommentMediaShift";
import DeferredRootOverlays from "./components/DeferredRootOverlays";
import ErrorBoundary from "./components/ErrorBoundary";
import LikeQueueBootstrap from "./components/LikeQueueBootstrap";
import { CommentModalProvider } from "./context/CommentModalContext";
import { NotificationProvider } from "./context/NotificationContext";
import { PersistentNotificationProvider } from "./context/PersistentNotificationContext";
import { useArtistDeepLinks } from "./hooks/useArtistDeepLinks";
import { useDownloadStore } from "./store/useDownloadStore";
import { useLibraryStore } from "./store/useLibraryStore";
import { useMediaStore } from "./store/useUploadStore";
import { hydrateFallbackKvFromAsyncStorage, appMmkv } from "../src/shared/cache/mmkvStorage";
import { hydrateFeedQueryCache } from "../src/shared/cache/hydrateFeedQueryCache";
import {
  allContentQueryKey,
  getFeedPageSize,
  getFeedStaleMs,
  getFeedMaxPages,
} from "../src/shared/config/feedCachePolicy";
import {
  hydrateLiteProfile,
  hydrateLiteProfileSync,
} from "../src/shared/lite/liteProfile";
import { hasBackendSessionSync } from "./utils/sessionAuth";
import { PERF, getAllPerfSummaries, perfMark, perfMeasure } from "../src/shared/utils/perfMarks";
import { warmupBackend } from "./utils/apiWarmup";
import { PerformanceOptimizer } from "./utils/performance";

let splashPerfRecorded = false;
function recordSplashHide(): void {
  if (splashPerfRecorded) return;
  splashPerfRecorded = true;
  perfMeasure(PERF.SPLASH_HIDE, PERF.APP_START);
}

if (__DEV__) {
  (globalThis as any).__jevahDumpPerf = () => {
    const summaries = getAllPerfSummaries();
    console.log("📊 Jevah perf summaries", summaries);
    return summaries;
  };
}

// Lean Sentry boot: no session replay / feedback at module load (expensive).
Sentry.init({
  dsn: "https://70c2253e1290544381fe6dae9bfdd172@o4509865295020032.ingest.us.sentry.io/4509865711763457",
  debug: false,
  sendDefaultPii: true,
  tracesSampleRate: __DEV__ ? 0.2 : 0.1,
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  integrations: [],
});

const publishableKey =
  Constants.expoConfig?.extra?.CLERK_KEY ||
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_ZWxlZ2FudC10aWdlci0zNi5jbGVyay5hY2NvdW50cy5kZXYk";

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore
    }
  },
};

SplashScreen.preventAutoHideAsync().catch(() => {});
perfMark(PERF.APP_START);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
  },
});

// Sync Lite mode + MMKV → React Query before first Home paint
try {
  hydrateLiteProfileSync();
  hydrateFeedQueryCache(queryClient);
} catch {
  // ignore corrupt cache
}

export default function RootLayout() {
  useArtistDeepLinks();
  const [fontsLoaded, fontError] = useFonts({
    Rubik_400Regular,
    Rubik_600SemiBold,
    Rubik_700Bold,
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...Feather.font,
  });

  useEffect(() => {
    if (__DEV__) return;
    const originalError = console.error;
    console.error = (...args) => {
      const errorMessage = args[0]?.toString() || "";
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
        errorMessage.includes("User not found") ||
        errorMessage.includes("Email not found") ||
        errorMessage.includes("Forgot password failed: User not found") ||
        errorMessage.includes("Error fetching categories")
      ) {
        return;
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const [isInitialized, setIsInitialized] = useState(false);
  const [error] = useState<string | null>(null);
  const loadPersistedMedia = useMediaStore((state) => state.loadPersistedMedia);
  const loadDownloadedItems = useDownloadStore(
    (state) => state.loadDownloadedItems
  );
  const loadSavedItems = useLibraryStore((state) => state.loadSavedItems);

  // Never trap users on native splash — fail-open quickly
  useEffect(() => {
    const fallback = setTimeout(() => {
      SplashScreen.hideAsync()
        .then(() => recordSplashHide())
        .catch(() => {});
    }, 400);
    return () => clearTimeout(fallback);
  }, []);

  // Hide splash as soon as fonts resolve OR on first paint of the shell
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
        .then(() => recordSplashHide())
        .catch(() => {});
      return;
    }
    // Don't wait on fonts forever — paint shell ASAP
    const raf = requestAnimationFrame(() => {
      SplashScreen.hideAsync()
        .then(() => recordSplashHide())
        .catch(() => {});
    });
    return () => cancelAnimationFrame(raf);
  }, [fontsLoaded, fontError]);

  // Migrate legacy AsyncStorage onboarding → MMKV once (sync Redirect path)
  useEffect(() => {
    void (async () => {
      try {
        if (appMmkv.getString("onboardingSeen") === "1") return;
        const seen = await (
          await import("@react-native-async-storage/async-storage")
        ).default.getItem("onboardingSeen");
        if (seen === "true") {
          appMmkv.set("onboardingSeen", "1");
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (isInitialized) return;
    setIsInitialized(true);
    void Promise.resolve(loadPersistedMedia()).catch(() => {});
  }, [loadPersistedMedia, isInitialized]);

  // Critical path: hydrate + warmup + feed prefetch (don't contend with Home paint)
  useEffect(() => {
    if (!isInitialized) return;

    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          await hydrateLiteProfile();
        } catch {}

        try {
          await hydrateFallbackKvFromAsyncStorage([
            "content-cache-store",
            "rq-all-content-seed",
            "rq-all-content-seed:lite",
            "rq-all-content-seed:full",
            "feed-page:ALL:public",
            "feed-page:ALL:auth",
            "feed-page:ALL:public:lite",
            "feed-page:ALL:auth:lite",
            "feed-page:ALL:public:full",
            "feed-page:ALL:auth:full",
            "video-feed-data",
          ]);
          hydrateFeedQueryCache(queryClient);
        } catch {}

        void warmupBackend(3000).catch(() => {});

        const pageSize = getFeedPageSize();
        const useAuth = hasBackendSessionSync();
        // Warm the key Home actually reads (auth For You when logged in)
        queryClient
          .prefetchInfiniteQuery({
            queryKey: allContentQueryKey("ALL", pageSize, useAuth, useAuth),
            queryFn: async ({ pageParam }) => {
              const { fetchAllContentPage } = await import(
                "../src/shared/media/fetchAllContentPage"
              );
              if (useAuth) {
                const cursor =
                  pageParam === null || pageParam === undefined
                    ? null
                    : typeof pageParam === "string"
                      ? pageParam
                      : null;
                return fetchAllContentPage({
                  contentType: "ALL",
                  page: cursor == null ? 1 : 2,
                  limit: pageSize,
                  useAuth: true,
                  cursor,
                });
              }
              return fetchAllContentPage({
                contentType: "ALL",
                page: (pageParam as number) || 1,
                limit: pageSize,
                useAuth: false,
                forceChronological: true,
              });
            },
            initialPageParam: useAuth ? null : 1,
            staleTime: getFeedStaleMs(),
            maxPages: getFeedMaxPages(),
          })
          .catch(() => {});
      })();
    });

    return () => task.cancel();
  }, [isInitialized]);

  // Secondary: downloads / library / misc preload — after first interactions settle
  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;
    let innerClear: (() => void) | undefined;
    const task = InteractionManager.runAfterInteractions(() => {
      const t = setTimeout(() => {
        if (cancelled) return;
        void (async () => {
          try {
            await loadDownloadedItems();
          } catch {}
          try {
            await loadSavedItems();
          } catch {}
          try {
            await PerformanceOptimizer.getInstance().preloadCriticalData();
          } catch {}
          try {
            const { preloadNavTapSound } = await import(
              "../src/shared/utils/uiSounds"
            );
            preloadNavTapSound();
          } catch {}
        })();
      }, 600);
      innerClear = () => clearTimeout(t);
    });
    return () => {
      cancelled = true;
      task.cancel();
      innerClear?.();
    };
  }, [isInitialized, loadDownloadedItems, loadSavedItems]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = () => {
      Alert.alert("Exit App?", "Do you want to exit the app?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => BackHandler.exitApp(),
        },
      ]);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, []);

  if (!publishableKey) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, color: "red", textAlign: "center" }}>
          Clerk key missing. Please configure EAS secrets.
        </Text>
      </View>
    );
  }

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

  // Mount shell immediately (fonts apply when ready — do not block providers)
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider initialMetrics={safeAreaInitialMetrics ?? undefined}>
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
                    <LikeQueueBootstrap />
                    <CommentMediaShift>
                      <Slot />
                    </CommentMediaShift>
                    <DeferredRootOverlays />
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
