/**
 * Hide the music mini-player while reading (Bible tab).
 * Pause the session; do not spawn a new player.
 */
let suppressed = false;
const listeners = new Set<() => void>();

export function setMiniPlayerSuppressed(next: boolean): void {
  if (suppressed === next) return;
  suppressed = next;
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // no-op
    }
  });
}

export function isMiniPlayerSuppressed(): boolean {
  return suppressed;
}

export function subscribeMiniPlayerGate(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
