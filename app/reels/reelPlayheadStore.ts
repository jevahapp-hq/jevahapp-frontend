/**
 * Playhead for the reel on screen. The progress bar subscribes here so a
 * time update does not re-render the like, comment, and share buttons.
 *
 * 0.1 matches FEED_VIDEO_START_POSITION_SECONDS: just past the blank frame.
 */
const REEL_RESTART_SECONDS = 0.1;

type PlayheadSnapshot = { positionMs: number; durationMs: number };

const positions = new Map<string, number>();
const durations = new Map<string, number>();
const snapshots = new Map<string, PlayheadSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string): void {
  const set = listeners.get(key);
  if (!set) return;
  set.forEach((listener) => {
    try {
      listener();
    } catch {
      // A broken subscriber must not stop the others.
    }
  });
}

export function subscribeReelPlayhead(
  key: string,
  listener: () => void
): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(key);
  };
}

export function getReelPositionMs(key: string): number {
  return positions.get(key) ?? 0;
}

export function getReelDurationMs(key: string): number {
  return durations.get(key) ?? 0;
}

/** Stable object so useSyncExternalStore does not re-render on an unchanged tick. */
export function reelPlayheadSnapshot(key: string): PlayheadSnapshot {
  const positionMs = positions.get(key) ?? 0;
  const durationMs = durations.get(key) ?? 0;
  const prev = snapshots.get(key);
  if (prev && prev.positionMs === positionMs && prev.durationMs === durationMs) {
    return prev;
  }
  const next = { positionMs, durationMs };
  snapshots.set(key, next);
  return next;
}

export function publishReelPlayhead(
  key: string,
  positionMs: number,
  durationMs?: number
): void {
  const nextPos = Math.max(0, positionMs);
  const prevPos = positions.get(key);
  let changed = prevPos == null || Math.abs(prevPos - nextPos) >= 180;
  positions.set(key, nextPos);
  if (typeof durationMs === "number" && durationMs > 0 && durations.get(key) !== durationMs) {
    durations.set(key, durationMs);
    changed = true;
  }
  if (changed) emit(key);
}

/** Scrub and resume need the exact millisecond, including a small move. */
export function publishReelPlayheadNow(
  key: string,
  positionMs: number,
  durationMs?: number
): void {
  positions.set(key, Math.max(0, positionMs));
  if (typeof durationMs === "number" && durationMs > 0) {
    durations.set(key, durationMs);
  }
  emit(key);
}

/**
 * Where a player that is still mounted should seek when it becomes audible.
 * Null leaves the live playhead alone so a half-watched reel does not reload.
 * A finished reel restarts just past the blank opening frame.
 */
export function reelResumeSeekSeconds(ended: boolean): number | null {
  if (ended) return REEL_RESTART_SECONDS;
  return null;
}
