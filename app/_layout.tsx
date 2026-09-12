import { ClerkProvider } from "@clerk/clerk-expo";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import * as Sentry from "@sentry/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Constants from "expo-constants";
import { Slot } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { BackHandler, Platform, Text, View } from "react-native";
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
import { useArtistDeepLinks } from "./hooks/useArtistDeepLinks";
import { useDownloadStore } from "@/store/useDownloadStore";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useMediaStore } from "@/store/useUploadStore";
import { appMmkv } from "../src/shared/cache/mmkvStorage";
import { hydrateFeedQueryCache } from "../src/shared/cache/hydrateFeedQueryCache";
import {
  startBootCacheHydration,
  whenBootCacheReady,
} from "../src/shared/cache/bootCache";
import {
  hydratePersistedQueryCache,
  registerPersistedQueryClient,
  subscribePersistedQueryCache,
  swrPersistedQueryCache,
} from "../src/shared/cache/persistQueryClient";
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
import { runFullscreenBackExit } from "../src/features/media/video-feed/fullscreenBackSession";
import { PERF, getAllPerfSummaries, perfMark } from "../src/shared/utils/perfMarks";
import { hideAppSplash } from "../src/shared/utils/appSplash";
import { warmupBackend } from "./utils/apiWarmup";
import { loadDeferredFonts } from "./utils/loadDeferredFonts";
import { PerformanceOptimizer } from "./utils/performance";

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

function resolveClerkPublishableKey(): string | null {
  const key = String(
    Constants.expoConfig?.extra?.CLERK_KEY ||
      process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      ""
  ).trim();
  if (!key) return null;
  if (!key.startsWith("pk_")) {
    throw new Error(
      "Invalid Clerk publishable key. Expected a key beginning with pk_test_ or pk_live_."
    );
  }
  if (
    process.env.EXPO_PUBLIC_CLERK_KEY_MODE === "live" &&
    !key.startsWith("pk_live_")
  ) {
    throw new Error(
      "This build requires a Clerk live publishable key (pk_live_), not pk_test_."
    );
  }
  return key;
}

const publishableKey = resolveClerkPublishableKey();

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
  hydratePersistedQueryCache(queryClient);
} catch {
  // ignore corrupt cache
}

registerPersistedQueryClient(queryClient);
subscribePersistedQueryCache(queryClient);
void startBootCacheHydration(queryClient);

export default function RootLayout() {
  useArtistDeepLinks();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    PlusJakartaSans: PlusJakartaSans_400Regular,
    "PlusJakartaSans-Regular": PlusJakartaSans_400Regular,
    "PlusJakartaSans-Medium": PlusJakartaSans_500Medium,
    "PlusJakartaSans-SemiBold": PlusJakartaSans_600SemiBold,
    "PlusJakartaSans-Bold": PlusJakartaSans_700Bold,
    "PlusJakartaSans-ExtraBold": PlusJakartaSans_800ExtraBold,
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...Feather.font,
  });

  useEffect(() => {
    if (__DEV__) return;
    const originalError = console.error;
    console.error = (...args) => {
      const first = args[0];
      const errorMessage =
        typeof first === "string" ? first : first?.toString?.() || "";
      // Clerk telemetry is noisy in production and is not an app failure.
      if (
        errorMessage.includes("clerk/telemetry") ||
        (typeof first === "string" && first.includes("clerk/telemetry"))
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

  // Keep native splash until Home paints. Expo Go route load can take seconds.
  useEffect(() => {
    const fallback = setTimeout(() => hideAppSplash(), __DEV__ ? 12000 : 1800);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    void loadDeferredFonts();
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

  // Critical path: disk seed is already running. Warm network + tab modules now.
  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;

    void (async () => {
      try {
        await whenBootCacheReady();
      } catch {}
      if (cancelled) return;

      try {
        await hydrateLiteProfile();
      } catch {}

      try {
        const { CacheManager } = await import("./utils/cache/CacheManager");
        CacheManager.rehydrateFromDisk();
      } catch {}
      try {
        const { URLManager } = await import("./utils/urlManager");
        URLManager.rehydrateFromDisk();
      } catch {}
      try {
        const { default: copyrightFreeMusicAPI } = await import(
          "./services/copyrightFreeMusicAPI"
        );
        copyrightFreeMusicAPI.rehydrateFromDisk();
      } catch {}

      void warmupBackend(3000).catch(() => {});

      const pageSize = getFeedPageSize();
      const useAuth = hasBackendSessionSync();
      swrPersistedQueryCache(queryClient, useAuth);
      queryClient
        .prefetchInfiniteQuery({
          queryKey: allContentQueryKey("ALL", pageSize, useAuth, useAuth),
          queryFn: async ({ pageParam }) => {
            const { fetchAllContentPage } = await import(
              "../src/shared/media/fetchAllContentPage"
            );
            return fetchAllContentPage({
              contentType: "ALL",
              page: typeof pageParam === "number" ? pageParam : 1,
              limit: pageSize,
              useAuth,
              forceChronological: true,
            });
          },
          initialPageParam: useAuth ? null : 1,
          staleTime: getFeedStaleMs(),
          maxPages: getFeedMaxPages(),
        })
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [isInitialized]);

  // Library / downloads: start immediately so Library tab has disk items on tap.
  useEffect(() => {
    if (!isInitialized) return;
    let cancelled = false;
    void (async () => {
      try {
        if (!cancelled) await loadSavedItems();
      } catch {}
      try {
        if (!cancelled) await loadDownloadedItems();
      } catch {}
      try {
        if (!cancelled) {
          await PerformanceOptimizer.getInstance().preloadCriticalData();
        }
      } catch {}
      try {
        const { preloadNavTapSound } = await import(
          "../src/shared/utils/uiSounds"
        );
        preloadNavTapSound();
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, loadDownloadedItems, loadSavedItems]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = () => {
      try {
        if (runFullscreenBackExit()) return true;
      } catch {
        return true;
      }
      // Leave the app. Do not sign the user out — session stays on disk.
      BackHandler.exitApp();
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
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
                <NotificationProvider>
                  <CommentModalProvider>
                    <LikeQueueBootstrap />
                    <CommentMediaShift>
                      <Slot />
                    </CommentMediaShift>
                    <DeferredRootOverlays />
                  </CommentModalProvider>
                </NotificationProvider>
            </GestureHandlerRootView>
          </ClerkProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
