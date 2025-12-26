import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Simple Performance Monitor for timing operations
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(key: string): void {
    this.timers.set(key, Date.now());
  }

  static endTimer(key: string): void {
    const startTime = this.timers.get(key);
    if (startTime) {
      const duration = Date.now() - startTime;
      console.log(`⏱️ Performance: ${key} took ${duration}ms`);
      this.timers.delete(key);
    }
  }
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private preloadedData: Map<string, any> = new Map();
  private isPreloading = false;

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Preload critical data for faster app startup
   */
  async preloadCriticalData(): Promise<void> {
    if (this.isPreloading) return;

    this.isPreloading = true;

    try {
      // Preload user data and token in parallel
      const [userData, token] = await Promise.allSettled([
        AsyncStorage.getItem("user"),
        AsyncStorage.getItem("token"),
      ]);

      if (userData.status === "fulfilled" && userData.value) {
        this.preloadedData.set("user", JSON.parse(userData.value));
      }

      if (token.status === "fulfilled" && token.value) {
        this.preloadedData.set("token", token.value);
      }

      // Preload other critical data
      await this.preloadAppSettings();
    } catch (error) {
      console.warn("Preloading failed:", error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload app settings and configuration
   */
  private async preloadAppSettings(): Promise<void> {
    try {
      const settings = await AsyncStorage.getItem("appSettings");
      if (settings) {
        this.preloadedData.set("settings", JSON.parse(settings));
      }
    } catch (error) {
      // Silent fail for settings
    }
  }

  /**
   * Get preloaded data
   */
  getPreloadedData(key: string): any {
    return this.preloadedData.get(key);
  }

  /**
   * Optimize network requests with caching
   */
  static async cachedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const cacheKey = `cache_${url}_${JSON.stringify(options)}`;

    try {
      // Check cache first
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Cache valid for 5 minutes
        if (now - timestamp < 5 * 60 * 1000) {
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    } catch (error) {
      // Cache miss, continue with network request
    }

    // Make network request
    const response = await fetch(url, options);

    if (response.ok) {
      try {
        const data = await response.clone().json();
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({
            data,
            timestamp: Date.now(),
          })
        );
      } catch (error) {
        // Failed to cache, continue
      }
    }

    return response;
  }

  /**
   * Optimize image loading
   */
  static preloadImages(images: string[]): Promise<void[]> {
    return Promise.all(
      images.map((uri) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = uri;
        });
      })
    );
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
   * Optimize AsyncStorage operations
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
        await Promise.all(
          batch.map((op) => AsyncStorage.setItem(op.key, op.value))
        );
        // Small delay between batches
        if (i + batchSize < operations.length) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }
  }

  /**
   * Optimized data fetching with caching and request deduplication
   */
  static async optimizedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      cacheDuration?: number;
      forceRefresh?: boolean;
      background?: boolean;
      priority?: "high" | "low";
      timeout?: number;
    } = {}
  ): Promise<T> {
    const {
      cacheDuration = 15 * 60 * 1000, // 15 minutes to match backend cache
      forceRefresh = false,
      background = false,
      priority = "high",
      timeout = 10000,
    } = options;

    const optimizer = PerformanceOptimizer.getInstance();

    // Check cache first for instant response
    if (!forceRefresh) {
      const cached = optimizer.preloadedData.get(key);
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        return cached.data;
      }
    }

    // Execute the underlying fetch function and cache the result.
    // NOTE: We intentionally do NOT add an extra timeout layer here because
    // many callers already implement their own timeout / abort handling.
    // Adding another layer caused duplicate \"Request timeout\" errors.
    const data = await fetchFn();

    optimizer.preloadedData.set(key, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  /**
   * Clear performance cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("cache_"));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      this.preloadedData.clear();
    } catch (error) {
      console.warn("Failed to clear cache:", error);
    }
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Hook for optimized button handling
export function useOptimizedButton(
  onPress: () => void | Promise<void>,
  options: {
    debounceMs?: number;
    key?: string;
  } = {}
) {
  const { debounceMs = 0, key = "default" } = options; // Changed from 300ms to 0 for immediate response

  return PerformanceOptimizer.debounce(onPress, debounceMs);
}

// Hook for optimized data fetching
export function useOptimizedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    cacheDuration?: number;
    forceRefresh?: boolean;
  } = {}
) {
  return async () => {
    // For now, just return the fetch function directly
    // In a full implementation, this would use caching
    return fetchFn();
  };
}
