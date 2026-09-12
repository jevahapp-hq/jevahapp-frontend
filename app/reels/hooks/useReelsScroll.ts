import { useCallback, useRef, type MutableRefObject } from "react";
import { ViewToken } from "react-native";
import { useReelsStore } from "@/store/useReelsStore";

export interface UseReelsScrollOptions {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  allVideos: any[];
  getSpeakerName: (videoData: any, fallback?: string) => string;
  userHasManuallyPaused: boolean;
  globalVideoStore: any;
  /** Ignore viewability until fullscreen lands on the video we opened. */
  pendingStartIndexRef?: MutableRefObject<number | null>;
}

/**
 * useReelsScroll - Handles FlatList viewability and scroll transitions for Reels
 *
 * `onViewableItemsChanged` MUST stay a stable identity. Recreating it on every
 * index change is unsupported by FlatList and is why the next reel stayed
 * paused (black) after the first swipe.
 */
export function useReelsScroll({
  currentIndex,
  setCurrentIndex,
  allVideos,
  getSpeakerName,
  userHasManuallyPaused,
  globalVideoStore,
  pendingStartIndexRef,
}: UseReelsScrollOptions) {
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const allVideosRef = useRef(allVideos);
  allVideosRef.current = allVideos;
  const getSpeakerNameRef = useRef(getSpeakerName);
  getSpeakerNameRef.current = getSpeakerName;
  const userHasManuallyPausedRef = useRef(userHasManuallyPaused);
  userHasManuallyPausedRef.current = userHasManuallyPaused;
  const globalVideoStoreRef = useRef(globalVideoStore);
  globalVideoStoreRef.current = globalVideoStore;
  const setCurrentIndexRef = useRef(setCurrentIndex);
  setCurrentIndexRef.current = setCurrentIndex;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 80,
  }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visible = viewableItems.find((token) => token.isViewable);
      if (!visible) return;

      const newIndex = visible.index ?? 0;
      const pending = pendingStartIndexRef?.current;
      if (pending != null && newIndex !== pending) {
        return;
      }
      if (pending != null && newIndex === pending) {
        pendingStartIndexRef.current = null;
      }
      if (newIndex === currentIndexRef.current) return;

      setCurrentIndexRef.current(newIndex);
      useReelsStore.getState().setCurrentIndex(newIndex);

      const videoData = allVideosRef.current[newIndex];
      if (!videoData) return;

      const speakerName = getSpeakerNameRef.current(videoData, "Creator");
      const videoKey = `reel-${videoData._id || videoData.id || newIndex}-${videoData.title}-${speakerName}`;

      try {
        if (!userHasManuallyPausedRef.current) {
          globalVideoStoreRef.current.playVideoGlobally(videoKey);
        }
      } catch (e) {
        console.warn("❌ useReelsScroll: Failed to trigger playback updates:", e);
      }
    },
    []
  );

  return {
    onViewableItemsChanged,
    viewabilityConfig,
  };
}
