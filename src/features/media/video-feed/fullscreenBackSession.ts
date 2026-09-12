/**
 * Android hardware back while video fullscreen (Reels) is open.
 *
 * The root layout leaves the app on unhandled back (session is kept).
 * Fullscreen registers an exit callback here so that handler can leave
 * fullscreen first instead of closing the app. The session is independent
 * of BackHandler subscription order — Reels re-renders often and must not
 * drop the interceptor.
 */

export type FullscreenBackExit = () => void;

let exitFullscreen: FullscreenBackExit | null = null;

export function isVideoFullscreenActive(): boolean {
  return exitFullscreen != null;
}

export function setFullscreenBackExit(handler: FullscreenBackExit | null): void {
  exitFullscreen = handler;
}

/**
 * Exit fullscreen if it is active.
 * @returns true when the back press was consumed (app must stay open)
 */
export function runFullscreenBackExit(): boolean {
  if (!exitFullscreen) return false;
  exitFullscreen();
  return true;
}

/** Root hardware-back policy: fullscreen first, otherwise leave the app. */
export function resolveRootHardwareBack(): "exit-fullscreen" | "app-exit" {
  return runFullscreenBackExit() ? "exit-fullscreen" : "app-exit";
}
