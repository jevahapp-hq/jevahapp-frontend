/**
 * Reels player built on expo-video
 * (https://docs.expo.dev/versions/latest/sdk/video/).
 */
import type { VideoPlayer } from "expo-video";
import { useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseReelsExpoVideoPlayerOptions {
  source: string | null;
  isActive: boolean;
  shouldPlay: boolean;
  isMuted: boolean;
  volume?: number;
  /** When false, pass null source so the decoder is released. */
  shouldMount: boolean;
}

export interface UseReelsExpoVideoPlayerResult {
  player: VideoPlayer | null;
  firstFrameReady: boolean;
  positionMs: number;
  durationMs: number;
  seekToMs: (ms: number) => void;
  handleFirstFrameRender: () => void;
}

export function useReelsExpoVideoPlayer({
  source,
  isActive,
  shouldPlay,
  isMuted,
  volume = 1,
  shouldMount,
}: UseReelsExpoVideoPlayerOptions): UseReelsExpoVideoPlayerResult {
  const [firstFrameReady, setFirstFrameReady] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const firstFrameReadyRef = useRef(false);

  const activeSource =
    shouldMount && source ? { uri: source, useCaching: true } : null;

  const player = useVideoPlayer(activeSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    p.timeUpdateEventInterval = 0.1;
    try {
      p.bufferOptions = {
        minBufferForPlayback: 0.1,
        prioritizeTimeOverSizeThreshold: true,
        waitsToMinimizeStalling: false,
        preferredForwardBufferDuration: 4,
      };
    } catch {
      // no-op
    }
    // Pre-buffer muted; active cell unmutes via the sync effect.
    try {
      p.play();
    } catch {
      // no-op
    }
  });

  const markReady = useCallback(() => {
    if (firstFrameReadyRef.current) return;
    firstFrameReadyRef.current = true;
    setFirstFrameReady(true);
  }, []);

  const handleFirstFrameRender = useCallback(() => {
    markReady();
  }, [markReady]);

  // Reset readiness when the mounted source identity changes
  useEffect(() => {
    firstFrameReadyRef.current = false;
    setFirstFrameReady(false);
    setPositionMs(0);
    setDurationMs(0);
  }, [source, shouldMount]);

  useEffect(() => {
    if (!player || !shouldMount) return;

    const statusSub = player.addListener("statusChange", ({ status }) => {
      if (status === "readyToPlay") {
        markReady();
        const d = player.duration;
        if (Number.isFinite(d) && d > 0) {
          setDurationMs(Math.round(d * 1000));
        }
      }
    });

    const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
      setPositionMs(Math.round((currentTime || 0) * 1000));
      const d = player.duration;
      if (Number.isFinite(d) && d > 0) {
        const next = Math.round(d * 1000);
        setDurationMs((prev) => (Math.abs(prev - next) < 250 ? prev : next));
      }
      if (player.playing && currentTime > 0.01) markReady();
    });

    const playingSub = player.addListener("playingChange", ({ isPlaying }) => {
      if (isPlaying) markReady();
    });

    if (player.status === "readyToPlay") markReady();

    return () => {
      statusSub.remove();
      timeSub.remove();
      playingSub.remove();
    };
  }, [player, shouldMount, markReady]);

  useEffect(() => {
    if (!player || !shouldMount) return;

    try {
      if (isActive && shouldPlay) {
        player.muted = isMuted;
        player.volume = isMuted ? 0 : volume;
        player.play();
        return;
      }

      // Neighbors / user-paused: stay silent.
      player.muted = true;
      player.volume = 0;
      if (isActive && !shouldPlay) {
        if (player.playing) player.pause();
        return;
      }

      // Inactive neighbor: muted preroll until first frame, then park.
      if (!firstFrameReadyRef.current) {
        if (!player.playing) player.play();
      } else {
        if (player.playing) player.pause();
        if (player.currentTime > 0.2) player.currentTime = 0.01;
      }
    } catch {
      // no-op
    }
  }, [player, shouldMount, isActive, shouldPlay, isMuted, volume, firstFrameReady]);

  // When the active reel becomes ready, force one more play kick — store
  // autoplay often raced before the expo-video player finished loading.
  useEffect(() => {
    if (!player || !shouldMount || !isActive || !shouldPlay || !firstFrameReady) {
      return;
    }
    try {
      player.muted = isMuted;
      player.volume = isMuted ? 0 : volume;
      player.play();
    } catch {
      // no-op
    }
  }, [
    player,
    shouldMount,
    isActive,
    shouldPlay,
    firstFrameReady,
    isMuted,
    volume,
  ]);

  const seekToMs = useCallback(
    (ms: number) => {
      if (!player || durationMs <= 0) return;
      const clamped = Math.max(0, Math.min(ms, durationMs));
      try {
        player.currentTime = clamped / 1000;
        setPositionMs(clamped);
      } catch {
        // no-op
      }
    },
    [player, durationMs]
  );

  return {
    player: shouldMount && source ? player : null,
    firstFrameReady,
    positionMs,
    durationMs,
    seekToMs,
    handleFirstFrameRender,
  };
}
