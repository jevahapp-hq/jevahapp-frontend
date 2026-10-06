/**
 * Leftover cancel hook. Do not arm this for queue advance: a JS timer is
 * frozen while the app is minimized, then fires on resume and skips a song
 * the native playlist has already started.
 */
let timer: ReturnType<typeof setTimeout> | null = null;

export function cancelScheduledTrackAdvance() {
  if (timer == null) return;
  clearTimeout(timer);
  timer = null;
}

export function scheduleTrackAdvance(
  remainingMs: number,
  advance: () => void
) {
  cancelScheduledTrackAdvance();
  if (!(remainingMs > 400) || remainingMs > 60 * 60 * 1000) return;
  timer = setTimeout(() => {
    timer = null;
    advance();
  }, remainingMs + 250);
}
