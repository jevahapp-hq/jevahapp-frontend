/**
 * Seek for expo-video (primary) with expo-av / audio fallbacks.
 * Optimistically updates scrubber position so the bar follows the finger.
 */
import React, { useCallback } from "react";
import {
  getPlayerDurationMs,
  seekPlayerBySeconds,
  seekPlayerToMs,
} from "../player/expoVideoAdapter";

export interface UseVideoCardSeekParams {
  isAudioSermon: boolean;
  audioState?: { position: number; duration: number };
  audioControls?: { seekTo: (ms: number) => Promise<void> };
  player: any;
  videoPositionMs: number;
  lastKnownDurationRef: React.MutableRefObject<number>;
  backendDurationMs: number;
  setVideoPositionMs?: (ms: number) => void;
  setVideoProgress?: (progress: number) => void;
  /** Blocks near-end auto-loop while scrubbing */
  suppressAutoLoopRef?: React.MutableRefObject<boolean>;
}

export function useVideoCardSeek({
  isAudioSermon,
  audioState,
  audioControls,
  player,
  videoPositionMs,
  lastKnownDurationRef,
  backendDurationMs,
  setVideoPositionMs,
  setVideoProgress,
  suppressAutoLoopRef,
}: UseVideoCardSeekParams) {
  const resolveDurationMs = useCallback(() => {
    const fromPlayer = getPlayerDurationMs(player, 0);
    const fromRef = lastKnownDurationRef.current || 0;
    const fromBackend = backendDurationMs || 0;
    return fromPlayer || fromRef || fromBackend || 0;
  }, [player, lastKnownDurationRef, backendDurationMs]);

  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      if (isAudioSermon) {
        const duration = audioState?.duration ?? 0;
        if (duration <= 0 || !audioControls) return;
        const nextMs = Math.max(
          0,
          Math.min((audioState?.position ?? 0) + deltaSec * 1000, duration)
        );
        try {
          await audioControls.seekTo(nextMs);
        } catch (e) {
          console.warn("Audio seekBySeconds failed", e);
        }
        return;
      }

      const durationMs = resolveDurationMs();
      await seekPlayerBySeconds(player, deltaSec, videoPositionMs, durationMs);
    },
    [
      isAudioSermon,
      audioState?.position,
      audioState?.duration,
      audioControls,
      player,
      videoPositionMs,
      resolveDurationMs,
    ]
  );

  const seekToPercent = useCallback(
    async (percent: number) => {
      const clamped = Math.max(0, Math.min(percent, 1));

      if (isAudioSermon) {
        const duration = audioState?.duration ?? 0;
        if (duration <= 0 || !audioControls) return;
        try {
          await audioControls.seekTo(clamped * duration);
        } catch (e) {
          console.warn("Audio seekToPercent failed", e);
        }
        return;
      }

      const durationMs = resolveDurationMs();
      if (!player || durationMs <= 0) {
        if (__DEV__) {
          console.warn("Video seekToPercent skipped", {
            hasPlayer: Boolean(player),
            durationMs,
          });
        }
        return;
      }

      if (suppressAutoLoopRef) suppressAutoLoopRef.current = true;

      const targetMs = clamped * durationMs;
      // Optimistic UI — bar/position follow immediately; player catches up
      setVideoPositionMs?.(targetMs);
      setVideoProgress?.(clamped);
      if (durationMs > 0) lastKnownDurationRef.current = durationMs;

      const ok = await seekPlayerToMs(player, targetMs);
      if (!ok && __DEV__) {
        console.warn(
          "Video seekToPercent: player did not seek (check expo-video adapter)"
        );
      }

      // Keep loop suppressed briefly so timeUpdate doesn't snap to 0 mid-seek
      if (suppressAutoLoopRef) {
        setTimeout(() => {
          if (suppressAutoLoopRef) suppressAutoLoopRef.current = false;
        }, 350);
      }
    },
    [
      isAudioSermon,
      audioState?.duration,
      audioControls,
      player,
      resolveDurationMs,
      setVideoPositionMs,
      setVideoProgress,
      lastKnownDurationRef,
      suppressAutoLoopRef,
    ]
  );

  return { seekBySeconds, seekToPercent };
}
