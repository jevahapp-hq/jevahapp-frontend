/**
 * @deprecated This file is maintained for backward compatibility.
 * Please import from '@/shared/utils/performance' or '@/utils/performance' instead.
 * 
 * This file re-exports the unified performance utilities from src/shared/utils/performance.ts
 */

// Re-export everything from the unified performance utility
export {
  PerformanceOptimizer,
  PerformanceMonitor,
  performanceOptimizer,
  useOptimizedButton,
  useFastPerformance,
  useFastDebounce,
  useFastThrottle,
  useStableCallback,
} from "../../src/shared/utils/performance";

// Default export for backward compatibility
export { default } from "../../src/shared/utils/performance";