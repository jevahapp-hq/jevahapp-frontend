import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  ensureFeedAuthors,
  feedNeedsAuthorEnrichment,
} from "../author";
import {
  allContentQueryKey,
  getFeedGcMs,
  getFeedMaxPages,
  getFeedPageSize,
  getFeedStaleMs,
} from "../config/feedCachePolicy";
import { shouldFetchServerForYou } from "../feed/feedFeatureFlags";
import { isLiteProfileActive } from "../lite/liteProfile";
import type { MediaItem } from "../types";
import {
  fetchAllContentPage,
  readSeededFirstPage,
  seedContentCache,
  type AllContentPageResult,
} from "./fetchAllContentPage";

const EMPTY_MEDIA_LIST: MediaItem[] = [];

type PageParam = number | string | null;

export function useAllContentInfiniteQuery(options: {
  contentType: string;
  limit?: number;
  useAuth?: boolean;
  enabled?: boolean;
}) {
  const {
    contentType,
    limit: limitOpt,
    useAuth = false,
    enabled = true,
  } = options;

  const limit = limitOpt ?? getFeedPageSize();
  const useForYou = shouldFetchServerForYou(contentType, useAuth);
  const queryKey = allContentQueryKey(contentType, limit, useAuth, useForYou);
  const seeded = readSeededFirstPage(contentType, useAuth);
  const seedFresh =
    Boolean(seeded?.media?.length) &&
    typeof seeded?.fetchedAt === "number" &&
    Date.now() - seeded.fetchedAt <= getFeedStaleMs();

  const initialData = seeded?.media?.length
    ? {
        pages: [
          {
            media: seeded.media,
            total: seeded.total,
            page: 1,
            limit,
            source: (useForYou ? "for_you" : "all_content") as
              | "for_you"
              | "all_content",
            cursor: seeded.cursor ?? null,
            hasMore:
              seeded.hasMore ??
              (typeof seeded.total === "number"
                ? seeded.total > seeded.media.length
                : seeded.media.length >= limit),
          } satisfies AllContentPageResult,
        ],
        pageParams: [useForYou ? null : 1] as PageParam[],
      }
    : undefined;

  const queryClient = useQueryClient();
  const enrichPassRef = useRef(0);
  const lastSuccessKeyRef = useRef("");

  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      if (useForYou) {
        const cursor =
          pageParam === null || pageParam === undefined
            ? null
            : typeof pageParam === "string"
              ? pageParam
              : null;
        const isFirst = cursor == null;
        try {
          const result = await fetchAllContentPage({
            contentType,
            page: isFirst ? 1 : 2,
            limit,
            useAuth,
            cursor,
          });
          if (!result.media?.length && isFirst) {
            const seed = readSeededFirstPage(contentType, useAuth);
            if (seed?.media?.length) {
              return {
                media: seed.media,
                total: seed.total,
                page: 1,
                limit,
                source: "all_content" as const,
              };
            }
          }
          return result;
        } catch {
          // Soft fallback chronological by page index
          return fetchAllContentPage({
            contentType,
            page: 1,
            limit,
            useAuth,
            forceChronological: true,
          });
        }
      }

      const page = typeof pageParam === "number" ? pageParam : 1;
      const result = await fetchAllContentPage({
        contentType,
        page,
        limit,
        useAuth,
        forceChronological: true,
      });

      if (!result.media?.length && page === 1) {
        const seed = readSeededFirstPage(contentType, useAuth);
        if (seed?.media?.length) {
          if (__DEV__) {
            console.warn(
              "⚠️ all-content returned empty; keeping seeded feed items"
            );
          }
          return {
            media: seed.media,
            total: seed.total,
            page: 1,
            limit,
            source: "all_content" as const,
          };
        }
      }
      return result;
    },
    initialPageParam: (useForYou ? null : 1) as PageParam,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.source === "for_you" && lastPage.cursor) {
        if (lastPage.hasMore === false) return undefined;
        return lastPage.cursor;
      }
      const loaded = allPages.reduce(
        (sum, p) => sum + (p.media?.length ?? 0),
        0
      );
      const total = lastPage.total ?? 0;
      if (total > 0 && loaded >= total) return undefined;
      if (!lastPage.media?.length) return undefined;
      // Short last fetch means end of list (fat Lite seeds are > page size).
      if (lastPage.media.length < limit) return undefined;
      return Math.ceil(loaded / limit) + 1;
    },
    enabled,
    initialData,
    placeholderData: (prev) => prev ?? initialData,
    staleTime: getFeedStaleMs(),
    gcTime: getFeedGcMs(),
    maxPages: getFeedMaxPages(),
    retry: 1,
    networkMode: isLiteProfileActive() ? "offlineFirst" : "online",
    refetchOnMount: seedFresh ? false : !initialData ? true : "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: seedFresh ? false : true,
  });

  const allContent = useMemo(() => {
    const pages = query.data?.pages;
    if (!pages?.length) return EMPTY_MEDIA_LIST;
    const flat: MediaItem[] = [];
    const seen = new Set<string>();
    for (const page of pages) {
      for (const item of page.media ?? []) {
        const id = String(item._id || (item as any).id || "");
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        flat.push(item);
      }
    }
    return flat;
  }, [query.data?.pages]);

  // Media often has avatar without names. Resolve via src/shared/author, then patch RQ.
  useEffect(() => {
    if (!allContent.length || !feedNeedsAuthorEnrichment(allContent)) return;

    const dedupeKey = allContent
      .slice(0, 50)
      .map((item) => String(item._id || ""))
      .join("|");
    // Skip only after a successful name resolve for this feed snapshot
    if (lastSuccessKeyRef.current === dedupeKey) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;
    const pass = ++enrichPassRef.current;

    const applyPatched = (patched: MediaItem[]) => {
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages?.length) return old;
        const byId = new Map(
          patched.map((item) => [String(item._id || (item as any).id || ""), item])
        );
        const pages = old.pages.map((page: AllContentPageResult) => ({
          ...page,
          media: (page.media || []).map((item) => {
            const id = String(item._id || (item as any).id || "");
            return byId.get(id) || item;
          }),
        }));
        const first = pages[0];
        if (first?.media?.length) {
          seedContentCache(contentType, useAuth, first);
        }
        return { ...old, pages };
      });
    };

    const run = async () => {
      if (cancelled || pass !== enrichPassRef.current) return;
      const patched = await ensureFeedAuthors(allContent);
      if (cancelled || pass !== enrichPassRef.current) return;
      applyPatched(patched);

      if (!feedNeedsAuthorEnrichment(patched)) {
        lastSuccessKeyRef.current = dedupeKey;
        return;
      }
      if (attempts >= MAX_ATTEMPTS) return;
      attempts += 1;
      // Token often lands after first paint — retry with backoff
      const delay = Math.min(8000, 800 * attempts);
      timer = setTimeout(() => {
        void run();
      }, delay);
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [allContent, contentType, queryClient, queryKey, useAuth]);

  const total = query.data?.pages?.[0]?.total ?? 0;
  const serverRanked = query.data?.pages?.some((p) => p.source === "for_you");

  return {
    query,
    allContent,
    total,
    serverRanked: Boolean(serverRanked),
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
