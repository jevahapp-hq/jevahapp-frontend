import AsyncStorage from "@react-native-async-storage/async-storage";
import { InteractionManager } from "react-native";
import {
  getPlatformOptimizations,
  getResponsivePerformanceSettings,
} from "./deviceSettings";
import {
  batchOperations,
  batchStateUpdates,
  batchStorageOperations,
  debounce,
  throttle,
} from "./scheduling";
import type {
  ButtonPressOptions,
  CacheEntry,
  OptimizedFetchOptions,
} from "./types";

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestCache = new Map<string, CacheEntry>();
  private pendingRequests = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, number>();
  private imageCache = new Set<string>();
  private touchTargets = new Map<
    string,
    { x: number; y: number; timestamp: number }
  >();
  private preloadedData = new Map<string, any>();
  private isPreloading = false;

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /** Handle button press with optimized debouncing and immediate feedback. */
  static handleButtonPress(
    onPress: () => void | Promise<void>,
    options: ButtonPressOptions = {}
  ): () => void {
    const {
      immediateFeedback = true,
      key = "default",
      priority = "high",
    } = options;

    const optimizer = PerformanceOptimizer.getInstance();

    return () => {
      // Reject rapid successive presses of the same key.
      const debounceThreshold = priority === "high" ? 30 : 100;
      const lastPress = optimizer.debounceTimers.get(key);
      if (lastPress !== undefined && Date.now() - lastPress < debounceThreshold) {
        return;
      }

      optimizer.debounceTimers.set(key, Date.now());

      // Yield a frame so any pressed-state style paints before the handler runs.
      if (immediateFeedback && priority === "high") {
        if (typeof requestAnimationFrame !== "undefined") {
          requestAnimationFrame(() => {});
        } else {
          InteractionManager.runAfterInteractions(() => {});
        }
      }

      try {
        const result = onPress();
        if (result instanceof Promise) {
          result.catch((error) => {
            if (__DEV__) console.error("Button press error:", error);
          });
        }
      } catch (error) {
        if (__DEV__) console.error("Button press error:", error);
      }

      setTimeout(() => {
        optimizer.debounceTimers.delete(key);
      }, debounceThreshold);
    };
  }

  /** Cached, deduplicated fetch with an optional timeout. */
  static async optimizedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: OptimizedFetchOptions = {}
  ): Promise<T> {
    const {
      cacheDuration = 15 * 60 * 1000,
      forceRefresh = false,
      background = false,
      timeout = 10000,
    } = options;

    const optimizer = PerformanceOptimizer.getInstance();

    if (!forceRefresh) {
      const cached = optimizer.requestCache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    const pending = optimizer.pendingRequests.get(key);
    if (pending) return pending;

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

    if (background) {
      InteractionManager.runAfterInteractions(() => {});
    }

    return requestPromise;
  }

  /** Preload critical data for faster app startup. */
  async preloadCriticalData(): Promise<void> {
    if (this.isPreloading) return;
    this.isPreloading = true;

    try {
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
      if (__DEV__) console.warn("Preloading failed:", error);
    } finally {
      this.isPreloading = false;
    }
  }

  getPreloadedData(key: string): any {
    return this.preloadedData.get(key);
  }

  /** Warm the image cache so first paint doesn't wait on the network. */
  static preloadImages(imageUrls: string[]): void {
    const optimizer = PerformanceOptimizer.getInstance();

    imageUrls.forEach((url) => {
      if (!url || !url.startsWith("http") || optimizer.imageCache.has(url)) {
        return;
      }
      optimizer.imageCache.add(url);
      InteractionManager.runAfterInteractions(() => {
        if (typeof Image !== "undefined") {
          const img = new Image();
          img.src = url;
        }
      });
    });
  }

  static clearCache(pattern?: string): void {
    const optimizer = PerformanceOptimizer.getInstance();

    if (pattern) {
      for (const key of optimizer.requestCache.keys()) {
        if (key.includes(pattern)) optimizer.requestCache.delete(key);
      }
      return;
    }

    optimizer.requestCache.clear();
    optimizer.preloadedData.clear();
  }

  /** Drop expired cache entries, stale touch targets and debounce marks. */
  static optimizeMemory(): void {
    const optimizer = PerformanceOptimizer.getInstance();
    const now = Date.now();

    for (const [key, value] of optimizer.requestCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        optimizer.requestCache.delete(key);
      }
    }
    for (const [key, value] of optimizer.touchTargets.entries()) {
      if (now - value.timestamp > 5000) optimizer.touchTargets.delete(key);
    }
    for (const [key, timestamp] of optimizer.debounceTimers.entries()) {
      if (now - timestamp > 1000) optimizer.debounceTimers.delete(key);
    }
  }

  async clearAsyncStorageCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("cache_"));
      if (cacheKeys.length > 0) await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      if (__DEV__) {
        console.warn("Failed to clear AsyncStorage cache:", error);
      }
    }
  }

  // Stateless helpers, kept on the class for backwards compatibility.
  static debounce = debounce;
  static throttle = throttle;
  static batchOperations = batchOperations;
  static batchStorageOperations = batchStorageOperations;
  static batchStateUpdates = batchStateUpdates;
  static getPlatformOptimizations = getPlatformOptimizations;
  static getResponsivePerformanceSettings = getResponsivePerformanceSettings;
}
