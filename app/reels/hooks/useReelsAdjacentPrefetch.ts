/**
 * Prefetch next 1–2 Reels video URLs around the focused index.
 */
import { useEffect, useRef } from "react";
import { detectNetworkQuality } from "../../utils/videoOptimization";
import { PERFORMANCE_CONFIG } from "../../../src/shared/config/performance";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia,
} from "../../../src/shared/utils/videoUrlManager";
import { prefetchVideoUrls } from "../../../src/shared/utils/videoPrefetch";

export function useReelsAdjacentPrefetch(options: {
  currentIndex: number;
  videos: any[];
  ahead?: number;
}) {
  const { currentIndex, videos } = options;
  const lastIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!videos.length || currentIndex < 0) return;
    if (lastIndexRef.current === currentIndex) return;
    lastIndexRef.current = currentIndex;

    let cancelled = false;

    const run = async () => {
      let ahead = options.ahead;
      if (ahead === undefined) {
        try {
          const quality = await detectNetworkQuality();
          const configured = PERFORMANCE_CONFIG.VIDEO.PRELOAD_DISTANCE ?? 2;
          ahead =
            quality.type === "excellent"
              ? configured
              : quality.type === "good"
                ? 1
                : 0;
        } catch {
          ahead = 1;
        }
      }

      if (cancelled || !ahead) return;

      const urls: string[] = [];
      for (let i = 1; i <= ahead; i += 1) {
        const item = videos[currentIndex + i];
        if (!item) continue;
        const raw = getVideoUrlFromMedia(item);
        const url = raw ? getBestVideoUrl(raw) : null;
        if (url) urls.push(url);
      }

      if (urls.length > 0) prefetchVideoUrls(urls);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [currentIndex, videos, options.ahead]);
}
