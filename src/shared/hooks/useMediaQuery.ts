/**
 * React Query hooks for media content
 * Wraps existing useMedia functionality with React Query caching
 * Provides 0ms cache hits when navigating back to screens
 */

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { mediaApi } from "../../core/api/MediaApi";
import { MediaItem, ContentFilter } from "../types";
import { filterContentByType, transformApiResponseToMediaItem } from "../utils";
import { UserProfileCache } from "../../../app/utils/cache/UserProfileCache";

/**
 * Hook for fetching all content (TikTok-style)
 * Uses React Query for automatic caching - 0ms on revisit
 */
export function useAllContentQuery(
  contentType: string = "ALL",
  page: number = 1,
  limit: number = 50,
  useAuth: boolean = false
) {
  return useQuery({
    queryKey: ["all-content", contentType, page, limit, useAuth],
    queryFn: async () => {
      let response;
      if (useAuth) {
        response = await mediaApi.getAllContentWithAuth({
          page,
          limit,
          contentType: contentType !== "ALL" ? contentType : undefined,
        });
      } else {
        response = await mediaApi.getAllContentPublic({
          page,
          limit,
          contentType: contentType !== "ALL" ? contentType : undefined,
        });
      }

      if (response.success) {
        // Batch enrich content with user profiles before transforming
        const enrichedMedia = await UserProfileCache.enrichContentArrayBatch(
          response.media || []
        );
        const transformedMedia = enrichedMedia
          .map(transformApiResponseToMediaItem)
          .filter((item): item is MediaItem => item !== null);

        return {
          media: transformedMedia,
          total: response.total || response.pagination?.total || 0,
          page: response.page || page,
          limit: response.limit || limit,
        };
      }

      throw new Error(response.error || "Failed to fetch content");
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - matches backend cache
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
    retry: 1,
    refetchOnMount: false, // Use cache if available
    refetchOnWindowFocus: false, // Don't refetch on app focus
  });
}

/**
 * Hook for infinite scroll (load more as user scrolls)
 * Uses React Query infinite query for automatic pagination caching
 */
export function useAllContentInfiniteQuery(
  contentType: string = "ALL",
  limit: number = 50,
  useAuth: boolean = false
) {
  return useInfiniteQuery({
    queryKey: ["all-content-infinite", contentType, limit, useAuth],
    queryFn: async ({ pageParam = 1 }) => {
      let response;
      if (useAuth) {
        response = await mediaApi.getAllContentWithAuth({
          page: pageParam,
          limit,
          contentType: contentType !== "ALL" ? contentType : undefined,
        });
      } else {
        response = await mediaApi.getAllContentPublic({
          page: pageParam,
          limit,
          contentType: contentType !== "ALL" ? contentType : undefined,
        });
      }

      if (response.success) {
        // Batch enrich content with user profiles before transforming
        const enrichedMedia = await UserProfileCache.enrichContentArrayBatch(
          response.media || []
        );
        const transformedMedia = enrichedMedia
          .map(transformApiResponseToMediaItem)
          .filter((item): item is MediaItem => item !== null);

        return {
          media: transformedMedia,
          total: response.total || response.pagination?.total || 0,
          page: response.page || pageParam,
          limit: response.limit || limit,
          hasMore:
            (response.page || pageParam) <
            Math.ceil(
              (response.total || response.pagination?.total || 0) /
                (response.limit || limit)
            ),
        };
      }

      throw new Error(response.error || "Failed to fetch content");
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for default content (paginated)
 * Uses React Query for automatic caching
 */
export function useDefaultContentQuery(params?: ContentFilter) {
  return useQuery({
    queryKey: [
      "default-content",
      params?.page || 1,
      params?.limit || 10,
      params?.contentType || "ALL",
      params?.search,
    ],
    queryFn: async () => {
      const filter: ContentFilter = {
        page: params?.page || 1,
        limit: params?.limit || 10,
        contentType: params?.contentType || "ALL",
        search: params?.search,
      };

      const response = await mediaApi.getDefaultContent(filter);

      if (response.success) {
        // Batch enrich content with user profiles before transforming
        const enrichedMedia = await UserProfileCache.enrichContentArrayBatch(
          response.media || []
        );
        const transformedMedia = enrichedMedia
          .map(transformApiResponseToMediaItem)
          .filter((item): item is MediaItem => item !== null);

        return {
          media: transformedMedia,
          total: response.total || 0,
          page: response.page || 1,
          limit: response.limit || 10,
          pages: Math.ceil((response.total || 0) / (response.limit || 10)),
        };
      }

      throw new Error(response.error || "Failed to fetch content");
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

