/**
 * Suppression registry for the Now Playing mini bar.
 *
 * Several unrelated subsystems need to hide the bar — reading in the Bible tab,
 * the FAB Upload / Go Live sheet covering the same corner of the screen — and a
 * single shared boolean made them fight: whichever released last won, and the
 * bar came back while the other still needed it gone.
 *
 * Suppression is therefore keyed by reason. The bar stays hidden while any
 * reason is held, and each subsystem only ever releases its own.
 */
export type MiniPlayerSuppressionReason =
  /** Bible reader / onboarding is on screen. */
  | "bible-tab"
  /** The bottom-nav create sheet (Upload / Go Live) is expanded. */
  | "create-sheet"
  /** First-run coach marks are walking the user through the UI. */
  | "login-tour";

const held = new Set<MiniPlayerSuppressionReason>();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // no-op
    }
  });
}

export function suppressMiniPlayer(reason: MiniPlayerSuppressionReason): void {
  if (held.has(reason)) return;
  held.add(reason);
  if (held.size === 1) emit();
}

export function releaseMiniPlayer(reason: MiniPlayerSuppressionReason): void {
  if (!held.delete(reason)) return;
  if (held.size === 0) emit();
}

/** Hold or release in one call, for components driving it from a boolean prop. */
export function setMiniPlayerSuppression(
  reason: MiniPlayerSuppressionReason,
  suppressed: boolean
): void {
  if (suppressed) suppressMiniPlayer(reason);
  else releaseMiniPlayer(reason);
}

export function isMiniPlayerSuppressed(): boolean {
  return held.size > 0;
}

export function subscribeMiniPlayerGate(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * @deprecated Pass an explicit reason via {@link setMiniPlayerSuppression}.
 * Retained so existing Bible-tab callers keep working unchanged.
 */
export function setMiniPlayerSuppressed(next: boolean): void {
  setMiniPlayerSuppression("bible-tab", next);
}
