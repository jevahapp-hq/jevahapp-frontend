/**
 * Feed video performance constants.
 * Tuned for device health: Android only has a few hardware decoder slots.
 * Mounting 10+ players (× multiple category panes) hangs the app.
 * Pattern: Mux Slop Social / Tendbble — active + previous paused + next
 * primed, warm network only beyond that.
 *
 * Feed cards are a fixed 400px box. Thumbnail + live video both cover-fill
 * the box (APK). Keep the previous card's paused frame so scrolling back
 * does not flash the cover thumbnail, and prime the next card the same way
 * so scrolling down also shows a decoded frame instead of the poster.
 */
import {
  getUnderReviewExtraRowSize,
  needsUnderReviewRowSpace,
} from "../../../shared/media/underReviewBannerLayout";

export const FEED_VIDEO_PLAYER_HEIGHT = 400;
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

/** Viewability: start autoplay once ~30% of the card is visible. */
export const FEED_VIDEO_VISIBLE_PERCENT = 30;
export const FEED_VIDEO_MIN_VIEW_MS = 180;
/** Audio sermons start as soon as the card is viewable — no 180ms gate. */
export const FEED_AUDIO_MIN_VIEW_MS = 0;

/**
 * A hair past 0 so the decoder actually paints a frame instead of sitting
 * black at exactly 0. Also the snapshot underlay timestamp.
 */
export const FEED_VIDEO_START_POSITION_SECONDS = 0.01;
