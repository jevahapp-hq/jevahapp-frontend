/**
 * Feed video performance constants.
 * Tuned for device health: Android only has a few hardware decoder slots.
 * Mounting 10+ players (× multiple category panes) hangs the app.
 * Pattern: Mux Slop Social / Tendbble — active + 1 ahead, warm network only beyond that.
 *
 * Feed cards are a fixed box (not 9:16 Reels). The player uses contain so
 * uploaded video is fully visible inside the box instead of cropped.
 */
export const FEED_VIDEO_PLAYER_HEIGHT = 400;
/** Footer + bottom margin — keep FlashList row size stable. */
export const FEED_VIDEO_FOOTER_ESTIMATE = 88;
export const FEED_VIDEO_CARD_MARGIN = 64;
export const FEED_VIDEO_ROW_SIZE =
  FEED_VIDEO_PLAYER_HEIGHT + FEED_VIDEO_FOOTER_ESTIMATE + FEED_VIDEO_CARD_MARGIN;

export function getFeedVideoRowSize(): number {
  return FEED_VIDEO_ROW_SIZE;
}

/** Real decoder window around the active video. */
export const FEED_PRELOAD_NEIGHBOR_DISTANCE = 1;
/** Network warm (no decoder) ahead of the mount window. */
export const FEED_PRELOAD_WARM_DISTANCE = 3;
/** Mount this many at cold start before viewability fires. */
export const FEED_INITIAL_MOUNT_COUNT = 2;
/** Hidden category panes: keep at most this many paused decoders warm. */
export const FEED_WARM_IDLE_MOUNT_COUNT = 1;
/** Hard ceiling — 1 audible + 1 preload (TikTok-style). */
export const FEED_HARD_MAX_PLAYERS = 2;

/** Viewability: start autoplay once ~30% of the card is visible. */
export const FEED_VIDEO_VISIBLE_PERCENT = 30;
export const FEED_VIDEO_MIN_VIEW_MS = 180;
