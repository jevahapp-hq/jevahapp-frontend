/**
 * Feed video performance constants.
 * Tuned for device health: Android only has a few hardware decoder slots.
 * Mounting 10+ players (× multiple category panes) hangs the app.
 * Pattern: Mux Slop Social / Tendbble — active + previous paused + next
 * primed, warm network only beyond that.
 *
 * Feed cards are a fixed 400px box. A 9:16 clip, and a clip whose ratio
 * is not known yet, fills that height and sits in the center. Every other
 * confirmed ratio covers the whole card. Reels gives 9:16 the full screen.
 * Keep the previous card's paused frame so scrolling back
 * does not flash the cover thumbnail, and prime the next card the same way
 * so scrolling down also shows a decoded frame instead of the poster.
 */
import {
  getUnderReviewExtraRowSize,
  needsUnderReviewRowSpace,
} from "../../../shared/media/underReviewBannerLayout";

export const FEED_VIDEO_PLAYER_HEIGHT = 400;
/**
 * Zoom the picture out inside the fixed card. Contain keeps width and height
 * and shows the whole frame, including heads that cover would crop.
 */
export const FEED_CARD_CONTENT_FIT = "contain" as const;
/** Footer + bottom margin — keep FlashList row size stable. */
export const FEED_VIDEO_FOOTER_ESTIMATE = 88;
/**
 * Floor for under-review extra (2-line banner). Real extra is computed from
 * viewport width so wrapped copy is not clipped on small phones.
 */
export const FEED_VIDEO_UNDER_REVIEW_EXTRA = 96;
export const FEED_VIDEO_CARD_MARGIN = 64;
export const FEED_VIDEO_ROW_SIZE =
  FEED_VIDEO_PLAYER_HEIGHT + FEED_VIDEO_FOOTER_ESTIMATE + FEED_VIDEO_CARD_MARGIN;

export function getFeedVideoRowSize(options?: {
  moderationStatus?: string | null;
  viewportWidth?: number;
}): number {
  if (!needsUnderReviewRowSpace(options?.moderationStatus)) {
    return FEED_VIDEO_ROW_SIZE;
  }
  const extra = Math.max(
    FEED_VIDEO_UNDER_REVIEW_EXTRA,
    getUnderReviewExtraRowSize(options?.viewportWidth ?? 390)
  );
  return FEED_VIDEO_ROW_SIZE + extra;
}

/** Real decoder window: current playing ± this many paused/primed neighbors. */
export const FEED_PRELOAD_NEIGHBOR_DISTANCE = 1;
/** Network warm (no decoder) ahead of the mount window. */
export const FEED_PRELOAD_WARM_DISTANCE = 3;
/** Mount this many at cold start before viewability fires (current + next). */
export const FEED_INITIAL_MOUNT_COUNT = 2;
/** Hidden category panes: never keep a paused decoder (it steals the surface). */
export const FEED_WARM_IDLE_MOUNT_COUNT = 0;
/** Current playing + previous paused + next primed. Hidden tabs still mount 0. */
export const FEED_HARD_MAX_PLAYERS = 3;

/**
 * A card stays the one playing until less than this much of it is still
 * on screen. 50% hands playback to the next card around the halfway point
 * instead of waiting until the previous card has almost left.
 */
export const FEED_VIDEO_VISIBLE_PERCENT = 50;
export const FEED_VIDEO_MIN_VIEW_MS = 0;
/** Audio sermons start as soon as the card is viewable — no 180ms gate. */
export const FEED_AUDIO_MIN_VIEW_MS = 0;

/**
 * Skip the blank first frame. A clip with no saved playhead starts here
 * instead of rewinding to 0, which is what flashes the cover and a white
 * surface. Also the snapshot underlay timestamp.
 */
export const FEED_VIDEO_START_POSITION_SECONDS = 0.1;
