/**
 * Reels video surface — expo-video + the same global session as the home feed.
 * Cards are views; play/pause/mute go through useGlobalVideoStore.
 */
import { MaterialIcons } from "@expo/vector-icons";
import type { VideoPlayer } from "expo-video";
import { VideoView } from "expo-video";
import { MutableRefObject, memo, useEffect, useRef } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useVideoPlaybackControl } from "../../../src/shared/hooks/useVideoPlaybackControl";
import { handleVideoError } from "../../../src/shared/utils/videoUrlManager";
import { useInstantFeedVideoPlayer } from "../../../src/features/media/video-feed";
import { setCachedDurationMs } from "../../../src/features/media/components/VideoCard/player/durationCache";
import { seekPlayerToMs } from "../../../src/features/media/components/VideoCard/player/expoVideoAdapter";
import { useReelsStore } from "@/store/useReelsStore";
import contentInteractionAPI from "../../utils/contentInteractionAPI";
import { qualifiesPlaybackView } from "../../utils/contentInteraction/viewQualification";

interface ReelsVideoPlayerProps {
  videoKey: string;
  contentId: string;
  videoUrl: string;
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
    isActive,
    isMuted,
    videoVolume,
    isPlaying,
    videoRefs,
    onToggleVideoPlay,
    setVideoDuration,
    setVideoPosition,
    setLocalPosition,
    setLocalDuration,
    isDragging,
    globalVideoStore,
    showPauseOverlay,
    getResponsiveSize,
    triggerHapticFeedback,
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
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const isDraggingRef = useRef(isDragging);
    isDraggingRef.current = isDragging;
    const hapticRef = useRef(triggerHapticFeedback);
    hapticRef.current = triggerHapticFeedback;

    /**
     * What we last pushed to the parent. Previously the effect compared against
     * the parent's `videoPosition` prop, but `memo` below intentionally ignores
     * that prop, so the closure held a stale 0 forever and the throttle check
     * was always true — pushing a parent setState every 400ms indefinitely.
     * The child tracking its own last-published value is both correct and local.
     */
    const lastPushedPositionRef = useRef(-1);
    const lastPushedDurationRef = useRef(-1);

    const { player, firstFrameReady, handleFirstFrameRender } =
      useInstantFeedVideoPlayer({
        source: videoUrl,
        loop: true,
        timeUpdateEventInterval: 0.25,
      });

    playerRef.current = player;

    useVideoPlaybackControl({
      videoKey,
      videoRef: playerRef,
      playbackReady: firstFrameReady,
    });

    const didApplyResumeRef = useRef(false);
    useEffect(() => {
      didApplyResumeRef.current = false;
    }, [contentId]);

    // Continuity from feed: seek once when this reel becomes ready/active.
    useEffect(() => {
      if (!player || !isActive || !firstFrameReady || didApplyResumeRef.current) {
        return;
      }
      const resume = useReelsStore.getState().resumePlayback;
      if (
        !resume ||
        resume.target !== "reels" ||
        String(resume.contentId) !== String(contentId) ||
        !(resume.positionMs > 400)
      ) {
        return;
      }
      didApplyResumeRef.current = true;
      void seekPlayerToMs(player, resume.positionMs).then((ok) => {
        if (ok) {
          setLocalPosition(resume.positionMs);
          setVideoPosition(resume.positionMs);
        }
      });
    }, [
      player,
      isActive,
      firstFrameReady,
      contentId,
      setLocalPosition,
      setVideoPosition,
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
      };
    }, [player, videoKey, videoRefs]);

    useEffect(() => {
      if (!player) return;

      const applyAudibleState = () => {
        try {
          if (isActive && isPlaying) {
            player.muted = isMuted;
            player.volume = isMuted ? 0 : videoVolume;
            if (!player.playing) player.play();
            return;
          }
          if (!isActive) {
            player.muted = true;
            player.volume = 0;
            if (player.playing) player.pause();
          }
        } catch {
          // no-op
        }
      };

      applyAudibleState();
      // expo-video can re-apply the muted prime after play(); push volume again.
      const frame = requestAnimationFrame(applyAudibleState);
      return () => cancelAnimationFrame(frame);
    }, [player, isActive, isPlaying, isMuted, videoVolume]);

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
        hapticRef.current();
        try {
          player.currentTime = 0;
          if (isActiveRef.current && isPlayingRef.current) player.play();
        } catch {
          // no-op
        }
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

    if (!player) {
      return <View style={styles.host} />;
    }

    return (
      <View style={styles.host}>
        <VideoView
          player={player}
          style={[styles.video, { zIndex: isActive ? 1 : 0 }]}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture={false}
          useExoShutter={false}
          onFirstFrameRender={handleFirstFrameRender}
        />

        {isActive && !isPlaying && (
          <View style={styles.overlay}>
            <TouchableOpacity onPress={onToggleVideoPlay} activeOpacity={0.8}>
              <MaterialIcons
                name="play-arrow"
                size={getResponsiveSize(50, 60, 70)}
                color="rgba(255, 255, 255, 0.6)"
              />
            </TouchableOpacity>
          </View>
        )}

        {isActive && showPauseOverlay && isPlaying && (
          <View style={[styles.overlay, { zIndex: 30 }]} pointerEvents="none">
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
    prev.isActive === next.isActive &&
    prev.isMuted === next.isMuted &&
    prev.isPlaying === next.isPlaying &&
    prev.showPauseOverlay === next.showPauseOverlay &&
    prev.isDragging === next.isDragging
);

export default ReelsVideoPlayer;

const styles = StyleSheet.create({
  host: {
    width: "100%",
    height: "100%",
    position: "absolute",
    backgroundColor: "#000",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    zIndex: 10,
  },
});
