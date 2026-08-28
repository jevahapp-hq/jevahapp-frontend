/**
 * Unified Performance Optimization Utility
 *
 * Facade over ./performance/: the monitor, the optimizer, the stateless
 * scheduling helpers, device tuning, and the React hooks.
 */
import {
  useFastDebounce,
  useFastPerformance,
  useFastThrottle,
  useOptimizedButton,
  useOptimizedFetch,
  useStableCallback,
} from "./performance/hooks";
import { PerformanceMonitor } from "./performance/PerformanceMonitor";
import { PerformanceOptimizer } from "./performance/PerformanceOptimizer";

export { PerformanceMonitor, PerformanceOptimizer };
export {
  useFastDebounce,
  useFastPerformance,
  useFastThrottle,
  useOptimizedButton,
  useOptimizedFetch,
  useStableCallback,
};

export {
  getCurrentPlatformOptimizations,
  getDeviceClass,
  getPlatformOptimizations,
  getResponsivePerformanceSettings,
} from "./performance/deviceSettings";
export {
  batchOperations,
  batchStateUpdates,
  batchStorageOperations,
  debounce,
  throttle,
} from "./performance/scheduling";
export type {
  ButtonPressOptions,
  CacheEntry,
  OptimizedFetchOptions,
} from "./performance/types";

export const performanceOptimizer = PerformanceOptimizer.getInstance();

export default {
  PerformanceOptimizer,
  PerformanceMonitor,
  performanceOptimizer,
  useOptimizedButton,
  useOptimizedFetch,
  useFastPerformance,
  useFastDebounce,
  useFastThrottle,
  useStableCallback,
};
