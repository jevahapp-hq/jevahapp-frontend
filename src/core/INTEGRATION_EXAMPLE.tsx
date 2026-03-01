/**
 * Instant-On Video Feed Integration Example
 * 
 * This file demonstrates how to integrate all the Instant-On architecture
 * components into your existing JevahApp.
 * 
 * Key Features:
 * - Zero loading spinners
 * - Zero dark flashes on startup
 * - Zero black screens during tab navigation
 * - Synchronous cache hydration from MMKV
 * - FlashList for 60fps view recycling
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Instant-On architecture components
import { AppEntry, useReportReady } from './app';
import { OptimizedTabNavigator, NavigationUtils } from './navigation';
import { InstantOnVideoFeed } from '../features/media/components';
import { MediaItem } from '../shared/types';

// ============================================================================
// STEP 1: Create your video feed screen component
// ============================================================================

/**
 * VideoFeedScreen - Your main video feed with Instant-On capabilities
 */
const VideoFeedScreen: React.FC = () => {
  const { reportFlashListReady } = useReportReady();
  
  // Handle video tap - navigate to reels or play video
  const handleVideoTap = useCallback((video: MediaItem, index: number) => {
    // Navigate to reels viewer or handle video tap
    console.log('Video tapped:', video.title, 'at index:', index);
    
    // Example: Navigate to reels
    // NavigationUtils.navigate('Reels', { initialIndex: index });
  }, []);
  
  // Handle video visibility - for autoplay or analytics
  const handleVideoVisible = useCallback((video: MediaItem, index: number) => {
    // Track view or start autoplay
    console.log('Video visible:', video.title, 'at index:', index);
  }, []);
  
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* 
        InstantOnVideoFeed - The main component
        
        Features:
        - Shows cached content immediately (no spinner)
        - Uses FlashList for 60fps recycling
        - Shows thumbnails first, videos load in background
        - Reports ready state to hide splash screen
      */}
      <InstantOnVideoFeed
        contentType="ALL"
        onVideoTap={handleVideoTap}
        onVideoVisible={handleVideoVisible}
      />
    </View>
  );
};

// ============================================================================
// STEP 2: Create other tab screens
// ============================================================================

const LibraryScreen: React.FC = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.text}>Library Screen</Text>
  </View>
);

const ProfileScreen: React.FC = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.text}>Profile Screen</Text>
  </View>
);

const UploadScreen: React.FC = () => (
  <View style={styles.screenContainer}>
    <Text style={styles.text}>Upload Screen</Text>
  </View>
);

// ============================================================================
// STEP 3: Define tab configuration
// ============================================================================

import type { TabConfig } from './navigation';

const TABS: TabConfig[] = [
  {
    name: 'Home',
    component: VideoFeedScreen,
    icon: 'home-outline',
    iconFocused: 'home',
    label: 'Home',
    preload: true, // Preload this tab on app start
  },
  {
    name: 'Library',
    component: LibraryScreen,
    icon: 'library-outline',
    iconFocused: 'library',
    label: 'Library',
    preload: false,
  },
  {
    name: 'Upload',
    component: UploadScreen,
    icon: 'add-circle-outline',
    iconFocused: 'add-circle',
    label: 'Upload',
    preload: false,
  },
  {
    name: 'Profile',
    component: ProfileScreen,
    icon: 'person-outline',
    iconFocused: 'person',
    label: 'Profile',
    preload: false,
  },
];

// ============================================================================
// STEP 4: Create the main App component with AppEntry wrapper
// ============================================================================

/**
 * Main App Component
 * 
 * Wraps everything in AppEntry which handles:
 * - Synchronous MMKV cache hydration
 * - BootSplash synchronization
 * - Font loading coordination
 * - FlashList ready state
 */
const App: React.FC = () => {
  const handleAppReady = useCallback(() => {
    console.log('App is fully ready - splash hidden');
  }, []);
  
  return (
    <SafeAreaProvider>
      <AppEntry onReady={handleAppReady}>
        <OptimizedTabNavigator
          tabs={TABS}
          initialRouteName="Home"
        />
      </AppEntry>
    </SafeAreaProvider>
  );
};

// ============================================================================
// STEP 5: Export for use in your app
// ============================================================================

export default App;

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});

// ============================================================================
// USAGE IN YOUR EXISTING APP
// ============================================================================

/**
 * To integrate into your existing app:
 * 
 * 1. Replace your current QueryClient setup with AppEntry in _layout.tsx:
 * 
 *    // Before:
 *    <QueryClientProvider client={queryClient}>
 *      <YourApp />
 *    </QueryClientProvider>
 *    
 *    // After:
 *    <AppEntry>
 *      <YourApp />
 *    </AppEntry>
 * 
 * 2. Replace your video list with InstantOnVideoFeed:
 *    
 *    // Before:
 *    <ScrollView>
 *      {videos.map(video => <VideoCard key={video.id} video={video} />)}
 *    </ScrollView>
 *    
 *    // After:
 *    <InstantOnVideoFeed
 *      contentType="ALL"
 *      onVideoTap={handleVideoTap}
 *    />
 * 
 * 3. Replace your tab navigator with OptimizedTabNavigator:
 *    
 *    // Before:
 *    <Tab.Navigator>
 *      <Tab.Screen name="Home" component={HomeScreen} />
 *    </Tab.Navigator>
 *    
 *    // After:
 *    <OptimizedTabNavigator
 *      tabs={[
 *        { name: 'Home', component: HomeScreen, icon: 'home', ... },
 *      ]}
 *    />
 * 
 * 4. The cache is automatically persisted and hydrated - no code changes needed!
 */
