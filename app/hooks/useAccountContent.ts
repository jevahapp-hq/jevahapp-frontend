import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useMemo } from "react";
import { useQuery, useInfiniteQuery, useQueries } from "@tanstack/react-query";
import type {
  MediaItem,
  Post,
  UserAnalytics,
  Video,
} from "../types/account.types";
import { apiClient } from "../utils/dataFetching";

type UseAccountContentResult = {
  posts: Post[];
  media: MediaItem[];
  videos: Video[];
  analytics: UserAnalytics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMorePosts: () => Promise<void>;
  loadMoreMedia: () => Promise<void>;
  loadMoreVideos: () => Promise<void>;
};

export function useAccountContent(): UseAccountContentResult {
  // Get userId from React Query cache (from useUserProfile)
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    enabled: false, // Don't fetch, just read from cache
  });

  const userId = useMemo(() => {
    if (userProfile) {
      return (userProfile as any).id || (userProfile as any)._id;
    }
    // Fallback: try to get from AsyncStorage synchronously
    return null;
  }, [userProfile]);

  // Helper to get userId async (fallback)
  const getUserId = useCallback(async (): Promise<string | null> => {
    if (userId) return userId;
    
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id || null;
      }
      const userProfile = await apiClient.getUserProfile();
      return userProfile.user._id || userProfile.user.id || null;
    } catch (error) {
      return null;
    }
  }, [userId]);

  // Use React Query for posts with infinite scroll
  const postsQuery = useInfiniteQuery({
    queryKey: ["account-posts", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const currentUserId = userId || await getUserId();
      if (!currentUserId) throw new Error("User ID not found");
      
      const response = await apiClient.getUserPosts(currentUserId, pageParam, 20);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch posts");
      }
      return {
        posts: response.data.posts || [],
        hasMore: response.data.pagination?.hasMore ?? false,
        page: pageParam,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Use React Query for media with infinite scroll
  const mediaQuery = useInfiniteQuery({
    queryKey: ["account-media", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const currentUserId = userId || await getUserId();
      if (!currentUserId) throw new Error("User ID not found");
      
      const response = await apiClient.getUserMedia(currentUserId, pageParam, 20, "image");
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch media");
      }
      return {
        media: response.data.media || [],
        hasMore: response.data.pagination?.hasMore ?? false,
        page: pageParam,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Use React Query for videos with infinite scroll
  const videosQuery = useInfiniteQuery({
    queryKey: ["account-videos", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const currentUserId = userId || await getUserId();
      if (!currentUserId) throw new Error("User ID not found");
      
      const response = await apiClient.getUserVideos(currentUserId, pageParam, 20);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch videos");
      }
      return {
        videos: response.data.videos || [],
        hasMore: response.data.pagination?.hasMore ?? false,
        page: pageParam,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Use React Query for analytics
  const analyticsQuery = useQuery({
    queryKey: ["account-analytics", userId],
    queryFn: async () => {
      const currentUserId = userId || await getUserId();
      if (!currentUserId) throw new Error("User ID not found");
      
      const response = await apiClient.getUserAnalytics(currentUserId);
      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to fetch analytics");
      }
      return response.data;
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Extract data from queries
  const posts = postsQuery.data?.pages.flatMap((page) => page.posts) || [];
  const media = mediaQuery.data?.pages.flatMap((page) => page.media) || [];
  const videos = videosQuery.data?.pages.flatMap((page) => page.videos) || [];
  const analytics = analyticsQuery.data || null;
  
  const loading = postsQuery.isLoading || mediaQuery.isLoading || videosQuery.isLoading || analyticsQuery.isLoading;
  const error = postsQuery.error || mediaQuery.error || videosQuery.error || analyticsQuery.error
    ? ((postsQuery.error || mediaQuery.error || videosQuery.error || analyticsQuery.error) as Error).message || "Failed to load content"
    : null;

  const loadMorePosts = useCallback(async () => {
    if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) {
      await postsQuery.fetchNextPage();
    }
  }, [postsQuery]);

  const loadMoreMedia = useCallback(async () => {
    if (mediaQuery.hasNextPage && !mediaQuery.isFetchingNextPage) {
      await mediaQuery.fetchNextPage();
    }
  }, [mediaQuery]);

  const loadMoreVideos = useCallback(async () => {
    if (videosQuery.hasNextPage && !videosQuery.isFetchingNextPage) {
      await videosQuery.fetchNextPage();
    }
  }, [videosQuery]);

  const refresh = useCallback(async () => {
    await Promise.all([
      postsQuery.refetch(),
      mediaQuery.refetch(),
      videosQuery.refetch(),
      analyticsQuery.refetch(),
    ]);
  }, [postsQuery, mediaQuery, videosQuery, analyticsQuery]);

  return {
    posts,
    media,
    videos,
    analytics,
    loading,
    error,
    refresh,
    loadMorePosts,
    loadMoreMedia,
    loadMoreVideos,
  };
}

export default useAccountContent;
