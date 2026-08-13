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
  /** translateY applied to the feed so media sits in the peek */
  shiftY: number;
  /** Scale feed content (1 = identity — avoid shrink-to-seam black band) */
  mediaScale: number;
};

/** Fresh window height (orientation / foldables) */
export function getWindowHeight(): number {
  return Dimensions.get("window").height;
}

/**
 * Dock the watching video into a tall top peek so pause stays high and tappable.
 * Biases the player upward (pause ~upper third of peek), sheet sits lower.
 */
export function resolveCommentSheetLayout(
  anchor?: CommentMediaAnchor | null
): CommentSheetLayoutLive {
  const H = getWindowHeight();
  // Taller peek = sheet lower = pause icon clearer
  const MIN_PEEK = Math.max(220, Math.round(H * 0.46));
  const MAX_PEEK = Math.round(H * 0.56);
  const FALLBACK_PEEK = Math.round(H * 0.52);

  const playerH =
    anchor &&
    Number.isFinite(anchor.mediaHeight) &&
    (anchor.mediaHeight as number) > 0
      ? Math.round(anchor.mediaHeight as number)
      : DEFAULT_PLAYER_H;

  const peekHeight = Math.max(
    MIN_PEEK,
    Math.min(MAX_PEEK, Math.round(H * 0.52))
  );

  if (
    !anchor ||
    !Number.isFinite(anchor.mediaBottomY) ||
    anchor.mediaBottomY <= 0
  ) {
    // Still lift so pause sits in the upper peek, not mid/low
    const lift = Math.round(playerH * 0.22);
    return {
      peekHeight: FALLBACK_PEEK,
      shiftY: -lift,
      mediaScale: 1,
    };
  }

  const mediaBottomY = Math.round(anchor.mediaBottomY);
  const mediaTopY = mediaBottomY - playerH;
  // Place pause (center of player) near ~32% down the peek — high & clickable
  const pauseInPlayerY = playerH / 2;
  const targetPauseY = Math.round(peekHeight * 0.32);
  const shiftY = targetPauseY - mediaTopY - pauseInPlayerY;

  return { peekHeight, shiftY, mediaScale: 1 };
}
