import type { VideoPlayer } from "expo-video";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FEED_VIDEO_START_POSITION_SECONDS } from "./feedVideoConfig";
import { captureVideoFrameSnapshot } from "./videoFrameSnapshotCache";

export interface UseInstantFeedVideoPlayerOptions {
  source: string | null;
  /** Alternate URLs to try on retry (hls / fileUrl fallbacks). */
  alternateSources?: string[];
  /** When false (hidden category pane), do not keep re-kicking muted play. */
  enablePreroll?: boolean;
  /** Most Recent hero — tighter buffer + faster preroll rekick. */
  isHero?: boolean;
}

/**
 * Pre-buffers muted, captures the ~0.02s frame as a static underlay, and
 * marks ready as soon as the player can play so Most Recent can unmute.
 *
 * Do NOT wait on onFirstFrameRender while the VideoView is hidden — iOS
 * often never fires it for opacity:0 surfaces, which left Most Recent
 * black and silent forever.
 *
 * iOS AVPlayer often emits a transient "Operation Stopped" on the first
 * cold load (CDN/R2 + early seek/play races). Auto-retry with
 * replaceAsync before surfacing Tap to retry — same workaround used in
 * expo#39100 discussions.
 */
const LOAD_TIMEOUT_MS = 12000;
/** Avoid spamming play() — that cancels AVPlayerItem and causes Operation Stopped. */
const PREROLL_REKICK_MS = 400;
const HERO_PREROLL_REKICK_MS = 250;
/** Silent recoveries before showing Tap to retry. */
const MAX_AUTO_RETRIES = 2;
const AUTO_RETRY_DELAY_MS = 180;

function withCacheBust(uri: string): string {
  const sep = uri.includes("?") ? "&" : "?";
  return `${uri}${sep}_retry=${Date.now()}`;
}

function isTransientLoadError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");
  const lower = message.toLowerCase();
  return (
    lower.includes("operation stopped") ||
    lower.includes("operation was cancelled") ||
    lower.includes("operation canceled") ||
    lower.includes("cancelled") ||
    lower.includes("canceled") ||
    lower.includes("nsosstatuserrordomain") ||
    lower.includes("-11839") // AVFoundation: media services were reset / stopped
  );
}

export function useInstantFeedVideoPlayer({
  source,
  alternateSources = [],
  enablePreroll = true,
  isHero = false,
}: UseInstantFeedVideoPlayerOptions) {
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const firstFrameReadyRef = useRef(false);
  const isMountedRef = useRef(true);
  const loadedSourceRef = useRef<string | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUriRef = useRef<string | null>(source);
  const retryIndexRef = useRef(0);
  const autoRetryCountRef = useRef(0);
  const isRecoveringRef = useRef(false);
  const sourceRef = useRef(source);
  const alternateSourcesRef = useRef(alternateSources);
  sourceRef.current = source;
  alternateSourcesRef.current = alternateSources;

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const clearAutoRetryTimer = useCallback(() => {
    if (autoRetryTimerRef.current) {
      clearTimeout(autoRetryTimerRef.current);
      autoRetryTimerRef.current = null;
    }
  }, []);

  // Stable source identity for useVideoPlayer (deps on JSON.stringify).
  // Hero skips HTTP cache on first mount — CDN/R2 first-hit + cache was a
  // common Operation Stopped trigger (expo#39100).
  const sourceUri = source || "";
  const videoSource = useMemo(
    () =>
      sourceUri
        ? { uri: sourceUri, useCaching: !isHero }
        : null,
    [sourceUri, isHero]
  );

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = true;
    p.volume = 0;
    p.timeUpdateEventInterval = isHero ? 0.05 : 0.1;
    try {
      p.bufferOptions = {
        // Start playback as soon as a tiny buffer exists (Instagram-style).
        // Avoid seeking here — seeking before the item is ready is a common
        // cause of iOS "Operation Stopped" on cold start.
        minBufferForPlayback: isHero ? 0.1 : 0.2,
        prioritizeTimeOverSizeThreshold: true,
        waitsToMinimizeStalling: false,
        preferredForwardBufferDuration: isHero ? 2 : 3,
      };
    } catch {
      // no-op
    }
    if (sourceUri) {
      try {
        p.play();
      } catch {
        // no-op
      }
    }
  });

  const markReady = useCallback(() => {
    if (!isMountedRef.current || firstFrameReadyRef.current) return;
    firstFrameReadyRef.current = true;
    autoRetryCountRef.current = 0;
    isRecoveringRef.current = false;
    setFirstFrameReady(true);
    setLoadTimedOut(false);
    clearLoadTimeout();
    clearAutoRetryTimer();
  }, [clearLoadTimeout, clearAutoRetryTimer]);

  const resetReadiness = useCallback(() => {
    clearLoadTimeout();
    clearAutoRetryTimer();
    firstFrameReadyRef.current = false;
    setFirstFrameReady(false);
    setLoadTimedOut(false);
  }, [clearLoadTimeout, clearAutoRetryTimer]);

  const armLoadTimeout = useCallback(() => {
    if (firstFrameReadyRef.current || loadTimeoutRef.current) return;
    loadTimeoutRef.current = setTimeout(() => {
      loadTimeoutRef.current = null;
      if (!isMountedRef.current || firstFrameReadyRef.current) return;
      // Hung load with no error event: kick silent recovery, then Tap to retry.
      if (autoRetryCountRef.current < MAX_AUTO_RETRIES) {
        scheduleAutoRetryRef.current?.("load timeout");
        return;
      }
      setLoadTimedOut(true);
    }, LOAD_TIMEOUT_MS);
  }, []);

  // Filled after scheduleAutoRetry is defined (avoids TDZ with armLoadTimeout).
  const scheduleAutoRetryRef = useRef<
    ((error?: unknown) => void) | null
  >(null);

  const kickMutedPlay = useCallback(() => {
    if (!player || firstFrameReadyRef.current || isRecoveringRef.current) return;
    try {
      // Never call play() while the player is already in error — that
      // compounds Operation Stopped. Recovery goes through replaceAsync.
      if (player.status === "error") return;
      player.muted = true;
      player.volume = 0;
      if (!player.playing) player.play();
    } catch {
      // no-op
    }
  }, [player]);

  const reloadSource = useCallback(
    (uri: string, useCaching: boolean) => {
      if (!player) return;
      isRecoveringRef.current = true;
      activeUriRef.current = uri;
      void player
        .replaceAsync({ uri, useCaching })
        .then(() => {
          if (!isMountedRef.current) return;
          isRecoveringRef.current = false;
          try {
            player.muted = true;
            player.volume = 0;
            // Seek only after replace finishes — never in the setup path.
            player.currentTime = FEED_VIDEO_START_POSITION_SECONDS;
            player.play();
          } catch {
            // no-op
          }
        })
        .catch(() => {
          if (!isMountedRef.current) return;
          isRecoveringRef.current = false;
          if (autoRetryCountRef.current >= MAX_AUTO_RETRIES) {
            setLoadTimedOut(true);
          }
        });
    },
    [player]
  );

  const scheduleAutoRetry = useCallback(
    (error?: unknown) => {
      if (!player || !sourceRef.current || firstFrameReadyRef.current) return;
      if (autoRetryCountRef.current >= MAX_AUTO_RETRIES) {
        setLoadTimedOut(true);
        return;
      }
      if (isRecoveringRef.current || autoRetryTimerRef.current) return;

      autoRetryCountRef.current += 1;
      const attempt = autoRetryCountRef.current;
      if (__DEV__) {
        console.warn(
          `[useInstantFeedVideoPlayer] auto-retry ${attempt}/${MAX_AUTO_RETRIES}`,
          error
        );
      }

      clearLoadTimeout();
      autoRetryTimerRef.current = setTimeout(() => {
        autoRetryTimerRef.current = null;
        if (!isMountedRef.current || firstFrameReadyRef.current) return;

        const primary = sourceRef.current;
        if (!primary) {
          setLoadTimedOut(true);
          return;
        }

        const candidates = [
          primary,
          ...alternateSourcesRef.current.filter((u) => u && u !== primary),
        ];
        retryIndexRef.current =
          (retryIndexRef.current + 1) % Math.max(candidates.length, 1);
        const next = candidates[retryIndexRef.current] || primary;
        // Bypass expo-video HTTP cache on recovery — first-hit CDN/cache
        // races are a known Operation Stopped trigger (expo#39100).
        reloadSource(withCacheBust(next), false);
        armLoadTimeout();
      }, AUTO_RETRY_DELAY_MS * attempt);
    },
    [player, reloadSource, clearLoadTimeout, armLoadTimeout]
  );
  scheduleAutoRetryRef.current = scheduleAutoRetry;

  useEffect(() => {
    if (!player || !source) {
      loadedSourceRef.current = null;
      activeUriRef.current = null;
      retryIndexRef.current = 0;
      autoRetryCountRef.current = 0;
      isRecoveringRef.current = false;
      resetReadiness();
      return;
    }

    if (loadedSourceRef.current === source) {
      if (!firstFrameReadyRef.current) armLoadTimeout();
      return;
    }

    loadedSourceRef.current = source;
    activeUriRef.current = source;
    retryIndexRef.current = 0;
    autoRetryCountRef.current = 0;
    isRecoveringRef.current = false;
    resetReadiness();
    armLoadTimeout();
    kickMutedPlay();
  }, [player, source, resetReadiness, armLoadTimeout, kickMutedPlay]);

  useEffect(() => {
    if (!player || !source) return;

    const statusSub = player.addListener("statusChange", ({ status, error }) => {
      if (!isMountedRef.current) return;
      if (status === "error") {
        clearLoadTimeout();
        // Transient iOS cold-start failures: recover silently.
        if (
          isTransientLoadError(error) ||
          autoRetryCountRef.current < MAX_AUTO_RETRIES
        ) {
          scheduleAutoRetry(error);
          return;
        }
        setLoadTimedOut(true);
        return;
      }
      if (status === "readyToPlay" && !firstFrameReadyRef.current) {
        try {
          // Safe seek once the item exists — paints a real first frame.
          if (player.currentTime < FEED_VIDEO_START_POSITION_SECONDS) {
            player.currentTime = FEED_VIDEO_START_POSITION_SECONDS;
          }
        } catch {
          // no-op
        }
        kickMutedPlay();
        markReady();
        captureVideoFrameSnapshot(source, player);
      }
    });

    const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
      if (!isMountedRef.current || firstFrameReadyRef.current) return;
      if (player.playing && currentTime > FEED_VIDEO_START_POSITION_SECONDS) {
        markReady();
        captureVideoFrameSnapshot(source, player);
      }
    });

    const playingSub = player.addListener(
      "playingChange",
      ({ isPlaying, oldIsPlaying }) => {
        if (!isMountedRef.current || firstFrameReadyRef.current) return;
        if (isPlaying && !oldIsPlaying) {
          kickMutedPlay();
          markReady();
          captureVideoFrameSnapshot(source, player);
        }
      }
    );

    if (player.status === "readyToPlay") {
      kickMutedPlay();
      markReady();
      captureVideoFrameSnapshot(source, player);
    } else if (player.status === "error") {
      scheduleAutoRetry();
    }

    return () => {
      statusSub.remove();
      timeSub.remove();
      playingSub.remove();
    };
  }, [
    player,
    source,
    clearLoadTimeout,
    kickMutedPlay,
    markReady,
    scheduleAutoRetry,
  ]);

  useEffect(() => {
    if (!enablePreroll || !player || !source || firstFrameReady || loadTimedOut) {
      return;
    }

    kickMutedPlay();
    const rekickMs = isHero ? HERO_PREROLL_REKICK_MS : PREROLL_REKICK_MS;
    const id = setInterval(() => {
      if (firstFrameReadyRef.current || isRecoveringRef.current) return;
      kickMutedPlay();
    }, rekickMs);

    return () => clearInterval(id);
  }, [
    enablePreroll,
    player,
    source,
    firstFrameReady,
    loadTimedOut,
    kickMutedPlay,
    isHero,
  ]);

  // Hero: one early play kick as soon as the player exists (before status
  // listeners settle) so Most Recent does not sit on a static artwork frame.
  useEffect(() => {
    if (!isHero || !enablePreroll || !player || !source || firstFrameReady) {
      return;
    }
    kickMutedPlay();
  }, [isHero, enablePreroll, player, source, firstFrameReady, kickMutedPlay]);

  const freezeOnFirstFrame = useCallback(() => {
    if (!player) return;
    try {
      if (player.currentTime > 0.05) {
        player.currentTime = FEED_VIDEO_START_POSITION_SECONDS;
      }
      player.pause();
      player.muted = true;
      player.volume = 0;
    } catch {
      // no-op
    }
    captureVideoFrameSnapshot(source, player);
  }, [player, source]);

  const handleFirstFrameRender = useCallback(() => {
    markReady();
    if (player && source) {
      captureVideoFrameSnapshot(source, player);
    }
  }, [markReady, player, source]);

  const retryLoad = useCallback(() => {
    if (!player || !source) return;
    autoRetryCountRef.current = 0;
    isRecoveringRef.current = false;
    resetReadiness();
    armLoadTimeout();

    const candidates = [
      source,
      ...alternateSources.filter((u) => u && u !== source),
    ];
    retryIndexRef.current =
      (retryIndexRef.current + 1) % Math.max(candidates.length, 1);
    const next = candidates[retryIndexRef.current] || source;
    reloadSource(withCacheBust(next), false);
  }, [
    player,
    source,
    alternateSources,
    resetReadiness,
    armLoadTimeout,
    reloadSource,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearLoadTimeout();
      clearAutoRetryTimer();
    };
  }, [clearLoadTimeout, clearAutoRetryTimer]);

  return {
    player: source ? player : null,
    firstFrameReady,
    loadTimedOut,
    handleFirstFrameRender,
    freezeOnFirstFrame,
    retryLoad,
    kickMutedPlay,
  } satisfies {
    player: VideoPlayer | null;
    firstFrameReady: boolean;
    loadTimedOut: boolean;
    handleFirstFrameRender: () => void;
    freezeOnFirstFrame: () => void;
    retryLoad: () => void;
    kickMutedPlay: () => void;
  };
}
