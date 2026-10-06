import type { MediaItem } from "../../../shared/types";
import { isAudioSermon } from "../../../shared/utils/mediaTypeDetection";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia,
} from "../../../shared/utils/videoUrlManager";
import { layoutAspectFromMedia, videoSourceUrls } from "./displayedVideoAspect";
import { readTrustedAspect, rememberFeedVideoAspect } from "./feedVideoAspectCache";
import { prefetchFirstFrames } from "./firstFrameCache";
import { prefetchDisplayedAspects } from "./measureDisplayedAspect";

/** Playback URL the feed card and Reels page both use for this item. */
export function playbackUrlForItem(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  if (isAudioSermon(item as MediaItem)) return null;
  const raw = getVideoUrlFromMedia(item);
  return raw ? getBestVideoUrl(raw) : null;
}

/**
 * Learn the first screen's shapes as soon as the list arrives, so those cards
 * open in their final frame. Cards further down measure when they render;
 * measuring the whole list at once took bandwidth from the clip on screen.
 */
export function prefetchFeedVideoAspects(
  items: readonly unknown[] | null | undefined,
  limit = 6
) {
  if (!items?.length) return;
  const entries: { url: string; also: string[] }[] = [];
  const firstScreen: string[] = [];
  for (const item of items.slice(0, limit)) {
    const url = playbackUrlForItem(item);
    if (url && firstScreen.length < 4) firstScreen.push(url);
    if (!url || readTrustedAspect(url) != null) continue;
    const also = videoSourceUrls(item as object, url);
    const stored = layoutAspectFromMedia(item as object);
    if (stored != null) {
      for (const source of also) rememberFeedVideoAspect(source, stored);
      continue;
    }
    entries.push({ url, also });
  }
  prefetchDisplayedAspects(entries);
  prefetchFirstFrames(firstScreen);
}
