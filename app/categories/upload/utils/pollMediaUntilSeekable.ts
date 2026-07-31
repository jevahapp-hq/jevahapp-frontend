/**
 * After upload finalize, BE is async: no duration / playable URLs until the
 * media worker finishes. Poll detail until seekable (ready + duration > 0).
 */

import { mediaApi } from "../../../../src/core/api/MediaApi";

export type MediaProcessingStatus =
  | "ready"
  | "processing"
  | "pending"
  | "failed"
  | string;

export type SeekableMediaSnapshot = {
  _id: string;
  duration?: number;
  fileUrl?: string;
  playbackUrl?: string;
  hlsUrl?: string;
  fileMimeType?: string;
  mimeType?: string;
  processingStatus?: MediaProcessingStatus;
  thumbnailUrl?: string;
  imageUrl?: string;
};

const DEFAULT_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 90_000;
/** Match scrubber absolute-seek gate (~500ms). */
const MIN_DURATION_SEC = 0.5;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSnapshot(raw: Record<string, unknown>, id: string): SeekableMediaSnapshot {
  const durationRaw = raw.duration;
  const duration =
    typeof durationRaw === "number"
      ? durationRaw
      : typeof durationRaw === "string"
        ? Number(durationRaw)
        : undefined;

  const processingStatus = String(
    raw.processingStatus || raw.status || ""
  ).toLowerCase() as MediaProcessingStatus;

  return {
    _id: String(raw._id || raw.id || id),
    duration: Number.isFinite(duration) ? duration : undefined,
    fileUrl: typeof raw.fileUrl === "string" ? raw.fileUrl : undefined,
    playbackUrl:
      typeof raw.playbackUrl === "string" ? raw.playbackUrl : undefined,
    hlsUrl: typeof raw.hlsUrl === "string" ? raw.hlsUrl : undefined,
    fileMimeType:
      typeof raw.fileMimeType === "string" ? raw.fileMimeType : undefined,
    mimeType: typeof raw.mimeType === "string" ? raw.mimeType : undefined,
    processingStatus: processingStatus || undefined,
    thumbnailUrl:
      typeof raw.thumbnailUrl === "string" ? raw.thumbnailUrl : undefined,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
  };
}

export function isMediaSeekable(snapshot: {
  processingStatus?: string | null;
  duration?: number | null;
}): boolean {
  const status = String(snapshot.processingStatus || "").toLowerCase();
  const duration = Number(snapshot.duration) || 0;
  // If status missing but duration is known, treat as seekable (older rows).
  if (status === "failed") return false;
  if (status && status !== "ready" && duration < MIN_DURATION_SEC) return false;
  return duration >= MIN_DURATION_SEC;
}

/**
 * Poll GET /api/media/:id until processingStatus === ready and duration > 0.
 * Returns the last snapshot (seekable or not) when timeout / failure ends the loop.
 */
export async function pollMediaUntilSeekable(
  mediaId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    signal?: AbortSignal;
    onUpdate?: (snapshot: SeekableMediaSnapshot) => void;
  }
): Promise<SeekableMediaSnapshot | null> {
  const id = String(mediaId || "").trim();
  if (!id) return null;

  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const started = Date.now();
  let last: SeekableMediaSnapshot | null = null;

  while (Date.now() - started < timeoutMs) {
    if (options?.signal?.aborted) return last;

    const res = await mediaApi.getMediaById(id);
    if (res.success && res.data && typeof res.data === "object") {
      last = normalizeSnapshot(res.data as Record<string, unknown>, id);
      options?.onUpdate?.(last);
      if (isMediaSeekable(last)) return last;
      if (String(last.processingStatus || "").toLowerCase() === "failed") {
        return last;
      }
    }

    await sleep(intervalMs);
  }

  return last;
}
