/**
 * Videos the signed-in user just uploaded.
 *
 * Home ALL/VIDEO reads the ranked For You feed, which does not include a
 * clip that is still processing or awaiting approval. These pins keep that
 * clip on this device until the public feed returns it.
 */
import type { MediaItem } from "../types";
import { readModerationStatus } from "./moderationStatus";

const STORAGE_KEY = "jevah.ownUploads.v1";
const DELETED_KEY = "jevah.deletedUploads.v1";
const MAX_PINS = 30;

let pins: MediaItem[] = [];
let hydrated = false;
/** Posts removed on this phone. The server no longer has them, so they stay hidden. */
const deletedIds = new Set<string>();
const deletedUrls = new Set<string>();
const listeners = new Set<() => void>();

function normalizeMediaUrl(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw || raw === "undefined" || raw === "null") return "";
  return raw.split("#")[0].split("?")[0].toLowerCase();
}

function mediaIdInUrl(url: string): string {
  const named = url.match(
    /\/([0-9a-f]{24})(?:-[a-z0-9]+)?\.(?:mp4|mov|m4v|webm|m4a|mp3|aac|wav)$/i
  );
  return named?.[1] || "";
}

function pushUnique(list: string[], value: string): void {
  if (value && !list.includes(value)) list.push(value);
}

function collectForgottenKeys(item: unknown): { ids: string[]; urls: string[] } {
  const ids: string[] = [];
  const urls: string[] = [];
  const pushId = (value: unknown) => pushUnique(ids, String(value || "").trim());
  const pushUrl = (value: unknown) => {
    const url = normalizeMediaUrl(value);
    if (!url) return;
    pushUnique(urls, url);
    pushId(mediaIdInUrl(url));
  };
  const sources = [item];
  if (item && typeof item === "object") {
    const row = item as Record<string, unknown>;
    sources.push(row.media, row.content, row.item);
  }
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const row = source as Record<string, unknown>;
    pushId(row._id);
    pushId(row.id);
    pushId(row.mediaId);
    pushId(row.contentId);
    pushUrl(row.fileUrl);
    pushUrl(row.playbackUrl);
    pushUrl(row.videoUrl);
    pushUrl(row.url);
    pushUrl(row.hlsUrl);
    pushUrl(row.imageUrl);
    pushUrl(row.thumbnailUrl);
    pushUrl(row.thumbnail);
  }
  return { ids, urls };
}

function itemId(item: { _id?: string; id?: string }): string {
  return String(item?._id || item?.id || "").trim();
}

export function canonicalMediaFileUrl(item: {
  fileUrl?: string;
  playbackUrl?: string;
  url?: string;
} | null | undefined): string {
  if (!item) return "";
  return normalizeMediaUrl(item.fileUrl || item.playbackUrl || item.url);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function isRejected(item: MediaItem): boolean {
  return String(item.moderationStatus || "").toLowerCase() === "rejected";
}

/** A local pin is not proof of review after two weeks. The server row is. */
const STALE_REVIEW_PIN_MS = 14 * 24 * 60 * 60 * 1000;

function isStaleReviewPin(item: MediaItem): boolean {
  const status = String(item.moderationStatus || "").toLowerCase();
  if (status !== "under_review" && status !== "pending") return false;
  const created = Date.parse(String(item.createdAt || ""));
  if (!Number.isFinite(created)) return false;
  return Date.now() - created > STALE_REVIEW_PIN_MS;
}

export function subscribeOwnUploads(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetOwnUploadsForTests(): void {
  pins = [];
  hydrated = false;
  deletedIds.clear();
  deletedUrls.clear();
}

export function isForgottenUpload(id: string | null | undefined): boolean {
  const key = String(id || "").trim();
  return Boolean(key) && deletedIds.has(key);
}

/** True when this card is a copy of something already deleted on this phone. */
export function isForgottenMedia(item: unknown): boolean {
  if (typeof item === "string" || typeof item === "number") {
    return isForgottenUpload(item);
  }
  const { ids, urls } = collectForgottenKeys(item);
  return ids.some((id) => deletedIds.has(id)) || urls.some((url) => deletedUrls.has(url));
}

export function getOwnUploads(): MediaItem[] {
  return pins.filter(
    (item) => itemId(item) && !isRejected(item) && !isForgottenMedia(item)
  );
}

/** Drop a local copy and never show that id again on this phone. */
export function forgetOwnUploads(ids: Array<string | null | undefined>): void {
  forgetDeletedMedia(undefined, ids);
}

/** Hide the post the viewer deleted, matching either its id or its file. */
export function forgetDeletedMedia(
  item: unknown,
  extraIds: Array<string | null | undefined> = []
): void {
  const { ids, urls } = collectForgottenKeys(item);
  extraIds.forEach((id) => pushUnique(ids, String(id || "").trim()));
  if (!ids.length && !urls.length) return;
  ids.forEach((id) => deletedIds.add(id));
  urls.forEach((url) => deletedUrls.add(url));
  pins = pins.filter((pin) => !isForgottenMedia(pin));
  notify();
  void persistPins();
  void persistDeleted();
}

function pinOwnerId(item: MediaItem): string {
  const uploadedBy = item.uploadedBy;
  if (uploadedBy && typeof uploadedBy === "object") {
    return String(uploadedBy._id || (uploadedBy as { id?: string }).id || "").trim();
  }
  return String(item.userId || "").trim();
}

export function isRememberedOwnUpload(item: {
  _id?: string;
  id?: string;
} | null | undefined): boolean {
  const id = itemId(item || {});
  if (!id) return false;
  return pins.some((pin) => itemId(pin) === id && !isRejected(pin));
}

/** True only when this device pinned the clip for the signed-in user. */
export function isViewersRememberedUpload(
  item: { _id?: string; id?: string } | null | undefined,
  viewerId?: string | null
): boolean {
  const viewer = String(viewerId || "").trim();
  if (!viewer || !isRememberedOwnUpload(item)) return false;
  const id = itemId(item || {});
  const pin = pins.find((entry) => itemId(entry) === id && !isRejected(entry));
  return Boolean(pin) && pinOwnerId(pin as MediaItem) === viewer;
}

export function rememberOwnUpload(item: MediaItem): void {
  const id = itemId(item);
  if (!id || isRejected(item) || isForgottenMedia(item)) return;
  const previous = pins.find((pin) => itemId(pin) === id);
  const createdAt =
    String(item.createdAt || "").trim() ||
    String(previous?.createdAt || "").trim();
  const next = createdAt ? { ...item, createdAt } : item;
  pins = [next, ...pins.filter((pin) => itemId(pin) !== id)].slice(0, MAX_PINS);
  notify();
  void persistPins();
}

export function mergeOwnUploads(
  items: MediaItem[],
  accepts?: (item: MediaItem) => boolean,
  viewerId?: string | null
): MediaItem[] {
  const list = (Array.isArray(items) ? items : []).filter(
    (item) => !isForgottenMedia(item)
  );
  const viewer = String(viewerId || "").trim();
  const seen = new Set(list.map((item) => itemId(item)).filter(Boolean));
  const seenUrls = new Set(
    list
      .map((item) => canonicalMediaFileUrl(item))
      .filter((url) => url && !url.startsWith("file:"))
  );
  const extra = getOwnUploads().filter((item) => {
    if (isStaleReviewPin(item)) return false;
    if (viewer && pinOwnerId(item) !== viewer) return false;
    if (seen.has(itemId(item))) return false;
    const url = canonicalMediaFileUrl(item);
    if (url && !url.startsWith("file:") && seenUrls.has(url)) return false;
    return accepts ? accepts(item) : true;
  });
  return extra.length ? [...extra, ...list] : list;
}

export function ingestAccountVideos(raw: unknown, viewerId: string): void {
  const ownerId = String(viewerId || "").trim();
  if (!ownerId || !Array.isArray(raw)) return;

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const video = entry as Record<string, any>;
    const id = String(video._id || video.id || "").trim();
    if (!id || isForgottenMedia(video)) continue;
    const status = readModerationStatus(video);
    if (status === "approved") {
      const pin = pins.find((item) => itemId(item) === id);
      if (pin && pin.moderationStatus !== "approved") {
        rememberOwnUpload({ ...pin, moderationStatus: "approved" });
      }
      continue;
    }
    if (status === "rejected" || (status !== "under_review" && status !== "pending")) {
      continue;
    }
    const fileUrl = String(
      video.fileUrl || video.playbackUrl || video.url || ""
    ).trim();
    const thumb = String(
      video.thumbnailUrl || video.thumbnail || video.imageUrl || fileUrl
    ).trim();
    const moderationStatus =
      status === "approved"
        ? "approved"
        : status === "pending"
          ? "pending"
          : "under_review";

    rememberOwnUpload({
      _id: id,
      title: String(video.title || "Untitled"),
      description: String(video.description || ""),
      contentType: "videos",
      fileUrl,
      playbackUrl: video.playbackUrl || undefined,
      hlsUrl: video.hlsUrl || undefined,
      thumbnailUrl: thumb || undefined,
      imageUrl: thumb,
      createdAt: String(video.createdAt || video.created_at || "").trim(),
      moderationStatus,
      processingStatus: video.processingStatus,
      duration: typeof video.duration === "number" ? video.duration : undefined,
      fileMimeType: video.fileMimeType || video.mimeType,
      userId: ownerId,
      uploadedBy: {
        _id: ownerId,
        firstName: video.uploadedBy?.firstName,
        lastName: video.uploadedBy?.lastName,
      },
    });
  }
}

export async function hydrateOwnUploads(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    const deletedRaw = await AsyncStorage.getItem(DELETED_KEY);
    if (deletedRaw) {
      const storedDeleted = JSON.parse(deletedRaw);
      if (Array.isArray(storedDeleted)) {
        storedDeleted.forEach((id) => {
          const key = String(id || "").trim();
          if (key) deletedIds.add(key);
        });
      } else if (storedDeleted && typeof storedDeleted === "object") {
        const storedIds = (storedDeleted as { ids?: unknown }).ids;
        const storedUrls = (storedDeleted as { urls?: unknown }).urls;
        if (Array.isArray(storedIds)) {
          storedIds.forEach((id) => {
            const key = String(id || "").trim();
            if (key) deletedIds.add(key);
          });
        }
        if (Array.isArray(storedUrls)) {
          storedUrls.forEach((url) => {
            const key = normalizeMediaUrl(url);
            if (key) deletedUrls.add(key);
          });
        }
      }
    }
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return;
    const seen = new Set(pins.map((item) => itemId(item)));
    const restored = stored.filter((item) => {
      const id = itemId(item);
      return id && !seen.has(id) && !isRejected(item) && !isForgottenMedia(item);
    }) as MediaItem[];
    if (!restored.length) return;
    pins = [...pins, ...restored].slice(0, MAX_PINS);
    notify();
  } catch {
    // Storage is optional. In-memory pins still cover this session.
  }
}

async function persistDeleted(): Promise<void> {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    await AsyncStorage.setItem(
      DELETED_KEY,
      JSON.stringify({ ids: [...deletedIds], urls: [...deletedUrls] })
    );
  } catch {
    // Ignore storage failures.
  }
}

async function persistPins(): Promise<void> {
  try {
    const AsyncStorage = (
      await import("@react-native-async-storage/async-storage")
    ).default;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    // Ignore storage failures.
  }
}
