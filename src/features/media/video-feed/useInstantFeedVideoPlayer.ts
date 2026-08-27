import type { VideoPlayer } from "expo-video";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UseInstantFeedVideoPlayerOptions {
  source: string | null;
  /** Reels loop; feed cards do not. */
  loop?: boolean;
  /** Seconds between timeUpdate events. */
  timeUpdateEventInterval?: number;
}

/**
 * Pre-buffers muted; marks ready on readyToPlay (and onFirstFrameRender).
 * Does not keep fighting play/pause after ready — that caused hang/echo.
 */
export function useInstantFeedVideoPlayer({
  source,
  loop = false,
  timeUpdateEventInterval = 0.5,
}: UseInstantFeedVideoPlayerOptions) {
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const firstFrameReadyRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadedSourceRef = useRef<string | null>(null);

  const videoSource = useMemo(
    () => (source ? { uri: source, useCaching: true } : null),
    [source]
  );

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = loop;
    p.muted = true;
    p.volume = 0;
    p.timeUpdateEventInterval = timeUpdateEventInterval;
    if (source) {
      try {
        p.play();
      } catch {
        // no-op
      }
    }
  });

  useEffect(() => {
    if (player) player.loop = loop;
  }, [player, loop]);

  const markReady = useCallback(() => {
    if (!isMountedRef.current || firstFrameReadyRef.current) return;
    firstFrameReadyRef.current = true;
    setFirstFrameReady(true);
  }, []);

  const resetReadiness = useCallback(() => {
    firstFrameReadyRef.current = false;
    setFirstFrameReady(false);
  }, []);

  // Recycle: new URL on same cell.
  useEffect(() => {
    if (!player || !source) {
      loadedSourceRef.current = null;
      resetReadiness();
      return;
    }

    if (loadedSourceRef.current === source) {
      if (player.status === "readyToPlay") markReady();
      return;
    }

    const isRecycle = loadedSourceRef.current !== null;
    loadedSourceRef.current = source;
    resetReadiness();

    if (!isRecycle) {
      if (player.status === "readyToPlay") markReady();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await player.replaceAsync({ uri: source, useCaching: true });
        if (cancelled || !isMountedRef.current) return;
        player.muted = true;
        player.volume = 0;
        player.play();
      } catch {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player, source, resetReadiness, markReady]);

  // Ready when native player can play — don't wait only for onFirstFrameRender
  // (off-screen views sometimes never fire that event).
  useEffect(() => {
    if (!player || !source) return;

    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (!isMountedRef.current) return;
      if (status === "readyToPlay") {
        markReady();
      }
    });

    if (player.status === "readyToPlay") {
      markReady();
    }

    // Do NOT force-ready on a timer — that opens a white blank before the frame.
    return () => {
      statusSub.remove();
    };
  }, [player, source, markReady]);

  // One-shot muted prime until ready (no interval loop — that hung the JS thread).
  useEffect(() => {
    if (!player || !source || firstFrameReady) return;
    try {
      player.muted = true;
      player.volume = 0;
      if (!player.playing) player.play();
    } catch {
      // no-op
    }
  }, [player, source, firstFrameReady]);

  const freezeOnFirstFrame = useCallback(() => {
    if (!player) return;
    try {
      if (player.currentTime > 0.05) {
        player.currentTime = 0;
      }
      player.pause();
      player.muted = true;
      player.volume = 0;
    } catch {
      // no-op
    }
  }, [player]);

  const handleFirstFrameRender = useCallback(() => {
    markReady();
  }, [markReady]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    player: source ? player : null,
    firstFrameReady,
    handleFirstFrameRender,
    freezeOnFirstFrame,
  } satisfies {
    player: VideoPlayer | null;
    firstFrameReady: boolean;
    handleFirstFrameRender: () => void;
    freezeOnFirstFrame: () => void;
  };
}
