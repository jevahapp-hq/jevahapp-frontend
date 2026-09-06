import { CacheItem, CACHE_DURATION } from "../api/types";
import { mmkvGetJson, mmkvSetJson } from "../../../src/shared/cache/mmkvStorage";
import { CACHE_MANAGER_DISK_KEY } from "../../../src/shared/cache/persistKeys";

const MAX_DISK_ENTRIES = 128;
const PERSIST_DEBOUNCE_MS = 400;

type DiskMap = Record<string, CacheItem>;

function pruneExpired(map: Map<string, CacheItem>): void {
  const now = Date.now();
  for (const [key, item] of map) {
    if (!item || now > item.expiresAt) map.delete(key);
  }
}

function capMap(map: Map<string, CacheItem>, max: number): void {
  if (map.size <= max) return;
  const oldest = [...map.entries()].sort(
    (a, b) => a[1].expiresAt - b[1].expiresAt
  );
  const drop = oldest.length - max;
  for (let i = 0; i < drop; i++) map.delete(oldest[i][0]);
}

// Cache management — RAM + MMKV so cheap JSON survives process death.
export class CacheManager {
  private static instance: CacheManager;
  private cache = new Map<string, CacheItem>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private hydrated = false;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /** Re-read MMKV after Expo Go AsyncStorage fallback fills memory. */
  static rehydrateFromDisk(): void {
    CacheManager.getInstance().hydrateFromDisk(true);
  }

  private constructor() {
    this.hydrateFromDisk(false);
  }

  private hydrateFromDisk(merge: boolean): void {
    const disk = mmkvGetJson<DiskMap>(CACHE_MANAGER_DISK_KEY);
    if (!disk || typeof disk !== "object") {
      this.hydrated = true;
      return;
    }
    const now = Date.now();
    for (const [key, item] of Object.entries(disk)) {
      if (!item || typeof item.expiresAt !== "number" || now > item.expiresAt) {
        continue;
      }
      if (merge && this.cache.has(key)) continue;
      this.cache.set(key, item);
    }
    pruneExpired(this.cache);
    capMap(this.cache, MAX_DISK_ENTRIES);
    this.hydrated = true;
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flushToDisk();
    }, PERSIST_DEBOUNCE_MS);
  }

  private flushToDisk(): void {
    pruneExpired(this.cache);
    capMap(this.cache, MAX_DISK_ENTRIES);
    const out: DiskMap = {};
    for (const [key, item] of this.cache) {
      out[key] = item;
    }
    mmkvSetJson(CACHE_MANAGER_DISK_KEY, out);
  }

  set(key: string, data: any, duration: number = CACHE_DURATION): void {
    const expiresAt = Date.now() + duration;
    this.cache.set(key, { data, timestamp: Date.now(), expiresAt });
    capMap(this.cache, MAX_DISK_ENTRIES);
    this.schedulePersist();
  }

  get(key: string): any | null {
    if (!this.hydrated) this.hydrateFromDisk(false);
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.schedulePersist();
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.flushToDisk();
  }

  remove(key: string): void {
    this.cache.delete(key);
    this.schedulePersist();
  }
}
