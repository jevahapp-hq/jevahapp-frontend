import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";

export function useFeedPlaybackSession(options: {
  isFeedActive: boolean;
  currentlyVisibleVideoRef: MutableRefObject<string | null>;
  pauseAllAudio: () => void;
}) {
  const { isFeedActive, currentlyVisibleVideoRef, pauseAllAudio } = options;

  const pauseVideoAction = useGlobalVideoStore((s) => s.pauseVideo);
  const pauseAllVideosAction = useGlobalVideoStore((s) => s.pauseAllVideos);
  const toggleVideoMuteAction = useGlobalVideoStore((s) => s.toggleVideoMute);
  const enableAutoPlayAction = useGlobalVideoStore((s) => s.enableAutoPlay);
  const playVideoGlobally = useGlobalVideoStore((s) => s.playVideoGlobally);
  const currentlyPlayingVideo = useGlobalVideoStore((s) => s.currentlyPlayingVideo);
  const isAutoPlayEnabled = useGlobalVideoStore((s) => s.isAutoPlayEnabled);

  const isFeedActiveRef = useRef(isFeedActive);
  const isAutoPlayEnabledRef = useRef(isAutoPlayEnabled);
  const wasFeedActiveRef = useRef(isFeedActive);

  useEffect(() => {
    isFeedActiveRef.current = isFeedActive;
  }, [isFeedActive]);
  useEffect(() => {
    isAutoPlayEnabledRef.current = isAutoPlayEnabled;
  }, [isAutoPlayEnabled]);

  const playMedia = useCallback(
    (key: string, type: "video" | "audio") => {
      if (type === "video") playVideoGlobally(key);
    },
    [playVideoGlobally]
  );

  const pauseMedia = useCallback(
    (key: string) => {
      pauseVideoAction(key);
    },
    [pauseVideoAction]
  );

  const pauseAllMedia = useCallback(() => {
    pauseAllVideosAction();
    pauseAllAudio();
  }, [pauseAllVideosAction, pauseAllAudio]);

  const toggleVideoMute = useCallback(
    (key: string) => toggleVideoMuteAction(key),
    [toggleVideoMuteAction]
  );

  useEffect(() => {
    return () => {
      try {
        pauseAllMedia();
      } catch {
        /* ignore */
      }
    };
  }, []);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next !== "active") {
        if (!isFeedActiveRef.current) return;
        try {
          pauseAllMedia();
        } catch {
          /* ignore */
        }
        pauseAllAudio();
        return;
      }
      if (!isFeedActiveRef.current) return;
      const key = currentlyVisibleVideoRef.current;
      if (key && isAutoPlayEnabledRef.current) {
        playMedia(key, "video");
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [pauseAllMedia, pauseAllAudio, playMedia, currentlyVisibleVideoRef]);

  useEffect(() => {
    if (!isFeedActive) {
      if (wasFeedActiveRef.current) {
        try {
          pauseAllMedia();
        } catch {
          /* ignore */
        }
        pauseAllAudio();
      }
      wasFeedActiveRef.current = false;
      return;
    }

    if (!wasFeedActiveRef.current) {
      const key = currentlyVisibleVideoRef.current;
      if (key && isAutoPlayEnabledRef.current) {
        requestAnimationFrame(() => {
          if (!isFeedActiveRef.current) return;
          playMedia(key, "video");
        });
      }
    }
    wasFeedActiveRef.current = true;
  }, [isFeedActive, pauseAllMedia, pauseAllAudio, playMedia, currentlyVisibleVideoRef]);

  useEffect(() => {
    enableAutoPlayAction();
  }, [enableAutoPlayAction]);

  return {
    playMedia,
    pauseMedia,
    pauseAllMedia,
    toggleVideoMute,
    currentlyPlayingVideo,
    isAutoPlayEnabled,
    isFeedActiveRef,
    isAutoPlayEnabledRef,
  };
}
