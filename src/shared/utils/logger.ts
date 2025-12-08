/**
 * Performance-optimized logger utility
 * Only logs in development mode to improve production performance
 */

const isDevelopment = __DEV__;

/**
 * Conditional logger that only logs in development mode
 * This improves production performance by removing console.log overhead
 */
export const devLog = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
};

/**
 * Performance logger for measuring render times
 * Only active in development
 */
export const perfLog = {
  start: (label: string): (() => void) => {
    if (!isDevelopment) {
      return () => {}; // No-op in production
    }
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      if (duration > 16) {
        // Only log if it takes longer than one frame (16ms)
        console.warn(`⚠️ Slow render: ${label} took ${duration.toFixed(2)}ms`);
      }
    };
  },
};
