/**
 * Unified Performance Optimization Utility
 * Consolidates all performance optimizers into a single, comprehensive module
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useRef } from "react";
import { Dimensions, InteractionManager, Platform } from "react-native";

// ============================================================================
// Performance Monitor - For timing and metrics
// ============================================================================

export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  private static metrics: Record<string, { start: number; end?: number }> = {};
  private static memoryUsage: Record<string, number> = {};

  static startTimer(key: string): void {
    this.timers.set(key, Date.now());
    this.metrics[key] = { start: Date.now() };
  }

  static endTimer(key: string): number {
    const startTime = this.timers.get(key);
    if (startTime) {
      const duration = Date.now() - startTime;
      if (__DEV__) {
        console.log(`⏱️ Performance: ${key} took ${duration}ms`);
      }
      this.timers.delete(key);
      
      const metric = this.metrics[key];
      if (metric) {
        metric.end = Date.now();
      }
      return duration;
    }
    return 0;
  }

  static getMetrics(): Record<string, number> {
    const results: Record<string, number> = {};
    Object.entries(this.metrics).forEach(([key, metric]) => {
      if (metric.end) {
        results[key] = metric.end - metric.start;
      }
    });
    return results;
  }

  static clearMetrics(): void {
    this.metrics = {};
    this.timers.clear();
  }

  static trackMemoryUsage(key: string, size: number): void {
    this.memoryUsage[key] = size;
  }

  static getMemoryUsage(): Record<string, number> {
    return { ...this.memoryUsage };
  }
}

// ============================================================================
// Performance Optimizer - Main optimization class
// ============================================================================

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface ButtonPressOptions {
  immediateFeedback?: boolean;
  debounceMs?: number;
  key?: string;
  hapticFeedback?: boolean;
  touchTargetSize?: number;
  priority?: "high" | "low";
}

interface OptimizedFetchOptions {
  cacheDuration?: number;
  forceRefresh?: boolean;
  background?: boolean;
  priority?: "high" | "low";
  timeout?: number;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestCache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, number>();
  private imageCache = new Set<string>();
  private touchTargets = new Map<string, { x: number; y: number; timestamp: number }>();
  private preloadedData = new Map<string, any>();
  private isPreloading = false;

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Handle button press with optimized debouncing and immediate feedback
   */
  static handleButtonPress(
    onPress: () => void | Promise<void>,
    options: ButtonPressOptions = {}
  ): () => void {
    const {
      immediateFeedback = true,
      debounceMs = 0,
      key = "default",
      hapticFeedback = true,
      touchTargetSize = 44,
      priority = "high",
    } = options;

    const optimizer = PerformanceOptimizer.getInstance();

    return () => {
      // Check if this button was recently pressed to prevent rapid successive calls
      const debounceThreshold = priority === "high" ? 30 : 100;
      if (optimizer.debounceTimers.has(key)) {
        const lastPress = optimizer.debounceTimers.get(key)!;
        const now = Date.now();
        if (now - lastPress < debounceThreshold) {
          return;
        }
      }

      // Mark this button as recently pressed
      optimizer.debounceTimers.set(key, Date.now());

      // Provide immediate visual feedback
      if (immediateFeedback && priority === "high") {
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => {
            // UI update happens in next frame
          });
        } else {
          InteractionManager.runAfterInteractions(() => {
            // Fallback for React Native
          });
        }
      }

      // Execute the onPress function immediately
      try {
        const result = onPress();
        if (result instanceof Promise) {
          result.catch((error) => {
            if (__DEV__) {
              console.error("Button press error:", error);
            }
          });
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Button press error:", error);
        }
      }

      // Clean up the debounce timer after a short delay
      setTimeout(() => {
        optimizer.debounceTimers.delete(key);
      }, debounceThreshold);
    };
  }

  /**
   * Optimized data fetching with caching and request deduplication
   */
  static async optimizedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: OptimizedFetchOptions = {}
  ): Promise<T> {
    const {
      cacheDuration = 15 * 60 * 1000, // 15 minutes
      forceRefresh = false,
      background = false,
      priority = "high",
      timeout = 10000,
    } = options;

    const optimizer = PerformanceOptimizer.getInstance();

    // Check cache first for instant response
    if (!forceRefresh) {
      const cached = optimizer.requestCache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    // Check for pending requests to prevent duplicates
    if (optimizer.pendingRequests.has(key)) {
      return optimizer.pendingRequests.get(key)!;
    }

    // Create new request with optional timeout
    const requestPromise = new Promise<T>(async (resolve, reject) => {
      const timeoutId =
        timeout > 0
          ? setTimeout(() => {
              optimizer.pendingRequests.delete(key);
              reject(new Error(`Request timeout for ${key}`));
            }, timeout)
          : null;

      try {
        const data = await fetchFn();
        if (timeoutId) clearTimeout(timeoutId);

        // Cache the result
        optimizer.requestCache.set(key, {
          data,
          timestamp: Date.now(),
          ttl: cacheDuration,
        });

        resolve(data);
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      } finally {
        optimizer.pendingRequests.delete(key);
      }
    });

    optimizer.pendingRequests.set(key, requestPromise);

    // Run in background if specified
    if (background) {
      InteractionManager.runAfterInteractions(() => {
        // Background processing
      });
    }

    return requestPromise;
  }

  /**
   * Preload critical data for faster app startup
   */
  async preloadCriticalData(): Promise<void> {
    if (this.isPreloading) return;

    this.isPreloading = true;

    try {
      // Preload user data and token in parallel
      const [userData, token, settings] = await Promise.allSettled([
        AsyncStorage.getItem("user"),
        AsyncStorage.getItem("token"),
        AsyncStorage.getItem("appSettings"),
      ]);

      if (userData.status === "fulfilled" && userData.value) {
        this.preloadedData.set("user", JSON.parse(userData.value));
      }

      if (token.status === "fulfilled" && token.value) {
        this.preloadedData.set("token", token.value);
      }

      if (settings.status === "fulfilled" && settings.value) {
        this.preloadedData.set("settings", JSON.parse(settings.value));
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Preloading failed:", error);
      }
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Get preloaded data
   */
  getPreloadedData(key: string): any {
    return this.preloadedData.get(key);
  }

  /**
   * Batch storage operations for better performance
   */
  static async batchStorageOperations(
    operations: Array<{ key: string; value: string }>
  ): Promise<void> {
    if (Platform.OS === "ios") {
      // iOS can handle multiple operations better
      await Promise.all(
        operations.map((op) => AsyncStorage.setItem(op.key, op.value))
      );
    } else {
      // Android: batch operations to avoid blocking
      const batchSize = 5;
      for (let i = 0; i < operations.length; i += batchSize) {
        const batch = operations.slice(i, i + batchSize);
        await Promise.all(batch.map((op) => AsyncStorage.setItem(op.key, op.value)));
        // Small delay between batches
        if (i + batchSize < operations.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }
  }

  /**
   * Preload images for faster rendering
   */
  static preloadImages(imageUrls: string[]): void {
    const optimizer = PerformanceOptimizer.getInstance();

    imageUrls.forEach((url) => {
      if (url && url.startsWith("http") && !optimizer.imageCache.has(url)) {
        optimizer.imageCache.add(url);
        // Preload image in background
        InteractionManager.runAfterInteractions(() => {
          if (typeof Image !== "undefined") {
            const img = new Image();
            img.src = url;
          }
        });
      }
    });
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Batch operations for better performance
   */
  static async batchOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 3
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map((op) => op()));
      results.push(...batchResults);

      // Small delay between batches to prevent blocking
      if (i + batchSize < operations.length) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    return results;
  }

  /**
   * Batch state updates for better performance
   */
  static batchStateUpdates(updates: Array<() => void>): void {
    if (updates.length === 0) return;

    // Use React's startTransition if available
    if (typeof React !== "undefined" && (React as any).startTransition) {
      (React as any).startTransition(() => {
        updates.forEach((update) => update());
      });
    } else {
      // Fallback to requestAnimationFrame
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => {
          updates.forEach((update) => update());
        });
      } else {
        updates.forEach((update) => update());
      }
    }
  }

  /**
   * Clear cache
   */
  static clearCache(pattern?: string): void {
    const optimizer = PerformanceOptimizer.getInstance();

    if (pattern) {
      // Clear specific pattern
      for (const key of optimizer.requestCache.keys()) {
        if (key.includes(pattern)) {
          optimizer.requestCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      optimizer.requestCache.clear();
      optimizer.preloadedData.clear();
    }
  }

  /**
   * Memory management and cleanup
   */
  static optimizeMemory(): void {
    const optimizer = PerformanceOptimizer.getInstance();
    const now = Date.now();

    // Clear old cache entries
    for (const [key, value] of optimizer.requestCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        optimizer.requestCache.delete(key);
      }
    }

    // Clear old touch targets
    for (const [key, value] of optimizer.touchTargets.entries()) {
      if (now - value.timestamp > 5000) {
        optimizer.touchTargets.delete(key);
      }
    }

    // Clear old debounce timers
    for (const [key, timestamp] of optimizer.debounceTimers.entries()) {
      if (now - timestamp > 1000) {
        optimizer.debounceTimers.delete(key);
      }
    }
  }

  /**
   * Clear performance cache (AsyncStorage cache keys)
   */
  async clearAsyncStorageCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("cache_"));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to clear AsyncStorage cache:", error);
      }
    }
  }

  /**
   * Platform-specific optimizations
   */
  static getPlatformOptimizations() {
    const isIOS = Platform.OS === "ios";
    const isAndroid = Platform.OS === "android";

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

  /**
   * Responsive performance settings based on device capabilities
   */
  static getResponsivePerformanceSettings() {
    const { width, height } = Dimensions.get("window");
    const isLowEndDevice = width < 375 || height < 667;
    const isHighEndDevice = width >= 414 && height >= 896;

    return {
      lowEnd: {
        debounceMs: 0,
        batchSize: 2,
        cacheDuration: 2 * 60 * 1000, // 2 minutes
        preloadImages: false,
        animationDuration: 400,
      },
      highEnd: {
        debounceMs: 0,
        batchSize: 5,
        cacheDuration: 10 * 60 * 1000, // 10 minutes
        preloadImages: true,
        animationDuration: 200,
      },
      default: {
        debounceMs: 0,
        batchSize: 3,
        cacheDuration: 5 * 60 * 1000, // 5 minutes
        preloadImages: true,
        animationDuration: 300,
      },
    };
  }
}

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for optimized button handling
 */
export function useOptimizedButton(
  onPress: () => void | Promise<void>,
  options: ButtonPressOptions = {}
) {
  return PerformanceOptimizer.handleButtonPress(onPress, options);
}

/**
 * Hook for optimized data fetching (returns a function that performs the fetch)
 */
export function useOptimizedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: OptimizedFetchOptions = {}
) {
  return useCallback(async () => {
    return PerformanceOptimizer.optimizedFetch(key, fetchFn, options);
  }, [key, fetchFn, options.cacheDuration, options.forceRefresh, options.priority]);
}

/**
 * Hook for fast performance optimization (compatibility alias)
 */
export const useFastPerformance = () => {
  const optimizer = PerformanceOptimizer.getInstance();

  const fastPress = (onPress: () => void, options?: ButtonPressOptions) => {
    return PerformanceOptimizer.handleButtonPress(onPress, options || {});
  };

  const fastFetch = <T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: OptimizedFetchOptions
  ) => {
    return PerformanceOptimizer.optimizedFetch(key, fetchFn, options);
  };

  const batchUpdates = (updates: Array<() => void>) => {
    PerformanceOptimizer.batchStateUpdates(updates);
  };

  return {
    fastPress,
    fastFetch,
    batchUpdates,
    cleanup: () => PerformanceOptimizer.optimizeMemory(),
  };
};

/**
 * Fast debounce utility hook
 */
export const useFastDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  ) as T;
};

/**
 * Fast throttle utility hook
 */
export const useFastThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 16 // 60fps
): T => {
  const lastCall = useRef(0);
  const lastCallTimer = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        if (lastCallTimer.current) {
          clearTimeout(lastCallTimer.current);
        }
        lastCallTimer.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - (now - lastCall.current));
      }
    },
    [callback, delay]
  ) as T;
};

/**
 * Stable callback hook to prevent unnecessary re-renders
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      return callbackRef.current(...args);
    },
    []
  ) as T;
};

// ============================================================================
// Export singleton instance
// ============================================================================

export const performanceOptimizer = PerformanceOptimizer.getInstance();

// ============================================================================
// Default export for compatibility
// ============================================================================

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
