/**
 * useAllContentTikTokScroll
 * Scroll handlers with auto-pause for video and audio
 */
import { Dimensions } from "react-native";
import { useCallback, useRef, useState } from "react";
import type { MediaItem } from "../../../../shared/types";

export interface UseAllContentTikTokScrollParams {
  isAutoPlayEnabled: boolean;
  currentlyVisibleVideo: string | null;
  setCurrentlyVisibleVideo: (v: string | null) => void;
  pauseAllMedia: () => void;
  playMedia: (key: string, type: "video" | "audio") => void;
  playingVideos: Record<string, boolean>;
  playingAudioId: string | null;
  pauseAllAudio: () => void;
  pauseMedia: (key: string) => void;
  filteredMediaList: MediaItem[];
  getContentKey: (item: MediaItem) => string;
  isVideoPlaying: (key: string) => boolean;
}

export function useAllContentTikTokScroll(params: UseAllContentTikTokScrollParams) {
  const {
    isAutoPlayEnabled,
    currentlyVisibleVideo,
    setCurrentlyVisibleVideo,
    pauseAllMedia,
    playMedia,
    playingVideos,
    playingAudioId,
    pauseAllAudio,
    pauseMedia,
    filteredMediaList,
    getContentKey,
    isVideoPlaying,
  } = params;

  const contentLayoutsRef = useRef<
    Record<string, { y: number; height: number; type: "video" | "music"; uri?: string }>
  >({});
  const lastScrollYRef = useRef<number>(0);
  const lastSwitchTimeRef = useRef<number>(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(null);
  const [hoveredVideos, setHoveredVideos] = useState<Set<string>>(new Set());
  const lastScrollY = useRef<number>(0);

  const handleVideoVisibilityChange = useCallback(
    (scrollY: number) => {
      if (!isAutoPlayEnabled) return;
      const screenHeight = Dimensions.get("window").height;
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;

      const currentScrollY = scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        setScrollDirection(currentScrollY > lastScrollY.current ? "down" : "up");
        lastScrollY.current = currentScrollY;
      }

      const videoLayouts = Object.entries(contentLayoutsRef.current)
        .filter(([_, layout]) => layout.type === "video")
        .sort((a, b) => a[1].y - b[1].y);
      if (videoLayouts.length === 0) return;

      let bestKey: string | null = null;
      let bestRatio = 0;
      let centerKey: string | null = null;
      let centerDist = Number.POSITIVE_INFINITY;
      const viewportCenter = (viewportTop + viewportBottom) / 2;
      const CENTER_BAND_TOP = viewportTop + screenHeight * 0.35;
      const CENTER_BAND_BOTTOM = viewportTop + screenHeight * 0.65;

      for (const [key, layout] of videoLayouts) {
        const videoTop = layout.y;
        const videoBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, videoTop);
        const intersectionBottom = Math.min(viewportBottom, videoBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const ratio = layout.height > 0 ? visibleHeight / layout.height : 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestKey = key;
        }
        const center = (videoTop + videoBottom) / 2;
        const dist = Math.abs(center - viewportCenter);
        if (center >= CENTER_BAND_TOP && center <= CENTER_BAND_BOTTOM && dist < centerDist) {
          centerDist = dist;
          centerKey = key;
        }
      }

      const HOLD_THRESHOLD = 0.25;
      const SWITCH_IN_THRESHOLD = 0.7;
      const PAUSE_THRESHOLD = 0.12;
      const MIN_SWITCH_INTERVAL = 900;

      if (currentlyVisibleVideo) {
        const cur = contentLayoutsRef.current[currentlyVisibleVideo];
        if (cur) {
          const curTop = cur.y;
          const curBottom = cur.y + cur.height;
          const iTop = Math.max(viewportTop, curTop);
          const iBottom = Math.min(viewportBottom, curBottom);
          const curVisible = Math.max(0, iBottom - iTop);
          const curRatio = cur.height > 0 ? curVisible / cur.height : 0;
          if (curRatio >= HOLD_THRESHOLD) return;
        }
      }

      const now = Date.now();
      if (now - lastSwitchTimeRef.current < MIN_SWITCH_INTERVAL) return;

      let targetKey: string | null = null;
      if (centerKey) targetKey = centerKey;
      else if (bestKey && bestRatio >= SWITCH_IN_THRESHOLD) targetKey = bestKey;

      if (targetKey && targetKey !== currentlyVisibleVideo) {
        const item = filteredMediaList.find((i) => getContentKey(i) === targetKey);
        if (!item || !item.fileUrl) return;
        pauseAllMedia();
        setCurrentlyVisibleVideo(targetKey);
        playMedia(targetKey, "video");
        lastSwitchTimeRef.current = now;
        return;
      }

      if (!bestKey || bestRatio < PAUSE_THRESHOLD) {
        if (currentlyVisibleVideo) {
          pauseAllMedia();
          setCurrentlyVisibleVideo(null);
        }
      }
    },
    [isAutoPlayEnabled, currentlyVisibleVideo, pauseAllMedia, playMedia, scrollDirection, filteredMediaList, getContentKey]
  );

  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset } = event.nativeEvent;
      const scrollY = contentOffset.y;
      lastScrollYRef.current = scrollY;

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {}, 100) as any;

      handleVideoVisibilityChange(scrollY);

      const screenHeight = Dimensions.get("window").height;
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;

      const allPlayingVideoKeys = Object.keys(playingVideos).filter((k) => playingVideos[k] === true);
      if (currentlyVisibleVideo && !allPlayingVideoKeys.includes(currentlyVisibleVideo)) {
        allPlayingVideoKeys.push(currentlyVisibleVideo);
      }

      let shouldPauseAnyVideo = false;
      allPlayingVideoKeys.forEach((key) => {
        const layout = contentLayoutsRef.current[key];
        if (layout && layout.type === "video") {
          const videoTop = layout.y;
          const videoBottom = layout.y + layout.height;
          const intersectionTop = Math.max(viewportTop, videoTop);
          const intersectionBottom = Math.min(viewportBottom, videoBottom);
          const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
          const visibilityRatio = layout.height > 0 ? visibleHeight / layout.height : 0;
          const isCompletelyOutOfView = videoBottom < viewportTop || videoTop > viewportBottom;
          const shouldPause = visibilityRatio < 0.3 || isCompletelyOutOfView;
          if (shouldPause && isVideoPlaying(key)) {
            shouldPauseAnyVideo = true;
            if (hoveredVideos.has(key)) {
              setHoveredVideos((prev) => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
              });
            }
          }
        } else if (isVideoPlaying(key) && scrollY > screenHeight * 1.5) {
          shouldPauseAnyVideo = true;
        }
      });

      if (shouldPauseAnyVideo) pauseAllMedia();

      Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
        if (layout.type === "music") {
          const musicTop = layout.y;
          const musicBottom = layout.y + layout.height;
          const intersectionTop = Math.max(viewportTop, musicTop);
          const intersectionBottom = Math.min(viewportBottom, musicBottom);
          const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
          const visibilityRatio = layout.height > 0 ? visibleHeight / layout.height : 0;
          const shouldPause = visibilityRatio < 0.3;
          const isLocallyPlaying = playingAudioId === key;
          const isGloballyPlaying = playingVideos[key] || false;
          if (shouldPause && (isLocallyPlaying || isGloballyPlaying)) {
            pauseAllAudio();
            pauseMedia(key);
          }
        }
      });
    },
    [
      handleVideoVisibilityChange,
      playingVideos,
      currentlyVisibleVideo,
      playingAudioId,
      hoveredVideos,
      pauseAllMedia,
      pauseAllAudio,
      pauseMedia,
      isVideoPlaying,
    ]
  );

  const handleScrollEnd = useCallback(() => {
    const scrollY = lastScrollYRef.current;
    const screenHeight = Dimensions.get("window").height;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + screenHeight;

    Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
      if (layout.type === "video") {
        const videoTop = layout.y;
        const videoBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, videoTop);
        const intersectionBottom = Math.min(viewportBottom, videoBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const visibilityRatio = layout.height > 0 ? visibleHeight / layout.height : 0;
        if (visibilityRatio < 0.2 && isVideoPlaying(key)) {
          pauseAllMedia();
          if (hoveredVideos.has(key)) {
            setHoveredVideos((prev) => {
              const newSet = new Set(prev);
              newSet.delete(key);
              return newSet;
            });
          }
        }
      } else if (layout.type === "music") {
        const musicTop = layout.y;
        const musicBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, musicTop);
        const intersectionBottom = Math.min(viewportBottom, musicBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const visibilityRatio = layout.height > 0 ? visibleHeight / layout.height : 0;
        const isLocallyPlaying = playingAudioId === key;
        const isGloballyPlaying = playingVideos[key] || false;
        if (visibilityRatio < 0.3 && (isLocallyPlaying || isGloballyPlaying)) {
          pauseAllAudio();
          pauseMedia(key);
        }
      }
    });
  }, [playingAudioId, pauseAllAudio, playingVideos, hoveredVideos, pauseAllMedia, pauseMedia, isVideoPlaying]);

  const handleContentLayout = useCallback((event: any, key: string, type: "video" | "music", uri?: string) => {
    const { y, height } = event.nativeEvent.layout;
    contentLayoutsRef.current[key] = { y, height, type, uri };
  }, []);

  return {
    handleScroll,
    handleScrollEnd,
    handleContentLayout,
    contentLayoutsRef,
    lastScrollYRef,
    hoveredVideos,
  };
}
