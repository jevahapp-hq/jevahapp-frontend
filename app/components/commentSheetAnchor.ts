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
 * Dock the watching video into a peek that matches the player frame.
 * Sheet sits on the player bottom so avatar / likes / comments stay covered.
 */
export function resolveCommentSheetLayout(
  anchor?: CommentMediaAnchor | null
): CommentSheetLayoutLive {
  const H = getWindowHeight();
  const playerH =
    anchor &&
    Number.isFinite(anchor.mediaHeight) &&
    (anchor.mediaHeight as number) > 0
      ? Math.round(anchor.mediaHeight as number)
      : DEFAULT_PLAYER_H;

  // Exact video frame (never taller than ~58% so comments still have room)
  const peekHeight = Math.max(180, Math.min(playerH, Math.round(H * 0.58)));

  if (
    !anchor ||
    !Number.isFinite(anchor.mediaBottomY) ||
    anchor.mediaBottomY <= 0
  ) {
    return {
      peekHeight,
      shiftY: 0,
      mediaScale: 1,
    };
  }

  const mediaBottomY = Math.round(anchor.mediaBottomY);
  const mediaTopY = mediaBottomY - playerH;
  // Player top → window top. Anything above (tabs/header) clips off-screen.
  const shiftY = -mediaTopY;

  return { peekHeight, shiftY, mediaScale: 1 };
}
