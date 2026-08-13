/**
 * Lite disk cache — posters + video first-segment on device.
 * RAM stays capped (no extra players); bytes live in FileSystem / expo-image disk.
 */
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import { isLiteProfileActive } from "../lite/liteProfile";
import type { MediaItem } from "../types";

const VIDEO_DIR = () =>
  `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ""}lite-video-head`;
const MAX_VIDEO_HEADS = 16;
const MIN_VALID = 2048;

function hashUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  }
  return `h${(h >>> 0).toString(16)}`;
}

export function getLiteVideoHeadPath(url: string): string {
  return `${VIDEO_DIR()}/${hashUrl(url)}.bin`;
}

async function ensureDir(): Promise<void> {
  const dir = VIDEO_DIR();
  if (!dir || dir.startsWith("lite-video-head")) return;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function hasLiteVideoHead(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    const info = await FileSystem.getInfoAsync(getLiteVideoHeadPath(url), {
      size: true,
    } as any);
    return Boolean(info.exists && ((info as any).size || 0) > MIN_VALID);
  } catch {
    return false;
  }
}

async function evictOldHeads(): Promise<void> {
  try {
    await ensureDir();
    const dir = VIDEO_DIR();
    const names = await FileSystem.readDirectoryAsync(dir);
    if (names.length <= MAX_VIDEO_HEADS) return;
    const withMeta = await Promise.all(
      names.map(async (name) => {
        const path = `${dir}/${name}`;
        const info = await FileSystem.getInfoAsync(path, { size: true } as any);
        return { path, mtime: (info as any).modificationTime ?? 0 };
      })
    );
    withMeta
      .sort((a, b) => a.mtime - b.mtime)
      .slice(0, names.length - MAX_VIDEO_HEADS)
      .forEach((e) => {
        void FileSystem.deleteAsync(e.path, { idempotent: true });
      });
  } catch {
    // best-effort
  }
}

function bytesToBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  const chunk = 0x2000;
  let binary = "";
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk) as unknown as number[]);
  }
  if (typeof btoa === "function") return btoa(binary);
  throw new Error("no-btoa");
}

/** Persist ~512KB video head so the next cold start can skip Range prefetch. */
export async function persistLiteVideoHead(
  url: string,
  bytes: ArrayBuffer
): Promise<void> {
  if (!isLiteProfileActive()) return;
  if (!url || !bytes || bytes.byteLength < MIN_VALID) return;
  try {
    await ensureDir();
    const dir = VIDEO_DIR();
    if (!dir || dir.startsWith("lite-video-head")) return;
    const b64 = bytesToBase64(bytes);
    await FileSystem.writeAsStringAsync(getLiteVideoHeadPath(url), b64, {
      encoding: "base64",
    });
    void evictOldHeads();
  } catch {
    // quota / FS — ignore
  }
}

function httpUri(raw: unknown): string | null {
  if (typeof raw === "string" && /^https?:\/\//i.test(raw)) return raw;
  if (raw && typeof raw === "object" && typeof (raw as any).uri === "string") {
    const uri = (raw as any).uri as string;
    return uri.startsWith("http") ? uri : null;
  }
  return null;
}

function posterUri(item: MediaItem): string | null {
  return (
    httpUri((item as any).thumbnailUrl) ||
    httpUri((item as any).coverImageUrl) ||
    httpUri(item.imageUrl)
  );
}

function avatarUri(item: MediaItem): string | null {
  const u = (item as any).uploadedBy;
  const author = (item as any).author;
  const info = (item as any).authorInfo;
  return (
    httpUri(u?.avatar) ||
    httpUri(u?.avatarUrl) ||
    httpUri(u?.imageUrl) ||
    httpUri(u?.profileImage) ||
    httpUri(author?.avatar) ||
    httpUri(info?.avatar) ||
    httpUri((item as any).speakerAvatar) ||
    httpUri((item as any).userAvatar)
  );
}

/** Disk-prefetch posters + avatars for the first N feed cards (Lite). */
export function prefetchLiteFeedPosters(
  items: MediaItem[],
  limit = 8
): void {
  if (!isLiteProfileActive() || !items?.length) return;
  const slice = items.slice(0, limit);
  const posters = slice.map(posterUri).filter((u): u is string => Boolean(u));
  const avatars = slice.map(avatarUri).filter((u): u is string => Boolean(u));
  if (posters.length) {
    void Image.prefetch(posters, "disk").catch(() => {});
  }
  if (avatars.length) {
    void Image.prefetch(avatars, "memory-disk").catch(() => {});
  }
}
