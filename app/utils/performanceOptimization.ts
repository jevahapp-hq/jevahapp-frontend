import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, InteractionManager, Platform } from 'react-native';

// Performance optimization utilities for better app responsiveness
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, number>(); // Changed to number for timestamp
  private imageCache = new Set<string>();
  private touchTargets = new Map<string, { x: number; y: number; timestamp: number }>();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Optimized button press handler with immediate feedback and touch target optimization
  static handleButtonPress(
    onPress: () => void | Promise<void>,
    options: {
      immediateFeedback?: boolean;
      debounceMs?: number;
      key?: string;
      hapticFeedback?: boolean;
      touchTargetSize?: number;
    } = {}
  ): () => void {
    const { 
      immediateFeedback = true, 
      debounceMs = 0, // Changed from 150ms to 0 for immediate response
      key = 'default',
      hapticFeedback = true,
      touchTargetSize = 44
    } = options;
    
    const optimizer = PerformanceOptimizer.getInstance();

    return () => {
      // Check if this button was recently pressed to prevent rapid successive calls
      if (optimizer.debounceTimers.has(key)) {
        const lastPress = optimizer.debounceTimers.get(key)!;
        const now = Date.now();
        if (now - lastPress < 100) { // Only prevent if pressed within 100ms
          return; // Ignore rapid successive presses
        }
      }

      // Mark this button as recently pressed
      optimizer.debounceTimers.set(key, Date.now());

      // Provide immediate visual feedback
      if (immediateFeedback) {
        // Trigger interaction manager to handle UI updates first
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

  // Optimized data fetching with caching and request deduplication
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
      cacheDuration = 15 * 60 * 1000, // 15 minutes to match backend cache
      forceRefresh = false, 
      background = false,
      priority = 'high'
    } = options;
    
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

  // Optimize image loading with preloading
  static preloadImages(imageUrls: string[]): void {
    const optimizer = PerformanceOptimizer.getInstance();
    
    imageUrls.forEach(url => {
      if (url && url.startsWith('http') && !optimizer.imageCache.has(url)) {
        optimizer.imageCache.add(url);
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
    batchSize: number = 3 // Reduced batch size for better responsiveness
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
      
      // Smaller delay between batches to prevent blocking
      if (i + batchSize < operations.length) {
        await new Promise(resolve => setTimeout(resolve, 5)); // Reduced from 10ms
      }
    }
    
    return results;
  }

  // Memory management
  static optimizeMemory(): void {
    const optimizer = PerformanceOptimizer.getInstance();
    
    // Clear old cache entries
    const now = Date.now();
    for (const [key, value] of optimizer.requestCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        optimizer.requestCache.delete(key);
      }
    }

    // Clear old touch targets
    for (const [key, value] of optimizer.touchTargets.entries()) {
      if (now - value.timestamp > 5000) { // 5 seconds
        optimizer.touchTargets.delete(key);
      }
    }
  }

  // Touch target optimization
  static optimizeTouchTarget(
    key: string,
    x: number,
    y: number,
    minSize: number = 44
  ): { x: number; y: number; width: number; height: number } {
    const optimizer = PerformanceOptimizer.getInstance();
    
    // Store touch target info
    optimizer.touchTargets.set(key, { x, y, timestamp: Date.now() });
    
    // Ensure minimum touch target size
    return {
      x: Math.max(0, x - minSize / 2),
      y: Math.max(0, y - minSize / 2),
      width: minSize,
      height: minSize
    };
  }

  // Platform-specific optimizations
  static getPlatformOptimizations() {
    const isIOS = Platform.OS === 'ios';
    const isAndroid = Platform.OS === 'android';
    
    return {
      // iOS-specific optimizations
      ios: {
        animationDuration: 300,
        debounceMs: 0, // No debounce for immediate response
        touchTargetSize: 44,
        hapticFeedback: true
      },
      // Android-specific optimizations
      android: {
        animationDuration: 250,
        debounceMs: 0, // No debounce for immediate response
        touchTargetSize: 48,
        hapticFeedback: false
      },
      // Web-specific optimizations
      web: {
        animationDuration: 200,
        debounceMs: 0, // No debounce for immediate response
        touchTargetSize: 40,
        hapticFeedback: false
      }
    };
  }

  // Responsive performance settings based on device capabilities
  static getResponsivePerformanceSettings() {
    const { width, height } = Dimensions.get('window');
    const isLowEndDevice = width < 375 || height < 667; // iPhone SE or smaller
    const isHighEndDevice = width >= 414 && height >= 896; // iPhone 11 Pro Max or larger
    
    return {
      // Low-end device optimizations
      lowEnd: {
        debounceMs: 0, // No debounce for immediate response
        batchSize: 2,
        cacheDuration: 2 * 60 * 1000, // 2 minutes
        preloadImages: false,
        animationDuration: 400
      },
      // High-end device optimizations
      highEnd: {
        debounceMs: 0, // No debounce for immediate response
        batchSize: 5,
        cacheDuration: 10 * 60 * 1000, // 10 minutes
        preloadImages: true,
        animationDuration: 200
      },
      // Default optimizations
      default: {
        debounceMs: 0, // No debounce for immediate response
        batchSize: 3,
        cacheDuration: 5 * 60 * 1000, // 5 minutes
        preloadImages: true,
        animationDuration: 300
      }
    };
  }
}

// Hook for optimized button handling
export function useOptimizedButton(
  onPress: () => void | Promise<void>,
  options: {
    debounceMs?: number;
    key?: string;
    hapticFeedback?: boolean;
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
    priority?: 'high' | 'low';
  } = {}
) {
  return () => PerformanceOptimizer.optimizedFetch(key, fetchFn, options);
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics: Record<string, { start: number; end?: number }> = {};
  private static memoryUsage: Record<string, number> = {};

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

  static trackMemoryUsage(key: string, size: number): void {
    this.memoryUsage[key] = size;
  }

  static getMemoryUsage(): Record<string, number> {
    return { ...this.memoryUsage };
  }
}

// Responsive touch handling
export class ResponsiveTouchHandler {
  private static touchHistory: Array<{ x: number; y: number; timestamp: number }> = [];
  private static readonly MAX_TOUCH_HISTORY = 10;

  static handleTouch(x: number, y: number): boolean {
    const now = Date.now();
    
    // Add to touch history
    this.touchHistory.push({ x, y, timestamp: now });
    
    // Keep only recent touches
    if (this.touchHistory.length > this.MAX_TOUCH_HISTORY) {
      this.touchHistory.shift();
    }
    
    // Check for rapid touches (potential double-tap)
    const recentTouches = this.touchHistory.filter(
      touch => now - touch.timestamp < 300
    );
    
    if (recentTouches.length > 1) {
      // Prevent rapid successive touches
      return false;
    }
    
    return true;
  }

  static clearTouchHistory(): void {
    this.touchHistory = [];
  }
}

// Export all utilities
export default {
  PerformanceOptimizer,
  PerformanceMonitor,
  ResponsiveTouchHandler,
  useOptimizedButton,
  useOptimizedFetch
};
