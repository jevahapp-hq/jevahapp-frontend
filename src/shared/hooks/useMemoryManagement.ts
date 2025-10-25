import { useEffect, useRef, useCallback } from 'react';

interface MemoryManagerOptions {
  maxCacheSize?: number;
  cleanupInterval?: number;
  memoryThreshold?: number;
}

export const useMemoryManagement = (options: MemoryManagerOptions = {}) => {
  const {
    maxCacheSize = 50,
    cleanupInterval = 30000, // 30 seconds
    memoryThreshold = 0.8
  } = options;

  const cache = useRef<Map<string, { data: any; timestamp: number; size: number }>>(new Map());
  const timers = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervals = useRef<Set<NodeJS.Timeout>>(new Set());

  // Add item to cache with size tracking
  const addToCache = useCallback((key: string, data: any, size: number = 1) => {
    // Remove oldest items if cache is full
    if (cache.current.size >= maxCacheSize) {
      const oldestKey = Array.from(cache.current.keys())[0];
      cache.current.delete(oldestKey);
    }

    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      size
    });
  }, [maxCacheSize]);

  // Get item from cache
  const getFromCache = useCallback((key: string) => {
    const item = cache.current.get(key);
    if (item) {
      // Update timestamp for LRU
      item.timestamp = Date.now();
      return item.data;
    }
    return null;
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    cache.current.clear();
  }, []);

  // Cleanup expired cache items
  const cleanupExpiredCache = useCallback((maxAge: number = 300000) => { // 5 minutes default
    const now = Date.now();
    const expiredKeys: string[] = [];

    cache.current.forEach((item, key) => {
      if (now - item.timestamp > maxAge) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => cache.current.delete(key));
  }, []);

  // Register timer for cleanup
  const registerTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      callback();
      timers.current.delete(timer);
    }, delay);
    
    timers.current.add(timer);
    return timer;
  }, []);

  // Register interval for cleanup
  const registerInterval = useCallback((callback: () => void, interval: number) => {
    const intervalId = setInterval(callback, interval);
    intervals.current.add(intervalId);
    return intervalId;
  }, []);

  // Clear specific timer
  const clearTimer = useCallback((timer: NodeJS.Timeout) => {
    clearTimeout(timer);
    timers.current.delete(timer);
  }, []);

  // Clear specific interval
  const clearIntervalById = useCallback((intervalId: NodeJS.Timeout) => {
    clearInterval(intervalId);
    intervals.current.delete(intervalId);
  }, []);

  // Get memory usage estimate
  const getMemoryUsage = useCallback(() => {
    let totalSize = 0;
    cache.current.forEach(item => {
      totalSize += item.size;
    });
    
    return {
      cacheSize: cache.current.size,
      totalSize,
      memoryUsage: totalSize / maxCacheSize
    };
  }, [maxCacheSize]);

  // Automatic cleanup on memory pressure
  const handleMemoryPressure = useCallback(() => {
    const usage = getMemoryUsage();
    
    if (usage.memoryUsage > memoryThreshold) {
      // Remove oldest 25% of cache
      const itemsToRemove = Math.ceil(cache.current.size * 0.25);
      const sortedItems = Array.from(cache.current.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < itemsToRemove; i++) {
        cache.current.delete(sortedItems[i][0]);
      }
    }
  }, [memoryThreshold, getMemoryUsage]);

  // Setup automatic cleanup
  useEffect(() => {
    // Cleanup expired cache every 30 seconds
    const cleanupIntervalId = registerInterval(() => {
      cleanupExpiredCache();
      handleMemoryPressure();
    }, cleanupInterval);

    return () => {
      clearIntervalById(cleanupIntervalId);
    };
  }, [cleanupInterval, cleanupExpiredCache, handleMemoryPressure, registerInterval, clearIntervalById]);

  // Cleanup all timers and intervals on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(timer => clearTimeout(timer));
      intervals.current.forEach(intervalId => clearInterval(intervalId));
      timers.current.clear();
      intervals.current.clear();
      cache.current.clear();
    };
  }, []);

  return {
    addToCache,
    getFromCache,
    clearCache,
    cleanupExpiredCache,
    registerTimer,
    registerInterval,
    clearTimer,
    clearIntervalById,
    getMemoryUsage,
    handleMemoryPressure
  };
};
