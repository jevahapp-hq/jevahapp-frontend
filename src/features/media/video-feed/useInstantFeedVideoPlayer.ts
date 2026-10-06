import type { VideoPlayer } from "expo-video";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { clearPlayhead, feedStartSeconds, savePlayhead } from "./playheadCache";
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
  /**
   * Off-screen neighbor. It only needs its first frames, so it buffers a few
   * seconds instead of competing with the clip on screen for the network.
   */
  idle?: boolean;
  /**
   * Check the resume seek against timeUpdate events instead of reading
   * `currentTime`. On Android that getter blocks JS until the main thread
   * answers, and during a Reels swipe the main thread is busy with decoders.
   */
  nonBlockingSeekCheck?: boolean;
  /**
   * How long to keep the still up after the first-frame callback. Android's
   * texture is black on that same tick. Reels passes a short delay because
   * the next page is already primed.
   */
  revealDelayMs?: number;
}

function androidBufferOptions(idle: boolean) {
  return {
    minBufferForPlayback: 0.25,
    // Neighbors keep several seconds ready. This is set once at creation.
    // Retuning it when a reel pauses clears the surface on the way back.
    preferredForwardBufferDuration: idle ? 6 : 12,
  };
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
  idle = false,
  nonBlockingSeekCheck = false,
  revealDelayMs,
}: UseInstantFeedVideoPlayerOptions) {
  const lastEventTimeRef = useRef(0);
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
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekWaitRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cacheBypassRef = useRef(false);
  const durationSecRef = useRef(0);
  const revealDelayRef = useRef(revealDelayMs);
  revealDelayRef.current = revealDelayMs;
  const mutedPrimeRef = useRef(mutedPrime);
  mutedPrimeRef.current = mutedPrime;

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
      // Start on half a second of video instead of a full second.
      if (Platform.OS === "android") p.bufferOptions = androidBufferOptions(idle);
      if (source) {
        if (restorePlayhead) {
          p.currentTime = feedStartSeconds(source);
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
    markPainted();
    if (nativeFirstFrameRef.current || revealTimeoutRef.current) return;
    const reveal = () => {
      revealTimeoutRef.current = null;
      if (!isMountedRef.current || nativeFirstFrameRef.current) return;
      if (paintInvalidatedRef.current) return;
      nativeFirstFrameRef.current = true;
      setNativeFirstFrame(true);
    };
    // Android's texture is still black on the same tick as the first-frame
    // callback. Keep the poster up until that frame has composited.
    if (Platform.OS === "android") {
      const delay = revealDelayRef.current ?? 160;
      if (delay <= 0) {
        reveal();
        return;
      }
      revealTimeoutRef.current = setTimeout(reveal, delay);
      return;
    }
    reveal();
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
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (seekWaitRef.current) {
      clearInterval(seekWaitRef.current);
      seekWaitRef.current = null;
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
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (seekWaitRef.current) {
      clearInterval(seekWaitRef.current);
      seekWaitRef.current = null;
    }
    firstFrameReadyRef.current = false;
    firstFramePaintedRef.current = false;
    nativeFirstFrameRef.current = false;
    paintInvalidatedRef.current = false;
    lastEventTimeRef.current = 0;
    durationSecRef.current = 0;
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
      // Same file, still mounted. Do not read player.status and do not
      // replace the source — both drop the frame on the way back.
      return;
    }

    const isRecycle = loadedSourceRef.current !== null;
    loadedSourceRef.current = source;
    resetReadiness();

    if (!isRecycle) return;

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
          try {
            player.currentTime = feedStartSeconds(source);
          } catch {
            // no-op
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
  }, [player, source, resetReadiness, restorePlayhead, mutedPrime]);

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
          if (durationSecRef.current <= 0) {
            try {
              const next = Number(player.duration);
              if (next > 0) durationSecRef.current = next;
            } catch {
              // Released native player.
            }
          }
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
                try {
                  player.currentTime = feedStartSeconds(source);
                } catch {
                  // no-op
                }
              }
              if (mutedPrimeRef.current) player.play();
            } catch {
              // no-op
            }
          })();
        }
      });
    } catch {
      return;
    }

    // One read when the listener attaches. readyToPlay may already have
    // fired. This effect does not re-run on play/pause, so the getter is
    // not on the swipe or tap path.
    try {
      if (player.status === "readyToPlay") {
        const next = Number(player.duration);
        if (next > 0) durationSecRef.current = next;
        markReady();
      }
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
  }, [player, source, markReady, resetReadiness, restorePlayhead]);

  // The setup callback already starts a muted prime. On Android this only
  // stops a neighbor that must not decode. iOS keeps the previous play/pause
  // check so a clip still starts the way the last build did.
  useEffect(() => {
    if (!player || !source || firstFrameReady) return;
    if (Platform.OS !== "android") {
      runWithLivePlayer(player, (p) => {
        p.muted = true;
        p.volume = 0;
        if (!mutedPrime) {
          if (p.playing) p.pause();
          return;
        }
        if (!p.playing) p.play();
      });
      return;
    }
    if (mutedPrime) return;
    const handle = setTimeout(() => {
      runWithLivePlayer(player, (p) => {
        p.muted = true;
        p.volume = 0;
        p.pause();
      });
    }, 0);
    return () => clearTimeout(handle);
  }, [player, source, firstFrameReady, mutedPrime]);

  const freezeOnFirstFrame = useCallback(() => {
    if (!player) return;
    runWithLivePlayer(player, (p) => {
      const t = readPlayerCurrentTimeSec(p);
      if (source && t > 0.15) savePlayhead(source, t, Number(p.duration));
      p.muted = true;
      p.volume = 0;
      if (p.playing) p.pause();
    });
  }, [player, source]);

  const handleFirstFrameRender = useCallback(() => {
    if (restorePlayhead) {
      const startAt = feedStartSeconds(source);
      // Event-based checks only hold the cover for a real resume point; the
      // default 0.1s start would wait on the first tick for nothing.
      const seekPending = () =>
        nonBlockingSeekCheck
          ? startAt > 0.25 && lastEventTimeRef.current + 0.04 < startAt
          : startAt > 0.05 && readPlayerCurrentTimeSec(player) + 0.04 < startAt;
      // Don't reveal the blank frame at 0 while the resume seek is still pending.
      // Android fires this once, often before the seek lands. Dropping it left
      // the cover up while the clip played underneath.
      if (seekPending()) {
        if (seekWaitRef.current) clearInterval(seekWaitRef.current);
        const startedAt = Date.now();
        seekWaitRef.current = setInterval(() => {
          if (!isMountedRef.current) return;
          if (seekPending() && Date.now() - startedAt < 1500) return;
          if (seekWaitRef.current) clearInterval(seekWaitRef.current);
          seekWaitRef.current = null;
          markNativeFirstFrame();
        }, 100);
        return;
      }
    }
    markNativeFirstFrame();
  }, [markNativeFirstFrame, source, player, restorePlayhead, nonBlockingSeekCheck]);

  useEffect(() => {
    if (!player || !source) return;
    let sub: { remove: () => void } | undefined;
    let endSub: { remove: () => void } | undefined;
    try {
      endSub = player.addListener("playToEnd", () => clearPlayhead(source));
      sub = player.addListener("timeUpdate", ({ currentTime }) => {
        if (typeof currentTime !== "number") return;
        lastEventTimeRef.current = currentTime;
        if (currentTime > 0.15) {
          const duration =
            durationSecRef.current > 0 ? durationSecRef.current : undefined;
          savePlayhead(source, currentTime, duration);
        }
        if (firstFramePaintedRef.current) return;
        if (restorePlayhead) {
          const startAt = feedStartSeconds(source);
          if (startAt > 0.05 && currentTime + 0.04 < startAt) return;
        }
        // Decoder has time, but the SurfaceView can still be black. Wait a
        // beat so the still stays up until a real frame can composite.
        if (currentTime < 0.12 || paintFallbackTimeoutRef.current) return;
        paintFallbackTimeoutRef.current = setTimeout(() => {
          paintFallbackTimeoutRef.current = null;
          // The view often skips onFirstFrameRender (resume seek, texture view
          // attached after the frame). A moving playhead means frames are
          // drawing, so uncover.
          markNativeFirstFrame();
        }, 180);
      });
    } catch {
      return;
    }
    return () => {
      try {
        sub?.remove();
        endSub?.remove();
      } catch {
        // no-op
      }
    };
  }, [player, source, markNativeFirstFrame, restorePlayhead]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (paintFallbackTimeoutRef.current) {
        clearTimeout(paintFallbackTimeoutRef.current);
        paintFallbackTimeoutRef.current = null;
      }
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealTimeoutRef.current = null;
      }
      if (seekWaitRef.current) {
        clearInterval(seekWaitRef.current);
        seekWaitRef.current = null;
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
