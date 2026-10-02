import { FEED_VIDEO_PLAYER_HEIGHT } from "../../src/features/media/video-feed/feedVideoConfig";
import { isNineSixteenAspect } from "../../src/features/media/video-feed/frameForFeedVideo";

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
 * Same picture box as a category card: full width, fixed card height.
 * A taller reel leaves bands above and below for the snapshot fill.
 */
export function categoryCardFrame(boxW: number, boxH: number): ReelDisplayFrame {
  const w = Math.max(1, Math.round(boxW));
  const h = Math.max(1, Math.round(boxH));
  return {
    width: w,
    height: Math.min(h, FEED_VIDEO_PLAYER_HEIGHT),
    contentFit: "cover",
  };
}

/**
 * Only a 9:16 clip fills the reel.
 * Every other known ratio stays centered so a snapshot can fill
 * the bands above and below. An unknown ratio stays full screen
 * until a real measurement arrives, so a 9:16 clip is not letterboxed first.
 */
export function reelFillsScreen(aspect: number | null | undefined): boolean {
  if (aspect == null || !(aspect > 0) || !Number.isFinite(aspect)) return true;
  return isNineSixteenAspect(aspect);
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
  return categoryCardFrame(w, h);
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
 * Every other known ratio covers the category-sized window.
 */
export function reelSharpFit(frame: ReelDisplayFrame): ReelContentFit {
  return frame.contentFit;
}
