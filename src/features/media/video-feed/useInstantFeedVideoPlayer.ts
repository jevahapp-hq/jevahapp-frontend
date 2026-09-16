import type { VideoPlayer } from "expo-video";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPlayhead, savePlayhead } from "./playheadCache";
import { readPlayerCurrentTimeSec, runWithLivePlayer } from "./safeVideoPlayer";
import {
  fixOverEncodedMediaUrl,
  isRetryableVideoSourceError,
  toExpoVideoSource,
} from "../../../shared/utils/videoUrlManager";

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
  /**
   * Muted play() until readyToPlay. Neighbors in Reels must stay paused —
   * extra ExoPlayers with doNotMix steal the session and crackle audio.
   */
  mutedPrime?: boolean;
}

/**
 * Pre-buffers muted; marks playback-ready on readyToPlay.
 * Keeps a still over the VideoView until onFirstFrameRender (timeUpdate is
 * only a delayed fallback) so the card never flashes black.
 */
export function useInstantFeedVideoPlayer({
  source,
  loop = false,
  timeUpdateEventInterval = 0.5,
  restorePlayhead = true,
  mutedPrime = true,
}: UseInstantFeedVideoPlayerOptions) {
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const firstFrameReadyRef = useRef(false);
  const [firstFramePainted, setFirstFramePainted] = useState(false);
  const firstFramePaintedRef = useRef(false);
  const [nativeFirstFrame, setNativeFirstFrame] = useState(false);
  const nativeFirstFrameRef = useRef(false);
  const paintInvalidatedRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadedSourceRef = useRef<string | null>(null);
  const paintFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const cacheBypassRef = useRef(false);

  const videoSource = useMemo(
    () => toExpoVideoSource(source),
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
        if (mutedPrime) p.play();
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
    if (paintFallbackTimeoutRef.current) {
      clearTimeout(paintFallbackTimeoutRef.current);
      paintFallbackTimeoutRef.current = null;
    }
    if (!isMountedRef.current || firstFramePaintedRef.current) return;
    firstFramePaintedRef.current = true;
    setFirstFramePainted(true);
    markReady();
  }, [markReady]);

  const markNativeFirstFrame = useCallback(() => {
    if (!isMountedRef.current) return;
    paintInvalidatedRef.current = false;
    if (!nativeFirstFrameRef.current) {
      nativeFirstFrameRef.current = true;
      setNativeFirstFrame(true);
    }
    markPainted();
  }, [markPainted]);

  /**
   * Cover the VideoView again after a seek or after the surface was hidden
   * (Reels on top of the feed). readyToPlay stays true so playback does not
   * stall waiting for a second prime.
   */
  const invalidateNativeFirstFrame = useCallback(() => {
    if (paintFallbackTimeoutRef.current) {
      clearTimeout(paintFallbackTimeoutRef.current);
      paintFallbackTimeoutRef.current = null;
    }
    paintInvalidatedRef.current = true;
    nativeFirstFrameRef.current = false;
    firstFramePaintedRef.current = false;
    setNativeFirstFrame(false);
    setFirstFramePainted(false);
  }, []);

  const resetReadiness = useCallback(() => {
    if (paintFallbackTimeoutRef.current) {
      clearTimeout(paintFallbackTimeoutRef.current);
      paintFallbackTimeoutRef.current = null;
    }
    firstFrameReadyRef.current = false;
    firstFramePaintedRef.current = false;
    nativeFirstFrameRef.current = false;
    paintInvalidatedRef.current = false;
    setFirstFrameReady(false);
    setFirstFramePainted(false);
    setNativeFirstFrame(false);
  }, []);

  // Recycle: new URL on same cell.
  useEffect(() => {
    cacheBypassRef.current = false;
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

    const nextSource = toExpoVideoSource(source);
    if (!nextSource) return;

    let cancelled = false;
    (async () => {
      try {
        await player.replaceAsync(nextSource);
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
        if (mutedPrime) player.play();
      } catch {
        // no-op
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [player, source, resetReadiness, markReady, restorePlayhead, mutedPrime]);

  // Ready when native player can play — don't wait only for onFirstFrameRender
  // (off-screen views sometimes never fire that event).
  useEffect(() => {
    if (!player || !source) return;

    let statusSub: { remove: () => void } | undefined;
    try {
      statusSub = player.addListener("statusChange", ({ status, error }) => {
        if (!isMountedRef.current) return;
        // Do NOT seek here. readyToPlay also fires after a rebuffer;
        // seeking back to a cached playhead mid-playback cracks audio.
        if (status === "readyToPlay") {
          markReady();
          return;
        }
        if (
          (status === "error" || error) &&
          isRetryableVideoSourceError(error) &&
          source &&
          !cacheBypassRef.current
        ) {
          cacheBypassRef.current = true;
          const streamed = toExpoVideoSource(fixOverEncodedMediaUrl(source), {
            useCaching: false,
          });
          if (!streamed) return;
          resetReadiness();
          void (async () => {
            try {
              await player.replaceAsync(streamed);
              if (!isMountedRef.current) return;
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
              if (mutedPrime) player.play();
            } catch {
              // no-op
            }
          })();
        }
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
  }, [player, source, markReady, resetReadiness, restorePlayhead, mutedPrime]);

  // One-shot muted prime until ready (no interval loop — that hung the JS thread).
  useEffect(() => {
    if (!player || !source || firstFrameReady) return;
    runWithLivePlayer(player, (p) => {
      p.muted = true;
      p.volume = 0;
      if (!mutedPrime) {
        if (p.playing) p.pause();
        return;
      }
      if (!p.playing) p.play();
    });
  }, [player, source, firstFrameReady, mutedPrime]);

  const freezeOnFirstFrame = useCallback(() => {
    if (!player) return;
    runWithLivePlayer(player, (p) => {
      const t = readPlayerCurrentTimeSec(p);
      if (source && t > 0.15) savePlayhead(source, t);
      p.muted = true;
      p.volume = 0;
      if (p.playing) p.pause();
    });
  }, [player, source]);

  const handleFirstFrameRender = useCallback(() => {
    if (restorePlayhead) {
      const saved = getPlayhead(source);
      const now = readPlayerCurrentTimeSec(player);
      // Don't reveal a remounted player sitting at 0 while we still need to seek.
      if (saved > 0.5 && now < saved - 0.4) return;
    }
    markNativeFirstFrame();
  }, [markNativeFirstFrame, source, player, restorePlayhead]);

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
          if (saved > 0.5 && currentTime < saved - 0.4) return;
        }
        // Decoder has time, but the SurfaceView can still be black. Wait a
        // beat so the still stays up until a real frame can composite.
        if (currentTime < 0.12 || paintFallbackTimeoutRef.current) return;
        paintFallbackTimeoutRef.current = setTimeout(() => {
          paintFallbackTimeoutRef.current = null;
          // After a resume seek the SurfaceView often skips onFirstFrameRender.
          // timeUpdate means the decoder has the target frame — uncover then.
          if (paintInvalidatedRef.current && firstFrameReadyRef.current) {
            markNativeFirstFrame();
            return;
          }
          markPainted();
        }, 180);
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
  }, [player, source, markPainted, markNativeFirstFrame, restorePlayhead]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (paintFallbackTimeoutRef.current) {
        clearTimeout(paintFallbackTimeoutRef.current);
        paintFallbackTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    player: source ? player : null,
    firstFrameReady,
    firstFramePainted,
    nativeFirstFrame,
    handleFirstFrameRender,
    freezeOnFirstFrame,
    invalidateNativeFirstFrame,
  } satisfies {
    player: VideoPlayer | null;
    firstFrameReady: boolean;
    firstFramePainted: boolean;
    nativeFirstFrame: boolean;
    handleFirstFrameRender: () => void;
    freezeOnFirstFrame: () => void;
    invalidateNativeFirstFrame: () => void;
  };
}
