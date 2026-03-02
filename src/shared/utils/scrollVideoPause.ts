/**
 * Utility functions for pausing videos when scrolled out of view
 * This ensures consistent TikTok/Instagram-like behavior across all video components
 */

import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

export interface VideoLayout {
  key: string;
  y: number;
  height: number;
  type: 'video' | 'music';
}

export interface ScrollPauseConfig {
  visibilityThreshold?: number; // 0-1, default 0.2 (20% visible)
  screenHeight?: number; // Will be auto-detected if not provided
}

/**
 * Create a scroll handler that pauses videos when scrolled out of view
 * 
 * @param layouts - Map of video layouts tracked via onLayout
 * @param isVideoPlaying - Function to check if a video is playing
 * @param pauseVideo - Function to pause a video
 * @param config - Configuration options
 * @returns Scroll event handler
 */
export const createScrollPauseHandler = (
  layouts: Map<string, VideoLayout>,
  isVideoPlaying: (key: string) => boolean,
  pauseVideo: (key: string) => void,
  config: ScrollPauseConfig = {}
) => {
  const { visibilityThreshold = 0.2, screenHeight } = config;

  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    const scrollY = contentOffset.y;
    
    // Get screen height
    let viewportHeight = screenHeight;
    if (!viewportHeight) {
      const { Dimensions } = require('react-native');
      viewportHeight = Dimensions.get('window').height;
    }

    const viewportTop = scrollY;
    const viewportBottom = scrollY + viewportHeight;

    // Check each video layout
    layouts.forEach((layout, key) => {
      if (layout.type !== 'video') return;
      if (!isVideoPlaying(key)) return; // Skip if not playing

      const videoTop = layout.y;
      const videoBottom = layout.y + layout.height;

      // Calculate visibility ratio
      const intersectionTop = Math.max(viewportTop, videoTop);
      const intersectionBottom = Math.min(viewportBottom, videoBottom);
      const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
      const visibilityRatio =
        layout.height > 0 ? visibleHeight / layout.height : 0;

      // Pause if video is less than threshold visible or completely out of view
      const shouldPause =
        visibilityRatio < visibilityThreshold ||
        videoBottom < viewportTop ||
        videoTop > viewportBottom;

      if (shouldPause) {
        console.log(
          `🎬 Auto-pause on scroll: Pausing video ${key} - visibility: ${(
            visibilityRatio * 100
          ).toFixed(1)}%`
        );
        pauseVideo(key);
      }
    });
  };
};

/**
 * Create a layout handler to track video positions
 * 
 * @param layouts - Map to store layouts
 * @returns Layout event handler
 */
export const createLayoutTracker = (layouts: Map<string, VideoLayout>) => {
  return (event: any, key: string, type: 'video' | 'music' = 'video') => {
    const { y, height } = event.nativeEvent.layout;
    layouts.set(key, { key, y, height, type });
  };
};


