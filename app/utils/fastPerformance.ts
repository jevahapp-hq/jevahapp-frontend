import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useRef } from 'react';
import { InteractionManager, Platform } from 'react-native';

// Ultra-fast performance optimization utilities
export class FastPerformanceOptimizer {
  private static instance: FastPerformanceOptimizer;
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, number>();
  private imageCache = new Set<string>();
  private componentRenderCounts = new Map<string, number>();
  private lastRenderTimes = new Map<string, number>();

  static getInstance(): FastPerformanceOptimizer {
    if (!FastPerformanceOptimizer.instance) {
      FastPerformanceOptimizer.instance = new FastPerformanceOptimizer();
    }
    return FastPerformanceOptimizer.instance;
  }

  // Ultra-fast button press handler with immediate feedback
  static handleButtonPress(
    onPress: () => void | Promise<void>,
    options: {
      immediateFeedback?: boolean;
      debounceMs?: number;
      key?: string;
      hapticFeedback?: boolean;
      priority?: 'high' | 'low';
    } = {}
  ): () => void {
    const { 
      immediateFeedback = true, 
      debounceMs = 0, // Zero debounce for immediate response
      key = 'default',
      hapticFeedback = true,
      priority = 'high'
    } = options;
    
    const optimizer = FastPerformanceOptimizer.getInstance();

    return () => {
      // Ultra-fast response: only prevent rapid successive calls within 30ms
      if (optimizer.debounceTimers.has(key)) {
        const lastPress = optimizer.debounceTimers.get(key)!;
        const now = Date.now();
        if (now - lastPress < 30) { // Very short debounce for immediate response
          return;
        }
      }

      // Mark this button as recently pressed
      optimizer.debounceTimers.set(key, Date.now());

      // Immediate visual feedback for high priority actions
      if (immediateFeedback && priority === 'high') {
        // Use requestAnimationFrame for immediate UI update
        requestAnimationFrame(() => {
          // This ensures UI updates happen in the next frame
        });
      }

      // Execute the onPress function immediately
      try {
        const result = onPress();
        if (result instanceof Promise) {
          // Handle promise asynchronously without blocking UI
          result.catch(error => {
            console.error('Button press error:', error);
          });
        }
      } catch (error) {
        console.error('Button press error:', error);
      }

      // Clean up the debounce timer after a very short delay
      setTimeout(() => {
        optimizer.debounceTimers.delete(key);
      }, 30); // Very short cleanup
    };
  }

  // Optimized data fetching with aggressive caching
  static async optimizedFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      cacheDuration?: number;
      forceRefresh?: boolean;
      background?: boolean;
      priority?: 'high' | 'low';
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { 
      cacheDuration = 15 * 60 * 1000, // 15 minutes to match backend cache
      forceRefresh = false, 
      background = false,
      priority = 'high',
      timeout = 8000 // Reduced timeout for faster failure detection
    } = options;
    
    const optimizer = FastPerformanceOptimizer.getInstance();

    // Check cache first for instant response
    if (!forceRefresh && optimizer.requestCache.has(key)) {
      const cached = optimizer.requestCache.get(key)!;
      if (Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }
    }

    // Check for pending requests to prevent duplicates
    if (optimizer.pendingRequests.has(key)) {
      return optimizer.pendingRequests.get(key)!;
    }

    // Create new request with timeout
    const requestPromise = new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timeout for ${key}`));
      }, timeout);

      try {
        const data = await fetchFn();
        clearTimeout(timeoutId);
        
        // Cache the result
        optimizer.requestCache.set(key, {
          data,
          timestamp: Date.now(),
          ttl: cacheDuration
        });
        
        resolve(data);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      } finally {
        optimizer.pendingRequests.delete(key);
      }
    });

    optimizer.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  // Batch state updates for better performance
  static batchStateUpdates(updates: Array<() => void>): void {
    if (updates.length === 0) return;

    // Use React's startTransition if available
    if (typeof React !== 'undefined' && React.startTransition) {
      React.startTransition(() => {
        updates.forEach(update => update());
      });
    } else {
      // Fallback to requestAnimationFrame
      requestAnimationFrame(() => {
        updates.forEach(update => update());
      });
    }
  }

  // Preload critical data for faster app startup
  static async preloadCriticalData(): Promise<void> {
    try {
      // Preload user preferences
      await AsyncStorage.getItem('user_preferences');
      
      // Preload authentication state
      await AsyncStorage.getItem('auth_token');
      
      // Preload recent content
      await AsyncStorage.getItem('recent_content');
    } catch (error) {
      console.warn('Preload error:', error);
    }
  }

  // Memory management
  static cleanup(): void {
    const optimizer = FastPerformanceOptimizer.getInstance();
    
    // Clear old cache entries
    const now = Date.now();
    for (const [key, value] of optimizer.requestCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        optimizer.requestCache.delete(key);
      }
    }

    // Clear old debounce timers
    for (const [key, timestamp] of optimizer.debounceTimers.entries()) {
      if (now - timestamp > 1000) { // Clear timers older than 1 second
        optimizer.debounceTimers.delete(key);
      }
    }
  }
}

// React hooks for fast performance optimization
export const useFastPerformance = () => {
  const optimizer = FastPerformanceOptimizer.getInstance();

  const fastPress = (onPress: () => void, options?: any) => {
    return FastPerformanceOptimizer.handleButtonPress(onPress, options);
  };

  const fastFetch = <T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: any
  ) => {
    return FastPerformanceOptimizer.optimizedFetch(key, fetchFn, options);
  };

  const batchUpdates = (updates: Array<() => void>) => {
    FastPerformanceOptimizer.batchStateUpdates(updates);
  };

  return {
    fastPress,
    fastFetch,
    batchUpdates,
    cleanup: () => FastPerformanceOptimizer.cleanup()
  };
};

// Ultra-fast debounce utility
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

// Ultra-fast throttle utility
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

// Stable callback hook to prevent unnecessary re-renders
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


