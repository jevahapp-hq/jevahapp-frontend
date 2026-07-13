/**
 * Lazy Loading Utilities
 * Provides lazy-loaded components with Suspense fallbacks
 */

import React, { Suspense, ComponentType } from "react";
import { ActivityIndicator, Image, View } from "react-native";

/**
 * Branded loading fallback for lazy-loaded screens.
 * Uses the app's white background + brand green spinner instead of an
 * unstyled (effectively black) screen, so tab switches never flash dark.
 */
const LoadingFallback = () => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#FFFFFF",
    }}
  >
    <Image
      source={require("../../assets/images/Jevah.png")}
      style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 16 }}
      resizeMode="contain"
    />
    <ActivityIndicator size="small" color="#256E63" />
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

// Home tab content (AllContentTikTok, Music, Hymns, LiveComponent) — load only when Home tab is selected

// Export wrapped components with Suspense
export const LibraryScreenWithSuspense = withSuspense(LazyLibraryScreen);
export const AllLibraryWithSuspense = withSuspense(LazyAllLibrary);
export const VideoComponentWithSuspense = withSuspense(LazyVideoComponent);
export const UploadScreenWithSuspense = withSuspense(LazyUploadScreen);
export const ReelsviewscrollWithSuspense = withSuspense(LazyReelsviewscroll);
export const CommunityScreenWithSuspense = withSuspense(LazyCommunityScreen);
export const BibleScreenWithSuspense = withSuspense(LazyBibleScreen);

/**
 * Warm the JS module cache for the main bottom-tab screens (Community,
 * Library, Bible) so that by the time the user taps a tab, its
 * React.lazy() import has already resolved and Suspense never needs to
 * show the loading fallback. Safe to call multiple times - each dynamic
 * import promise is cached by the module loader after the first call.
 */
export function preloadTabScreens() {
  import("../screens/CommunityScreen").catch(() => {});
  import("../screens/library/LibraryScreen").catch(() => {});
  import("../screens/BibleScreen").catch(() => {});
}

