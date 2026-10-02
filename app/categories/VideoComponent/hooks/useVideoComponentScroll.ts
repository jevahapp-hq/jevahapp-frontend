/**
 * VideoComponent Scroll Hook
 * Handles scroll events, auto-pause, and footer-based autoplay
 */

import { Dimensions, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useCallback, useRef } from "react";
import { getVideoKey } from "../utils";

interface UseVideoComponentScrollProps {
  videoLayoutsRef: React.MutableRefObject<Record<string, { y: number; height: number }>>;
  lastScrollYRef: React.MutableRefObject<number>;
  isAutoPlayEnabled: boolean;
  globalVideoStore: {
    playingVideos: Record<string, boolean>;
    pauseVideo: (key: string) => void;
    playVideoGlobally: (key: string) => void;
    currentlyVisibleVideo: string | null;
    handleVideoVisibilityChange?: (visibleVideoKey: string | null) => void;
  };
  uploadedVideos: any[];
}

export function useVideoComponentScroll({
  videoLayoutsRef,
  lastScrollYRef,
  isAutoPlayEnabled,
  globalVideoStore,
  uploadedVideos,
}: UseVideoComponentScrollProps) {
  const lastVisibleKeyRef = useRef<string | null>(null);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      try {
        if (!event?.nativeEvent?.contentOffset) return;
        const { contentOffset } = event.nativeEvent;
        const scrollY = contentOffset.y;
        if (typeof scrollY !== "number" || isNaN(scrollY)) return;

        lastScrollYRef.current = scrollY;
        const screenHeight = Dimensions.get("window").height;
        const viewportTop = scrollY;
        const viewportBottom = scrollY + screenHeight;

        Object.entries(videoLayoutsRef.current).forEach(([key, layout]) => {
          if (!layout || typeof layout !== "object") return;
          const videoTop = layout.y;
          const videoBottom = layout.y + layout.height;
          const intersectionTop = Math.max(viewportTop, videoTop);
          const intersectionBottom = Math.min(viewportBottom, videoBottom);
          const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
          const visibilityRatio = layout.height > 0 ? visibleHeight / layout.height : 0;
          const shouldPause =
            visibilityRatio < 0.2 ||
            videoBottom < viewportTop ||
            videoTop > viewportBottom;
          const isVideoPlaying = globalVideoStore.playingVideos[key] || false;
          if (shouldPause && isVideoPlaying) {
            try {
              globalVideoStore.pauseVideo(key);
            } catch (error) {
              console.warn("Error pausing video:", key, error);
            }
          }
        });

        if (isAutoPlayEnabled) {
          const videoLayouts = Object.entries(videoLayoutsRef.current);
          let targetVideo: string | null = null;
          let bestRatio = 0;
          for (const [key, layout] of videoLayouts) {
            if (!layout || layout.height <= 0) continue;
            const intersectionTop = Math.max(viewportTop, layout.y);
            const intersectionBottom = Math.min(
              viewportBottom,
              layout.y + layout.height
            );
            const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
            const ratio = visibleHeight / layout.height;
            if (ratio > bestRatio) {
              bestRatio = ratio;
              targetVideo = key;
            }
          }
          if (bestRatio < 0.45) targetVideo = null;

          // Only when the video in view changes. Replaying the same card on
          // every scroll tick undoes a tap-to-pause.
          if (targetVideo !== lastVisibleKeyRef.current) {
            lastVisibleKeyRef.current = targetVideo;
            try {
              if (targetVideo) {
                globalVideoStore.handleVideoVisibilityChange?.(targetVideo);
                globalVideoStore.playVideoGlobally(targetVideo);
              } else {
                globalVideoStore.handleVideoVisibilityChange?.(null);
              }
            } catch (error) {
              console.warn("Error playing video globally:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error in handleScroll:", error);
      }
    },
    [isAutoPlayEnabled, globalVideoStore]
  );

  const handleScrollEnd = useCallback(() => {
    try {
      const scrollY = lastScrollYRef.current;
      const screenHeight = Dimensions.get("window").height;
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;

      Object.entries(videoLayoutsRef.current).forEach(([key, layout]) => {
        if (!layout || typeof layout !== "object") return;
        const videoTop = layout.y;
        const videoBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, videoTop);
        const intersectionBottom = Math.min(viewportBottom, videoBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const visibilityRatio = layout.height > 0 ? visibleHeight / layout.height : 0;
        const isVideoPlaying = globalVideoStore.playingVideos[key] || false;
        if (visibilityRatio < 0.2 && isVideoPlaying) {
          try {
            globalVideoStore.pauseVideo(key);
          } catch (error) {
            console.warn("Error pausing video in handleScrollEnd:", key, error);
          }
        }
      });
    } catch (error) {
      console.error("Error in handleScrollEnd:", error);
    }
  }, [globalVideoStore]);

  const recomputeVisibilityFromLayouts = useCallback(() => {
    if (!isAutoPlayEnabled) return;
    const scrollY = lastScrollYRef.current;
    const screenHeight = Dimensions.get("window").height;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + screenHeight;
    const MIN_VISIBILITY_THRESHOLD = 0.5;

    uploadedVideos.forEach((v) => {
      const key = getVideoKey(v.fileUrl);
      const layout = videoLayoutsRef.current[key];
      if (!layout) return;
      const itemTop = layout.y;
      const itemBottom = layout.y + layout.height;
      const intersectionTop = Math.max(viewportTop, itemTop);
      const intersectionBottom = Math.min(viewportBottom, itemBottom);
      const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
      const ratio = visibleHeight / Math.max(1, layout.height);
      // Auto-play globally disabled; do not trigger visibility-based play
    });
  }, [isAutoPlayEnabled, uploadedVideos]);

  return { handleScroll, handleScrollEnd, recomputeVisibilityFromLayouts };
}
