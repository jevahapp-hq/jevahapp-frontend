/**
 * Artist releases (album / EP / mixtape / single) — studio + public.
 * Never mix with copyright-free / listener playlists.
 */

export type ReleaseType = "single" | "ep" | "album" | "mixtape";

export type ReleaseStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "archived";

/** Nested on TrackCard / AudioTrack for mini-player context */
export type ReleaseRef = {
  id: string;
  title: string;
  coverUrl?: string;
  type?: ReleaseType | string;
  slug?: string;
};

export type ReleaseTrack = {
  id: string;
  title: string;
  trackNumber?: number;
  discNumber?: number;
  processingStatus?: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  moderationStatus?: string;
  visibility?: string;
  release?: ReleaseRef;
  raw?: unknown;
};

export type ArtistRelease = {
  id: string;
  slug?: string;
  title: string;
  type: ReleaseType | string;
  status: ReleaseStatus | string;
  description?: string;
  label?: string;
  upc?: string;
  coverUrl?: string;
  releaseDate?: string;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  trackCount?: number;
  tracks?: ReleaseTrack[];
  artistSlug?: string;
  artistName?: string;
  raw?: unknown;
};

export type CreateReleaseBody = {
  title: string;
  type?: ReleaseType;
  description?: string;
  label?: string;
  upc?: string;
  releaseDate?: string;
  slug?: string;
};

export type PatchReleaseBody = Partial<CreateReleaseBody> & {
  status?: ReleaseStatus;
};

export type PublishReleaseBody = {
  scheduledAt?: string;
  skipTypeHints?: boolean;
};

export const RELEASE_TYPE_HINTS: Record<
  ReleaseType,
  { min: number; max: number; label: string }
> = {
  single: { min: 1, max: 1, label: "Single (1 track)" },
  ep: { min: 2, max: 6, label: "EP (2–6 tracks)" },
  album: { min: 7, max: 40, label: "Album (7–40)" },
  mixtape: { min: 7, max: 40, label: "Mixtape (7–40)" },
};

function unwrap(raw: any): any {
  return raw?.data?.data ?? raw?.data ?? raw;
}

export function normalizeReleaseRef(raw: any): ReleaseRef | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const nested = raw.release && typeof raw.release === "object" ? raw.release : raw;
  const id = String(nested.id || nested._id || raw.releaseId || raw.albumId || "").trim();
  const title = String(nested.title || "").trim();
  if (!id && !title) return undefined;
  return {
    id: id || title,
    title: title || "Release",
    coverUrl: nested.coverUrl || nested.thumbnailUrl || undefined,
    type: nested.type,
    slug: nested.slug,
  };
}

export function normalizeReleaseTrack(raw: any): ReleaseTrack | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || raw._id || "").trim();
  if (!id) return null;
  return {
    id,
    title: String(raw.title || "Untitled"),
    trackNumber: Number(raw.trackNumber ?? raw.track_number) || undefined,
    discNumber: Number(raw.discNumber ?? raw.disc_number) || undefined,
    processingStatus: raw.processingStatus || raw.status,
    playbackUrl:
      raw.playbackUrl || raw.fileUrl || raw.audioUrl || raw.mediaUrl || undefined,
    thumbnailUrl: raw.thumbnailUrl || raw.coverUrl || undefined,
    durationSec: Number(raw.durationSec ?? raw.duration ?? 0) || undefined,
    moderationStatus: raw.moderationStatus,
    visibility: raw.visibility,
    release: normalizeReleaseRef(raw),
    raw,
  };
}

export function normalizeArtistRelease(raw: any): ArtistRelease | null {
  const data = unwrap(raw);
  const r = data?.release ?? data;
  if (!r || typeof r !== "object") return null;
  const id = String(r.id || r._id || "").trim();
  if (!id) return null;
  const tracksRaw = Array.isArray(r.tracks) ? r.tracks : [];
  const tracks = tracksRaw
    .map(normalizeReleaseTrack)
    .filter((t: ReleaseTrack | null): t is ReleaseTrack => !!t)
    .sort(
      (a: ReleaseTrack, b: ReleaseTrack) =>
        (a.trackNumber ?? 999) - (b.trackNumber ?? 999)
    );

  return {
    id,
    slug: r.slug ? String(r.slug) : undefined,
    title: String(r.title || "Untitled release"),
    type: (r.type || "single") as ReleaseType,
    status: (r.status || "draft") as ReleaseStatus,
    description: r.description,
    label: r.label,
    upc: r.upc,
    coverUrl:
      r.coverUrl ||
      r.thumbnailUrl ||
      (r.type === "single" && tracks[0]?.thumbnailUrl) ||
      undefined,
    releaseDate: r.releaseDate,
    publishedAt: r.publishedAt ?? null,
    scheduledAt: r.scheduledAt ?? null,
    trackCount: Number(r.trackCount ?? tracks.length) || tracks.length,
    tracks,
    artistSlug: r.artistSlug || r.artist?.slug,
    artistName: r.artistName || r.artist?.displayName || r.artist?.name,
    raw: r,
  };
}

export function typeHintMismatch(
  type: ReleaseType | string,
  trackCount: number
): string | null {
  const t = String(type || "single").toLowerCase() as ReleaseType;
  const hint = RELEASE_TYPE_HINTS[t];
  if (!hint) return null;
  if (trackCount < hint.min || trackCount > hint.max) {
    return `${hint.label} — you have ${trackCount} track${trackCount === 1 ? "" : "s"}.`;
  }
  return null;
}
