/**
 * Normalize BE copyright-free / audio track payloads → FE song shape.
 * Single source for list, search, detail, and modal transforms (DRY).
 */

export type MappedCopyrightFreeSong = {
  id: string;
  _id: string;
  title: string;
  artist: string;
  artistName: string;
  year?: number;
  audioUrl: string;
  fileUrl: string;
  thumbnailUrl: string;
  category?: string;
  /** Seconds — seed seek; never invent if BE omits */
  duration: number;
  durationSec: number;
  contentType: string;
  description?: string;
  speaker?: string;
  uploadedBy?: unknown;
  createdAt?: string;
  viewCount: number;
  views: number;
  likeCount: number;
  likes: number;
  shareCount: number;
  saveCount: number;
  playCount: number;
  isLiked: boolean;
  isInLibrary: boolean;
  isSaved: boolean;
  shareUrl?: string;
  isPublicDomain: boolean;
  processingStatus?: string;
  source?: "copyright-free" | "media" | string;
};

function num(...vals: unknown[]): number {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

/** Prefer durationSec, then duration (seconds). Ignore bogus ms-scale if both missing. */
export function resolveDurationSec(raw: any): number {
  const sec = num(raw?.durationSec, raw?.duration);
  if (sec > 0 && sec <= 10000) return Math.round(sec);
  const ms = num(raw?.durationMs);
  if (ms > 1000) return Math.round(ms / 1000);
  return sec > 0 ? Math.round(sec) : 0;
}

export function mapCopyrightFreeSong(raw: any): MappedCopyrightFreeSong {
  const id = String(raw?.id ?? raw?._id ?? "").trim();
  const audioUrl = String(raw?.audioUrl ?? raw?.fileUrl ?? raw?.playbackUrl ?? "");
  const fileUrl = String(raw?.fileUrl ?? raw?.audioUrl ?? raw?.playbackUrl ?? "");
  const artist = String(
    raw?.artistName ?? raw?.artist ?? raw?.singer ?? raw?.speaker ?? ""
  );
  const likeCount = num(raw?.likeCount, raw?.likes);
  const viewCount = Math.max(num(raw?.viewCount, raw?.views), likeCount);
  const duration = resolveDurationSec(raw);
  const isInLibrary = Boolean(
    raw?.isInLibrary ?? raw?.isSaved ?? raw?.bookmarked ?? false
  );

  return {
    id,
    _id: id,
    title: String(raw?.title || "Untitled"),
    artist,
    artistName: artist,
    year: raw?.year || (raw?.createdAt ? new Date(raw.createdAt).getFullYear() : undefined),
    audioUrl,
    fileUrl,
    thumbnailUrl: String(raw?.thumbnailUrl || raw?.coverUrl || raw?.imageUrl || ""),
    category: raw?.category,
    duration,
    durationSec: duration,
    contentType: raw?.contentType || "copyright-free-music",
    description: raw?.description || "",
    speaker: raw?.speaker ?? artist,
    uploadedBy: raw?.uploadedBy,
    createdAt: raw?.createdAt,
    viewCount,
    views: viewCount,
    likeCount,
    likes: likeCount,
    shareCount: num(raw?.shareCount, raw?.shares),
    saveCount: num(raw?.saveCount, raw?.bookmarkCount, raw?.saves),
    playCount: num(raw?.playCount, raw?.plays),
    isLiked: Boolean(raw?.isLiked),
    isInLibrary,
    isSaved: Boolean(raw?.isSaved ?? isInLibrary),
    shareUrl: raw?.shareUrl ? String(raw.shareUrl) : undefined,
    isPublicDomain: raw?.isPublicDomain !== undefined ? Boolean(raw.isPublicDomain) : true,
    processingStatus: raw?.processingStatus || raw?.status,
    source: raw?.source,
  };
}
