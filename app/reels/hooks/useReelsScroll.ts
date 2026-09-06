import { useCallback, useRef } from "react";
import { ViewToken } from "react-native";
import { useReelsStore } from "@/store/useReelsStore";

export interface UseReelsScrollOptions {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  allVideos: any[];
  getSpeakerName: (videoData: any, fallback?: string) => string;
  userHasManuallyPaused: boolean;
  globalVideoStore: any;
}

/**
 * useReelsScroll - Handles FlatList viewability and scroll transitions for Reels
 */
export function useReelsScroll({
  currentIndex,
  setCurrentIndex,
  allVideos,
  getSpeakerName,
  userHasManuallyPaused,
  globalVideoStore,
}: UseReelsScrollOptions) {

  // Viewability configuration - 80% visibility required to trigger change
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 100,
  }).current;

  /**
   * Handles changes in which items are currently visible in the list
   */
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const item = viewableItems[0];
        const newIndex = item.index ?? 0;

        // If the focused reel has changed
        if (newIndex !== currentIndex) {
          setCurrentIndex(newIndex);
          // Keep store in sync so exit/re-enter resumes the same video.
          useReelsStore.getState().setCurrentIndex(newIndex);

          // Trigger playback for the new video
          const videoData = allVideos[newIndex];
          if (videoData) {
            const speakerName = getSpeakerName(videoData, "Creator");
            const videoKey = `reel-${videoData._id || videoData.id || newIndex}-${videoData.title}-${speakerName}`;

            // Track access and auto-play if not manually paused
            try {
              if (!userHasManuallyPaused) {
                globalVideoStore.playVideoGlobally(videoKey);
              }
            } catch (e) {
              console.warn("❌ useReelsScroll: Failed to trigger playback updates:", e);
            }
          }
        }
      }
    },
    [currentIndex, allVideos, getSpeakerName, userHasManuallyPaused, globalVideoStore, setCurrentIndex]
  );

  return {
    onViewableItemsChanged,
    viewabilityConfig,
  };
}
