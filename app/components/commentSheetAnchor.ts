/**
 * Align comment sheet top with the live media container bottom (TikTok/IG).
 * Measure mediaBottomY (+ optional mediaHeight) via measureInWindow before opening.
 */
import { Dimensions } from "react-native";

const DEFAULT_PLAYER_H = 400;

export type CommentMediaAnchor = {
  /** Window Y of the bottom edge of the video/media player */
  mediaBottomY: number;
  /** Measured player height (for scale-into-peek) */
  mediaHeight?: number;
};

export type CommentSheetLayoutLive = {
  /** Sheet top / dim height after open */
  peekHeight: number;
  /** translateY applied to the feed so media bottom meets sheet top */
  shiftY: number;
  /** Scale feed content so player fits inside peek (1 = no scale) */
  mediaScale: number;
};

/** Fresh window height (orientation / foldables) */
export function getWindowHeight(): number {
  return Dimensions.get("window").height;
}

function computeMediaScale(peekHeight: number, playerH: number): number {
  if (playerH <= 0) return 1;
  const fit = (peekHeight - 8) / playerH;
  if (!Number.isFinite(fit) || fit >= 1) return 1;
  // Don't shrink below a usable watch band
  return Math.max(0.72, fit);
}

/**
 * Dock player bottom to sheet top.
 * Peek stays ~22–34% so the sheet is ~66–78% (more comments visible).
 */
export function resolveCommentSheetLayout(
  anchor?: CommentMediaAnchor | null
): CommentSheetLayoutLive {
  const H = getWindowHeight();
  const MIN_PEEK = Math.round(H * 0.22);
  const MAX_PEEK = Math.round(H * 0.34);
  const FALLBACK_PEEK = Math.round(H * 0.28);

  if (
    !anchor ||
    !Number.isFinite(anchor.mediaBottomY) ||
    anchor.mediaBottomY <= 0
  ) {
    const peekHeight = FALLBACK_PEEK;
    // Assume a typical mid-upper card bottom when we have no measure
    const assumedBottom = Math.round(H * 0.55);
    return {
      peekHeight,
      shiftY: peekHeight - assumedBottom,
      mediaScale: computeMediaScale(peekHeight, DEFAULT_PLAYER_H),
    };
  }

  const measured = Math.round(anchor.mediaBottomY);
  const playerH =
    Number.isFinite(anchor.mediaHeight) &&
    (anchor.mediaHeight as number) > 0
      ? Math.round(anchor.mediaHeight as number)
      : DEFAULT_PLAYER_H;

  // Prefer flush-at-measure; clamp peek so sheet stays tall (~66%+)
  const peekHeight = Math.max(MIN_PEEK, Math.min(MAX_PEEK, measured));
  const shiftY = peekHeight - measured;
  const mediaScale = computeMediaScale(peekHeight, playerH);

  return { peekHeight, shiftY, mediaScale };
}
