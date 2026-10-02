/**
 * Reels video surface — expo-video + the same global session as the home feed.
 * Cards are views; play/pause/mute go through useGlobalVideoStore.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { VideoPlayer } from "expo-video";
import { MutableRefObject, memo, useEffect, useRef, useSyncExternalStore } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useVideoPlaybackControl } from "../../../src/shared/hooks/useVideoPlaybackControl";
import { handleVideoError, isRetryableVideoSourceError } from "../../../src/shared/utils/videoUrlManager";
import {
  DarkSnapshotFill,
  FeedVideoSurface,
  useInstantFeedVideoPlayer,
} from "../../../src/features/media/video-feed";
import { setCachedDurationMs } from "../../../src/features/media/components/VideoCard/player/durationCache";
import { useFeedVideoAspect, peekFeedVideoAspect } from "../../../src/features/media/video-feed/useFeedVideoAspect";
import { useVideoFrameSnapshot } from "../../../src/features/media/video-feed/videoFrameSnapshotCache";
import { reelDisplayFrame, reelFrameNeedsBackdrop } from "../reelFrame";
import contentInteractionAPI from "../../utils/contentInteractionAPI";
import { qualifiesPlaybackView } from "../../utils/contentInteraction/viewQualification";
import { androidReelMayHear, getAudibleReel, subscribeAudibleReel } from "../reelAudible";

interface ReelsVideoPlayerProps {
  videoKey: string;
  contentId: string;
  videoUrl: string;
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
    const audibleKey = useSyncExternalStore(
      subscribeAudibleReel,
      getAudibleReel,
      getAudibleReel
    );
    const shouldHearRef = useRef(false);
    shouldHearRef.current =
      isActive &&
      isPlaying &&
      (audibleKey == null
        ? androidReelMayHear(videoKey)
        : audibleKey === videoKey);

    const {
      player,
      firstFrameReady,
      nativeFirstFrame,
      handleFirstFrameRender,
    } = useInstantFeedVideoPlayer({
      source: videoUrl,
      loop: true,
      // Seek to the feed playhead before the first paint. Seeking after
      // the frame is visible clears the surface and leaves Reels black.
      restorePlayhead: true,
      timeUpdateEventInterval: 0.25,
      // Only the page on screen may decode. A neighbor that keeps play()
      // running holds ExoPlayer, so the visible reel stays on a frozen frame.
      mutedPrime: isActive,
    });

    playerRef.current = player;
    const measuredAspect = useFeedVideoAspect(player, videoUrl);
    const fitted = reelDisplayFrame(
      measuredAspect ?? peekFeedVideoAspect(videoUrl),
      screenWidth,
      screenHeight
    );
    const showSnapshotBands = reelFrameNeedsBackdrop(
      fitted,
      screenWidth,
      screenHeight
    );
    const heldFrame = useVideoFrameSnapshot(videoUrl);
    const snapshotUri = videoUrl.includes("/upload/")
      ? `${videoUrl.replace("/upload/", "/upload/so_1/")}.jpg`
      : null;
    const frameTop = Math.max(0, Math.round((screenHeight - fitted.height) / 2));
    const frameLeft = Math.max(0, Math.round((screenWidth - fitted.width) / 2));
    useVideoPlaybackControl({
      videoKey,
      videoRef: playerRef,
      playbackReady: firstFrameReady,
      syncPlayback: false,
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
      if (!player) return;

      const applyAudibleState = () => {
        try {
          const shouldHear =
            isActive &&
            isPlaying &&
            (audibleKey == null
              ? androidReelMayHear(videoKey)
              : audibleKey === videoKey);
          if (!shouldHear) {
            // Mute does not release ExoPlayer's audio track. A reel that is
            // no longer the one on screen, or that was tapped to pause, has
            // to stop or the next page never gets the decoder.
            player.muted = true;
            player.volume = 0;
            if (player.playing) player.pause();
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
          // ExoPlayer often ignores play() while the reel you left is still
          // stopping. One more attempt on the next frame starts this page.
          requestAnimationFrame(() => {
            if (!shouldHearRef.current) return;
            try {
              if (!player.playing) player.play();
            } catch {
              // Released native player.
            }
          });
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
      videoKey,
      audibleKey,
    ]);

    useEffect(() => {
      if (!player) return;
      let sub: { remove: () => void } | undefined;
      try {
        sub = player.addListener("playingChange", ({ isPlaying: nativePlaying }) => {
          if (nativePlaying) {
            if (shouldHearRef.current) return;
            try {
              player.muted = true;
              player.volume = 0;
              player.pause();
            } catch {
              // Released native player.
            }
            return;
          }
          // Android releases the surface when the title and buttons attach,
          // and ExoPlayer pauses. The reel on screen keeps playing on iPhone.
          if (!shouldHearRef.current) return;
          requestAnimationFrame(() => {
            if (!shouldHearRef.current) return;
            const audible = getAudibleReel();
            if (audible && audible !== videoKey) return;
            try {
              if (!player.playing) player.play();
            } catch {
              // Released native player.
            }
          });
        });
      } catch {
        return;
      }
      return () => {
        try {
          sub?.remove();
        } catch {
          // Released native player.
        }
      };
    }, [player]);

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

    const surfaceStyle = {
      width: screenWidth,
      height: screenHeight,
    };
    const iconSize = getResponsiveSize(50, 60, 70);
    const iconTop = Math.max(0, Math.round((screenHeight - iconSize) / 2));

    return (
      <View
        pointerEvents={Platform.OS === "android" ? "none" : "auto"}
        style={[styles.host, surfaceStyle]}
        collapsable={false}
      >
        {showSnapshotBands && (heldFrame || snapshotUri) ? (
          <DarkSnapshotFill
            source={heldFrame || { uri: snapshotUri as string }}
          />
        ) : null}
        <View
          pointerEvents="box-none"
          collapsable={false}
          style={{
            position: "absolute",
            top: frameTop,
            left: frameLeft,
            width: fitted.width,
            height: fitted.height,
            overflow: "hidden",
          }}
        >
            {player && fitted.width > 0 && fitted.height > 0 ? (
              <FeedVideoSurface
                inline
                useExoShutter={false}
                player={player}
                width={fitted.width}
                height={fitted.height}
                contentFit="cover"
                onFirstFrameRender={handleFirstFrameRender}
              />
            ) : null}
            {!nativeFirstFrame && (heldFrame || snapshotUri) ? (
              <Image
                source={heldFrame || { uri: snapshotUri as string }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy="memory-disk"
                pointerEvents="none"
              />
            ) : null}
        </View>

        {isActive && player && nativeFirstFrame && !isPlaying && (
          <View
            pointerEvents="none"
            style={[styles.overlay, { top: iconTop, height: iconSize }]}
          >
            <MaterialIcons
              name="play-arrow"
              size={iconSize}
              color="rgba(255, 255, 255, 0.6)"
            />
          </View>
        )}

        {isActive && player && showPauseOverlay && isPlaying && (
          <View
            pointerEvents="none"
            style={[styles.overlay, { top: iconTop, height: iconSize }]}
          >
            <MaterialIcons
              name="pause"
              size={iconSize}
              color="rgba(255, 255, 255, 0.6)"
            />
          </View>
        )}
      </View>
    );
  },
  (prev, next) =>
    prev.videoUrl === next.videoUrl &&
    prev.screenHeight === next.screenHeight &&
    prev.screenWidth === next.screenWidth &&
    prev.isActive === next.isActive &&
    prev.isMuted === next.isMuted &&
    prev.isPlaying === next.isPlaying &&
    prev.showPauseOverlay === next.showPauseOverlay &&
    prev.isDragging === next.isDragging
);

export default ReelsVideoPlayer;

const styles = StyleSheet.create({
  host: {
    backgroundColor: "transparent",
    position: "relative",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
    elevation: 30,
  },
});
