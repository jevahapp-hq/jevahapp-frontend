import type { VideoPlayer } from "expo-video";
import { useEffect, useRef, useState } from "react";
import contentInteractionAPI from "../../../../../../app/utils/contentInteractionAPI";
import { useReelsStore } from "@/store/useReelsStore";
import { setCachedDurationMs } from "../player/durationCache";
import { getPlayerDurationMs, seekPlayerToMs } from "../player/expoVideoAdapter";

export interface UseVideoCardPlaybackParams {
  isAudioSermon: boolean;
  contentId: string;
  player: VideoPlayer | null;
  handleVideoError: (error: any) => void;
  setFailedVideoLoad: (v: boolean) => void;
  setVideoLoaded: (v: boolean) => void;
  videoLoadedRef: React.MutableRefObject<boolean>;
  hasTrackedView: boolean;
  setHasTrackedView: (v: boolean) => void;
  storeRef: React.MutableRefObject<any>;
  isMountedRef: React.MutableRefObject<boolean>;
  /**
   * Duration we already know before the player reports one — from the upload's
   * local probe (`durationCache`) or the item's own metadata.
   */
  initialDurationMs?: number;
}

const MIN_DURATION_MS = 100;
const DURATION_EPSILON_MS = 40;
const POSITION_EPSILON_MS = 80;

/**
 * Progress / duration / view-tracking driven by expo-video player events
 * (`timeUpdate`, `statusChange`, `playToEnd`, `sourceLoad`).
 *
 * Position is written only from `timeUpdate` (same as Reels). A JS interval
 * that sampled `currentTime` every 250ms retriggered this effect and hit
 * "Maximum update depth exceeded", which also left the scrubber on
 * "Preparing…".
 */
export function useVideoCardPlayback({
  isAudioSermon,
  contentId,
  player,
  handleVideoError,
  setFailedVideoLoad,
  setVideoLoaded,
  videoLoadedRef,
  hasTrackedView,
  setHasTrackedView,
  storeRef,
  isMountedRef,
  initialDurationMs = 0,
}: UseVideoCardPlaybackParams) {
  const seedMs =
    Number.isFinite(initialDurationMs) && initialDurationMs > 0
      ? initialDurationMs
      : 0;

  const lastKnownDurationRef = useRef(seedMs);
  const lastPositionMsRef = useRef(0);
  const lastProgressRef = useRef(0);
  const [videoDurationMs, setVideoDurationMs] = useState(seedMs);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const hasTrackedViewRef = useRef(hasTrackedView);
  const handleVideoErrorRef = useRef(handleVideoError);
  const setFailedVideoLoadRef = useRef(setFailedVideoLoad);
  const setVideoLoadedRef = useRef(setVideoLoaded);
  const setHasTrackedViewRef = useRef(setHasTrackedView);

  // Parent callbacks are not guaranteed to be referentially stable. Keeping
  // them in refs prevents playback state updates from tearing down and
  // reattaching every player listener on each render.
  handleVideoErrorRef.current = handleVideoError;
  setFailedVideoLoadRef.current = setFailedVideoLoad;
  setVideoLoadedRef.current = setVideoLoaded;
  setHasTrackedViewRef.current = setHasTrackedView;

  useEffect(() => {
    hasTrackedViewRef.current = hasTrackedView;
  }, [hasTrackedView]);

  useEffect(() => {
    if (isAudioSermon || !player) return;

    const unsub = useReelsStore.subscribe((state, prev) => {
      if (
        state.resumePlayback?.target === "feed" &&
        String(state.resumePlayback.contentId) === String(contentId) &&
        state.resumePlayback !== prev.resumePlayback
      ) {
        const resume = useReelsStore
          .getState()
          .consumeResumePlayback(contentId, "feed");
        if (!resume || !(resume.positionMs > 400)) return;
        void seekPlayerToMs(player, resume.positionMs).then((ok) => {
          if (!ok || !isMountedRef.current) return;
          lastPositionMsRef.current = resume.positionMs;
          lastProgressRef.current =
            lastKnownDurationRef.current > 0
              ? resume.positionMs / lastKnownDurationRef.current
              : 0;
          setVideoPositionMs(resume.positionMs);
          setVideoProgress(lastProgressRef.current);
        });
      }
    });
    return unsub;
  }, [isAudioSermon, player, contentId, isMountedRef]);

  useEffect(() => {
    if (!(seedMs > 0)) return;
    const prev = lastKnownDurationRef.current;
    if (Math.abs(prev - seedMs) < DURATION_EPSILON_MS) return;
    if (prev >= MIN_DURATION_MS && seedMs < prev * 0.5) return;
    lastKnownDurationRef.current = seedMs;
    setVideoDurationMs(seedMs);
    setCachedDurationMs(contentId, seedMs);
  }, [seedMs, contentId]);

  useEffect(() => {
    /**
     * Deliberately NOT gated on `isMountedRef.current` at setup.
     * That ref is owned by an effect declared after this hook; on remount
     * its cleanup runs first and would skip attaching listeners for good.
     */
    if (isAudioSermon || !player) return;

    const pendingResume = useReelsStore.getState().resumePlayback;
    const keepFeedResume =
      pendingResume?.target === "feed" &&
      String(pendingResume.contentId) === String(contentId) &&
      pendingResume.positionMs > 400;

    if (
      !keepFeedResume &&
      (lastPositionMsRef.current !== 0 || lastProgressRef.current !== 0)
    ) {
      lastPositionMsRef.current = 0;
      lastProgressRef.current = 0;
      setVideoPositionMs(0);
      setVideoProgress(0);
    }

    try {
      player.timeUpdateEventInterval = 0.25;
    } catch {
      // no-op
    }

    const commitDurationMs = (durationMs: number) => {
      if (!Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS) return;
      const prev = lastKnownDurationRef.current;
      if (Math.abs(prev - durationMs) < DURATION_EPSILON_MS) {
        setCachedDurationMs(contentId, Math.max(prev, durationMs));
        return;
      }
      if (prev >= MIN_DURATION_MS && durationMs < prev * 0.5) return;
      lastKnownDurationRef.current = durationMs;
      setVideoDurationMs(durationMs);
      setCachedDurationMs(contentId, durationMs);
    };

    const applyDurationSeconds = (durationSec: unknown) => {
      const fake = { duration: durationSec };
      const ms = getPlayerDurationMs(fake, 0);
      if (ms > 0) commitDurationMs(ms);
    };

    const applyPositionSeconds = (positionSec: number, isPlaying: boolean) => {
      if (!Number.isFinite(positionSec)) return;

      const positionMs = Math.max(0, positionSec * 1000);
      const durationMs = lastKnownDurationRef.current;
      const clamped =
        durationMs > 0 ? Math.min(positionMs, durationMs) : positionMs;
      const progress =
        durationMs > 0 ? Math.max(0, Math.min(1, clamped / durationMs)) : 0;

      if (
        Math.abs(clamped - lastPositionMsRef.current) < POSITION_EPSILON_MS &&
        Math.abs(progress - lastProgressRef.current) < 0.002
      ) {
        return;
      }

      lastPositionMsRef.current = clamped;
      lastProgressRef.current = progress;
      setVideoPositionMs(clamped);
      setVideoProgress(progress);

      const qualifies = isPlaying && (clamped >= 3000 || progress >= 0.25);
      if (!hasTrackedViewRef.current && qualifies) {
        try {
          contentInteractionAPI
            .recordView(contentId, "media", {
              durationMs: clamped,
              progressPct: Math.round(progress * 100),
              isComplete: false,
            })
            .then((result) => {
              setHasTrackedViewRef.current(true);
              hasTrackedViewRef.current = true;
              if (result?.totalViews != null && storeRef.current?.mutateStats) {
                storeRef.current.mutateStats(contentId, () => ({
                  views: Number(result.totalViews) || 0,
                }));
              }
            })
            .catch(() => {});
        } catch {
          // no-op
        }
      }
    };

    const statusSub = player.addListener("statusChange", ({ status, error }) => {
      if (!isMountedRef.current) return;

      if (status === "error") {
        setFailedVideoLoadRef.current(true);
        handleVideoErrorRef.current(error ?? new Error("Video playback error"));
        return;
      }

      if (status === "readyToPlay") {
        setFailedVideoLoadRef.current(false);
        setVideoLoadedRef.current(true);
        videoLoadedRef.current = true;
        applyDurationSeconds(player.duration);

        const resume = useReelsStore
          .getState()
          .consumeResumePlayback(contentId, "feed");
        if (resume && resume.positionMs > 400) {
          void seekPlayerToMs(player, resume.positionMs).then((ok) => {
            if (!ok || !isMountedRef.current) return;
            lastPositionMsRef.current = resume.positionMs;
            lastProgressRef.current =
              lastKnownDurationRef.current > 0
                ? resume.positionMs / lastKnownDurationRef.current
                : 0;
            setVideoPositionMs(resume.positionMs);
            setVideoProgress(lastProgressRef.current);
          });
        }
      }
    });

    const sourceLoadSub = player.addListener("sourceLoad", ({ duration }) => {
      if (!isMountedRef.current) return;
      setFailedVideoLoadRef.current(false);
      setVideoLoadedRef.current(true);
      videoLoadedRef.current = true;
      applyDurationSeconds(duration);
    });

    const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
      applyPositionSeconds(currentTime, player.playing);
      if (player.duration > 0) applyDurationSeconds(player.duration);
    });

    const endSub = player.addListener("playToEnd", () => {
      if (!isMountedRef.current) return;

      const durationMs = lastKnownDurationRef.current || player.duration * 1000;
      const wasPlaying = player.playing;

      if (!hasTrackedViewRef.current) {
        try {
          contentInteractionAPI
            .recordView(contentId, "media", {
              durationMs,
              progressPct: 100,
              isComplete: true,
            })
            .then((result) => {
              setHasTrackedViewRef.current(true);
              hasTrackedViewRef.current = true;
              if (result?.totalViews != null && storeRef.current?.mutateStats) {
                storeRef.current.mutateStats(contentId, () => ({
                  views: Number(result.totalViews) || 0,
                }));
              }
            })
            .catch(() => {});
        } catch {
          // no-op
        }
      }

      try {
        player.currentTime = 0;
        lastPositionMsRef.current = 0;
        lastProgressRef.current = 0;
        setVideoPositionMs(0);
        setVideoProgress(0);
        if (wasPlaying) player.play();
      } catch {
        // no-op
      }
    });

    if (player.status === "readyToPlay") {
      setFailedVideoLoadRef.current(false);
      setVideoLoadedRef.current(true);
      videoLoadedRef.current = true;
      const resume = useReelsStore
        .getState()
        .consumeResumePlayback(contentId, "feed");
      if (resume && resume.positionMs > 400) {
        void seekPlayerToMs(player, resume.positionMs).then((ok) => {
          if (!ok || !isMountedRef.current) return;
          lastPositionMsRef.current = resume.positionMs;
          lastProgressRef.current =
            lastKnownDurationRef.current > 0
              ? resume.positionMs / lastKnownDurationRef.current
              : 0;
          setVideoPositionMs(resume.positionMs);
          setVideoProgress(lastProgressRef.current);
        });
      }
    }
    const immediateMs = getPlayerDurationMs(player, 0);
    if (immediateMs > 0) commitDurationMs(immediateMs);

    /**
     * Duration-only poll. Feed cards are often handed a player whose
     * `sourceLoad` / `readyToPlay` already fired, so those events never
     * come again. Do not sample `currentTime` here — that setState loop
     * is what blew the update cap.
     */
    let pollId: ReturnType<typeof setInterval> | undefined;
    if (!(lastKnownDurationRef.current >= MIN_DURATION_MS)) {
      pollId = setInterval(() => {
        if (lastKnownDurationRef.current >= MIN_DURATION_MS) {
          if (pollId) clearInterval(pollId);
          pollId = undefined;
          return;
        }
        const ms = getPlayerDurationMs(player, 0);
        if (ms > 0) commitDurationMs(ms);
      }, 400);
    }

    return () => {
      if (pollId) clearInterval(pollId);
      statusSub.remove();
      sourceLoadSub.remove();
      timeSub.remove();
      endSub.remove();
    };
  }, [
    player,
    isAudioSermon,
    contentId,
  ]);

  return {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
  };
}
