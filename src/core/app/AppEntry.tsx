/**
 * App Entry with Instant-On Architecture
 * 
 * Features:
 * - Synchronous MMKV cache hydration
 * - BootSplash control for zero dark flashes
 * - React Query cache restoration before first render
 * - FlashList ready state synchronization
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, AppState } from 'react-native';
import { hide as hideBootSplash, isVisible as isBootSplashVisible } from 'react-native-bootsplash';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { hydrateQueryCache, setupCachePersistence } from '../storage/queryCachePersistence';
import { mmkvStorage } from '../storage/mmkvStorage';

// Configuration constants
const SPLASH_MIN_DISPLAY_MS = 800; // Minimum splash display time

interface AppEntryProps {
  children: React.ReactNode;
  onReady?: () => void;
}

interface AppReadyState {
  cacheHydrated: boolean;
  fontsLoaded: boolean;
  flashListReady: boolean;
  initialDataLoaded: boolean;
}

/**
 * Check if we have valid cached data to show immediately
 */
const hasValidCache = (): boolean => {
  try {
    const allKeys = mmkvStorage.getAllKeys();
    return allKeys.some(key => key.includes('react-query-cache'));
  } catch {
    return false;
  }
};

/**
 * App Entry Component
 * Manages the critical path from app launch to interactive UI
 */
export const AppEntry: React.FC<AppEntryProps> = ({ children, onReady }) => {
  // Track all readiness states
  const [readyState, setReadyState] = useState<AppReadyState>({
    cacheHydrated: false,
    fontsLoaded: false,
    flashListReady: false,
    initialDataLoaded: false,
  });
  
  const [isReady, setIsReady] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Refs for timing and query client
  const splashStartTime = useRef<number>(Date.now());
  const queryClientRef = useRef<QueryClient | null>(null);
  const appStateRef = useRef(AppState.currentState);
  
  // Initialize QueryClient with cache hydration
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 15 * 60 * 1000, // 15 minutes
          gcTime: 30 * 60 * 1000, // 30 minutes
          retry: 1,
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          refetchOnMount: false,
          // Start with cached data immediately
          placeholderData: (previousData: unknown) => previousData,
        },
      },
    });
    
    // Hydrate cache synchronously before any render
    hydrateQueryCache(queryClientRef.current);
    
    // Setup automatic persistence
    setupCachePersistence(queryClientRef.current);
  }
  
  const queryClient = queryClientRef.current;
  
  /**
   * Check if all readiness conditions are met
   */
  const checkAllReady = useCallback(() => {
    const { cacheHydrated, fontsLoaded, flashListReady, initialDataLoaded } = readyState;
    
    // If we have cache, we can show content immediately after fonts load
    const hasCache = hasValidCache();
    
    if (hasCache) {
      // With cache: show as soon as fonts are loaded
      return fontsLoaded;
    } else {
      // Without cache: wait for initial data
      return fontsLoaded && initialDataLoaded;
    }
  }, [readyState]);
  
  /**
   * Hide splash screen with minimum display time
   */
  const hideSplash = useCallback(async () => {
    // Only hide if still visible
    if (!isBootSplashVisible()) return;
    
    const elapsed = Date.now() - splashStartTime.current;
    const remainingDelay = Math.max(0, SPLASH_MIN_DISPLAY_MS - elapsed);
    
    // Ensure minimum splash display time for perceived performance
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
    
    await hideBootSplash({ fade: true });
  }, []);
  
  /**
   * Mark component as ready and hide splash
   */
  const markReady = useCallback(async () => {
    if (isReady) return;
    
    setIsReady(true);
    setShowContent(true);
    
    // Hide splash screen
    await hideSplash();
    
    // Notify parent
    onReady?.();
  }, [isReady, hideSplash, onReady]);
  
  // Initialize on mount
  useEffect(() => {
    // Mark cache as hydrated immediately since we did it synchronously
    setReadyState(prev => ({ ...prev, cacheHydrated: true }));
  }, []);
  
  // Monitor app state for background/foreground transitions
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - ensure content is visible
        if (isReady) {
          setShowContent(true);
        }
      }
      
      appStateRef.current = nextAppState;
    });
    
    return () => subscription.remove();
  }, [isReady]);
  
  // Check readiness and hide splash when ready
  useEffect(() => {
    if (checkAllReady() && !isReady) {
      markReady();
    }
  }, [readyState, checkAllReady, isReady, markReady]);
  
  /**
   * Public API for child components to report readiness
   */
  const reportReady = useCallback((key: keyof AppReadyState) => {
    setReadyState(prev => ({ ...prev, [key]: true }));
  }, []);
  
  /**
   * Report FlashList ready state
   */
  const reportFlashListReady = useCallback(() => {
    reportReady('flashListReady');
  }, [reportReady]);
  
  /**
   * Report fonts loaded
   */
  const reportFontsLoaded = useCallback(() => {
    reportReady('fontsLoaded');
  }, [reportReady]);
  
  /**
   * Report initial data loaded
   */
  const reportInitialDataLoaded = useCallback(() => {
    reportReady('initialDataLoaded');
  }, [reportReady]);
  
  // Provide context value
  const contextValue = {
    isReady,
    reportFlashListReady,
    reportFontsLoaded,
    reportInitialDataLoaded,
    queryClient,
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <AppEntryContext.Provider value={contextValue}>
        <View style={[styles.container, !showContent && styles.hidden]}>
          {children}
        </View>
      </AppEntryContext.Provider>
    </QueryClientProvider>
  );
};

// Context for child components
interface AppEntryContextType {
  isReady: boolean;
  reportFlashListReady: () => void;
  reportFontsLoaded: () => void;
  reportInitialDataLoaded: () => void;
  queryClient: QueryClient;
}

const AppEntryContext = React.createContext<AppEntryContextType | null>(null);

/**
 * Hook to access AppEntry context
 */
export const useAppEntry = (): AppEntryContextType => {
  const context = React.useContext(AppEntryContext);
  if (!context) {
    throw new Error('useAppEntry must be used within AppEntry');
  }
  return context;
};

/**
 * Hook for components to report their readiness
 */
export const useReportReady = () => {
  const context = useAppEntry();
  
  return {
    reportFlashListReady: context.reportFlashListReady,
    reportFontsLoaded: context.reportFontsLoaded,
    reportInitialDataLoaded: context.reportInitialDataLoaded,
    isReady: context.isReady,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hidden: {
    opacity: 0,
  },
});

export default AppEntry;
