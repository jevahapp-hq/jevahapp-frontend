/**
 * Lazy Loading Utilities
 * Provides lazy-loaded components with Suspense fallbacks
 */

import React, { ComponentType, Suspense } from "react";
import { ActivityIndicator, Text, View } from "react-native";

/**
 * Loading fallback component for lazy-loaded screens
 */
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
    <ActivityIndicator size="large" color="#000" />
    <Text style={{ marginTop: 10, fontSize: 14, color: "#666" }}>
      Loading...
    </Text>
  </View>
);

/**
 * Wrap a lazy-loaded component with Suspense
 */
export function withSuspense<P extends object>(
  Component: React.LazyExoticComponent<ComponentType<P>>
): ComponentType<P> {
  return (props: P) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Lazy load heavy screens/components
 */

// Heavy screens that benefit from lazy loading
export const LazyLibraryScreen = React.lazy(
  () => import("../screens/library/LibraryScreen")
);

export const LazyAllLibrary = React.lazy(
  () => import("../screens/library/AllLibrary")
);

export const LazyVideoComponent = React.lazy(
  () => import("../categories/VideoComponent")
);

export const LazyUploadScreen = React.lazy(
  () => import("../categories/upload")
);

export const LazyReelsviewscroll = React.lazy(
  () => import("../reels/Reelsviewscroll")
);

export const LazyCommunityScreen = React.lazy(
  () => import("../screens/CommunityScreen")
);

export const LazyBibleScreen = React.lazy(() => import("../screens/BibleScreen"));

export const LazyMusicCategory = React.lazy(() => import("../categories/music"));
export const LazyHymnsCategory = React.lazy(() => import("../categories/hymns"));
export const LazyLiveCategory = React.lazy(
  () => import("../categories/LiveComponent")
);

// Home tab content (AllContentTikTok, Music, Hymns, LiveComponent) — load only when Home tab is selected

// Export wrapped components with Suspense
export const LibraryScreenWithSuspense = withSuspense(LazyLibraryScreen);
export const AllLibraryWithSuspense = withSuspense(LazyAllLibrary);
export const VideoComponentWithSuspense = withSuspense(LazyVideoComponent);
export const UploadScreenWithSuspense = withSuspense(LazyUploadScreen);
export const ReelsviewscrollWithSuspense = withSuspense(LazyReelsviewscroll);
export const CommunityScreenWithSuspense = withSuspense(LazyCommunityScreen);
export const BibleScreenWithSuspense = withSuspense(LazyBibleScreen);
export const MusicCategoryWithSuspense = withSuspense(LazyMusicCategory);
export const HymnsCategoryWithSuspense = withSuspense(LazyHymnsCategory);
export const LiveCategoryWithSuspense = withSuspense(LazyLiveCategory);

