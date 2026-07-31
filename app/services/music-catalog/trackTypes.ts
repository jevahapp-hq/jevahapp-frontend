/**
 * Unified TrackCard for curated (copyright-free) and artist lanes.
 * Never mix lanes in one shelf without an explicit curation product.
 */

export type TrackLane = "curated" | "artist";

export type TrackCard = {
  id: string;
  title: string;
  artistName: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  durationSec: number;
  lane: TrackLane;
  processingStatus?: string;
  playCount?: number;
  visibility?: "draft" | "public" | "unlisted" | string;
  genre?: string;
  category?: string;
  description?: string;
  artistSlug?: string;
  artistId?: string;
  raw?: unknown;
};

const READY_STATUSES = new Set([
  "ready",
  "completed",
  "done",
  "success",
  "published",
]);

export function pickPlaybackUrl(raw: any): string {
  return (
    raw?.playbackUrl ||
    raw?.fileUrl ||
    raw?.audioUrl ||
    raw?.mediaUrl ||
    ""
  ).toString();
}

function normalizeVisibility(raw: any): string | undefined {
  if (raw?.visibility) return String(raw.visibility);
  if (typeof raw?.published === "boolean") {
    return raw.published ? "public" : "draft";
  }
  return undefined;
}

export function isTrackPlayable(track: {
  playbackUrl?: string;
  audioUrl?: string;
  processingStatus?: string;
}): boolean {
  const url = String(track.playbackUrl || track.audioUrl || "").trim();
  if (!url) return false;
  const proc = String(track.processingStatus || "").toLowerCase();
  if (!proc) return true;
  if (READY_STATUSES.has(proc)) return true;
  if (
    proc.includes("process") ||
    proc.includes("pending") ||
    proc.includes("upload") ||
    proc.includes("fail") ||
    proc.includes("error") ||
    proc === "queued"
  ) {
    return false;
  }
  return true;
}

export function isTrackProcessing(track: {
  playbackUrl?: string;
  audioUrl?: string;
  processingStatus?: string;
}): boolean {
  const proc = String(track.processingStatus || "").toLowerCase();
  if (!proc) return !String(track.playbackUrl || track.audioUrl || "").trim();
  if (READY_STATUSES.has(proc)) return false;
  return (
    proc.includes("process") ||
    proc.includes("pending") ||
    proc.includes("upload") ||
    proc === "queued" ||
    !String(track.playbackUrl || track.audioUrl || "").trim()
  );
}

export function normalizeTrackCard(
  raw: any,
  fallbackLane: TrackLane = "artist"
): TrackCard | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || raw._id || "").trim();
  if (!id) return null;

  const playbackUrl = pickPlaybackUrl(raw);
  const laneRaw = String(raw.lane || "").toLowerCase();
  const lane: TrackLane =
    laneRaw === "curated" || laneRaw === "copyright-free"
      ? "curated"
      : laneRaw === "artist"
        ? "artist"
        : fallbackLane;

  const durationSec = Number(
    raw.durationSec ??
      raw.duration ??
      (typeof raw.durationMs === "number" ? raw.durationMs / 1000 : 0) ??
      0
  );

  return {
    id,
    title: String(raw.title || "Untitled"),
    artistName: String(
      raw.artistName || raw.artist || raw.singer || raw.speaker || "Unknown"
    ),
    playbackUrl,
    thumbnailUrl: raw.thumbnailUrl || raw.coverUrl || raw.imageUrl || undefined,
    durationSec: Number.isFinite(durationSec) ? durationSec : 0,
    lane,
    processingStatus: raw.processingStatus || raw.status || undefined,
    playCount:
      Number(raw.playCount ?? raw.plays ?? raw.viewCount ?? raw.views ?? 0) || 0,
    visibility: normalizeVisibility(raw),
    genre: raw.genre,
    category: raw.category,
    description: raw.description,
    artistSlug: raw.artistSlug || raw.artist?.slug || undefined,
    artistId: raw.artistId || raw.artist?._id || raw.artist?.id || undefined,
    raw,
  };
}

/** Map TrackCard → global floating player shape */
export function trackCardToAudioTrack(track: TrackCard) {
  return {
    id: track.id,
    title: track.title,
    artist: track.artistName,
    audioUrl: track.playbackUrl,
    thumbnailUrl: track.thumbnailUrl || "",
    duration: track.durationSec || 0,
    category: track.category || track.lane,
    description: track.description,
  };
}

/** Song-shaped object for CopyrightFreeSongModal compatibility */
export function trackCardToSongUi(track: TrackCard) {
  return {
    id: track.id,
    _id: track.id,
    title: track.title,
    artist: track.artistName,
    audioUrl: track.playbackUrl,
    thumbnailUrl: track.thumbnailUrl,
    duration: track.durationSec,
    category: track.category,
    genre: track.genre,
    description: track.description,
    contentType:
      track.lane === "curated" ? "copyright-free-music" : "artist-music",
    lane: track.lane,
    artistSlug: track.artistSlug,
    artistId: track.artistId,
    views: track.playCount,
    viewCount: track.playCount,
    playCount: track.playCount,
    processingStatus: track.processingStatus,
    visibility: track.visibility,
    isProcessing: isTrackProcessing(track),
    isPlayable: isTrackPlayable(track),
  };
}
