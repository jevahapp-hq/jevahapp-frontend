import { useCallback, useRef } from "react";
import { PerformanceOptimizer } from "./PerformanceOptimizer";
import type { ButtonPressOptions, OptimizedFetchOptions } from "./types";

/** Hook for optimized button handling. */
export function useOptimizedButton(
  onPress: () => void | Promise<void>,
  options: ButtonPressOptions = {}
) {
  return PerformanceOptimizer.handleButtonPress(onPress, options);
}

/** Returns a function that performs the cached, deduplicated fetch. */
export function useOptimizedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: OptimizedFetchOptions = {}
) {
  return useCallback(
    async () => PerformanceOptimizer.optimizedFetch(key, fetchFn, options),
    [key, fetchFn, options.cacheDuration, options.forceRefresh, options.priority]
  );
}

/** Compatibility alias exposing the optimizer as a small hook API. */
export const useFastPerformance = () => {
  const fastPress = (onPress: () => void, options?: ButtonPressOptions) =>
    PerformanceOptimizer.handleButtonPress(onPress, options || {});

  const fastFetch = <T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: OptimizedFetchOptions
  ) => PerformanceOptimizer.optimizedFetch(key, fetchFn, options);

  const batchUpdates = (updates: Array<() => void>) =>
    PerformanceOptimizer.batchStateUpdates(updates);

  return {
    fastPress,
    fastFetch,
    batchUpdates,
    cleanup: () => PerformanceOptimizer.optimizeMemory(),
  };
};

export const useFastDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100
): T => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  ) as T;
};

export const useFastThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 16 // 60fps
): T => {
  const lastCall = useRef(0);
  const lastCallTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
        return;
      }
      if (lastCallTimer.current) clearTimeout(lastCallTimer.current);
      lastCallTimer.current = setTimeout(
        () => {
          lastCall.current = Date.now();
          callback(...args);
        },
        delay - (now - lastCall.current)
      );
    },
    [callback, delay]
  ) as T;
};

/** Stable identity wrapper so callbacks don't retrigger memoized children. */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    (...args: Parameters<T>) => callbackRef.current(...args),
    []
  ) as T;
};
