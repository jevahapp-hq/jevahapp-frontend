/**
 * Shared PDF disk cache — used by PdfViewer and feed ahead-of-open warmups.
 * Caps last-N files so large ebooks don't fill the cache forever.
 */
import * as FileSystem from "expo-file-system";
import { PERF, recordSample } from "../../src/shared/utils/perfMarks";
import { PERFORMANCE_FEATURES } from "../../src/shared/config/performance";

const CACHE_DIR = () => `${FileSystem.cacheDirectory}pdf-cache`;
const MAX_CACHED_PDFS = 8;
const MIN_VALID_BYTES = 1000;

export function getPdfCachePath(url: string): string {
  const safe = encodeURIComponent(String(url || "").trim());
  return `${CACHE_DIR()}/${safe}.pdf`;
}

export async function ensurePdfCacheDir(): Promise<void> {
  const dir = CACHE_DIR();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function getCachedPdfUri(
  url: string
): Promise<string | null> {
  if (!url || !/^https?:\/\//i.test(url.trim())) return null;
  try {
    const path = getPdfCachePath(url);
    const info = await FileSystem.getInfoAsync(path, { size: true } as any);
    if (info.exists && (info as any).size > MIN_VALID_BYTES) {
      return path;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Evict oldest cached PDFs beyond MAX_CACHED_PDFS. */
export async function evictOldPdfCache(
  keepMax: number = MAX_CACHED_PDFS
): Promise<void> {
  try {
    await ensurePdfCacheDir();
    const dir = CACHE_DIR();
    const names = await FileSystem.readDirectoryAsync(dir);
    if (names.length <= keepMax) return;

    const withMeta = await Promise.all(
      names.map(async (name) => {
        const path = `${dir}/${name}`;
        const info = await FileSystem.getInfoAsync(path, {
          size: true,
          md5: false,
        } as any);
        return {
          path,
          mtime: (info as any).modificationTime ?? 0,
        };
      })
    );

    withMeta
      .sort((a, b) => a.mtime - b.mtime)
      .slice(0, Math.max(0, withMeta.length - keepMax))
      .forEach((entry) => {
        void FileSystem.deleteAsync(entry.path, { idempotent: true });
      });
  } catch {
    // best-effort
  }
}

/** Download (or no-op if cached) a PDF into disk cache. */
export async function prefetchPdfUrl(
  url: string | null | undefined
): Promise<string | null> {
  if (!PERFORMANCE_FEATURES.ENABLE_PDF_PREFETCH) return null;
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;

  const started = Date.now();
  try {
    const hit = await getCachedPdfUri(trimmed);
    if (hit) return hit;

    await ensurePdfCacheDir();
    const path = getPdfCachePath(trimmed);
    const result = await FileSystem.downloadAsync(trimmed, path);
    if (result.status >= 200 && result.status < 300) {
      await evictOldPdfCache();
      recordSample(PERF.EBOOK_FIRST_PAGE + ".prefetch", Date.now() - started);
      return path;
    }
  } catch {
    // best-effort
  }
  return null;
}

export function prefetchPdfUrls(
  urls: Array<string | null | undefined>
): void {
  for (const url of urls) {
    void prefetchPdfUrl(url);
  }
}
