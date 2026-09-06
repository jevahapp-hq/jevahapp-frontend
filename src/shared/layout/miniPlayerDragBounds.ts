export type MiniPlayerDragBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * Translation limits for the Now Playing bar.
 *
 * The bar is laid out at `defaultLeft` / `defaultBottom`, then moved with
 * `translateX` / `translateY` (positive Y is down). The floor is the lowest
 * the bar's bottom edge may sit — always above the bottom nav / FAB so the
 * plus button stays tappable.
 */
export function getMiniPlayerTranslationBounds(args: {
  screenWidth: number;
  screenHeight: number;
  barWidth: number;
  barHeight: number;
  defaultLeft: number;
  defaultBottom: number;
  minBottom: number;
  topInset: number;
  sideMargin: number;
}): MiniPlayerDragBounds {
  const {
    screenWidth,
    screenHeight,
    barWidth,
    barHeight,
    defaultLeft,
    defaultBottom,
    minBottom,
    topInset,
    sideMargin,
  } = args;

  const minX = sideMargin - defaultLeft;
  const maxX = screenWidth - sideMargin - defaultLeft - barWidth;
  // Positive Y moves the bar down toward the nav.
  const maxY = defaultBottom - minBottom;
  // Negative Y moves the bar up; keep its top edge under the status bar.
  const minY = topInset - (screenHeight - defaultBottom - barHeight);

  return {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minY: Math.min(minY, maxY),
    maxY: Math.max(minY, maxY),
  };
}

export function clampMiniPlayerTranslation(
  x: number,
  y: number,
  bounds: MiniPlayerDragBounds
): { x: number; y: number } {
  "worklet";
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, y)),
  };
}
