import { Dimensions, Platform } from "react-native";

/** Platform-specific interaction tuning. */
export function getPlatformOptimizations() {
  return {
    ios: {
      animationDuration: 300,
      debounceMs: 0,
      touchTargetSize: 44,
      hapticFeedback: true,
    },
    android: {
      animationDuration: 250,
      debounceMs: 0,
      touchTargetSize: 48,
      hapticFeedback: false,
    },
    web: {
      animationDuration: 200,
      debounceMs: 0,
      touchTargetSize: 40,
      hapticFeedback: false,
    },
  };
}

/** Performance budgets keyed by rough device class. */
export function getResponsivePerformanceSettings() {
  return {
    lowEnd: {
      debounceMs: 0,
      batchSize: 2,
      cacheDuration: 2 * 60 * 1000,
      preloadImages: false,
      animationDuration: 400,
    },
    highEnd: {
      debounceMs: 0,
      batchSize: 5,
      cacheDuration: 10 * 60 * 1000,
      preloadImages: true,
      animationDuration: 200,
    },
    default: {
      debounceMs: 0,
      batchSize: 3,
      cacheDuration: 5 * 60 * 1000,
      preloadImages: true,
      animationDuration: 300,
    },
  };
}

/** Which bucket of `getResponsivePerformanceSettings` this device falls into. */
export function getDeviceClass(): "lowEnd" | "highEnd" | "default" {
  const { width, height } = Dimensions.get("window");
  if (width < 375 || height < 667) return "lowEnd";
  if (width >= 414 && height >= 896) return "highEnd";
  return "default";
}

export function getCurrentPlatformOptimizations() {
  const all = getPlatformOptimizations();
  if (Platform.OS === "ios") return all.ios;
  if (Platform.OS === "android") return all.android;
  return all.web;
}
