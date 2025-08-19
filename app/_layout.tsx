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
import { useMediaStore } from './store/useUploadStore';
import ErrorBoundary from './components/ErrorBoundary';

// ✅ Initialize Sentry
Sentry.init({
  dsn: 'https://70c2253e1290544381fe6dae9bfdd172@o4509865295020032.ingest.us.sentry.io/4509865711763457',
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  enableInExpoDevelopment: true, // capture errors in dev
  debug: true, // log for debugging
});

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  (__DEV__ ? "http://192.168.100.133:4000" : "https://jevahapp-backend.onrender.com");

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
  }, [fontsLoaded, loadPersistedMedia, isInitialized]);

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
          <Slot />
        </GestureHandlerRootView>
      </ClerkProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
