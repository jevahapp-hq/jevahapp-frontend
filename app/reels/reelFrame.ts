import {
  frameForFeedVideo,
  isNineSixteenAspect,
} from "../../src/features/media/video-feed/frameForFeedVideo";

/** Classic vertical reel. Width / height. */
export const REEL_NINE_SIXTEEN = 9 / 16;

export type ReelContentFit = "contain" | "cover";

export type ReelDisplayFrame = {
  width: number;
  height: number;
  contentFit: ReelContentFit;
};

function fullCell(boxW: number, boxH: number, contentFit: ReelContentFit): ReelDisplayFrame {
  return {
    width: Math.max(1, Math.round(boxW)),
    height: Math.max(1, Math.round(boxH)),
    contentFit,
  };
}

/**
 * Only a 9:16 clip fills the reel.
 * Every other known ratio uses the feed's portrait frame turned on its
 * side: that column's height becomes this picture's width, and its width
 * becomes this picture's height. An unknown ratio stays full screen until
 * a real measurement arrives, so a 9:16 clip is not letterboxed first.
 */
export function reelFillsScreen(aspect: number | null | undefined): boolean {
  if (aspect == null || !(aspect > 0) || !Number.isFinite(aspect)) return true;
  return isNineSixteenAspect(aspect);
}

/** Feed portrait column, with width and height exchanged, fitted to the reel. */
export function swappedPortraitFeedFrame(
  boxW: number,
  boxH: number
): ReelDisplayFrame {
  const portrait = frameForFeedVideo(9 / 16, boxW);
  let width = portrait.height;
  let height = portrait.width;
  const maxW = Math.max(1, boxW);
  const maxH = Math.max(1, boxH);
  if (width > maxW) {
    height *= maxW / width;
    width = maxW;
  }
  if (height > maxH) {
    width *= maxH / height;
    height = maxH;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    contentFit: "cover",
  };
}

export function reelDisplayFrame(
  aspect: number | null | undefined,
  boxW: number,
  boxH: number
): ReelDisplayFrame {
  const w = Math.max(1, boxW);
  const h = Math.max(1, boxH);
  if (!(boxW > 0) || !(boxH > 0)) return fullCell(w, h, "cover");
  if (reelFillsScreen(aspect)) return fullCell(w, h, "cover");
  return swappedPortraitFeedFrame(w, h);
}

/** True when the sharp picture does not already cover the cell. */
export function reelFrameNeedsBackdrop(
  frame: ReelDisplayFrame,
  boxW: number,
  boxH: number
): boolean {
  if (frame.contentFit === "contain") return true;
  return frame.width < boxW - 1 || frame.height < boxH - 1;
}

/**
 * The sharp picture uses the frame's fit. 9:16 covers the whole reel.
 * Every other known ratio covers the turned portrait-feed window.
 */
export function reelSharpFit(frame: ReelDisplayFrame): ReelContentFit {
  return frame.contentFit;
}
