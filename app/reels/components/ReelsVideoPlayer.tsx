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
  localDuration: number;
  videoPosition: number;
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
    localDuration,
    videoPosition,
    globalVideoStore,
    showPauseOverlay,
    getResponsiveSize,
    triggerHapticFeedback,
  }: ReelsVideoPlayerProps) => {
    const lastUpdateRef = useRef(0);
    const hasTrackedViewRef = useRef(false);
    const playerRef = useRef<VideoPlayer | null>(null);

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
      if (!player || !firstFrameReady) return;

      if (isActive && isPlaying) {
        player.muted = isMuted;
        player.volume = isMuted ? 0 : videoVolume;
        if (!player.playing) player.play();
      } else {
        player.muted = true;
        player.volume = 0;
        if (player.playing) player.pause();
      }
    }, [
      player,
      firstFrameReady,
      isActive,
      isPlaying,
      isMuted,
      videoVolume,
    ]);

    useEffect(() => {
      if (!player) return;

      const applyDuration = (durationSec: number) => {
        if (!Number.isFinite(durationSec) || durationSec <= 0) return;
        const durationMs = Math.min(durationSec * 1000, 24 * 60 * 60 * 1000);
        setLocalDuration(durationMs);
        setVideoDuration(durationMs);
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
        if (!isActive) return;
        const durationSec = Number(player.duration) || 0;
        const positionMs = Math.max(0, (currentTime || 0) * 1000);
        const durationMs = durationSec * 1000;

        if (!isDragging) {
          setLocalPosition(positionMs);
        }

        const now = Date.now();
        if (now - lastUpdateRef.current > 400) {
          lastUpdateRef.current = now;
          if (durationMs > 0 && (localDuration === 0 || localDuration !== durationMs)) {
            setVideoDuration(durationMs);
          }
          if (!isDragging && Math.abs(positionMs - videoPosition) > 1000) {
            setVideoPosition(positionMs);
          }
          const pct = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
          globalVideoStore.setVideoProgress(videoKey, pct);
        }

        if (
          isActive &&
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
        triggerHapticFeedback();
        try {
          player.currentTime = 0;
          if (isActive && isPlaying) player.play();
        } catch {
          // no-op
        }
      });

      return () => {
        statusSub.remove();
        timeSub.remove();
        endSub.remove();
      };
    }, [
      player,
      isActive,
      isPlaying,
      isDragging,
      localDuration,
      videoPosition,
      videoKey,
      videoUrl,
      contentId,
      globalVideoStore,
      setLocalDuration,
      setLocalPosition,
      setVideoDuration,
      setVideoPosition,
      triggerHapticFeedback,
    ]);

    if (!player) {
      return <View style={styles.host} />;
    }

    return (
      <View style={styles.host}>
        <VideoView
          player={player}
          style={[styles.video, { zIndex: isActive ? 1 : 0 }]}
          contentFit="cover"
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
