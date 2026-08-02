/**
 * Feed video performance constants.
 * Tuned for device health: Android only has a few hardware decoder slots.
 * Mounting 10+ players (× multiple category panes) hangs the app.
 * Pattern: Mux Slop Social / Tendbble — active + 1 ahead, warm network only beyond that.
 */
export const FEED_VIDEO_PLAYER_HEIGHT = 400;
/** Footer + bottom margin — keep FlashList row size stable. */
export const FEED_VIDEO_FOOTER_ESTIMATE = 88;
export const FEED_VIDEO_CARD_MARGIN = 64;
export const FEED_VIDEO_ROW_SIZE =
  FEED_VIDEO_PLAYER_HEIGHT + FEED_VIDEO_FOOTER_ESTIMATE + FEED_VIDEO_CARD_MARGIN;

// NOTE: all distances/counts below are measured in VIDEOS, not feed rows.
// The feed's seq maps skip ebook/audio rows, so "1 neighbor" always means
// the nearest actual video above/below — no matter how much non-video
// content is interleaved between them.

/** Real decoder window around the active video (nearest videos each way). */
export const FEED_PRELOAD_NEIGHBOR_DISTANCE = 1;
/** Network warm (no decoder) ahead of the mount window. */
export const FEED_PRELOAD_WARM_DISTANCE = 3;
/** Mount this many videos at cold start before viewability fires. */
export const FEED_INITIAL_MOUNT_COUNT = 2;
/** Hidden category panes: keep at most this many paused decoders warm. */
export const FEED_WARM_IDLE_MOUNT_COUNT = 1;
/**
 * Hard ceiling — prune oldest mounts beyond this.
 *
 * The gap between this and the hot window (active + 1 neighbor each side
 * = 3) is the "scroll-back history": recently watched videos that keep a
 * live, paused player. Keep this at 4 — it was briefly raised to 6 for
 * seamless scroll-back, but the extra live players (each holding decoder
 * slots + AVPlayer buffers) pushed Expo Go into OOM crashes on reload.
 * Scroll-back continuity beyond this window is handled visually by
 * first-frame snapshots (videoFrameSnapshotCache), which cost a few MB
 * of bitmaps instead of live decoders.
 */
export const FEED_HARD_MAX_PLAYERS = 4;

/** Viewability: start autoplay once ~30% of the card is visible. */
export const FEED_VIDEO_VISIBLE_PERCENT = 30;
/**
 * Debounce before a visible video becomes the active one. Kept above ~30ms
 * on purpose (near-zero flipped the active video every scroll frame and
 * broke autoplay); 50ms is a safe snappy middle ground.
 */
export const FEED_VIDEO_MIN_VIEW_MS = 50;

/**
 * "Beginning" of a video for playback purposes. A hair past 0 rather than
 * exactly 0: seeking to a tiny non-zero offset forces the decoder to
 * actually render a frame to the surface, whereas a player sitting at
 * exactly 0 can stay black until playback kicks in.
 *
 * Also the frame we snapshot as the cell background so the black gap
 * before play is covered by real video pixels.
 */
export const FEED_VIDEO_START_POSITION_SECONDS = 0.01;
