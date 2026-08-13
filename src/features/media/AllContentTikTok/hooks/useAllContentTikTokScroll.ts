import { Dimensions } from "react-native";
import { useCallback, useRef } from "react";
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

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MIN_SWITCH_INTERVAL = 150;
const HOLD_THRESHOLD = 0.2;
const SWITCH_IN_THRESHOLD = 0.5;

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
  const lastScrollUpdate = useRef<number>(0);
  const lastScrollY = useRef<number>(0);

  const findBestVideo = useCallback((scrollY: number) => {
    const viewportTop = scrollY;
    const viewportBottom = scrollY + SCREEN_HEIGHT;
    const viewportCenter = (viewportTop + viewportBottom) / 2;

    const videoLayouts = Object.entries(contentLayoutsRef.current)
      .filter(([_, layout]) => layout.type === "video")
      .sort((a, b) => a[1].y - b[1].y);

    if (videoLayouts.length === 0) return null;

    let bestKey: string | null = null;
    let bestRatio = 0;
    const CENTER_BAND_TOP = viewportTop + SCREEN_HEIGHT * 0.3;
    const CENTER_BAND_BOTTOM = viewportTop + SCREEN_HEIGHT * 0.7;

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
      if (center >= CENTER_BAND_TOP && center <= CENTER_BAND_BOTTOM && ratio >= SWITCH_IN_THRESHOLD) {
        bestKey = key;
        break;
      }
    }

    if (bestKey && bestRatio >= SWITCH_IN_THRESHOLD) return bestKey;
    if (bestKey && bestRatio >= HOLD_THRESHOLD && currentlyVisibleVideo === null) return bestKey;
    return null;
  }, [currentlyVisibleVideo]);

  const throttledScrollHandler = useCallback((scrollY: number) => {
    const now = Date.now();
    if (now - lastScrollUpdate.current < 40) return;
    lastScrollUpdate.current = now;

    const viewportTop = scrollY;
    const viewportBottom = scrollY + SCREEN_HEIGHT;

    if (Math.abs(scrollY - lastScrollY.current) > 10) {
      lastScrollY.current = scrollY;
    }

    if (isAutoPlayEnabled) {
      const now2 = Date.now();
      if (now2 - lastSwitchTimeRef.current < MIN_SWITCH_INTERVAL) return;

      const targetKey = findBestVideo(scrollY);
      if (targetKey && targetKey !== currentlyVisibleVideo) {
        const item = filteredMediaList.find((i) => getContentKey(i) === targetKey);
        if (!item || !item.fileUrl) return;
        pauseAllMedia();
        setCurrentlyVisibleVideo(targetKey);
        playMedia(targetKey, "video");
        lastSwitchTimeRef.current = now2;
        return;
      }

      // If all videos are out of view, pause everything
      if (!targetKey && currentlyVisibleVideo) {
        const cur = contentLayoutsRef.current[currentlyVisibleVideo];
        if (cur) {
          const curTop = cur.y;
          const curBottom = cur.y + cur.height;
          const iTop = Math.max(viewportTop, curTop);
          const iBottom = Math.min(viewportBottom, curBottom);
          const curVisible = Math.max(0, iBottom - iTop);
          const curRatio = cur.height > 0 ? curVisible / cur.height : 0;
          if (curRatio < 0.15) {
            pauseAllMedia();
            setCurrentlyVisibleVideo(null);
          }
        } else {
          pauseAllMedia();
          setCurrentlyVisibleVideo(null);
        }
      }
    }

    // Pause any currently playing video that's scrolled out of view
    const allPlayingKeys = Object.keys(playingVideos).filter((k) => playingVideos[k]);
    if (currentlyVisibleVideo && !allPlayingKeys.includes(currentlyVisibleVideo)) {
      allPlayingKeys.push(currentlyVisibleVideo);
    }

    let shouldPause = false;
    for (const key of allPlayingKeys) {
      const layout = contentLayoutsRef.current[key];
      if (layout && layout.type === "video") {
        const videoTop = layout.y;
        const videoBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, videoTop);
        const intersectionBottom = Math.min(viewportBottom, videoBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const ratio = layout.height > 0 ? visibleHeight / layout.height : 0;
        if (ratio < 0.2 || videoBottom < viewportTop || videoTop > viewportBottom) {
          shouldPause = true;
          break;
        }
      } else if (isVideoPlaying(key) && scrollY > SCREEN_HEIGHT * 1.5) {
        shouldPause = true;
        break;
      }
    }
    if (shouldPause) pauseAllMedia();
  }, [isAutoPlayEnabled, currentlyVisibleVideo, filteredMediaList, getContentKey, playingVideos, isVideoPlaying, pauseAllMedia, playMedia, setCurrentlyVisibleVideo, findBestVideo]);

  const handleScroll = useCallback(
    (event: any) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      lastScrollYRef.current = scrollY;
      throttledScrollHandler(scrollY);
    },
    [throttledScrollHandler]
  );

  const handleScrollEnd = useCallback(() => {
    const scrollY = lastScrollYRef.current;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + SCREEN_HEIGHT;

    Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
      if (layout.type === "video") {
        const videoTop = layout.y;
        const videoBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, videoTop);
        const intersectionBottom = Math.min(viewportBottom, videoBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const ratio = layout.height > 0 ? visibleHeight / layout.height : 0;
        if (ratio < 0.15 && isVideoPlaying(key)) {
          pauseAllMedia();
        }
      } else if (layout.type === "music") {
        const musicTop = layout.y;
        const musicBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, musicTop);
        const intersectionBottom = Math.min(viewportBottom, musicBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const ratio = layout.height > 0 ? visibleHeight / layout.height : 0;
        const isLocallyPlaying = playingAudioId === key;
        const isGloballyPlaying = playingVideos[key] || false;
        if (ratio < 0.2 && (isLocallyPlaying || isGloballyPlaying)) {
          pauseAllAudio();
          pauseMedia(key);
        }
      }
    });
  }, [playingAudioId, pauseAllAudio, playingVideos, pauseAllMedia, pauseMedia, isVideoPlaying]);

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
  };
}
