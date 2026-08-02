import type { VideoPlayer } from "expo-video";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
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
 */
const LOAD_TIMEOUT_MS = 10000;
/** Faster than 400ms, but not so low it races pause/play. */
const PREROLL_REKICK_MS = 200;

function withCacheBust(uri: string): string {
  const sep = uri.includes("?") ? "&" : "?";
  return `${uri}${sep}_retry=${Date.now()}`;
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
  const activeUriRef = useRef<string | null>(source);
  const retryIndexRef = useRef(0);
  const isHeroRef = useRef(isHero);
  isHeroRef.current = isHero;

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const videoSource = source ? { uri: source, useCaching: true } : null;

  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = false;
    p.muted = true;
    p.volume = 0;
    p.timeUpdateEventInterval = isHero ? 0.05 : 0.1;
    try {
      p.bufferOptions = {
        // Hero: start with even less buffered data so Most Recent paints ASAP.
        minBufferForPlayback: isHero ? 0.05 : 0.15,
        prioritizeTimeOverSizeThreshold: true,
        waitsToMinimizeStalling: false,
        preferredForwardBufferDuration: isHero ? 2 : 3,
      };
    } catch {
      // no-op
    }
    if (source) {
      try {
        p.currentTime = FEED_VIDEO_START_POSITION_SECONDS;
        p.play();
      } catch {
        // no-op
      }
    }
  });

  const markReady = useCallback(() => {
    if (!isMountedRef.current || firstFrameReadyRef.current) return;
    firstFrameReadyRef.current = true;
    setFirstFrameReady(true);
    setLoadTimedOut(false);
    clearLoadTimeout();
  }, [clearLoadTimeout]);

  const resetReadiness = useCallback(() => {
    clearLoadTimeout();
    firstFrameReadyRef.current = false;
    setFirstFrameReady(false);
    setLoadTimedOut(false);
  }, [clearLoadTimeout]);

  const armLoadTimeout = useCallback(() => {
    if (firstFrameReadyRef.current || loadTimeoutRef.current) return;
    loadTimeoutRef.current = setTimeout(() => {
      loadTimeoutRef.current = null;
      if (!isMountedRef.current || firstFrameReadyRef.current) return;
      setLoadTimedOut(true);
    }, LOAD_TIMEOUT_MS);
  }, []);

  const kickMutedPlay = useCallback(() => {
    if (!player || firstFrameReadyRef.current) return;
    try {
      player.muted = true;
      player.volume = 0;
      if (!player.playing) player.play();
    } catch {
      // no-op
    }
  }, [player]);

  useEffect(() => {
    if (!player || !source) {
      loadedSourceRef.current = null;
      activeUriRef.current = null;
      retryIndexRef.current = 0;
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
    resetReadiness();
    armLoadTimeout();
    kickMutedPlay();
  }, [player, source, resetReadiness, armLoadTimeout, kickMutedPlay]);

  useEffect(() => {
    if (!player || !source) return;

    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (!isMountedRef.current) return;
      if (status === "error") {
        setLoadTimedOut(true);
        clearLoadTimeout();
        return;
      }
      if (status === "readyToPlay" && !firstFrameReadyRef.current) {
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
    }

    return () => {
      statusSub.remove();
      timeSub.remove();
      playingSub.remove();
    };
  }, [player, source, clearLoadTimeout, kickMutedPlay, markReady]);

  useEffect(() => {
    if (!enablePreroll || !player || !source || firstFrameReady || loadTimedOut) {
      return;
    }

    kickMutedPlay();
    const rekickMs = isHero ? 100 : PREROLL_REKICK_MS;
    const id = setInterval(() => {
      if (firstFrameReadyRef.current) return;
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
    try {
      player.muted = true;
      player.volume = 0;
      player.play();
    } catch {
      // no-op
    }
  }, [isHero, enablePreroll, player, source, firstFrameReady]);

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
    resetReadiness();
    armLoadTimeout();

    const candidates = [
      source,
      ...alternateSources.filter((u) => u && u !== source),
    ];
    retryIndexRef.current =
      (retryIndexRef.current + 1) % Math.max(candidates.length, 1);
    const next = candidates[retryIndexRef.current] || source;
    const uri = withCacheBust(next);
    activeUriRef.current = uri;

    void player
      .replaceAsync({ uri, useCaching: false })
      .then(() => {
        if (!isMountedRef.current) return;
        try {
          player.muted = true;
          player.volume = 0;
          player.currentTime = FEED_VIDEO_START_POSITION_SECONDS;
          player.play();
        } catch {
          // no-op
        }
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        setLoadTimedOut(true);
      });
  }, [player, source, alternateSources, resetReadiness, armLoadTimeout]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearLoadTimeout();
    };
  }, [clearLoadTimeout]);

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
