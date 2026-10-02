/**
 * Opening a reel pauses the feed. The feed's own blur then used to pause
 * every player, including the reel that had just started — fullscreen sat
 * on a paused frame until another tap.
 */
export function reelKeyToKeepOnFeedBlur(
  currentlyPlaying: string | null | undefined
): string | null {
  if (typeof currentlyPlaying !== "string") return null;
  return currentlyPlaying.startsWith("reel-") ? currentlyPlaying : null;
}
