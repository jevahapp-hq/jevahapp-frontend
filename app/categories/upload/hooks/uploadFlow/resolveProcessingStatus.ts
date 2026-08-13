import type { MediaItem } from "../../../../../src/shared/types";
import { setCachedDurationMs } from "../../../../../src/features/media/components/VideoCard/player/durationCache";
import type { SeekableMediaSnapshot } from "../../utils/pollMediaUntilSeekable";

export type UploadedMedia = {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  playbackUrl?: string;
  hlsUrl?: string;
  contentType: string;
  fileMimeType?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  duration?: number;
  genre?: string;
  moderationStatus?: string;
  processingStatus?: string;
  status?: string;
};

export function resolveProcessingStatus(
  uploaded: Pick<UploadedMedia, "processingStatus" | "status" | "duration">
): MediaItem["processingStatus"] {
  const raw = String(
    uploaded.processingStatus || uploaded.status || ""
  ).toLowerCase();
  if (raw === "queued") return "pending";
  if (
    raw === "ready" ||
    raw === "processing" ||
    raw === "pending" ||
    raw === "failed"
  ) {
    return raw;
  }
  // Finalize often omits status; if duration already known treat as ready.
  if (Number(uploaded.duration) > 0) return "ready";
  return "processing";
}

export function seedDurationCache(
  mediaId: string | undefined,
  durationSec?: number
) {
  if (!mediaId || !durationSec || durationSec < 0.5) return;
  setCachedDurationMs(mediaId, durationSec * 1000);
}

export function snapshotToFeedPatch(
  snapshot: SeekableMediaSnapshot,
  options?: { includePlaybackUrls?: boolean }
): Partial<MediaItem> {
  const includeUrls = options?.includePlaybackUrls !== false;
  const patch: Partial<MediaItem> = {
    processingStatus: snapshot.processingStatus,
  };
  if (typeof snapshot.duration === "number" && snapshot.duration > 0) {
    patch.duration = snapshot.duration;
  }
  // Mid-poll URL swaps remount the feed player (black frame / "disappear").
  // Only apply playback URLs once seekable / on final snapshot.
  if (includeUrls) {
    if (snapshot.fileUrl) patch.fileUrl = snapshot.fileUrl;
    if (snapshot.playbackUrl) patch.playbackUrl = snapshot.playbackUrl;
    if (snapshot.hlsUrl) patch.hlsUrl = snapshot.hlsUrl;
  }
  if (snapshot.fileMimeType) {
    patch.fileMimeType = snapshot.fileMimeType;
    patch.mimeType = snapshot.fileMimeType;
  } else if (snapshot.mimeType) {
    patch.mimeType = snapshot.mimeType;
    patch.fileMimeType = snapshot.mimeType;
  }
  if (snapshot.thumbnailUrl) {
    patch.thumbnailUrl = snapshot.thumbnailUrl;
    patch.imageUrl = snapshot.thumbnailUrl;
  } else if (snapshot.imageUrl) {
    patch.imageUrl = snapshot.imageUrl;
  }
  return patch;
}
