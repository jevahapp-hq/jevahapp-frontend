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
