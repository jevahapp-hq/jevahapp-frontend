/**
 * Keep the still/poster over VideoView until a real frame at the intended
 * playhead is on screen.
 *
 * Fullscreen (Reels) primes from t≈0, paints one frame, then seeks to the
 * feed playhead. Dropping the still on that first frame is the black flash.
 * Returning to the category has the same shutter if a paused SurfaceView is
 * uncovered before it paints again.
 */
export function shouldHoldVideoStill(options: {
  nativeFirstFrame: boolean;
  isSurfaceActive: boolean;
  pendingResumeSec?: number | null;
}): boolean {
  if (!options.isSurfaceActive) return true;
  if (!options.nativeFirstFrame) return true;
  return (options.pendingResumeSec ?? 0) > 0.4;
}
