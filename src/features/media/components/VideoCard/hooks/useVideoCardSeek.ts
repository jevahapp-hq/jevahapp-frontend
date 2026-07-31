/**
 * Seek for expo-video — absolute % seek when duration is known.
 * Scrubber UI always moves; player seek only runs with a real duration.
 */
import React, { useCallback } from "react";
import { setCachedDurationMs } from "../player/durationCache";
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
  mediaId?: string;
  setVideoPositionMs?: (ms: number) => void;
  setVideoProgress?: (progress: number) => void;
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
  mediaId,
  setVideoPositionMs,
  setVideoProgress,
  suppressAutoLoopRef,
}: UseVideoCardSeekParams) {
  const resolveDurationMs = useCallback((): number => {
    const fromPlayer = getPlayerDurationMs(player, 0);
    const fromRef = lastKnownDurationRef.current || 0;
    const fromBackend = backendDurationMs || 0;
    const resolved = fromPlayer || fromRef || fromBackend || 0;
    return resolved >= 500 ? resolved : 0;
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

      await seekPlayerBySeconds(
        player,
        deltaSec,
        videoPositionMs,
        resolveDurationMs()
      );
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

      // Refresh duration from player right before seek (often appears after play)
      const live = getPlayerDurationMs(player, 0);
      if (live >= 500) {
        lastKnownDurationRef.current = live;
        setCachedDurationMs(mediaId, live);
      }

      const durationMs = resolveDurationMs();
      // Optimistic UI even if we can't drive the decoder yet
      setVideoProgress?.(clamped);
      if (durationMs > 0) {
        setVideoPositionMs?.(clamped * durationMs);
      }

      if (!player || durationMs <= 0) {
        return;
      }

      if (suppressAutoLoopRef) suppressAutoLoopRef.current = true;

      const targetMs = Math.min(
        clamped * durationMs,
        Math.max(0, durationMs - 250)
      );

      const wasPlaying = Boolean(player.playing);
      try {
        if (wasPlaying && typeof player.pause === "function") player.pause();
      } catch {
        // no-op
      }

      await seekPlayerToMs(player, targetMs, durationMs);

      try {
        if (wasPlaying && typeof player.play === "function") player.play();
      } catch {
        // no-op
      }

      if (suppressAutoLoopRef) {
        setTimeout(() => {
          if (suppressAutoLoopRef) suppressAutoLoopRef.current = false;
        }, 1200);
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
      mediaId,
    ]
  );

  return {
    seekBySeconds,
    seekToPercent,
  };
}
