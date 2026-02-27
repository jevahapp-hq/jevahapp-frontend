import { useRef, useCallback, RefObject } from "react";
import { ScrollView } from "react-native";

export interface UseReelsScrollOptions {
  screenHeight: number;
  scrollViewRef: RefObject<ScrollView | null>;
  getSpeakerName: (videoData: any, fallback?: string) => string;
  setCurrentIndex: (index: number) => void;
  currentIndex: number;
  allVideos: any[];
  userHasManuallyPaused: boolean;
  mediaStore: any;
  globalVideoStore: any;
}

export function useReelsScroll({
  screenHeight,
  scrollViewRef,
  getSpeakerName,
  setCurrentIndex,
  currentIndex,
  allVideos,
  userHasManuallyPaused,
  mediaStore,
  globalVideoStore,
}: UseReelsScrollOptions) {
  const lastIndexRef = useRef<number>(0);
  const scrollStartIndexRef = useRef<number>(0);

  const handleScroll = useCallback(
    (event: any) => {
      try {
        if (!event?.nativeEvent?.contentOffset) return;
        const { contentOffset } = event.nativeEvent;
        const scrollY = contentOffset.y;
        if (typeof scrollY !== "number" || isNaN(scrollY)) return;
        if (!Array.isArray(allVideos) || allVideos.length === 0) return;

        const index = Math.round(scrollY / screenHeight);
        const clampedIndex = Math.max(0, Math.min(index, allVideos.length - 1));

        if (
          clampedIndex !== lastIndexRef.current &&
          clampedIndex >= 0 &&
          clampedIndex < allVideos.length
        ) {
          lastIndexRef.current = clampedIndex;
          setCurrentIndex(clampedIndex);

          try {
            const activeVideo = allVideos[clampedIndex];
            const activeKey = activeVideo
              ? `reel-${activeVideo.title}-${getSpeakerName(activeVideo, "Creator")}`
              : `reel-index-${clampedIndex}`;
            try {
              mediaStore.updateLastAccessed(activeKey);
            } catch {}
            if (!userHasManuallyPaused) {
              try {
                globalVideoStore.playVideoGlobally(activeKey);
              } catch {}
            }
          } catch {}
        }
      } catch (error) {
        console.error("❌ Error in handleScroll:", error);
      }
    },
    [
      screenHeight,
      allVideos,
      getSpeakerName,
      setCurrentIndex,
      userHasManuallyPaused,
      mediaStore,
      globalVideoStore,
    ]
  );

  const handleScrollEnd = useCallback(
    (event?: any) => {
      try {
        if (!scrollViewRef.current) return;
        let finalScrollY = currentIndex * screenHeight;
        if (event?.nativeEvent?.contentOffset?.y !== undefined) {
          const scrollY = event.nativeEvent.contentOffset.y;
          if (typeof scrollY === "number" && !isNaN(scrollY)) {
            finalScrollY = scrollY;
          }
        }

        const finalIndex = Math.round(finalScrollY / screenHeight);
        const startIndex = scrollStartIndexRef.current;

        if (!Array.isArray(allVideos) || allVideos.length === 0) return;

        let targetIndex = finalIndex;
        const maxAllowedIndex = Math.min(startIndex + 1, allVideos.length - 1);
        const minAllowedIndex = Math.max(startIndex - 1, 0);

        if (targetIndex > maxAllowedIndex) targetIndex = maxAllowedIndex;
        else if (targetIndex < minAllowedIndex) targetIndex = minAllowedIndex;
        targetIndex = Math.max(0, Math.min(targetIndex, allVideos.length - 1));

        if (targetIndex !== finalIndex && scrollViewRef.current) {
          try {
            const targetY = targetIndex * screenHeight;
            scrollViewRef.current.scrollTo({
              y: targetY,
              animated: true,
            });
          } catch {}
        }

        if (targetIndex !== currentIndex) {
          setCurrentIndex(targetIndex);
          lastIndexRef.current = targetIndex;
        }

        scrollStartIndexRef.current = targetIndex;

        if (!userHasManuallyPaused && allVideos[targetIndex]) {
          try {
            const activeVideo = allVideos[targetIndex];
            const activeKey = activeVideo
              ? `reel-${activeVideo.title}-${getSpeakerName(activeVideo, "Creator")}`
              : `reel-index-${targetIndex}`;
            globalVideoStore.playVideoGlobally(activeKey);
          } catch {}
        }
      } catch (error) {
        console.error("❌ Error in handleScrollEnd:", error);
      }
    },
    [
      currentIndex,
      screenHeight,
      scrollViewRef,
      allVideos,
      getSpeakerName,
      setCurrentIndex,
      userHasManuallyPaused,
      globalVideoStore,
    ]
  );

  const handleScrollBeginDrag = useCallback(() => {
    scrollStartIndexRef.current = currentIndex;
  }, [currentIndex]);

  const setScrollStartIndex = useCallback((index: number) => {
    scrollStartIndexRef.current = index;
  }, []);

  return {
    scrollStartIndexRef,
    handleScroll,
    handleScrollEnd,
    handleScrollBeginDrag,
    setScrollStartIndex,
  };
}
