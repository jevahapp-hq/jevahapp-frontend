import { mmkvGetJson, mmkvSetJson } from "../../src/shared/cache/mmkvStorage";
import { SIGNED_URL_DISK_KEY } from "../../src/shared/cache/persistKeys";
import { FEED_STALE_MS } from "../../src/shared/config/feedCachePolicy";
import allMediaAPI from "./allMediaAPI";

type UrlCacheEntry = { url: string; timestamp: number; expiresAt: number };
type DiskUrlMap = Record<string, UrlCacheEntry>;

const MAX_URL_ENTRIES = 48;
const PERSIST_DEBOUNCE_MS = 400;
/** Drop signed URLs this far before AWS expiry so playback never starts on a dying URL. */
const EXPIRY_SAFETY_MS = 30 * 1000;

/** Parse SigV4 `X-Amz-Date` + `X-Amz-Expires`. Null if not a signed URL. */
export function signedUrlExpiresAtMs(url: string): number | null {
  try {
    const parsed = new URL(url);
    const dateParam = parsed.searchParams.get("X-Amz-Date");
    const expiresParam = parsed.searchParams.get("X-Amz-Expires");
    if (!dateParam || !expiresParam) return null;
    const ttlSec = parseInt(expiresParam, 10);
    if (!Number.isFinite(ttlSec) || ttlSec <= 0) return null;
    // yyyyMMddTHHmmssZ
    if (!/^\d{8}T\d{6}Z$/.test(dateParam)) return null;
    const issued = Date.UTC(
      Number(dateParam.slice(0, 4)),
      Number(dateParam.slice(4, 6)) - 1,
      Number(dateParam.slice(6, 8)),
      Number(dateParam.slice(9, 11)),
      Number(dateParam.slice(11, 13)),
      Number(dateParam.slice(13, 15))
    );
    if (!Number.isFinite(issued)) return null;
    return issued + ttlSec * 1000;
  } catch {
    return null;
  }
}

function isEphemeralSignedUrl(url: string): boolean {
  return /[?&](X-Amz-Signature|X-Amz-Credential|X-Amz-Security-Token|X-Goog-Signature|Signature|Expires)=/i.test(
    url
  );
}

function entryStillValid(
  entry: UrlCacheEntry | undefined
): entry is UrlCacheEntry {
  return Boolean(entry && Date.now() < entry.expiresAt - EXPIRY_SAFETY_MS);
}

export interface MediaItem {
  _id?: string;
  contentType: string;
  fileUrl: string;
  title: string;
  speaker?: string;
  uploadedBy?: string;
  description?: string;
  createdAt: string;
  speakerAvatar?: string | number | { uri: string };
  views?: number;
  sheared?: number;
  saved?: number;
  comment?: number;
  favorite?: number;
  imageUrl?: string | { uri: string };
  thumbnailUrl?: string;
}

export class URLManager {
  private static instance: URLManager;
  private urlCache = new Map<string, UrlCacheEntry>();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  static getInstance(): URLManager {
    if (!URLManager.instance) {
      URLManager.instance = new URLManager();
    }
    return URLManager.instance;
  }

  static rehydrateFromDisk(): void {
    URLManager.getInstance().hydrateFromDisk(true);
  }

  private constructor() {
    this.hydrateFromDisk(false);
  }

  private hydrateFromDisk(merge: boolean): void {
    const disk = mmkvGetJson<DiskUrlMap>(SIGNED_URL_DISK_KEY);
    if (!disk || typeof disk !== "object") return;
    for (const [key, entry] of Object.entries(disk)) {
      if (!entryStillValid(entry)) continue;
      if (isEphemeralSignedUrl(entry.url)) continue;
      if (merge && this.urlCache.has(key)) continue;
      this.urlCache.set(key, entry);
    }
    this.capCache();
  }

  private capCache(): void {
    if (this.urlCache.size <= MAX_URL_ENTRIES) return;
    const oldest = [...this.urlCache.entries()].sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt
    );
    const drop = oldest.length - MAX_URL_ENTRIES;
    for (let i = 0; i < drop; i++) this.urlCache.delete(oldest[i][0]);
  }

  private remember(key: string, url: string): void {
    const signedExpiry = signedUrlExpiresAtMs(url);
    const expiresAt = signedExpiry ?? Date.now() + FEED_STALE_MS;
    if (expiresAt <= Date.now() + EXPIRY_SAFETY_MS) return;
    this.urlCache.set(key, { url, timestamp: Date.now(), expiresAt });
    this.capCache();
    this.schedulePersist();
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flushToDisk();
    }, PERSIST_DEBOUNCE_MS);
  }

  private flushToDisk(): void {
    const out: DiskUrlMap = {};
    for (const [key, entry] of this.urlCache) {
      if (!entryStillValid(entry)) {
        this.urlCache.delete(key);
        continue;
      }
      if (isEphemeralSignedUrl(entry.url)) continue;
      out[key] = entry;
    }
    mmkvSetJson(SIGNED_URL_DISK_KEY, out);
  }

  /**
   * Get a valid URL for a media item, with automatic refresh if needed
   */
  async getValidUrl(item: MediaItem): Promise<string> {
    const cacheKey = `${item._id || item.title}-${item.contentType}`;
    const cached = this.urlCache.get(cacheKey);
    if (entryStillValid(cached)) {
      return cached.url;
    }
    if (cached) this.urlCache.delete(cacheKey);

    const currentUrl = item.fileUrl;
    if (this.isValidUrl(currentUrl)) {
      this.remember(cacheKey, currentUrl);
      return currentUrl;
    }

    console.log(`🔄 URLManager: Refreshing URL for ${item.title}`);
    const refreshedUrl = await this.refreshUrl(item);

    if (refreshedUrl) {
      this.remember(cacheKey, refreshedUrl);
      return refreshedUrl;
    }

    return this.getFallbackUrl(item);
  }

  private isValidUrl(url: string): boolean {
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return false;
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return false;
    }

    const placeholderPatterns = [
      "example.com",
      "placeholder",
      "default",
      "temp",
      "test",
    ];

    return !placeholderPatterns.some((pattern) =>
      url.toLowerCase().includes(pattern)
    );
  }

  private async refreshUrl(item: MediaItem): Promise<string | null> {
    try {
      const response = await allMediaAPI.getAllMedia({
        search: item.title,
        contentType: item.contentType as any,
        limit: 1,
      });

      const fresh = (response as any)?.media?.[0];
      if (fresh?.fileUrl && this.isValidUrl(fresh.fileUrl)) {
        console.log(
          `✅ URLManager: Found fresh URL for ${item.title}: ${fresh.fileUrl}`
        );
        return fresh.fileUrl;
      }
    } catch (error) {
      console.warn(
        `⚠️ URLManager: Failed to refresh URL for ${item.title}:`,
        error
      );
    }

    return null;
  }

  private getFallbackUrl(item: MediaItem): string {
    const fallbackUrls = {
      videos:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      music: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav",
      ebook: "https://via.placeholder.com/400x600/4A90E2/FFFFFF?text=E-Book",
      books: "https://via.placeholder.com/400x600/4A90E2/FFFFFF?text=Book",
      sermon:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      live: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    };

    return (
      fallbackUrls[item.contentType as keyof typeof fallbackUrls] ||
      fallbackUrls.videos
    );
  }

  getFallbackImageUrl(contentType: string): string {
    const fallbackImages = {
      videos: "https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Video",
      music: "https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Music",
      ebook: "https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=E-Book",
      books: "https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Book",
      sermon: "https://via.placeholder.com/400x300/96CEB4/FFFFFF?text=Sermon",
      live: "https://via.placeholder.com/400x300/FFEAA7/FFFFFF?text=Live",
    };

    return (
      fallbackImages[contentType as keyof typeof fallbackImages] ||
      fallbackImages.videos
    );
  }

  clearCache(): void {
    this.urlCache.clear();
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.flushToDisk();
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.urlCache.size,
      entries: Array.from(this.urlCache.keys()),
    };
  }
}

export const urlManager = URLManager.getInstance();
