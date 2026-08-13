import { useEffect, useRef } from "react";
import { prefetchLiteFeedPosters } from "../../../../shared/cache/liteMediaDiskCache";
import {
  getLiteDiskWarmupCount,
  getLiteWarmupUrlCount,
  isLiteProfileActive,
} from "../../../../shared/lite/liteProfile";
import type { MediaItem } from "../../../../shared/types";
import { PERF, perfMark, perfMeasure } from "../../../../shared/utils/perfMarks";
import { prefetchVideoUrls } from "../../../../shared/utils/videoPrefetch";
import { getVideoUrlFromMedia } from "../../../../shared/utils/videoUrlManager";

/** Warm posters + video heads. Lite: first screen on disk; no extra players. */
export function useAllContentTikTokWarmup(filteredMediaList: MediaItem[]) {
  const warmedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (filteredMediaList.length === 0) return;
    const headId = String(
      filteredMediaList[0]?._id || (filteredMediaList[0] as any)?.id || ""
    );
    if (headId && warmedIdRef.current === headId) return;
    warmedIdRef.current = headId || "anon";

    if (isLiteProfileActive()) {
      prefetchLiteFeedPosters(filteredMediaList, getLiteDiskWarmupCount());
    }
    // Video Range heads stay tiny (1–2) so avatars/icons are not starved.
    const urls = filteredMediaList
      .slice(0, getLiteWarmupUrlCount())
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
