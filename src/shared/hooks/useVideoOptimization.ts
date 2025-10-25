import { useRef, useCallback, useEffect } from 'react';
import { Video } from 'expo-av';

interface VideoOptimizationOptions {
  maxConcurrentVideos?: number;
  preloadDistance?: number;
  memoryThreshold?: number;
}

export const useVideoOptimization = (options: VideoOptimizationOptions = {}) => {
  const {
    maxConcurrentVideos = 3,
    preloadDistance = 2,
    memoryThreshold = 0.8
  } = options;

  const videoRefs = useRef<Map<string, Video>>(new Map());
  const videoStates = useRef<Map<string, 'loading' | 'loaded' | 'playing' | 'paused' | 'unloaded'>>(new Map());
  const memoryUsage = useRef<number>(0);

  // Clean up unused video resources
  const cleanupVideo = useCallback((videoId: string) => {
    const video = videoRefs.current.get(videoId);
    if (video) {
      video.unloadAsync().catch(console.warn);
      videoRefs.current.delete(videoId);
      videoStates.current.set(videoId, 'unloaded');
    }
  }, []);

  // Preload video when it's about to be visible
  const preloadVideo = useCallback(async (videoId: string, source: { uri: string }) => {
    if (videoStates.current.get(videoId) === 'loaded') return;

    try {
      const video = videoRefs.current.get(videoId);
      if (video) {
        await video.loadAsync(source, { shouldPlay: false });
        videoStates.current.set(videoId, 'loaded');
      }
    } catch (error) {
      console.warn(`Failed to preload video ${videoId}:`, error);
    }
  }, []);

  // Memory management - unload videos when memory usage is high
  const manageMemory = useCallback(() => {
    const currentMemoryUsage = memoryUsage.current;
    
    if (currentMemoryUsage > memoryThreshold) {
      // Unload paused videos first
      const pausedVideos = Array.from(videoStates.current.entries())
        .filter(([_, state]) => state === 'paused')
        .map(([id]) => id);

      // Unload oldest paused videos
      pausedVideos.slice(0, Math.ceil(pausedVideos.length / 2)).forEach(cleanupVideo);
    }
  }, [memoryThreshold, cleanupVideo]);

  // Register video
  const registerVideo = useCallback((videoId: string, video: Video) => {
    videoRefs.current.set(videoId, video);
    videoStates.current.set(videoId, 'loading');
  }, []);

  // Update video state
  const updateVideoState = useCallback((videoId: string, state: 'loading' | 'loaded' | 'playing' | 'paused' | 'unloaded') => {
    videoStates.current.set(videoId, state);
    
    // Update memory usage estimate
    const loadedVideos = Array.from(videoStates.current.values()).filter(s => s === 'loaded' || s === 'playing').length;
    memoryUsage.current = loadedVideos / maxConcurrentVideos;
    
    // Manage memory if needed
    if (memoryUsage.current > memoryThreshold) {
      manageMemory();
    }
  }, [maxConcurrentVideos, memoryThreshold, manageMemory]);

  // Pause all videos except the current one
  const pauseAllExcept = useCallback(async (currentVideoId: string) => {
    const promises: Promise<void>[] = [];
    
    videoRefs.current.forEach((video, videoId) => {
      if (videoId !== currentVideoId && videoStates.current.get(videoId) === 'playing') {
        promises.push(
          video.pauseAsync().then(() => {
            updateVideoState(videoId, 'paused');
          }).catch(console.warn)
        );
      }
    });

    await Promise.all(promises);
  }, [updateVideoState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      videoRefs.current.forEach((video) => {
        video.unloadAsync().catch(console.warn);
      });
      videoRefs.current.clear();
      videoStates.current.clear();
    };
  }, []);

  return {
    registerVideo,
    updateVideoState,
    preloadVideo,
    pauseAllExcept,
    cleanupVideo,
    manageMemory,
    getVideoState: (videoId: string) => videoStates.current.get(videoId),
    getMemoryUsage: () => memoryUsage.current
  };
};
