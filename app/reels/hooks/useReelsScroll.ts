import { useCallback, useRef, type MutableRefObject } from "react";
import { ViewToken } from "react-native";
import type { VideoPlayer } from "expo-video";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useReelsStore } from "@/store/useReelsStore";
import { isLiveVideoPlayer } from "../../../src/features/media/video-feed/safeVideoPlayer";
import { setAndroidAudibleReel } from "../reelAudible";
import { reelVideoKey } from "../reelScrollIndex";

export interface UseReelsScrollOptions {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  allVideos: any[];
  getSpeakerName: (videoData: any, fallback?: string) => string;
  userHasManuallyPaused: boolean;
  globalVideoStore: any;
  /** Ignore viewability until fullscreen lands on the video we opened. */
  pendingStartIndexRef?: MutableRefObject<number | null>;
  /** A new page should autoplay even if the previous one was tap-paused. */
  clearManualPause?: () => void;
  /** Live players, so Android can mute the reel being left in this same turn. */
  videoRefs?: MutableRefObject<Record<string, VideoPlayer>>;
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
  videoRefs,
  clearManualPause,
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
    const videoRefsRef = useRef(videoRefs);
    videoRefsRef.current = videoRefs;
    const clearManualPauseRef = useRef(clearManualPause);
    clearManualPauseRef.current = clearManualPause;
  const silenceExcept = useCallback((keep: string | null, pause: boolean) => {
    const players = videoRefsRef.current?.current;
    if (!players) return;
    for (const key of Object.keys(players)) {
      const player = players[key];
      if (!isLiveVideoPlayer(player) || key === keep) continue;
      try {
        player.muted = true;
        player.volume = 0;
        // ExoPlayer keeps the audio track when only `muted` flips.
        // Pause whenever this reel is no longer the one on screen.
        if (pause) player.pause();
      } catch {
        // Released native player.
      }
    }
  }, []);

  const hearReel = useCallback((keep: string) => {
    const player = videoRefsRef.current?.current?.[keep];
    if (!isLiveVideoPlayer(player)) return;
    const muted = useGlobalVideoStore.getState().mutedVideos[keep] ?? false;
    const volume = muted ? 0 : 1;
    try {
      if (player.muted !== muted) player.muted = muted;
      if (Math.abs((Number(player.volume) || 0) - volume) > 0.02) {
        player.volume = volume;
      }
      if (!player.playing) player.play();
    } catch {
      // Released native player.
    }
  }, []);

  const scrollIndexRef = useRef(currentIndex);
  const activateIndexRef = useRef<(index: number) => void>(() => {});

  const activateIndex = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= allVideosRef.current.length) return;
    const pending = pendingStartIndexRef?.current;
    if (pending != null && newIndex !== pending) {
      // The list has already moved. The page on screen is the one that
      // plays — holding the opening index left the previous clip's audio
      // running and hid this page's profile and buttons.
      if (pendingStartIndexRef) pendingStartIndexRef.current = null;
    } else if (pending != null && newIndex === pending) {
      if (pendingStartIndexRef) pendingStartIndexRef.current = null;
    }

    const videoData = allVideosRef.current[newIndex];
    if (!videoData) return;
    const videoKey = reelVideoKey(videoData, newIndex);
    const alreadyHere = newIndex === currentIndexRef.current;
    const alreadyPlaying =
      useGlobalVideoStore.getState().currentlyPlayingVideo === videoKey;

    if (!alreadyHere) {
      currentIndexRef.current = newIndex;
      setCurrentIndexRef.current(newIndex);
      useReelsStore.getState().setCurrentIndex(newIndex);
      userHasManuallyPausedRef.current = false;
      clearManualPauseRef.current?.();
    }

    // Stop every other clip in this same turn, including when this page
    // was already the visible one. Waiting for the next render lets the
    // previous reel keep talking.
    setAndroidAudibleReel(videoKey);
    silenceExcept(videoKey, true);

    if (userHasManuallyPausedRef.current && alreadyHere) {
      try {
        globalVideoStoreRef.current.pauseAllVideos?.();
      } catch {
        // Released player.
      }
      scrollIndexRef.current = newIndex;
      return;
    }

    scrollIndexRef.current = newIndex;
    if (!(alreadyHere && alreadyPlaying)) {
      try {
        globalVideoStoreRef.current.playVideoGlobally(videoKey);
      } catch (e) {
        console.warn("❌ useReelsScroll: Failed to trigger playback updates:", e);
      }
    }
    hearReel(videoKey);
  }, [hearReel, silenceExcept]);

  activateIndexRef.current = activateIndex;

  /**
   * Fabric drops `onViewableItemsChanged` if its identity changes.
   * The pair is created once and always calls the latest handoff.
   * When two cells are both "viewable", the first one in the list is the
   * reel you already left — picking it left that clip playing off screen.
   */
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const candidates = viewableItems.filter(
        (token) => token.isViewable && typeof token.index === "number"
      );
      if (candidates.length === 0) return;
      if (candidates.length === 1) {
        activateIndexRef.current(candidates[0].index ?? 0);
        return;
      }
      const target = scrollIndexRef.current;
      let best = candidates[0];
      for (const token of candidates) {
        const index = token.index ?? 0;
        const bestIndex = best.index ?? 0;
        if (Math.abs(index - target) < Math.abs(bestIndex - target)) best = token;
      }
      activateIndexRef.current(best.index ?? 0);
    }
  ).current;

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: {
        viewAreaCoveragePercentThreshold: 60,
        minimumViewTime: 0,
      },
      onViewableItemsChanged,
    },
  ]).current;

  /** The reel that fills the screen is the one that plays. */
  const commitVisibleIndex = useCallback(
    (index: number) => {
      scrollIndexRef.current = index;
      activateIndex(index);
    },
    [activateIndex]
  );

  return {
    viewabilityConfigCallbackPairs,
    commitVisibleIndex,
  };
}
