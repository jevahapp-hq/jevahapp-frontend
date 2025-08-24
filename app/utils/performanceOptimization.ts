import { useCallback, useMemo, useRef } from 'react';

// Performance optimization utilities

/**
 * Memoized callback that prevents unnecessary re-renders
 */
export const useStableCallback = <T extends (...args: any[]) => any>(callback: T): T => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
};

/**
 * Debounced function to prevent excessive API calls
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
};

/**
 * Throttled function to limit execution frequency
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef(0);
  
  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    }
  }, [callback, delay]) as T;
};

/**
 * Optimized state setter that prevents unnecessary updates
 */
export const useOptimizedState = <T>(initialValue: T) => {
  const [state, setState] = React.useState<T>(initialValue);
  const stateRef = useRef<T>(initialValue);
  
  const setOptimizedState = useCallback((newValue: T | ((prev: T) => T)) => {
    const nextValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(stateRef.current)
      : newValue;
    
    if (nextValue !== stateRef.current) {
      stateRef.current = nextValue;
      setState(nextValue);
    }
  }, []);
  
  return [state, setOptimizedState] as const;
};

/**
 * Memoized object to prevent unnecessary re-renders
 */
export const useMemoizedObject = <T extends object>(obj: T, deps: any[]): T => {
  return useMemo(() => obj, deps);
};

/**
 * Performance monitoring hook
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());
  
  renderCountRef.current += 1;
  const now = Date.now();
  const timeSinceLastRender = now - lastRenderTimeRef.current;
  lastRenderTimeRef.current = now;
  
  if (__DEV__) {
    console.log(`🔄 ${componentName} rendered ${renderCountRef.current} times (${timeSinceLastRender}ms since last render)`);
  }
  
  return {
    renderCount: renderCountRef.current,
    timeSinceLastRender,
  };
};
