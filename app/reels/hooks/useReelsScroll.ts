import type { VideoPlayer } from "expo-video";
import { useCallback, useRef, type MutableRefObject } from "react";
import { ViewToken } from "react-native";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { useReelsStore } from "@/store/useReelsStore";
import {
  reelManuallyPaused,
  setAndroidAudibleReel,
  setReelManualPause,
} from "../reelAudible";
import {
  enqueueReelPlayerJob,
  silenceReelPlayersExcept,
} from "../reelPlayerQueue";
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
  userHasManuallyPaused,
  pendingStartIndexRef,
  clearManualPause,
  videoRefs,
}: UseReelsScrollOptions) {
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const allVideosRef = useRef(allVideos);
  allVideosRef.current = allVideos;
  const userHasManuallyPausedRef = useRef(userHasManuallyPaused);
  userHasManuallyPausedRef.current = userHasManuallyPaused;
  const setCurrentIndexRef = useRef(setCurrentIndex);
  setCurrentIndexRef.current = setCurrentIndex;
  const clearManualPauseRef = useRef(clearManualPause);
  clearManualPauseRef.current = clearManualPause;
  const videoRefsRef = useRef(videoRefs);
  videoRefsRef.current = videoRefs;

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
      useGlobalVideoStore.getState().playingVideos[videoKey] === true;

    // Stop every clip except the one on screen. Pausing only the previous
    // index left a reel you scrolled past still playing over this one.
    if (!alreadyHere) {
      const refs = videoRefsRef.current?.current;
      silenceReelPlayersExcept(videoKey, refs);
      if (refs?.[videoKey] && !reelManuallyPaused(videoKey)) {
        const arriving = refs[videoKey];
        const muted =
          useGlobalVideoStore.getState().mutedVideos[videoKey] ?? false;
        enqueueReelPlayerJob(videoKey, "hear", () => {
          try {
            silenceReelPlayersExcept(videoKey, videoRefsRef.current?.current);
            arriving.pause();
            arriving.muted = muted;
            arriving.volume = muted ? 0 : 1;
            arriving.play();
          } catch {
            // Released native player.
          }
        });
      }
    }

    if (!alreadyHere) setReelManualPause(null);
    setAndroidAudibleReel(videoKey);
    if (!(alreadyHere && alreadyPlaying) && !reelManuallyPaused(videoKey)) {
      // State only, in this turn, so the pause icon and the player agree
      // before the list re-renders. Native play stays on the player effect.
      useGlobalVideoStore.getState().playVideo(videoKey);
    }

    if (!alreadyHere) {
      currentIndexRef.current = newIndex;
      userHasManuallyPausedRef.current = false;
      clearManualPauseRef.current?.();
    }

    scrollIndexRef.current = newIndex;
    if (!(alreadyHere && alreadyPlaying)) {
      setCurrentIndexRef.current(newIndex);
      useReelsStore.getState().setCurrentIndex(newIndex);
    }
  }, []);

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
      const target = scrollIndexRef.current;
      const onTarget = candidates.some((token) => token.index === target);
      // A callback that does not include the page the scroll already chose
      // belongs to the reel you left. Applying it restarted that reel and
      // hid the buttons on the one you landed on.
      if (!onTarget) return;
      activateIndexRef.current(target);
    }
  ).current;

  const viewabilityConfigCallbackPairs = useRef([
    {
      viewabilityConfig: {
        viewAreaCoveragePercentThreshold: 8,
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
