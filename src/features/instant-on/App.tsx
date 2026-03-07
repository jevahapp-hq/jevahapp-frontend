/**
 * App.tsx - Main application entry point for 'Instant-On' video feed
 * 
 * This file demonstrates the complete integration of the instant-on system:
 * - BootSplash integration with preventAutoHide()
 * - Synchronous data hydration from MMKV
 * - FlashList for optimal video feed rendering
 * - Navigation with freezeOnBlur for smooth tab switching
 * - Splash screen hides ONLY when first video is ready for display
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Instant-on feature imports
import { InstantVideoFeed } from './components/InstantVideoFeed';
import { InstantOnProvider, useInstantOn } from './context/InstantOnContext';
import { InstantOnNavigator } from './navigation/InstantOnNavigator';

// Import your existing API and types
import type { MediaItem } from '../../shared/types';

// Create QueryClient with instant-on optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is already cached in MMKV, so we can show stale data immediately
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Don't refetch on mount - we want instant display from cache
      refetchOnMount: false,
    },
  },
});

// =============================================================================
// SPLASH SCREEN MANAGER
// =============================================================================

/**
 * Manages the native splash screen visibility
 * Hides ONLY when the first video is ready for display
 */
const useBootSplash = () => {
  const { isSplashVisible, isFirstVideoReady } = useInstantOn();
  const [isAppReady, setIsAppReady] = useState(false);
  const hasHiddenRef = React.useRef(false);

  useEffect(() => {
    // Mark app as ready after initial mount
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Hide splash only when first video is ready (and only once)
    if (isAppReady && isFirstVideoReady && !isSplashVisible && !hasHiddenRef.current) {
      hasHiddenRef.current = true;
      BootSplash.hide({ fade: true });
    }
  }, [isAppReady, isFirstVideoReady, isSplashVisible]);

  return { isAppReady };
};

// =============================================================================
// VIDEO FEED SCREEN
// =============================================================================

interface VideoFeedScreenProps {
  /** API function to fetch videos */
  fetchVideos: () => Promise<MediaItem[]>;
  /** Query key for react-query */
  queryKey?: string[];
}

/**
 * Main video feed screen - optimized for instant-on experience
 * No thumbnails, no loading spinners - just live video
 */
const VideoFeedScreen: React.FC<VideoFeedScreenProps> = ({ 
  fetchVideos,
  queryKey = ['videos', 'feed'],
}) => {
  const handleVideoTap = useCallback((key: string, video: MediaItem, index: number) => {
    // Handle video tap - e.g., toggle play/pause
    console.log('Video tapped:', key, index);
  }, []);

  const handleTogglePlay = useCallback((key: string) => {
    // Handle play/pause toggle
    console.log('Toggle play:', key);
  }, []);

  const handleToggleMute = useCallback((key: string) => {
    // Handle mute toggle
    console.log('Toggle mute:', key);
  }, []);

  const handleRefresh = useCallback(async () => {
    // Trigger refresh
    console.log('Refreshing feed...');
  }, []);

  return (
    <View style={styles.container}>
      <InstantVideoFeed
        fetchVideos={fetchVideos}
        queryKey={queryKey}
        onVideoTap={handleVideoTap}
        onTogglePlay={handleTogglePlay}
        onToggleMute={handleToggleMute}
        autoPlay={true}
        initialMute={true}
        onRefresh={handleRefresh}
        refreshing={false}
      />
    </View>
  );
};

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

interface AppProps {
  /** Function to fetch videos from your API */
  fetchVideos: () => Promise<MediaItem[]>;
  /** Query key for react-query */
  queryKey?: string[];
  /** Optional: Custom explore screen */
  ExploreScreen?: React.ComponentType<any>;
  /** Optional: Custom library screen */
  LibraryScreen?: React.ComponentType<any>;
  /** Optional: Custom profile screen */
  ProfileScreen?: React.ComponentType<any>;
  /** Optional: Custom tab bar component */
  TabBarComponent?: React.ComponentType<any>;
}

/**
 * Main App Component - Integrates all instant-on features
 * 
 * Usage:
 * ```tsx
 * import { App } from './src/features/instant-on/App';
 * import { fetchAllContentPublic } from './src/shared/hooks/useMedia';
 * 
 * export default function MyApp() {
 *   return (
 *     <App 
 *       fetchVideos={fetchAllContentPublic}
 *       queryKey={['all-content', 'ALL']}
 *     />
 *   );
 * }
 * ```
 */
export const App: React.FC<AppProps> = ({
  fetchVideos,
  queryKey = ['videos', 'feed'],
  ExploreScreen,
  LibraryScreen,
  ProfileScreen,
  TabBarComponent,
}) => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <InstantOnProvider>
            <AppContent
              fetchVideos={fetchVideos}
              queryKey={queryKey}
              ExploreScreen={ExploreScreen}
              LibraryScreen={LibraryScreen}
              ProfileScreen={ProfileScreen}
              TabBarComponent={TabBarComponent}
            />
          </InstantOnProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

/**
 * Inner app content that has access to InstantOn context
 */
const AppContent: React.FC<AppProps> = ({
  fetchVideos,
  queryKey,
  ExploreScreen,
  LibraryScreen,
  ProfileScreen,
  TabBarComponent,
}) => {
  // Manage splash screen visibility
  useBootSplash();

  // Create the video feed screen with injected dependencies
  const HomeScreen = React.useCallback(() => (
    <VideoFeedScreen 
      fetchVideos={fetchVideos} 
      queryKey={queryKey} 
    />
  ), [fetchVideos, queryKey]);

  return (
    <InstantOnNavigator
      HomeScreen={HomeScreen}
      ExploreScreen={ExploreScreen}
      LibraryScreen={LibraryScreen}
      ProfileScreen={ProfileScreen}
      TabBarComponent={TabBarComponent}
      initialRouteName="Home"
    />
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
});

export default App;
