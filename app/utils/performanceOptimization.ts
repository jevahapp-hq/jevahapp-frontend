/**
 * @deprecated This file is maintained for backward compatibility.
 * Please import from '@/shared/utils/performance' or '@/utils/performance' instead.
 * 
 * This file re-exports the unified performance utilities from src/shared/utils/performance.ts
 */

// Import for use in default export
import {
  PerformanceOptimizer,
  PerformanceMonitor,
  useOptimizedButton,
  useOptimizedFetch,
  performanceOptimizer,
} from "../../src/shared/utils/performance";

// Re-export everything from the unified performance utility
export {
  PerformanceOptimizer,
  PerformanceMonitor,
  useOptimizedButton,
  useOptimizedFetch,
  performanceOptimizer,
};

// Re-export ResponsiveTouchHandler if it was used (creating a simple placeholder)
// Note: This was in the old file but isn't critical, so we'll create a minimal version
export class ResponsiveTouchHandler {
  private static touchHistory: Array<{ x: number; y: number; timestamp: number }> = [];
  private static readonly MAX_TOUCH_HISTORY = 10;

  static handleTouch(x: number, y: number): boolean {
    const now = Date.now();
    this.touchHistory.push({ x, y, timestamp: now });
    if (this.touchHistory.length > this.MAX_TOUCH_HISTORY) {
      this.touchHistory.shift();
    }
    const recentTouches = this.touchHistory.filter(
      (touch) => now - touch.timestamp < 300
    );
    return recentTouches.length <= 1;
  }

  static clearTouchHistory(): void {
    this.touchHistory = [];
  }
}

// Default export for backward compatibility
export default {
  PerformanceOptimizer,
  PerformanceMonitor,
  ResponsiveTouchHandler,
  useOptimizedButton,
  useOptimizedFetch,
  performanceOptimizer,
};