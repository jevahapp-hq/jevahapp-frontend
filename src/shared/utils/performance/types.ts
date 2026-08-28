export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface ButtonPressOptions {
  immediateFeedback?: boolean;
  debounceMs?: number;
  key?: string;
  hapticFeedback?: boolean;
  touchTargetSize?: number;
  priority?: "high" | "low";
}

export interface OptimizedFetchOptions {
  cacheDuration?: number;
  forceRefresh?: boolean;
  background?: boolean;
  priority?: "high" | "low";
  timeout?: number;
}
