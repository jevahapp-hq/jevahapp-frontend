import type { VideoPlayer } from "expo-video";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPlayhead, savePlayhead } from "./playheadCache";
import { readPlayerCurrentTimeSec, runWithLivePlayer } from "./safeVideoPlayer";

export interface UseInstantFeedVideoPlayerOptions {
  source: string | null;
  /** Restart from the beginning when the clip ends. */
  loop?: boolean;
  /** Seconds between timeUpdate events. */
  timeUpdateEventInterval?: number;
  /**
   * Restore last playhead from cache (feed cards). Reels has its own
   * resume path — seeking here before a frame paints leaves a black surface.
   */
  restorePlayhead?: boolean;
}

/**
 * Pre-buffers muted; marks playback-ready on readyToPlay.
 * Hides the poster only after a real frame paints (onFirstFrameRender /
 * playhead moved) so the card never flashes black.
 */
export function useInstantFeedVideoPlayer({
  source,
  loop = false,
  timeUpdateEventInterval = 0.5,
  restorePlayhead = true,
}: UseInstantFeedVideoPlayerOptions) {
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const firstFrameReadyRef = useRef(false);
  const [firstFramePainted, setFirstFramePainted] = useState(false);
  const firstFramePaintedRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadedSourceRef = useRef<string | null>(null);

  const videoSource = useMemo(
    () => (source ? { uri: source, useCaching: true } : null),
    [source]
  );

  const player = useVideoPlayer(videoSource, (p) => {
    try {
      p.loop = loop;
      p.muted = true;
      p.volume = 0;
      p.timeUpdateEventInterval = timeUpdateEventInterval;
      if (source) {
        if (restorePlayhead) {
          const saved = getPlayhead(source);
          if (saved > 0.2) {
            p.currentTime = saved;
          }
        }
        p.play();
      }
    } catch {
      // Native player already released during setup.
    }
  });

  useEffect(() => {
    runWithLivePlayer(player, (p) => {
      p.loop = loop;
    });
  }, [player, loop]);

  const markReady = useCallback(() => {
    if (!isMountedRef.current || firstFrameReadyRef.current) return;
    firstFrameReadyRef.current = true;
    setFirstFrameReady(true);
  }, []);

  const markPainted = useCallback(() => {
    if (!isMountedRef.current || firstFramePaintedRef.current) return;
    firstFramePaintedRef.current = true;
    setFirstFramePainted(true);
    markReady();
  }, [markReady]);

  const resetReadiness = useCallback(() => {
    firstFrameReadyRef.current = false;
    firstFramePaintedRef.current = false;
    setFirstFrameReady(false);
    setFirstFramePainted(false);
  }, []);

  // Recycle: new URL on same cell.
  useEffect(() => {
    if (!player || !source) {
      loadedSourceRef.current = null;
      resetReadiness();
      return;
    }

    if (loadedSourceRef.current === source) {
      try {
        if (player.status === "readyToPlay") markReady();
      } catch {
        // no-op
      }
      return;
    }

    const isRecycle = loadedSourceRef.current !== null;
    loadedSourceRef.current = source;
    resetReadiness();

    if (!isRecycle) {
      try {
        if (player.status === "readyToPlay") markReady();
      } catch {
        // no-op
      }
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await player.replaceAsync({ uri: source, useCaching: true });
        if (cancelled || !isMountedRef.current) return;
        player.muted = true;
        player.volume = 0;
        if (restorePlayhead) {
          const saved = getPlayhead(source);
          if (saved > 0.2) {
            try {
              player.currentTime = saved;
            } catch {
              // no-op
            }
          }
        }
        player.play();
      } catch {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player, source, resetReadiness, markReady, restorePlayhead]);

  // Ready when native player can play — don't wait only for onFirstFrameRender
  // (off-screen views sometimes never fire that event).
  useEffect(() => {
    if (!player || !source) return;

    let statusSub: { remove: () => void } | undefined;
    try {
      statusSub = player.addListener("statusChange", ({ status }) => {
        if (!isMountedRef.current) return;
        // Do NOT seek here. readyToPlay also fires after a rebuffer;
        // seeking back to a cached playhead mid-playback cracks audio.
        if (status === "readyToPlay") markReady();
      });
    } catch {
      return;
    }

    try {
      if (player.status === "readyToPlay") markReady();
    } catch {
      // Native player already released.
    }

    // Do NOT force-ready on a timer — that opens a white blank before the frame.
    return () => {
      try {
        statusSub?.remove();
      } catch {
        // no-op
      }
    };
  }, [player, source, markReady]);

  // One-shot muted prime until ready (no interval loop — that hung the JS thread).
  useEffect(() => {
    if (!player || !source || firstFrameReady) return;
    runWithLivePlayer(player, (p) => {
      p.muted = true;
      p.volume = 0;
      if (!p.playing) p.play();
    });
  }, [player, source, firstFrameReady]);

  const freezeOnFirstFrame = useCallback(() => {
    if (!player) return;
    runWithLivePlayer(player, (p) => {
      const t = readPlayerCurrentTimeSec(p);
      if (source && t > 0.15) savePlayhead(source, t);
      p.pause();
      p.muted = true;
      p.volume = 0;
    });
  }, [player, source]);

  const handleFirstFrameRender = useCallback(() => {
    if (restorePlayhead) {
      const saved = getPlayhead(source);
      const now = readPlayerCurrentTimeSec(player);
      // Don't reveal a remounted player sitting at 0 while we still need to seek.
      if (saved > 0.5 && now < saved - 0.4) return;
    }
    markPainted();
  }, [markPainted, source, player, restorePlayhead]);

  useEffect(() => {
    if (!player || !source) return;
    let sub: { remove: () => void } | undefined;
    try {
      sub = player.addListener("timeUpdate", ({ currentTime }) => {
        if (typeof currentTime !== "number") return;
        if (currentTime > 0.15) savePlayhead(source, currentTime);
        if (firstFramePaintedRef.current) return;
        if (restorePlayhead) {
          const saved = getPlayhead(source);
          if (saved > 0.5) {
            if (currentTime >= saved - 0.4) markPainted();
            else if (currentTime > 0.5 && currentTime < saved - 1) {
              // Resume seek didn't apply; don't keep the poster up forever.
              markPainted();
            }
            return;
          }
        }
        if (currentTime > 0.08) markPainted();
      });
    } catch {
      return;
    }
    return () => {
      try {
        sub?.remove();
      } catch {
        // no-op
      }
    };
  }, [player, source, markPainted, restorePlayhead]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    player: source ? player : null,
    firstFrameReady,
    firstFramePainted,
    handleFirstFrameRender,
    freezeOnFirstFrame,
  } satisfies {
    player: VideoPlayer | null;
    firstFrameReady: boolean;
    firstFramePainted: boolean;
    handleFirstFrameRender: () => void;
    freezeOnFirstFrame: () => void;
  };
}
