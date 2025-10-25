import React, { useCallback, useMemo, useRef, useEffect } from 'react';

// Debounce hook for search and input
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Throttle hook for scroll events
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args: any[]) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
};

// Stable callback hook to prevent unnecessary re-renders
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    []
  );
};

// Memoized selector for Zustand stores
export const useStoreSelector = <T, R>(
  store: any,
  selector: (state: T) => R,
  deps: any[] = []
): R => {
  return useMemo(() => {
    return selector(store.getState());
  }, deps);
};

// Batch state updates
export const useBatchedUpdates = () => {
  const updateQueue = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchedUpdate = useCallback((update: () => void) => {
    updateQueue.current.push(update);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const updates = updateQueue.current;
      updateQueue.current = [];
      
      // Use React's batching
      React.startTransition(() => {
        updates.forEach(update => update());
      });
    }, 0);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return batchedUpdate;
};

// Virtual scrolling hook
export const useVirtualScrolling = (
  itemHeight: number,
  containerHeight: number,
  totalItems: number,
  scrollOffset: number
) => {
  return useMemo(() => {
    const visibleStart = Math.floor(scrollOffset / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
      totalItems
    );

    return {
      startIndex: Math.max(0, visibleStart - 1), // Buffer
      endIndex: Math.min(totalItems, visibleEnd + 1), // Buffer
      totalHeight: totalItems * itemHeight,
      offsetY: visibleStart * itemHeight
    };
  }, [itemHeight, containerHeight, totalItems, scrollOffset]);
};

// Image preloading hook
export const useImagePreloader = (urls: string[], maxConcurrent = 3) => {
  const [loadedImages, setLoadedImages] = React.useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = React.useState<Set<string>>(new Set());

  const preloadImage = useCallback(async (url: string) => {
    if (loadedImages.has(url) || loadingImages.has(url)) return;

    setLoadingImages(prev => new Set(prev).add(url));

    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
      
      setLoadedImages(prev => new Set(prev).add(url));
    } catch (error) {
      console.warn(`Failed to preload image: ${url}`, error);
    } finally {
      setLoadingImages(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
      });
    }
  }, [loadedImages, loadingImages]);

  const preloadImages = useCallback(async () => {
    const chunks = [];
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      chunks.push(urls.slice(i, i + maxConcurrent));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(preloadImage));
    }
  }, [urls, maxConcurrent, preloadImage]);

  useEffect(() => {
    preloadImages();
  }, [preloadImages]);

  return {
    loadedImages,
    loadingImages,
    isImageLoaded: (url: string) => loadedImages.has(url),
    isImageLoading: (url: string) => loadingImages.has(url)
  };
};
