/** Same id the player, the store, and the scroll handoff must share. */
export function reelVideoKey(
  video: { _id?: string; id?: string } | null | undefined,
  index: number
): string {
  const id = String(video?._id || video?.id || "").trim();
  return id ? `reel-${id}` : `reel-index-${index}`;
}

/**
 * Which reel should be audible for a scroll offset.
 * A small move toward the next cell switches immediately. Resting on a
 * page stays on that page.
 */
export function reelIndexForScroll(options: {
  offsetY: number;
  cellHeight: number;
  previousOffsetY: number;
  count: number;
  lead?: number;
}): number {
  const { offsetY, cellHeight, previousOffsetY, count } = options;
  const lead = options.lead ?? 0.04;
  if (!(count > 0) || !(cellHeight > 0)) return 0;
  const page = offsetY / cellHeight;
  const dy = offsetY - previousOffsetY;
  let index: number;
  if (!Number.isFinite(previousOffsetY) || Math.abs(dy) < 0.5) {
    index = Math.round(page);
  } else if (dy > 0) {
    index = Math.floor(page + (1 - lead));
  } else {
    index = Math.ceil(page - (1 - lead));
  }
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(count - 1, index));
}
