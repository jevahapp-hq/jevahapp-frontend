/**
 * Hook to automatically pause videos when scrolled out of view
 * This ensures videos stop playing when user scrolls away (TikTok/Instagram behavior)
 * 
 * Usage:
 * const { onLayout, onScroll } = useVideoScrollPause({
 *   videoKey: 'video-123',
 *   isPlaying: true,
 *   onPause: () => pauseVideo('video-123'),
 *   visibilityThreshold: 0.2, // Pause when less than 20% visible
 * });
 * 
 * Then use in your component:
 * <View onLayout={onLayout}>...</View>
 * <ScrollView onScroll={onScroll}>...</ScrollView>
 */

import { useCallback, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

interface UseVideoScrollPauseOptions {
  videoKey: string;
  isPlaying: boolean;
  onPause: () => void;
  visibilityThreshold?: number; // 0-1, default 0.2 (20% visible)
  enabled?: boolean; // Default true
}

interface VideoLayout {
  y: number;
  height: number;
}

export const useVideoScrollPause = ({
  videoKey,
  isPlaying,
  onPause,
  visibilityThreshold = 0.2,
  enabled = true,
}: UseVideoScrollPauseOptions) => {
  const layoutRef = useRef<VideoLayout | null>(null);
  const scrollYRef = useRef<number>(0);
  const screenHeightRef = useRef<number>(0);

  // Track video layout position
  const handleLayout = useCallback(
    (event: any) => {
      if (!enabled) return;
      
      const { y, height } = event.nativeEvent.layout;
      layoutRef.current = { y, height };
      
      // Get screen height if not set
      if (screenHeightRef.current === 0) {
        const { Dimensions } = require('react-native');
        screenHeightRef.current = Dimensions.get('window').height;
      }
    },
    [enabled]
  );

  // Handle scroll to check visibility and pause if needed
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!enabled || !isPlaying || !layoutRef.current) return;

      const { contentOffset } = event.nativeEvent;
      scrollYRef.current = contentOffset.y;

      // Get screen height if not set
      if (screenHeightRef.current === 0) {
        const { Dimensions } = require('react-native');
        screenHeightRef.current = Dimensions.get('window').height;
      }

      const viewportTop = contentOffset.y;
      const viewportBottom = contentOffset.y + screenHeightRef.current;
      const videoTop = layoutRef.current.y;
      const videoBottom = layoutRef.current.y + layoutRef.current.height;

      // Calculate visibility ratio
      const intersectionTop = Math.max(viewportTop, videoTop);
      const intersectionBottom = Math.min(viewportBottom, videoBottom);
      const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
      const visibilityRatio =
        layoutRef.current.height > 0
          ? visibleHeight / layoutRef.current.height
          : 0;

      // Pause if video is less than threshold visible or completely out of view
      const shouldPause =
        visibilityRatio < visibilityThreshold ||
        videoBottom < viewportTop ||
        videoTop > viewportBottom;

      if (shouldPause) {
        console.log(
          `🎬 Auto-pause on scroll: Pausing video ${videoKey} - visibility: ${(
            visibilityRatio * 100
          ).toFixed(1)}%`
        );
        onPause();
      }
    },
    [enabled, isPlaying, videoKey, onPause, visibilityThreshold]
  );

  return {
    onLayout: handleLayout,
    onScroll: handleScroll,
  };
};


