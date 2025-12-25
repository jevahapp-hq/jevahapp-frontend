import { CacheItem, CACHE_DURATION } from "../api/types";

// Cache management
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheItem>();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  set(key: string, data: any, duration: number = CACHE_DURATION): void {
    const expiresAt = Date.now() + duration;
    this.cache.set(key, { data, timestamp: Date.now(), expiresAt });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): void {
    this.cache.delete(key);
  }
}

