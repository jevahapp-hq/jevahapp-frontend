/**
 * Lazy Loading Utilities
 * Provides lazy-loaded components with Suspense fallbacks
 */

import React, { Suspense, ComponentType } from "react";
import { View, ActivityIndicator, Text } from "react-native";

/**
 * Loading fallback component for lazy-loaded screens
 */
const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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

// Export wrapped components with Suspense
export const LibraryScreenWithSuspense = withSuspense(LazyLibraryScreen);
export const AllLibraryWithSuspense = withSuspense(LazyAllLibrary);
export const VideoComponentWithSuspense = withSuspense(LazyVideoComponent);
export const UploadScreenWithSuspense = withSuspense(LazyUploadScreen);
export const ReelsviewscrollWithSuspense = withSuspense(LazyReelsviewscroll);
export const CommunityScreenWithSuspense = withSuspense(LazyCommunityScreen);
export const BibleScreenWithSuspense = withSuspense(LazyBibleScreen);

