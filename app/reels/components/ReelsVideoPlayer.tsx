/**
 * Reels video surface — expo-video + the same global session as the home feed.
 * Cards are views; play/pause/mute go through useGlobalVideoStore.
 */
import { MaterialIcons } from "@expo/vector-icons";
import type { VideoPlayer } from "expo-video";
import { MutableRefObject, memo, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useVideoPlaybackControl } from "../../../src/shared/hooks/useVideoPlaybackControl";
import { handleVideoError, isRetryableVideoSourceError } from "../../../src/shared/utils/videoUrlManager";
import {
  FeedVideoSurface,
  FittedMediaImage,
  shouldHoldVideoStill,
  useInstantFeedVideoPlayer,
} from "../../../src/features/media/video-feed";
import { setCachedDurationMs } from "../../../src/features/media/components/VideoCard/player/durationCache";
import {
  snapshotPlayerFrame,
  useVideoFrameSnapshot,
} from "../../../src/features/media/video-feed/videoFrameSnapshotCache";
import { readPlayerCurrentTimeSec } from "../../../src/features/media/video-feed/safeVideoPlayer";
import { FEED_VIDEO_START_POSITION_SECONDS } from "../../../src/features/media/video-feed/feedVideoConfig";
import { useReelsStore } from "@/store/useReelsStore";
import contentInteractionAPI from "../../utils/contentInteractionAPI";
import { qualifiesPlaybackView } from "../../utils/contentInteraction/viewQualification";
import {
  getReelsMediaFrame,
  REELS_CONTENT_FIT,
} from "../hooks/useReelsResponsive";

interface ReelsVideoPlayerProps {
  videoKey: string;
  contentId: string;
  videoUrl: string;
  posterUri?: string | null;
  screenHeight: number;
  screenWidth: number;
  isActive: boolean;
  isMuted: boolean;
  videoVolume: number;
  isPlaying: boolean;
  videoRefs: MutableRefObject<Record<string, VideoPlayer>>;
  onToggleVideoPlay: () => void;
  setVideoDuration: (d: number) => void;
  setVideoPosition: (p: number) => void;
  setLocalPosition: (p: number) => void;
  setLocalDuration: (d: number) => void;
  isDragging: boolean;
  globalVideoStore: any;
  showPauseOverlay: boolean;
  getResponsiveSize: (s: number, m: number, l: number) => number;
  triggerHapticFeedback: () => void;
}

const ReelsVideoPlayer = memo(
  ({
    videoKey,
    contentId,
    videoUrl,
    posterUri,
    screenHeight,
    screenWidth,
    isActive,
    isMuted,
    videoVolume,
    isPlaying,
    videoRefs,
    onToggleVideoPlay: _onToggleVideoPlay,
    setVideoDuration,
    setVideoPosition,
    setLocalPosition,
    setLocalDuration,
    isDragging,
    globalVideoStore,
    showPauseOverlay,
    getResponsiveSize,
    triggerHapticFeedback: _triggerHapticFeedback,
  }: ReelsVideoPlayerProps) => {
    const lastUpdateRef = useRef(0);
    const hasTrackedViewRef = useRef(false);
    const playerRef = useRef<VideoPlayer | null>(null);

    /**
     * Values the native listeners read but must NOT re-subscribe on.
     *
     * These used to be effect dependencies, and the effect also *wrote* two of
     * them (`localDuration`, `videoPosition`), so each write tore down and
     * rebuilt three listeners and scheduled another write — the
     * "Maximum update depth exceeded" loop. Reading them from refs keeps the
     * subscription stable for the life of the player.
     */
    const isActiveRef = useRef(isActive);
    isActiveRef.current = isActive;
    const isDraggingRef = useRef(isDragging);
    isDraggingRef.current = isDragging;

    /**
     * What we last pushed to the parent. Previously the effect compared against
     * the parent's `videoPosition` prop, but `memo` below intentionally ignores
     * that prop, so the closure held a stale 0 forever and the throttle check
     * was always true — pushing a parent setState every 400ms indefinitely.
     * The child tracking its own last-published value is both correct and local.
     */
    const lastPushedPositionRef = useRef(-1);
    const lastPushedDurationRef = useRef(-1);

    const {
      player,
      firstFrameReady,
      nativeFirstFrame,
      handleFirstFrameRender,
      freezeOnFirstFrame,
      invalidateNativeFirstFrame,
    } = useInstantFeedVideoPlayer({
      source: videoUrl,
      loop: true,
      restorePlayhead: false,
      timeUpdateEventInterval: 0.25,
    });

    playerRef.current = player;
    const lastFrame = useVideoFrameSnapshot(videoUrl);

    useVideoPlaybackControl({
      videoKey,
      videoRef: playerRef,
      playbackReady: firstFrameReady,
      syncPlayback: false,
    });

    const didApplyResumeRef = useRef(false);
    const [resumeSeekDone, setResumeSeekDone] = useState(false);
    useEffect(() => {
      didApplyResumeRef.current = false;
      setResumeSeekDone(false);
    }, [contentId]);

    const pendingResume = useReelsStore((s) => s.resumePlayback);
    const pendingResumeSec =
      !resumeSeekDone &&
      pendingResume?.target === "reels" &&
      String(pendingResume.contentId) === String(contentId) &&
      pendingResume.positionMs > 400
        ? pendingResume.positionMs / 1000
        : 0;
    const holdStill = shouldHoldVideoStill({
      nativeFirstFrame,
      isSurfaceActive: isActive,
      pendingResumeSec,
    });

    // Continuity from feed: wait for a painted frame, then seek. Uncovering
    // the first t≈0 frame and seeking immediately is the fullscreen black flash.
    useEffect(() => {
      if (!player || !isActive || !nativeFirstFrame || didApplyResumeRef.current) {
        return;
      }
      const resume = useReelsStore.getState().resumePlayback;
      if (
        !resume ||
        resume.target !== "reels" ||
        String(resume.contentId) !== String(contentId) ||
        !(resume.positionMs > 400)
      ) {
        didApplyResumeRef.current = true;
        setResumeSeekDone(true);
        return;
      }
      didApplyResumeRef.current = true;
      invalidateNativeFirstFrame();
      try {
        const wantMuted = isMuted;
        const wantVol = isMuted ? 0 : videoVolume;
        if (player.playing) {
          player.muted = true;
          player.volume = 0;
        }
        player.currentTime = resume.positionMs / 1000;
        setLocalPosition(resume.positionMs);
        setVideoPosition(resume.positionMs);
        player.muted = wantMuted;
        player.volume = wantVol;
        setResumeSeekDone(true);
      } catch {
        didApplyResumeRef.current = false;
        setResumeSeekDone(false);
      }
    }, [
      player,
      isActive,
      nativeFirstFrame,
      contentId,
      isMuted,
      videoVolume,
      setLocalPosition,
      setVideoPosition,
      invalidateNativeFirstFrame,
    ]);

    useEffect(() => {
      hasTrackedViewRef.current = false;
    }, [contentId]);

    useEffect(() => {
      if (player) {
        videoRefs.current[videoKey] = player;
      }
      return () => {
        delete videoRefs.current[videoKey];
        snapshotPlayerFrame(videoUrl, playerRef.current);
      };
    }, [player, videoKey, videoRefs, videoUrl]);

    useEffect(() => {
      if (!player) return;

      const applyAudibleState = () => {
        try {
          const shouldHear = isActive && isPlaying;
          if (!shouldHear) {
            if (!player.muted) player.muted = true;
            if ((Number(player.volume) || 0) !== 0) player.volume = 0;
            if (player.playing && nativeFirstFrame) freezeOnFirstFrame();
            return;
          }
          const wantMuted = isMuted;
          const wantVol = isMuted ? 0 : videoVolume;
          // Set mute/volume while paused, then play once. Unmuting a
          // decoder that is already playing is the Android crackle.
          if (player.muted !== wantMuted) player.muted = wantMuted;
          if (Math.abs((Number(player.volume) || 0) - wantVol) > 0.02) {
            player.volume = wantVol;
          }
          if (!player.playing) player.play();
        } catch {
          // no-op
        }
      };

      applyAudibleState();
    }, [
      player,
      isActive,
      isPlaying,
      isMuted,
      videoVolume,
      freezeOnFirstFrame,
      nativeFirstFrame,
    ]);

    // Snapshot the paused frame as soon as this reel is no longer active so
    // scrolling back shows a still instead of a black VideoView.
    useEffect(() => {
      if (!player || !videoUrl || isActive || !nativeFirstFrame) return;
      const t = readPlayerCurrentTimeSec(player);
      snapshotPlayerFrame(
        videoUrl,
        player,
        t > 0 ? t : FEED_VIDEO_START_POSITION_SECONDS
      );
    }, [player, videoUrl, isActive, nativeFirstFrame]);

    useEffect(() => {
      if (!player || !videoUrl || !nativeFirstFrame) return;
      snapshotPlayerFrame(videoUrl, player);
    }, [player, videoUrl, nativeFirstFrame]);

    useEffect(() => {
      if (!player) return;

      const applyDuration = (durationSec: number) => {
        if (!Number.isFinite(durationSec) || durationSec <= 0) return;
        const durationMs = Math.min(durationSec * 1000, 24 * 60 * 60 * 1000);
        // expo-video refines `duration` repeatedly while buffering (and for
        // every HLS segment), so publish only real changes.
        if (lastPushedDurationRef.current === durationMs) return;
        lastPushedDurationRef.current = durationMs;
        setLocalDuration(durationMs);
        setVideoDuration(durationMs);
        // Shared with the feed cards so both surfaces agree on the timer.
        setCachedDurationMs(contentId, durationMs);
      };

      if (player.duration > 0) applyDuration(player.duration);

      const statusSub = player.addListener("statusChange", ({ status, error }) => {
        if (status === "error" || error) {
          // HLS + useCaching throws on iOS; the player retries without cache.
          if (isRetryableVideoSourceError(error)) return;
          handleVideoError(error as any, videoUrl, videoKey);
          globalVideoStore.pauseVideo(videoKey);
          return;
        }
        if (status === "readyToPlay" && player.duration > 0) {
          applyDuration(player.duration);
        }
      });

      const timeSub = player.addListener("timeUpdate", ({ currentTime }) => {
        if (!isActiveRef.current) return;
        const durationSec = Number(player.duration) || 0;
        const positionMs = Math.max(0, (currentTime || 0) * 1000);
        const durationMs = durationSec * 1000;
        const dragging = isDraggingRef.current;

        if (!dragging) {
          setLocalPosition(positionMs);
        }

        const now = Date.now();
        if (now - lastUpdateRef.current > 400) {
          lastUpdateRef.current = now;
          if (durationMs > 0) applyDuration(durationSec);
          if (
            !dragging &&
            Math.abs(positionMs - lastPushedPositionRef.current) > 1000
          ) {
            lastPushedPositionRef.current = positionMs;
            setVideoPosition(positionMs);
          }
          const pct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
          globalVideoStore.setVideoProgress(videoKey, pct);
        }

        if (
          !hasTrackedViewRef.current &&
          player.playing &&
          durationMs > 0
        ) {
          const progress = durationMs > 0 ? positionMs / durationMs : 0;
          const { qualifies, finished } = qualifiesPlaybackView({
            family: "video",
            isPlaying: true,
            positionMs,
            progress,
            durationMs,
          });
          if (qualifies || finished) {
            hasTrackedViewRef.current = true;
            contentInteractionAPI
              .recordView(contentId, "media", {
                durationMs: finished ? durationMs : positionMs,
                progressPct: Math.round(progress * 100),
                isComplete: finished,
                source: "reels",
              })
              .then((result) => {
                if (result.counted === false) {
                  hasTrackedViewRef.current = false;
                }
              })
              .catch(() => {
                hasTrackedViewRef.current = false;
              });
          }
        }
      });

      const endSub = player.addListener("playToEnd", () => {
        // loop={true} already restarts. Do not seek/play/haptic here —
        // those crack the loop point.
      });

      return () => {
        statusSub.remove();
        timeSub.remove();
        endSub.remove();
      };
      // Subscribe once per player/source. Everything else is read via refs.
    }, [
      player,
      videoKey,
      videoUrl,
      contentId,
      globalVideoStore,
      setLocalDuration,
      setLocalPosition,
      setVideoDuration,
      setVideoPosition,
    ]);

    const mediaFrame = getReelsMediaFrame(screenWidth, screenHeight);
    const surfaceStyle = {
      width: screenWidth,
      height: screenHeight,
    };

    const still = (
      <PosterLayer
        posterUri={posterUri}
        lastFrame={lastFrame}
        width={mediaFrame.width}
        height={mediaFrame.height}
      />
    );

    if (!player) {
      return (
        <View style={[styles.host, surfaceStyle]} collapsable={false}>
          {still}
        </View>
      );
    }

    return (
      <View style={[styles.host, surfaceStyle]} collapsable={false}>
        {still}
        <FeedVideoSurface
          player={player}
          visible
          height={mediaFrame.height}
          width={mediaFrame.width}
          contentFit={REELS_CONTENT_FIT}
          onFirstFrameRender={handleFirstFrameRender}
        />
        {holdStill ? (
          <View style={styles.stillOverlay} pointerEvents="none">
            <PosterLayer
              posterUri={posterUri}
              lastFrame={lastFrame}
              width={mediaFrame.width}
              height={mediaFrame.height}
            />
          </View>
        ) : null}

        {isActive && !isPlaying && (
          <View style={styles.overlay} pointerEvents="none">
            <MaterialIcons
              name="play-arrow"
              size={getResponsiveSize(50, 60, 70)}
              color="rgba(255, 255, 255, 0.6)"
            />
          </View>
        )}

        {isActive && showPauseOverlay && isPlaying && (
          <View style={styles.overlay} pointerEvents="none">
            <MaterialIcons
              name="pause"
              size={getResponsiveSize(50, 60, 70)}
              color="rgba(255, 255, 255, 0.6)"
            />
          </View>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.videoUrl === next.videoUrl &&
    prev.posterUri === next.posterUri &&
    prev.screenHeight === next.screenHeight &&
    prev.screenWidth === next.screenWidth &&
    prev.isActive === next.isActive &&
    prev.isMuted === next.isMuted &&
    prev.isPlaying === next.isPlaying &&
    prev.showPauseOverlay === next.showPauseOverlay &&
    prev.isDragging === next.isDragging
);

function PosterLayer({
  posterUri,
  lastFrame,
  width,
  height,
}: {
  posterUri?: string | null;
  lastFrame: ReturnType<typeof useVideoFrameSnapshot>;
  width: number;
  height: number;
}) {
  if (lastFrame) {
    return (
      <FittedMediaImage
        source={lastFrame}
        width={width}
        height={height}
        contentFit={REELS_CONTENT_FIT}
        style={styles.stillFill}
      />
    );
  }
  if (posterUri) {
    return (
      <FittedMediaImage
        uri={posterUri}
        width={width}
        height={height}
        contentFit={REELS_CONTENT_FIT}
        style={styles.stillFill}
      />
    );
  }
  return <View style={[styles.stillFill, { width, height }]} />;
}

export default ReelsVideoPlayer;

const styles = StyleSheet.create({
  host: {
    backgroundColor: "transparent",
    position: "relative",
  },
  stillOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 4,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  stillFill: {
    backgroundColor: "#000",
  },
});
