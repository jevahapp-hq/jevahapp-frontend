import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { useReelsStore } from "@/store/useReelsStore";

export function useAllContentTikTokLifecycle(options: {
  pauseAllMedia: () => void;
  pauseAllAudio: () => void;
  setCurrentlyVisibleVideo: (key: string | null) => void;
  currentlyVisibleVideoRef?: MutableRefObject<string | null>;
}) {
  const {
    pauseAllMedia,
    pauseAllAudio,
    setCurrentlyVisibleVideo,
    currentlyVisibleVideoRef,
  } = options;
  const isMountedRef = useRef(true);
  /** Last feed video key before leaving (e.g. Reels) so we restore on return. */
  const resumeVideoKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      try {
        pauseAllMedia();
      } catch {
        /* ignore */
      }
    };
  }, [pauseAllMedia]);

  useFocusEffect(
    useCallback(() => {
      const fromStore = useReelsStore.getState().resumePlayback?.feedKey;
      const resumeKey = fromStore || resumeVideoKeyRef.current;
      if (resumeKey) {
        setCurrentlyVisibleVideo(resumeKey);
        resumeVideoKeyRef.current = null;
      }

      return () => {
        if (__DEV__) console.log("📱 Pausing all media on focus loss");
        try {
          pauseAllMedia();
        } catch {
          /* ignore */
        }
        resumeVideoKeyRef.current =
          currentlyVisibleVideoRef?.current ?? resumeVideoKeyRef.current;
        setCurrentlyVisibleVideo(null);
        pauseAllAudio();
      };
    }, [
      pauseAllMedia,
      pauseAllAudio,
      setCurrentlyVisibleVideo,
      currentlyVisibleVideoRef,
    ])
  );

  return { isMountedRef };
}
