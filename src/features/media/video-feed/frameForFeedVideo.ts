import { FEED_VIDEO_PLAYER_HEIGHT } from "./feedVideoConfig";

const NINE_SIXTEEN = 9 / 16;

/** True for a classic vertical clip, within a small encoding tolerance. */
export function isNineSixteenAspect(aspect: number | null | undefined): boolean {
  if (aspect == null || !(aspect > 0) || !Number.isFinite(aspect)) return false;
  return Math.abs(aspect - NINE_SIXTEEN) / NINE_SIXTEEN <= 0.06;
}

export type FeedVideoFrame = {
  portrait: boolean;
  width: number;
  height: number;
};

function nineSixteenColumn(boxW: number): FeedVideoFrame {
  return {
    portrait: true,
    width: Math.min(
      boxW,
      Math.max(1, Math.round(FEED_VIDEO_PLAYER_HEIGHT * NINE_SIXTEEN))
    ),
    height: FEED_VIDEO_PLAYER_HEIGHT,
  };
}

/**
 * A 9:16 clip fills the card height and sits in the center.
 * The side gaps are for a snapshot of that same video.
 * Every other ratio, and an unknown one, covers the whole card. Most
 * sermons are wide, and starting them in the column made them jump.
 */
export function frameForFeedVideo(
  videoAspect: number | null,
  boxW: number
): FeedVideoFrame {
  const fullCard: FeedVideoFrame = {
    portrait: false,
    width: Math.max(1, boxW),
    height: FEED_VIDEO_PLAYER_HEIGHT,
  };
  if (!(boxW > 0)) return fullCard;
  if (isNineSixteenAspect(videoAspect)) return nineSixteenColumn(boxW);
  return fullCard;
}
