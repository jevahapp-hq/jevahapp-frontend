import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, InteractionManager, Platform } from 'react-native';

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private preloadedData: Map<string, any> = new Map();
  private isPreloading = false;
  private debounceTimers: Map<string, number> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  /**
   * Get platform-specific optimizations
   */
  static getPlatformOptimizations() {
    const { width, height } = Dimensions.get('window');
    const isTablet = width > 768;
    const isLowEndDevice = Platform.OS === 'android' && height < 600;

    return {
      ios: {
        touchTargetSize: 44,
        debounceMs: 0,
        hapticFeedback: true,
        animationDuration: 300,
        batchSize: 10,
      },
      android: {
        touchTargetSize: 48,
        debounceMs: 0,
        hapticFeedback: true,
        animationDuration: 250,
        batchSize: 5,
      },
      web: {
        touchTargetSize: 40,
        debounceMs: 0,
        hapticFeedback: false,
        animationDuration: 200,
        batchSize: 20,
      },
      tablet: {
        touchTargetSize: isTablet ? 56 : 44,
        debounceMs: 0,
        hapticFeedback: true,
        animationDuration: 350,
        batchSize: 15,
      },
      lowEnd: {
        touchTargetSize: 48,
        debounceMs: 50, // Slight delay for low-end devices
        hapticFeedback: false, // Disable haptics for better performance
        animationDuration: 150,
        batchSize: 3,
      },
    };
  }

  /**
   * Optimized button press handler with immediate feedback
   */
  static handleButtonPress(
    onPress: () => void | Promise<void>,
    options: {
      immediateFeedback?: boolean;
      debounceMs?: number;
      key?: string;
      hapticFeedback?: boolean;
      hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
      touchTargetSize?: number;
    } = {}
  ): () => void {
    const platformOpts = PerformanceOptimizer.getPlatformOptimizations();
    const platform = Platform.OS;
    const { width, height } = Dimensions.get('window');
    const isTablet = width > 768;
    const isLowEndDevice = Platform.OS === 'android' && height < 600;

    const { 
      immediateFeedback = true, 
      debounceMs = isLowEndDevice ? platformOpts.lowEnd.debounceMs : 0,
      key = 'default',
      hapticFeedback = isLowEndDevice ? false : platformOpts[platform]?.hapticFeedback ?? true,
      hapticType = 'light',
      touchTargetSize = platformOpts[platform]?.touchTargetSize ?? 44,
    } = options;
    
    const optimizer = PerformanceOptimizer.getInstance();

    return () => {
      const now = Date.now();

      // Check if this button was recently pressed to prevent rapid successive calls
      if (optimizer.debounceTimers.has(key)) {
        const lastPress = optimizer.debounceTimers.get(key)!;
        if (now - lastPress < 100) {
          return; // Ignore rapid successive presses
        }
      }

      // Mark this button as recently pressed
      optimizer.debounceTimers.set(key, now);

      // Provide immediate visual feedback
      if (immediateFeedback) {
        InteractionManager.runAfterInteractions(() => {
          // This ensures UI updates happen before heavy operations
        });
      }

      // Execute the onPress function immediately
      try {
        const result = onPress();
        if (result instanceof Promise) {
          // If it's a promise, handle it asynchronously
          result.catch(error => {
            console.error('Button press error:', error);
          });
        }
      } catch (error) {
        console.error('Button press error:', error);
      }

      // Clean up the debounce timer after a short delay
      setTimeout(() => {
        optimizer.debounceTimers.delete(key);
      }, 100);
    };
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
      priority?: 'high' | 'low';
    } = {}
  ): Promise<T> {
    const { 
      cacheDuration = 5 * 60 * 1000, // 5 minutes
      forceRefresh = false, 
      background = false,
      priority = 'high',
    } = options;
    
    const optimizer = PerformanceOptimizer.getInstance();

    // Check cache first
    if (!forceRefresh) {
      const cached = optimizer.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    // Execute fetch
    const startTime = Date.now();
      try {
        const data = await fetchFn();
        
        // Cache the result
      optimizer.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl: cacheDuration,
        });

      // Record performance metric
      const duration = Date.now() - startTime;
      optimizer.recordMetric(`fetch_${key}`, duration);

        return data;
    } catch (error) {
      // Record error metric
      optimizer.recordMetric(`fetch_error_${key}`, Date.now() - startTime);
      throw error;
    }
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
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('appSettings'),
      ]);

      if (userData.status === 'fulfilled' && userData.value) {
        this.preloadedData.set('user', JSON.parse(userData.value));
      }

      if (token.status === 'fulfilled' && token.value) {
        this.preloadedData.set('token', token.value);
      }

      if (settings.status === 'fulfilled' && settings.value) {
        this.preloadedData.set('settings', JSON.parse(settings.value));
      }

      // Preload other critical data
      await this.preloadAppSettings();
      
    } catch (error) {
      console.warn('Preloading failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Preload app settings and configuration
   */
  private async preloadAppSettings(): Promise<void> {
    try {
      const settings = await AsyncStorage.getItem('appSettings');
      if (settings) {
        this.preloadedData.set('settings', JSON.parse(settings));
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
  static async cachedRequest(url: string, options: RequestInit = {}): Promise<Response> {
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
            headers: { 'Content-Type': 'application/json' }
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
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
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
      images.map(uri => {
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
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Optimize AsyncStorage operations
   */
  static async batchStorageOperations(operations: Array<{ key: string; value: string }>): Promise<void> {
    const platformOpts = PerformanceOptimizer.getPlatformOptimizations();
    const batchSize = platformOpts[Platform.OS]?.batchSize ?? 10;

    if (Platform.OS === 'ios') {
      // iOS can handle multiple operations better
      await Promise.all(
        operations.map(op => AsyncStorage.setItem(op.key, op.value))
      );
    } else {
      // Android: batch operations to avoid blocking
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
        await Promise.all(
          batch.map(op => AsyncStorage.setItem(op.key, op.value))
        );
        // Small delay between batches
      if (i + batchSize < operations.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }
  }

  /**
   * Record performance metrics
   */
  recordMetric(key: string, value: number): void {
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, []);
    }
    this.performanceMetrics.get(key)!.push(value);

    // Keep only last 100 metrics
    const metrics = this.performanceMetrics.get(key)!;
    if (metrics.length > 100) {
      metrics.splice(0, metrics.length - 100);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(key: string): { avg: number; min: number; max: number; count: number } | null {
    const metrics = this.performanceMetrics.get(key);
    if (!metrics || metrics.length === 0) return null;

    const sum = metrics.reduce((a, b) => a + b, 0);
    return {
      avg: sum / metrics.length,
      min: Math.min(...metrics),
      max: Math.max(...metrics),
      count: metrics.length,
    };
  }

  /**
   * Clear performance cache
   */
  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      this.preloadedData.clear();
      this.cache.clear();
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    for (const [key, metrics] of this.performanceMetrics.entries()) {
      report[key] = this.getMetrics(key);
    }
    
    return {
      metrics: report,
      cacheSize: this.cache.size,
      preloadedDataSize: this.preloadedData.size,
      debounceTimersSize: this.debounceTimers.size,
    };
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
  const { debounceMs = 0, key = 'default' } = options;
  
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
    return PerformanceOptimizer.optimizedFetch(key, fetchFn, options);
  };
}
