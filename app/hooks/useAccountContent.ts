import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../utils/dataFetching";
import type {
  Post,
  MediaItem,
  Video,
  UserAnalytics,
} from "../types/account.types";

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
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);

  // Pagination state
  const [postsPage, setPostsPage] = useState(1);
  const [mediaPage, setMediaPage] = useState(1);
  const [videosPage, setVideosPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [hasMoreMedia, setHasMoreMedia] = useState(true);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);

  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user ID from profile
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;

      if (!userId) {
        throw new Error("User ID not found");
      }

      // Fetch all data in parallel with error handling
      const [postsData, mediaData, videosData, analyticsData] =
        await Promise.all([
          apiClient.getUserPosts(userId, 1, 20).catch((err) => {
            console.warn("Failed to fetch posts:", err);
            return { success: false, data: { posts: [], pagination: { hasMore: false } } };
          }),
          apiClient.getUserMedia(userId, 1, 20, "image").catch((err) => {
            console.warn("Failed to fetch media:", err);
            return { success: false, data: { media: [], pagination: { hasMore: false } } };
          }),
          apiClient.getUserVideos(userId, 1, 20).catch((err) => {
            console.warn("Failed to fetch videos:", err);
            return { success: false, data: { videos: [], pagination: { hasMore: false } } };
          }),
          apiClient.getUserAnalytics(userId).catch((err) => {
            console.warn("Failed to fetch analytics:", err);
            return { success: false, data: null };
          }),
        ]);

      // Update state with results
      if (postsData.success && postsData.data) {
        setPosts(postsData.data.posts || []);
        setHasMorePosts(postsData.data.pagination?.hasMore ?? false);
      }

      if (mediaData.success && mediaData.data) {
        setMedia(mediaData.data.media || []);
        setHasMoreMedia(mediaData.data.pagination?.hasMore ?? false);
      }

      if (videosData.success && videosData.data) {
        setVideos(videosData.data.videos || []);
        setHasMoreVideos(videosData.data.pagination?.hasMore ?? false);
      }

      if (analyticsData.success && analyticsData.data) {
        setAnalytics(analyticsData.data);
      }

      // Reset pagination
      setPostsPage(1);
      setMediaPage(1);
      setVideosPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to load content");
      console.error("Error loading account content:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (!hasMorePosts || loading) return;

    try {
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;
      if (!userId) return;

      const nextPage = postsPage + 1;
      const postsData = await apiClient.getUserPosts(userId, nextPage, 20);

      if (postsData.success && postsData.data) {
        setPosts((prev) => [...prev, ...(postsData.data.posts || [])]);
        setHasMorePosts(postsData.data.pagination?.hasMore ?? false);
        setPostsPage(nextPage);
      }
    } catch (err: any) {
      console.error("Error loading more posts:", err);
    }
  }, [postsPage, hasMorePosts, loading]);

  const loadMoreMedia = useCallback(async () => {
    if (!hasMoreMedia || loading) return;

    try {
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;
      if (!userId) return;

      const nextPage = mediaPage + 1;
      const mediaData = await apiClient.getUserMedia(
        userId,
        nextPage,
        20,
        "image"
      );

      if (mediaData.success && mediaData.data) {
        setMedia((prev) => [...prev, ...(mediaData.data.media || [])]);
        setHasMoreMedia(mediaData.data.pagination?.hasMore ?? false);
        setMediaPage(nextPage);
      }
    } catch (err: any) {
      console.error("Error loading more media:", err);
    }
  }, [mediaPage, hasMoreMedia, loading]);

  const loadMoreVideos = useCallback(async () => {
    if (!hasMoreVideos || loading) return;

    try {
      const userProfile = await apiClient.getUserProfile();
      const userId = userProfile.user._id || userProfile.user.id;
      if (!userId) return;

      const nextPage = videosPage + 1;
      const videosData = await apiClient.getUserVideos(userId, nextPage, 20);

      if (videosData.success && videosData.data) {
        setVideos((prev) => [...prev, ...(videosData.data.videos || [])]);
        setHasMoreVideos(videosData.data.pagination?.hasMore ?? false);
        setVideosPage(nextPage);
      }
    } catch (err: any) {
      console.error("Error loading more videos:", err);
    }
  }, [videosPage, hasMoreVideos, loading]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  return {
    posts,
    media,
    videos,
    analytics,
    loading,
    error,
    refresh: loadContent,
    loadMorePosts,
    loadMoreMedia,
    loadMoreVideos,
  };
}

export default useAccountContent;
