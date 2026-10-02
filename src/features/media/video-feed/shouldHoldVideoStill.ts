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
  // A painted frame stays on screen while the reel is paused, so scrolling
  // shows video-to-video instead of the cover thumbnail.
  if (!options.nativeFirstFrame) return true;
  if (!options.isSurfaceActive) return false;
  return (options.pendingResumeSec ?? 0) > 0.4;
}
