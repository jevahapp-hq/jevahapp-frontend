/**
 * Single source of truth for reel FlashList / playback keys.
 * Mismatched keys were the reason autoplay set playingVideos[A] while
 * the mounted player listened for playingVideos[B].
 */
export function getReelVideoKey(
  item: any,
  index: number,
  speakerName: string
): string {
  const id = item?._id || item?.id || index;
  const title = item?.title || "video";
  const speaker = speakerName || "Creator";
  return `reel-${id}-${title}-${speaker}`;
}
