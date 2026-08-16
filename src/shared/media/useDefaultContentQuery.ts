import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useContentCacheStore } from "../../../app/store/useContentCacheStore";
import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";
import { mediaApi } from "../../core/api/MediaApi";
import {
  FEED_GC_MS,
  FEED_PAGE_SIZE,
  FEED_STALE_MS,
} from "../config/feedCachePolicy";
import type { ContentFilter, MediaItem } from "../types";
import { transformApiResponseToMediaItem } from "../utils";
import { syncMediaStatsToInteractionStore } from "./syncMediaStats";

const EMPTY_MEDIA_LIST: MediaItem[] = [];

export function useDefaultContentQuery(options: {
  enabled: boolean;
  page?: number;
  limit?: number;
  contentType?: string;
}) {
  const {
    enabled,
    page = 1,
    limit = FEED_PAGE_SIZE,
    contentType = "ALL",
  } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["default-content", page, limit, contentType],
    queryFn: async () => {
      const response = await mediaApi.getDefaultContent({
        page,
        limit,
        contentType: contentType !== "ALL" ? contentType : undefined,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to fetch content");
      }

      const enrichedMedia = UserProfileCache.enrichContentArray(
        response.media || []
      );
      const transformedMedia = enrichedMedia
        .map(transformApiResponseToMediaItem)
        .filter((item): item is MediaItem => item !== null);

      const defaultKey = `${contentType || "ALL"}:page:${page || 1}`;
      useContentCacheStore.getState().set(defaultKey, {
        items: transformedMedia,
        page: response.page || page,
        limit: response.limit || limit,
        total: response.total || 0,
        fetchedAt: Date.now(),
      });

      const result = {
        media: transformedMedia,
        total: response.total || 0,
        page: response.page || page,
        limit: response.limit || limit,
        pages: Math.ceil((response.total || 0) / (response.limit || limit)),
      };

      syncMediaStatsToInteractionStore(result.media);

      if (!result.media.length) {
        const prev = queryClient.getQueryData<{
          media: MediaItem[];
          total: number;
          page: number;
          limit: number;
          pages: number;
        }>(["default-content", page, limit, contentType]);
        if (prev?.media?.length) {
          if (__DEV__) {
            console.warn(
              "⚠️ default-content returned empty; keeping previous feed items"
            );
          }
          return prev;
        }
      }

      return result;
    },
    enabled,
    placeholderData: (prev) => prev,
    staleTime: FEED_STALE_MS,
    gcTime: FEED_GC_MS,
    retry: (failureCount, error) => {
      const msg = String((error as Error)?.message || "");
      if (msg.includes("429") || msg.toLowerCase().includes("too many")) {
        return false;
      }
      return failureCount < 1;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const fetchDefaultContent = useCallback(
    async (params?: ContentFilter) => {
      const filter: ContentFilter = {
        page: params?.page || page,
        limit: params?.limit || limit,
        contentType: params?.contentType || contentType,
        search: params?.search,
      };

      await queryClient.fetchQuery({
        queryKey: [
          "default-content",
          filter.page,
          filter.limit,
          filter.contentType,
          filter.search,
        ],
        queryFn: async () => {
          const response = await mediaApi.getDefaultContent(filter);
          if (!response.success) {
            throw new Error(response.error || "Failed to fetch content");
          }
          const enrichedMedia = UserProfileCache.enrichContentArray(
            response.media || []
          );
          const transformedMedia = enrichedMedia
            .map(transformApiResponseToMediaItem)
            .filter((item): item is MediaItem => item !== null);

          const key = `${filter.contentType || "ALL"}:page:${filter.page || 1}`;
          useContentCacheStore.getState().set(key, {
            items: transformedMedia,
            page: filter.page || 1,
            limit: filter.limit || limit,
            total: response.total || 0,
            fetchedAt: Date.now(),
          });

          syncMediaStatsToInteractionStore(transformedMedia);

          return {
            media: transformedMedia,
            total: response.total || 0,
            page: response.page || 1,
            limit: response.limit || limit,
            pages: Math.ceil(
              (response.total || 0) / (response.limit || limit)
            ),
          };
        },
        staleTime: FEED_STALE_MS,
        gcTime: FEED_GC_MS,
      });
    },
    [queryClient, page, limit, contentType]
  );

  return {
    query,
    defaultContent: query.data?.media ?? EMPTY_MEDIA_LIST,
    pagination: {
      page: query.data?.page || page,
      limit: query.data?.limit || limit,
      total: query.data?.total || 0,
      pages: query.data?.pages || 0,
    },
    fetchDefaultContent,
    refetch: query.refetch,
  };
}
