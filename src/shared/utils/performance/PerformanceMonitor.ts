/** Timing and memory metrics. */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();
  private static metrics: Record<string, { start: number; end?: number }> = {};
  private static memoryUsage: Record<string, number> = {};

  static startTimer(key: string): void {
    this.timers.set(key, Date.now());
    this.metrics[key] = { start: Date.now() };
  }

  static endTimer(key: string): number {
    const startTime = this.timers.get(key);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    if (__DEV__) {
      console.log(`⏱️ Performance: ${key} took ${duration}ms`);
    }
    this.timers.delete(key);

    const metric = this.metrics[key];
    if (metric) metric.end = Date.now();

    return duration;
  }

  static getMetrics(): Record<string, number> {
    const results: Record<string, number> = {};
    Object.entries(this.metrics).forEach(([key, metric]) => {
      if (metric.end) results[key] = metric.end - metric.start;
    });
    return results;
  }

  static clearMetrics(): void {
    this.metrics = {};
    this.timers.clear();
  }

  static trackMemoryUsage(key: string, size: number): void {
    this.memoryUsage[key] = size;
  }

  static getMemoryUsage(): Record<string, number> {
    return { ...this.memoryUsage };
  }
}
