import type { QueryClient } from "@tanstack/react-query";
import { hydrateAuthorProfilesSync, paintAuthorsFromCache } from "../author";
import {
  allContentQueryKey,
  getFeedPageSize,
} from "../config/feedCachePolicy";
import type { AllContentPageResult } from "../media/fetchAllContentPage";
import { syncMediaStatsToInteractionStore } from "../media/syncMediaStats";
import { PERF, perfMark, perfMeasure } from "../utils/perfMarks";
import { getFeedPageSync, getRqFeedSeedSync } from "./feedMmkv";
import {
  buildFeedInfiniteData,
  shouldSeedFeedPage,
} from "./feedSeedInfiniteData";

/**
 * Synchronously seed React Query infinite feed from MMKV so Home can paint
 * last session's first page before the network returns.
 *
 * Seeds both chrono + for-you keys and the live page size so Lite/full
 * cold starts hit the same key the UI actually reads.
 */
export function hydrateFeedQueryCache(queryClient: QueryClient): void {
  perfMark(PERF.FEED_SEED);
  hydrateAuthorProfilesSync();
  const candidates: Array<{ contentType: string; useAuth: boolean }> = [
    { contentType: "ALL", useAuth: false },
    { contentType: "ALL", useAuth: true },
  ];

  const liveLimit = getFeedPageSize();
  let seeded = false;

  for (const { contentType, useAuth } of candidates) {
    const page =
      getFeedPageSync(contentType, useAuth) ||
      (contentType === "ALL" ? getRqFeedSeedSync() : null);
    if (!shouldSeedFeedPage(page?.media)) continue;
    const media = paintAuthorsFromCache(page.media);
    syncMediaStatsToInteractionStore(media);

    const storedLimit = page.limit || liveLimit;
    const limits = new Set<number>([liveLimit, storedLimit]);

    for (const limit of limits) {
      const result: AllContentPageResult = {
        media,
        total: page.total,
        page: 1,
        limit,
        cursor: page.cursor ?? null,
        hasMore: page.hasMore,
      };

      for (const forYou of [false, true] as const) {
        queryClient.setQueryData(
          allContentQueryKey(contentType, limit, useAuth, forYou),
          buildFeedInfiniteData(result, forYou)
        );
      }
    }
    seeded = true;
  }

  if (seeded) {
    perfMeasure(PERF.FEED_SEED, PERF.APP_START);
  }
}
