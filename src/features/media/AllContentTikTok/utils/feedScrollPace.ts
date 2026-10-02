/**
 * A fast fling should not swap video decoders on every row.
 * Cells keep their poster until the scroll settles, then the visible clip plays.
 */

export const FAST_FEED_SCROLL_PX_PER_MS = 1.5;

export function scrollSpeedIsFast(deltaPx: number, deltaMs: number): boolean {
  if (!(deltaMs > 0)) return false;
  return Math.abs(deltaPx) / deltaMs >= FAST_FEED_SCROLL_PX_PER_MS;
}

/**
 * A flick pauses the clip that is already on screen. Scrolling back up often
 * starts that same clip before the flick is detected, then the pause sticks
 * because the visible key never changes. Resume it when the scroll stops.
 */
export function shouldResumeVisibleVideoAfterScroll(options: {
  autoPlay: boolean;
  feedActive: boolean;
  commentsOpen: boolean;
  visibleKey: string | null;
  visibleIsVideo: boolean;
  isPlaying: boolean;
}): boolean {
  if (!options.autoPlay || !options.feedActive || options.commentsOpen) return false;
  if (!options.visibleIsVideo || !options.visibleKey) return false;
  return !options.isPlaying;
}

let fast = false;
const settlers = new Set<() => void>();
const listeners = new Set<(scrollingFast: boolean) => void>();

export function isFeedScrollingFast(): boolean {
  return fast;
}

export function setFeedScrollingFast(next: boolean): void {
  if (fast === next) return;
  fast = next;
  if (!next) {
    settlers.forEach((run) => {
      try {
        run();
      } catch {
        // no-op
      }
    });
  }
  listeners.forEach((listener) => {
    try {
      listener(next);
    } catch {
      // no-op
    }
  });
}

/** Runs once when a flick ends, so every pending viewability update can apply. */
export function subscribeFeedScrollSettle(run: () => void): () => void {
  settlers.add(run);
  return () => {
    settlers.delete(run);
  };
}

export function subscribeFeedScrollPace(
  listener: (scrollingFast: boolean) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
