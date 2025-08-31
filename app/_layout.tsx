import { ClerkProvider } from '@clerk/clerk-expo';
import { Rubik_400Regular, Rubik_600SemiBold, Rubik_700Bold, useFonts } from '@expo-google-fonts/rubik';
import * as Sentry from '@sentry/react-native';
import Constants from "expo-constants";
import { Slot } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CommentReplyModal from './components/CommentReplyModal';
import ErrorBoundary from './components/ErrorBoundary';
import { CommentModalProvider } from './context/CommentModalContext';
import { useDownloadStore } from './store/useDownloadStore';
import { useMediaStore } from './store/useUploadStore';
import { PerformanceOptimizer } from './utils/performance';

// ✅ Initialize Sentry
Sentry.init({
  dsn: 'https://70c2253e1290544381fe6dae9bfdd172@o4509865295020032.ingest.us.sentry.io/4509865711763457',
  debug: __DEV__, // only log in development

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  "https://jevahapp-backend.onrender.com";

const publishableKey = Constants.expoConfig?.extra?.CLERK_KEY ||
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "pk_test_ZWxlZ2FudC10aWdlci0zNi5jbGVyay5hY2NvdW50cy5kZXYk"; // fallback

// ✅ Clerk token cache
const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.error('Error getting token:', err);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return await SecureStore.setItemAsync(key, value);
    } catch (err) {
      console.error('Error saving token:', err);
    }
  },
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Rubik_400Regular,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadPersistedMedia = useMediaStore((state) => state.loadPersistedMedia);
  const loadDownloadedItems = useDownloadStore((state) => state.loadDownloadedItems);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App initializing...');
        console.log('✅ API_URL =', API_BASE_URL);
        console.log('✅ CLERK_KEY =', publishableKey ? 'Present' : 'Missing');
        console.log('🔧 Environment:', __DEV__ ? 'Development' : 'Production');

        // Try to load persisted media
        try {
          await loadPersistedMedia();
          console.log('✅ Media loaded successfully');
        } catch (mediaErr) {
          console.warn('⚠️ Media loading failed (continuing anyway):', mediaErr);
        }

        // Try to load downloaded items
        try {
          await loadDownloadedItems();
          console.log('✅ Downloads loaded successfully');
        } catch (downloadErr) {
          console.warn('⚠️ Downloads loading failed (continuing anyway):', downloadErr);
        }

        // Preload critical data for better performance
        try {
          await PerformanceOptimizer.preloadCriticalData();
          console.log('✅ Critical data preloaded successfully');
        } catch (preloadErr) {
          console.warn('⚠️ Critical data preloading failed (continuing anyway):', preloadErr);
        }

        console.log('✅ App initialization complete');
        setIsInitialized(true);
      } catch (err) {
        console.error('❌ App initialization failed:', err);
        setError('Initialization failed');
        setIsInitialized(true);
      }
    };

    if (fontsLoaded && !isInitialized) {
      initializeApp();
    }
  }, [fontsLoaded, loadPersistedMedia, loadDownloadedItems, isInitialized]);

  // ✅ Fonts not loaded
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          App initialization failed
        </Text>
        <Text style={{ fontSize: 14, textAlign: 'center', color: 'red' }}>{error}</Text>
      </View>
    );
  }

  // ✅ Normal app rendering
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <CommentModalProvider>
              <Slot />
              <CommentReplyModal />
            </CommentModalProvider>
          </GestureHandlerRootView>
        </ClerkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
