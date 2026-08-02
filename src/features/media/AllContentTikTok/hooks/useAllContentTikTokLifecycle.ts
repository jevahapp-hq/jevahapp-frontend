import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

export function useAllContentTikTokLifecycle(options: {
  pauseAllMedia: () => void;
  pauseAllAudio: () => void;
  setCurrentlyVisibleVideo: (key: string | null) => void;
}) {
  const { pauseAllMedia, pauseAllAudio, setCurrentlyVisibleVideo } = options;
  const isMountedRef = useRef(true);

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
      return () => {
        if (__DEV__) console.log("📱 Pausing all media on focus loss");
        try {
          pauseAllMedia();
        } catch {
          /* ignore */
        }
        setCurrentlyVisibleVideo(null);
        pauseAllAudio();
      };
    }, [pauseAllMedia, pauseAllAudio, setCurrentlyVisibleVideo])
  );

  return { isMountedRef };
}
