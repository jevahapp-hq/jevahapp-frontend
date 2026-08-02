import { useEffect, useRef } from "react";
import type { MediaItem } from "../../../../shared/types";
import { PERF, perfMark, perfMeasure } from "../../../../shared/utils/perfMarks";
import { prefetchVideoUrls } from "../../../../shared/utils/videoPrefetch";
import { getVideoUrlFromMedia } from "../../../../shared/utils/videoUrlManager";

/** Warm first cards' bytes + mark feed first paint. */
export function useAllContentTikTokWarmup(filteredMediaList: MediaItem[]) {
  useEffect(() => {
    if (filteredMediaList.length === 0) return;
    const urls = filteredMediaList
      .slice(0, 8)
      .map((item) => getVideoUrlFromMedia(item))
      .filter(Boolean) as string[];
    if (urls.length) prefetchVideoUrls(urls);
  }, [filteredMediaList]);

  const feedFirstPaintMarkedRef = useRef(false);
  useEffect(() => {
    if (feedFirstPaintMarkedRef.current) return;
    if (filteredMediaList.length === 0) return;
    feedFirstPaintMarkedRef.current = true;
    perfMark(PERF.FEED_FIRST_PAINT);
    perfMeasure(PERF.FEED_FIRST_PAINT, PERF.APP_START);
  }, [filteredMediaList.length]);
}
