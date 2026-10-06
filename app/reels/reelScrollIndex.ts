/** Same id the player, the store, and the scroll handoff must share. */
export function reelVideoKey(
  video: { _id?: string; id?: string } | null | undefined,
  index: number
): string {
  const id = String(video?._id || video?.id || "").trim();
  return id ? `reel-${id}` : `reel-index-${index}`;
}

/**
 * The reel that should play while the list is moving. The page you are
 * moving toward takes over once `lead` of it is on screen. `direction` is
 * 1 (down the list), -1 (back up) or 0 (unknown).
 * A small lead pauses the reel you left and starts the next one as soon
 * as the swipe has clearly moved onto it.
 */
export function reelIndexWhileScrolling(
  page: number,
  direction: number,
  count: number,
  lead = 0.02
): number {
  "worklet";
  if (!(count > 0) || !Number.isFinite(page)) return 0;
  const base = Math.floor(page);
  const frac = page - base;
  let index: number;
  if (direction > 0) index = frac >= lead ? base + 1 : base;
  else if (direction < 0) index = frac <= 1 - lead ? base : base + 1;
  else index = Math.round(page);
  return Math.max(0, Math.min(count - 1, index));
}

/**
 * Scroll direction that ignores finger wobble: it only flips after the list
 * travels `slop` px the other way from the furthest point reached.
 */
export function nextScrollDirection(
  direction: number,
  anchor: number,
  offset: number,
  slop = 12
): { direction: number; anchor: number } {
  "worklet";
  if (direction > 0) {
    if (offset > anchor) return { direction: 1, anchor: offset };
    if (anchor - offset > slop) return { direction: -1, anchor: offset };
    return { direction, anchor };
  }
  if (direction < 0) {
    if (offset < anchor) return { direction: -1, anchor: offset };
    if (offset - anchor > slop) return { direction: 1, anchor: offset };
    return { direction, anchor };
  }
  if (offset - anchor > slop) return { direction: 1, anchor: offset };
  if (anchor - offset > slop) return { direction: -1, anchor: offset };
  return { direction: 0, anchor };
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
