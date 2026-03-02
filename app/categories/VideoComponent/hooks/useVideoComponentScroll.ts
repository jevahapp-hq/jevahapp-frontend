/**
 * VideoComponent Scroll Hook
 * Handles scroll events, auto-pause, and footer-based autoplay
 */

import { Dimensions, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useCallback, useRef, useState } from "react";
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
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null);
  const lastScrollY = useRef<number>(0);

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
          const currentScrollY = scrollY;
          if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
            setScrollDirection(currentScrollY > lastScrollY.current ? "down" : "up");
            lastScrollY.current = currentScrollY;
          }

          const videoLayouts = Object.entries(videoLayoutsRef.current).sort(
            (a, b) => a[1].y - b[1].y
          );
          let targetVideo: string | null = null;

          if (videoLayouts.length === 0) return;

          if (scrollDirection === "down") {
            for (const [key, layout] of videoLayouts) {
              const videoTop = layout.y;
              const videoBottom = layout.y + layout.height;
              const videoHeight = layout.height;
              const footerStart = videoTop + videoHeight * 0.8;
              const isFooterVisible =
                footerStart < viewportBottom && videoBottom > viewportTop;
              if (!isFooterVisible && videoTop < viewportBottom) {
                targetVideo = key;
                break;
              }
            }
          } else if (scrollDirection === "up") {
            for (let i = videoLayouts.length - 1; i >= 0; i--) {
              const [key, layout] = videoLayouts[i];
              const videoTop = layout.y;
              const videoBottom = layout.y + layout.height;
              const videoHeight = layout.height;
              const intersectionTop = Math.max(viewportTop, videoTop);
              const intersectionBottom = Math.min(viewportBottom, videoBottom);
              const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
              const visibilityRatio = visibleHeight / videoHeight;
              if (visibilityRatio >= 0.5 && videoTop < viewportBottom) {
                targetVideo = key;
                break;
              }
            }
          } else {
            if (videoLayouts.length > 0) {
              const [firstKey, firstLayout] = videoLayouts[0];
              const videoTop = firstLayout.y;
              const videoBottom = firstLayout.y + firstLayout.height;
              const isVisible = videoTop < viewportBottom && videoBottom > viewportTop;
              if (isVisible) targetVideo = firstKey;
            }
          }

          if (targetVideo && targetVideo !== globalVideoStore.currentlyVisibleVideo) {
            try {
              globalVideoStore.playVideoGlobally(targetVideo);
            } catch (error) {
              console.warn("Error playing video globally:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error in handleScroll:", error);
      }
    },
    [isAutoPlayEnabled, globalVideoStore, scrollDirection]
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
