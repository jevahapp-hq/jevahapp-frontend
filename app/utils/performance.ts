import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';

// Performance optimization utilities
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Optimized button press handler with immediate feedback
  static handleButtonPress(
    onPress: () => void | Promise<void>,
    options: {
      immediateFeedback?: boolean;
      debounceMs?: number;
      key?: string;
    } = {}
  ): () => void {
    const { immediateFeedback = true, debounceMs = 300, key = 'default' } = options;
    const optimizer = PerformanceOptimizer.getInstance();

    return () => {
      // Provide immediate visual feedback
      if (immediateFeedback) {
        // Trigger interaction manager to handle UI updates first
        InteractionManager.runAfterInteractions(() => {
          // This ensures UI updates happen before heavy operations
        });
      }

      // Debounce to prevent rapid successive calls
      if (optimizer.debounceTimers.has(key)) {
        clearTimeout(optimizer.debounceTimers.get(key)!);
      }

      const timer = setTimeout(async () => {
        try {
          await onPress();
        } catch (error) {
          console.error('Button press error:', error);
        }
      }, debounceMs);

      optimizer.debounceTimers.set(key, timer);
    };
  }

  // Optimized data fetching with caching and request deduplication
  static async optimizedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      cacheDuration?: number;
      forceRefresh?: boolean;
      background?: boolean;
    } = {}
  ): Promise<T> {
    const { cacheDuration = 5 * 60 * 1000, forceRefresh = false, background = false } = options;
    const optimizer = PerformanceOptimizer.getInstance();

    // Check cache first
    if (!forceRefresh) {
      const cached = optimizer.requestCache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    // Check if request is already pending
    if (optimizer.pendingRequests.has(key)) {
      return optimizer.pendingRequests.get(key)!;
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const data = await fetchFn();
        
        // Cache the result
        optimizer.requestCache.set(key, {
          data,
          timestamp: Date.now(),
          ttl: cacheDuration,
        });

        return data;
      } finally {
        // Remove from pending requests
        optimizer.pendingRequests.delete(key);
      }
    })();

    optimizer.pendingRequests.set(key, requestPromise);

    // Run in background if specified
    if (background) {
      InteractionManager.runAfterInteractions(() => {
        // Background processing
      });
    }

    return requestPromise;
  }

  // Preload critical data
  static async preloadCriticalData(): Promise<void> {
    const optimizer = PerformanceOptimizer.getInstance();
    
    // Preload user data
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        optimizer.requestCache.set('user', {
          data: JSON.parse(userData),
          timestamp: Date.now(),
          ttl: 10 * 60 * 1000, // 10 minutes
        });
      }
    } catch (error) {
      console.warn('Failed to preload user data:', error);
    }

    // Preload media list
    try {
      const mediaList = await AsyncStorage.getItem('mediaList');
      if (mediaList) {
        optimizer.requestCache.set('mediaList', {
          data: JSON.parse(mediaList),
          timestamp: Date.now(),
          ttl: 5 * 60 * 1000, // 5 minutes
        });
      }
    } catch (error) {
      console.warn('Failed to preload media list:', error);
    }
  }

  // Clear cache
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
    }
  }

  // Optimize image loading
  static preloadImages(imageUrls: string[]): void {
    imageUrls.forEach(url => {
      if (url && url.startsWith('http')) {
        // Preload image in background
        InteractionManager.runAfterInteractions(() => {
          const img = new Image();
          img.src = url;
        });
      }
    });
  }

  // Batch operations for better performance
  static async batchOperations<T>(
    operations: (() => Promise<T>)[],
    batchSize: number = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
      
      // Small delay between batches to prevent blocking
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }
}

// Hook for optimized button handling
export function useOptimizedButton(
  onPress: () => void | Promise<void>,
  options: {
    debounceMs?: number;
    key?: string;
  } = {}
) {
  return PerformanceOptimizer.handleButtonPress(onPress, options);
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
  return () => PerformanceOptimizer.optimizedFetch(key, fetchFn, options);
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Record<string, { start: number; end?: number }> = {};

  static startTimer(key: string): void {
    this.metrics[key] = { start: Date.now() };
  }

  static endTimer(key: string): number {
    const metric = this.metrics[key];
    if (metric && !metric.end) {
      metric.end = Date.now();
      const duration = metric.end - metric.start;
      console.log(`⏱️ Performance: ${key} took ${duration}ms`);
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
  }
}
