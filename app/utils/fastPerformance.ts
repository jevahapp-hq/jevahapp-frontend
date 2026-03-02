/**
 * @deprecated This file is maintained for backward compatibility.
 * Please import from '@/shared/utils/performance' or '@/utils/performance' instead.
 * 
 * This file re-exports the unified performance utilities from src/shared/utils/performance.ts
 */

// Re-export FastPerformanceOptimizer as alias to PerformanceOptimizer for compatibility
export {
  PerformanceOptimizer as FastPerformanceOptimizer,
  useFastPerformance,
  useFastDebounce,
  useFastThrottle,
  useStableCallback,
  performanceOptimizer,
} from "../../src/shared/utils/performance";

// Also export the main class as PerformanceOptimizer for cases where both are imported
export { PerformanceOptimizer } from "../../src/shared/utils/performance";