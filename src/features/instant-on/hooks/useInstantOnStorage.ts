/**
 * useInstantOnStorage - Synchronous storage hydration for instant video feed
 * 
 * Uses react-native-mmkv for synchronous storage access, ensuring video data
 * is available before the JS bridge finishes booting.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';
import type { MediaItem } from '../../../shared/types';

// Create MMKV instance for video feed cache
const videoStorage = createMMKV({
  id: 'instant-video-cache',
});

const CACHE_KEY = 'video-feed-data';
const CACHE_TIMESTAMP_KEY = 'video-feed-timestamp';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface CachedVideoData {
  videos: MediaItem[];
  timestamp: number;
}

/**
 * Synchronously get cached videos from MMKV
 * This is the key to "instant-on" - data is available immediately without async wait
 */
export const getCachedVideosSync = (): MediaItem[] | null => {
  try {
    const data = videoStorage.getString(CACHE_KEY);
    const timestamp = videoStorage.getNumber(CACHE_TIMESTAMP_KEY);
    
    if (!data || !timestamp) return null;
    
    // Check if cache is still valid
    const now = Date.now();
    if (now - timestamp > CACHE_DURATION) {
      return null;
    }
    
    const parsed: CachedVideoData = JSON.parse(data);
    return parsed.videos || null;
  } catch {
    return null;
  }
};

/**
 * Save videos to MMKV cache
 */
export const cacheVideos = (videos: MediaItem[]): void => {
  try {
    const data: CachedVideoData = {
      videos,
      timestamp: Date.now(),
    };
    videoStorage.set(CACHE_KEY, JSON.stringify(data));
    videoStorage.set(CACHE_TIMESTAMP_KEY, Date.now());
  } catch (error) {
    console.warn('Failed to cache videos:', error);
  }
};

/**
 * Clear video cache
 */
export const clearVideoCache = (): void => {
  try {
    videoStorage.remove(CACHE_KEY);
    videoStorage.remove(CACHE_TIMESTAMP_KEY);
  } catch (error) {
    console.warn('Failed to clear video cache:', error);
  }
};

interface UseInstantOnStorageOptions {
  /** Query key for react-query */
  queryKey: string[];
  /** Function to fetch fresh data */
  fetchFn: () => Promise<MediaItem[]>;
  /** Whether to enable the query */
  enabled?: boolean;
}

interface UseInstantOnStorageReturn {
  /** Videos to display (cached or fresh) */
  videos: MediaItem[];
  /** Whether fresh data is loading */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Whether data has been hydrated from cache */
  isHydrated: boolean;
  /** Refetch fresh data */
  refetch: () => Promise<void>;
  /** Manually cache current videos */
  saveToCache: (videos: MediaItem[]) => void;
}

/**
 * Hook that provides synchronous data hydration for instant video feed
 * 
 * 1. First returns cached data synchronously (immediate render)
 * 2. Then fetches fresh data in background
 * 3. Updates UI when fresh data arrives
 */
export const useInstantOnStorage = ({
  queryKey,
  fetchFn,
  enabled = true,
}: UseInstantOnStorageOptions): UseInstantOnStorageReturn => {
  const queryClient = useQueryClient();
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Get cached data synchronously on first render
  const [syncVideos, setSyncVideos] = useState<MediaItem[]>(() => {
    const cached = getCachedVideosSync();
    return cached || [];
  });

  // React Query for fresh data
  const { 
    data: freshVideos, 
    isLoading, 
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey,
    queryFn: fetchFn,
    enabled: enabled && isHydrated, // Only fetch after initial hydration
    staleTime: CACHE_DURATION,
    gcTime: CACHE_DURATION * 2,
  });

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update cache when fresh data arrives
  useEffect(() => {
    if (freshVideos && freshVideos.length > 0) {
      cacheVideos(freshVideos);
      setSyncVideos(freshVideos);
    }
  }, [freshVideos]);

  const refetch = useCallback(async () => {
    const result = await queryRefetch();
    if (result.data) {
      cacheVideos(result.data);
      setSyncVideos(result.data);
    }
  }, [queryRefetch]);

  const saveToCache = useCallback((videos: MediaItem[]) => {
    cacheVideos(videos);
    setSyncVideos(videos);
  }, []);

  // Use fresh videos if available, otherwise cached/sync videos
  const videos = freshVideos && freshVideos.length > 0 ? freshVideos : syncVideos;

  return {
    videos,
    isLoading,
    error: error as Error | null,
    isHydrated,
    refetch,
    saveToCache,
  };
};

export default useInstantOnStorage;
