import { Ionicons } from "@expo/vector-icons";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { FeedMediaTypeOverlay } from "../../../../shared/components/FeedMediaTypeOverlay";
import { MediaPlayButton } from "../../../../shared/components/MediaPlayButton";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import { VideoProgressBar } from "../../../../shared/components/VideoProgressBar";
import { useVideoPlaybackControl } from "../../../../shared/hooks/useVideoPlaybackControl";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon } from "../../../../shared/utils";
import { useCommentModal } from "@/app/context/CommentModalContext";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import {
  FEED_VIDEO_PLAYER_HEIGHT,
  FeedVideoPoster,
  FeedVideoSurface,
  useInstantFeedVideoPlayer,
} from "../../video-feed";
import { normalizeDurationMs } from "../../../../shared/media/normalizeDurationMs";
import { getCachedDurationMs } from "./player/durationCache";
import { getPlayerDurationMs } from "./player/expoVideoAdapter";
import { useHealMissingDuration } from "./hooks/useHealMissingDuration";
import { useVideoCardPlayback } from "./hooks/useVideoCardPlayback";
import { useVideoCardSeek } from "./hooks/useVideoCardSeek";
import { useVideoCardTapLogic } from "./hooks/useVideoCardTapLogic";

export interface VideoCardPlayerAreaProps {
  video: MediaItem;
  contentKey: string;
  index: number;
  isActive: boolean;
  videoUrl: string | null;
  videoVolume: number;
  isMuted: boolean;
  onVideoTap: (key: string, video: MediaItem, index: number) => void;
  onTogglePlay: (key: string) => void;
  onToggleMute: (key: string) => void;
  getContentKey: (video: MediaItem) => string;
  onForceActive: () => void;
  onDelete?: (item: MediaItem) => void;
  onModalToggle: (val: string | null) => void;
  modalVisible: string | null;
  checkIfDownloaded: (id: string) => boolean;
  getTimeAgo: (createdAt: string) => string;
  getUserDisplayNameFromContent: (item: MediaItem) => string;
  getUserAvatarFromContent: (item: MediaItem) => any;
  onLayout?: (
    event: any,
    key: string,
    type: "video" | "music",
    uri?: string
  ) => void;
  /**
   * When true, allocate a decoder and pre-buffer frame 1 off-screen.
   */
  shouldRenderPlayer?: boolean;
  /** Hidden category panes must never output audio. */
  isFeedActive?: boolean;
  /** Fires when the first decoded frame is ready (Instagram-style reveal). */
  onSurfaceReadyChange?: (ready: boolean) => void;
}

/** Same size as a live player, with a poster so the row is never a white hole. */
function VideoPlayerSlot({ video }: { video?: MediaItem }) {
  return (
    <View
      collapsable={false}
      style={{
        height: FEED_VIDEO_PLAYER_HEIGHT,
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#121212",
      }}
    >
      <FeedVideoPoster item={video} />
    </View>
  );
}

/**
 * Video rows ALWAYS keep a stable height (mounted or not). Height 0↔400
 * was stacking FlashList cells on top of each other with a flash.
 * Frames fade in via opacity — never by collapsing layout.
 */
export function VideoCardPlayerArea(props: VideoCardPlayerAreaProps) {
  const {
    video,
    contentKey,
    videoUrl,
    shouldRenderPlayer = false,
    onSurfaceReadyChange,
  } = props;

  useEffect(() => {
    if (!shouldRenderPlayer || !videoUrl || isAudioSermon(video)) {
      onSurfaceReadyChange?.(false);
    }
  }, [shouldRenderPlayer, videoUrl, video, onSurfaceReadyChange]);

  if (isAudioSermon(video)) {
    return <View style={{ height: 0 }} />;
  }

  if (!shouldRenderPlayer || !videoUrl) {
    return <VideoPlayerSlot video={video} />;
  }

  return (
    <VideoCardPlayerInner
      key={contentKey}
      {...props}
      videoUrl={videoUrl}
    />
  );
}

function VideoCardPlayerInner(
  props: VideoCardPlayerAreaProps & { videoUrl: string }
) {
  const {
    video,
    contentKey: key,
    index,
    videoUrl,
    videoVolume,
    isMuted,
    onVideoTap,
    onTogglePlay,
    onToggleMute,
    getContentKey,
    isFeedActive = true,
    onSurfaceReadyChange,
  } = props;

  const contentId = video._id || getContentKey(video);
  const { isVisible: commentsOpen, isClosing } = useCommentModal();
  const hideChrome = commentsOpen || isClosing;
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [, setVideoLoaded] = useState(false);
  const videoLoadedRef = useRef(false);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const storeRef = useRef<any>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  /**
   * Declared here, above every hook that reads `isMountedRef`, because React
   * runs all cleanups in declaration order and then all setups in declaration
   * order. When this lived below `useVideoCardPlayback`, a remount ran this
   * cleanup (ref -> false) before that hook's setup, so the hook saw a false
   * ref and skipped attaching its listeners for good.
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const videoRef = useRef<VideoPlayer | null>(null);

  const {
    player,
    firstFrameReady,
    handleFirstFrameRender,
    freezeOnFirstFrame,
  } = useInstantFeedVideoPlayer({
    source: videoUrl,
    timeUpdateEventInterval: 0.25,
  });

  useEffect(() => {
    onSurfaceReadyChange?.(firstFrameReady);
    return () => onSurfaceReadyChange?.(false);
  }, [firstFrameReady, onSurfaceReadyChange]);

  videoRef.current = player;

  const {
    isPlaying,
    toggle: togglePlayback,
    shouldPlayThisVideo,
  } = useVideoPlaybackControl({
    videoKey: key,
    videoRef,
    enableAutoPlay: false,
    playbackReady: firstFrameReady,
  });

  useEffect(() => {
    if (!player || isFeedActive) return;
    try {
      player.muted = true;
      player.volume = 0;
      player.pause();
    } catch {
      // no-op
    }
  }, [player, isFeedActive]);

  useEffect(() => {
    if (!player || !firstFrameReady) return;

    const audiblyActive = isFeedActive && shouldPlayThisVideo;

    if (audiblyActive) {
      player.muted = isMuted;
      player.volume = isMuted ? 0 : videoVolume;
      if (!player.playing) player.play();
      setShowOverlay(false);
    } else {
      // Neighbors, hidden tabs, and primed cards stay silent — no echo.
      player.muted = true;
      player.volume = 0;
      if (player.playing) player.pause();
      // Hold the watching video's frame (comments peek + user pause).
      // Only rewind off-screen neighbors back to the poster frame.
      const store = useGlobalVideoStore.getState();
      const isWatching =
        commentsOpen || key === store.currentlyVisibleVideo || key === store.currentlyPlayingVideo;
      if (!isWatching) freezeOnFirstFrame();
    }
  }, [
    shouldPlayThisVideo,
    isFeedActive,
    firstFrameReady,
    player,
    isMuted,
    videoVolume,
    freezeOnFirstFrame,
    commentsOpen,
  ]);

  const showOverlayTemporarily = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    overlayTimeoutRef.current = setTimeout(() => setShowOverlay(false), 3000);
  }, []);

  const showOverlayPermanently = useCallback(() => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    setShowOverlay(true);
  }, []);

  const hideOverlay = useCallback(() => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
    setShowOverlay(false);
  }, []);

  useEffect(() => {
    if (!firstFrameReady) return;
    if (!isPlaying) showOverlayPermanently();
    else showOverlayTemporarily();
  }, [isPlaying, firstFrameReady, showOverlayPermanently, showOverlayTemporarily]);

  useEffect(() => {
    if (shouldPlayThisVideo && firstFrameReady) {
      setShowOverlay(false);
    }
  }, [shouldPlayThisVideo, firstFrameReady]);

  useEffect(() => {
    if (!player) return;
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error" || error) {
        setFailedVideoLoad(true);
      }
    });
    return () => sub.remove();
  }, [player]);

  const handleVideoError = useCallback((error: unknown) => {
    setFailedVideoLoad(true);
    if (__DEV__) {
      console.warn("[VideoCardPlayerArea] playback error", error);
    }
  }, []);

  /**
   * Best duration we know before the player loads. The upload flow probes the
   * file locally and calls `seedDurationCache`; we also heal from media detail
   * when the feed item is missing a length (fresh Most Recent uploads).
   */
  const healedDurationMs = useHealMissingDuration({
    mediaId: contentId,
    durationSec: (video as any)?.duration,
    processingStatus: (video as any)?.processingStatus,
  });

  const knownDurationMs = useMemo(
    () =>
      getCachedDurationMs(contentId) ||
      healedDurationMs ||
      normalizeDurationMs((video as any)?.duration),
    [contentId, healedDurationMs, (video as any)?.duration]
  );

  const {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
  } = useVideoCardPlayback({
    isAudioSermon: false,
    contentId,
    player,
    initialDurationMs: knownDurationMs,
    handleVideoError,
    setFailedVideoLoad,
    setVideoLoaded,
    videoLoadedRef,
    hasTrackedView,
    setHasTrackedView,
    storeRef,
    isMountedRef,
  });

  /**
   * Reels-style local playhead: the player writes here every tick, and seek
   * updates it immediately so the timer doesn't wait on the next event.
   *
   * Do not depend on `isDragging` — lifting the finger would copy a stale
   * parent position over the optimistic seek we just applied.
   */
  useEffect(() => {
    if (isDragging) return;
    if (Math.abs(localPosition - videoPositionMs) < 80) return;
    setLocalPosition(videoPositionMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPositionMs]);

  useEffect(() => {
    const next = videoDurationMs > 0 ? videoDurationMs : knownDurationMs;
    if (!(next > 0) || Math.abs(next - localDuration) < 40) return;
    setLocalDuration(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoDurationMs, knownDurationMs]);

  const { seekToPercent } = useVideoCardSeek({
    isAudioSermon: false,
    videoRef,
    videoPositionMs,
    lastKnownDurationRef,
    backendDurationMs: knownDurationMs,
  });

  const { handleVideoTap, handleTogglePlay, tapTimeoutRef } =
    useVideoCardTapLogic({
      key,
      video,
      index,
      isPlaying,
      isAudioSermon: false,
      audioIsPlaying: false,
      onTogglePlay,
      onVideoTap,
      audioControlsPause: () => {},
      togglePlayback,
      videoRef,
      showOverlayPermanently,
      hideOverlay,
    });

  useEffect(() => {
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, [tapTimeoutRef]);

  const handleToggleMuteInternal = useCallback(() => {
    onToggleMute(key);
  }, [onToggleMute, key]);

  if (failedVideoLoad || !player) {
    return <VideoPlayerSlot video={video} />;
  }

  const showChrome = firstFrameReady;

  return (
    <View
      className="w-full relative"
      collapsable={false}
      style={{
        height: FEED_VIDEO_PLAYER_HEIGHT,
        backgroundColor: "#121212",
        overflow: "hidden",
      }}
    >
      <TouchableWithoutFeedback onPress={handleVideoTap}>
        <View style={{ flex: 1 }}>
          <FeedVideoPoster item={video} />
          <View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              opacity: firstFrameReady ? 1 : 0,
            }}
          >
            <FeedVideoSurface
              player={player}
              visible={firstFrameReady}
              onFirstFrameRender={handleFirstFrameRender}
            />
          </View>

          {showChrome && !hideChrome &&
            video.moderationStatus &&
            video.moderationStatus !== "approved" && (
              <View style={{ position: "absolute", top: 50, left: 12, zIndex: 11 }}>
                <ModerationBadge status={video.moderationStatus} />
              </View>
            )}

          {showChrome && !hideChrome && (
            <FeedMediaTypeOverlay
              item={video}
              contentType={video.contentType || "video"}
              showCenter={false}
            />
          )}

          {showChrome && !hideChrome && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onVideoTap(key, video, index)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {showChrome && !hideChrome && (
            <MediaPlayButton
              isPlaying={isPlaying}
              onPress={() => handleTogglePlay(setIsPlayTogglePending)}
              showOverlay={showOverlay}
              size="medium"
              disabled={isPlayTogglePending}
            />
          )}

          {showChrome && !hideChrome && (
            <View
              style={{
                position: "absolute",
                bottom: 64,
                left: 12,
                right: 12,
                paddingHorizontal: 10,
                paddingVertical: 6,
                pointerEvents: "none",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#FFFFFF",
                  lineHeight: 16,
                  textShadowColor: "rgba(0, 0, 0, 0.75)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 3,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {video.title}
              </Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>

      {showChrome && !hideChrome ? (
        <VideoProgressBar
          progress={
            localDuration > 0
              ? localPosition / localDuration
              : Math.max(0, Math.min(1, videoProgress || 0))
          }
          currentMs={localPosition}
          durationMs={
            localDuration > 0
              ? localDuration
              : videoDurationMs || lastKnownDurationRef.current || knownDurationMs
          }
          isMuted={isMuted}
          onToggleMute={handleToggleMuteInternal}
          onSeekToPercent={(pct: number) => {
            const clamped = Math.max(0, Math.min(1, pct));
            const dur =
              localDuration > 0
                ? localDuration
                : videoDurationMs > 0
                  ? videoDurationMs
                  : knownDurationMs > 0
                    ? knownDurationMs
                    : getPlayerDurationMs(videoRef.current, 0);
            if (dur > 0) {
              setLocalPosition(clamped * dur);
              if (!(lastKnownDurationRef.current > 0)) {
                lastKnownDurationRef.current = dur;
              }
            }
            seekToPercent(clamped);
          }}
          onScrubStart={() => setIsDragging(true)}
          onScrubEnd={() => setIsDragging(false)}
          showControls
          bottomOffset={24}
          enlargeOnDrag
          knobSize={10}
          knobSizeDragging={14}
          trackHeights={{ normal: 3, dragging: 8 }}
          seekDuringDrag
          liveSeekThrottleMs={32}
          enableHaptics
          verticalScrub={{ enabled: true, sensitivityBase: 60, maxSlowdown: 5 }}
          style={{ zIndex: 200, elevation: 200 }}
        />
      ) : null}
    </View>
  );
}
