/**
 * Always mount the real player for feed cells.
 * FlashList / virtualization already limits how many cells exist —
 * poster-only cards are not IG/TikTok behavior.
 */
export function shouldMountMediaPlayer(_options?: {
  itemKey?: string;
  focusedKey?: string | null;
  orderedKeys?: string[];
  warmFirst?: number;
  radius?: number;
}): boolean {
  return true;
}
