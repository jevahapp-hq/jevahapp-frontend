/**
 * iPhone portrait videos are often stored as landscape pixels plus a rotation.
 * The track size ignores that rotation, so a wide track is not proof the
 * picture is wide. A generated frame applies the rotation.
 */

export function aspectFromSize(
  width?: number | null,
  height?: number | null
): number | null {
  if (typeof width !== "number" || typeof height !== "number") return null;
  if (!(width > 0) || !(height > 0)) return null;
  return width / height;
}

/** Encoded size is safe only when it is already tall. Wide pixels may be rotated. */
export function confirmedAspectFromTrack(track: number | null): number | null {
  if (track != null && track > 0 && track < 1) return track;
  return null;
}

/**
 * A thumbnail clamped to both requested edges is the cap box, not the picture.
 * 96×96 was being stored as a square and the reel then cover-cropped 9:16.
 */
export function aspectFromThumbnail(
  width?: number | null,
  height?: number | null,
  maxWidth?: number | null,
  maxHeight?: number | null
): number | null {
  const aspect = aspectFromSize(width, height);
  if (aspect == null) return null;
  if (
    typeof width === "number" &&
    typeof height === "number" &&
    typeof maxWidth === "number" &&
    typeof maxHeight === "number" &&
    width >= maxWidth - 1 &&
    height >= maxHeight - 1
  ) {
    return null;
  }
  return aspect;
}

/**
 * A wide buffer is often a portrait clip stored sideways.
 * Keep the first tall reading. A later tall frame may replace a wide one.
 */
export function preferDisplayedAspect(
  current: number | null | undefined,
  next: number | null | undefined
): number | null {
  if (next == null || !(next > 0) || !Number.isFinite(next)) {
    return current != null && current > 0 && Number.isFinite(current) ? current : null;
  }
  if (current == null || !(current > 0) || !Number.isFinite(current)) return next;
  if (current < 1) return current;
  return next;
}

/** Cloudinary frame grab. Its pixel size is the picture, not a cover crop. */
export function videoFramePosterUrl(
  videoUrl: string | null | undefined
): string | null {
  if (!videoUrl || !videoUrl.includes("/upload/")) return null;
  const noQuery = videoUrl.split("#")[0].split("?")[0];
  if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(noQuery)) return null;
  return `${noQuery.replace("/upload/", "/upload/so_1/")}.jpg`;
}

function folderOf(url: string): string {
  const path = url.split("#")[0].split("?")[0];
  return path.slice(0, path.lastIndexOf("/") + 1);
}

/**
 * True when the poster is a frame the pipeline cut from this video (it sits
 * next to the file). Custom cover art is a different picture, so Reels must
 * not flash it before the clip.
 */
export function isFramePosterOf(
  posterUrl: string | null | undefined,
  videoUrl: string | null | undefined
): boolean {
  if (!posterUrl || !videoUrl) return false;
  if (videoFramePosterUrl(videoUrl) === posterUrl) return true;
  const posterFolder = folderOf(posterUrl);
  return posterFolder.length > 8 && posterFolder === folderOf(videoUrl);
}

function positiveDimension(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || !(parsed > 0)) return null;
  return parsed;
}

/** Size saved with the upload, or returned by the API. Cover art is not used. */
export function aspectFromMedia(item?: object | null): number | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  const pairs: Array<[unknown, unknown]> = [
    [record.videoWidth, record.videoHeight],
    [record.displayWidth, record.displayHeight],
    [record.sourceWidth, record.sourceHeight],
  ];
  for (const [width, height] of pairs) {
    const aspect = aspectFromSize(
      positiveDimension(width),
      positiveDimension(height)
    );
    if (aspect != null) return aspect;
  }
  return null;
}

/**
 * Size saved with the upload, when it is already the upright picture.
 * A wide pair is often 1920×1080 pixels plus a 90° matrix, which is the
 * sideways buffer, so it must not letterbox a 9:16 reel.
 */
export function layoutAspectFromMedia(item?: object | null): number | null {
  const aspect = aspectFromMedia(item);
  if (aspect == null || aspect >= 1) return null;
  return aspect;
}

/** Playback URL plus the original file, so a sideways MP4 is measured even when HLS is playing. */
export function videoSourceUrls(
  item?: object | null,
  playbackUrl?: string | null
): string[] {
  const record = (item ?? {}) as Record<string, unknown>;
  const values = [
    playbackUrl,
    record.fileUrl,
    record.playbackUrl,
    record.hlsUrl,
  ];
  const urls: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || urls.includes(trimmed)) continue;
    urls.push(trimmed);
  }
  return urls;
}

/**
 * True when a later reading crosses the tall/wide boundary, so the card
 * must leave the full-bleed frame for the full-height frame (or the reverse).
 */
export function frameAspectChanged(
  locked: number | null,
  next: number | null
): boolean {
  if (locked == null || next == null) return false;
  if (!(locked > 0) || !(next > 0)) return false;
  return (locked < 1) !== (next < 1);
}
