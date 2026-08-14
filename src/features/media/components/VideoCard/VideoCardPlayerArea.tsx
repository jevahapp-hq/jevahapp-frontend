import { Ionicons } from "@expo/vector-icons";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { ContentTypeBadge } from "../../../../shared/components/ContentTypeBadge";
import { MediaPlayButton } from "../../../../shared/components/MediaPlayButton";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import { VideoProgressBar } from "../../../../shared/components/VideoProgressBar";
import { useVideoPlaybackControl } from "../../../../shared/hooks/useVideoPlaybackControl";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon } from "../../../../shared/utils";
import { useCommentModal } from "@/app/context/CommentModalContext";
import { useGlobalVideoStore } from "@/app/store/useGlobalVideoStore";
import {
  FEED_VIDEO_PLAYER_HEIGHT,
  FeedVideoSurface,
  useInstantFeedVideoPlayer,
} from "../../video-feed";
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

/** Empty clipped slot — same size as a live player (stops FlashList overlap). */
function VideoPlayerSlot() {
  return (
    <View
      collapsable={false}
      style={{
        height: FEED_VIDEO_PLAYER_HEIGHT,
        width: "100%",
        overflow: "hidden",
        backgroundColor: "transparent",
      }}
    />
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

  if (isAudioSermon(video) || !videoUrl) {
    return <View style={{ height: 0 }} />;
  }

  if (!shouldRenderPlayer) {
    return <VideoPlayerSlot />;
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
  const { isVisible: commentsOpen } = useCommentModal();
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [, setVideoLoaded] = useState(false);
  const videoLoadedRef = useRef(false);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const storeRef = useRef<any>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const videoRef = useRef<VideoPlayer | null>(null);

  const {
    player,
    firstFrameReady,
    handleFirstFrameRender,
    freezeOnFirstFrame,
  } = useInstantFeedVideoPlayer({
    source: videoUrl,
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

  const {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
  } = useVideoCardPlayback({
    isAudioSermon: false,
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
  });

  const { seekToPercent } = useVideoCardSeek({
    isAudioSermon: false,
    videoRef,
    videoPositionMs,
    lastKnownDurationRef,
    backendDurationMs: (video as any).duration
      ? (video as any).duration * 1000
      : 0,
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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, [tapTimeoutRef]);

  const handleToggleMuteInternal = useCallback(() => {
    onToggleMute(key);
  }, [onToggleMute, key]);

  if (failedVideoLoad || !player) {
    return <VideoPlayerSlot />;
  }

  const showChrome = firstFrameReady;

  return (
    <TouchableWithoutFeedback onPress={handleVideoTap}>
      <View
        className="w-full relative"
        collapsable={false}
        style={{
          height: FEED_VIDEO_PLAYER_HEIGHT,
          backgroundColor: "transparent",
          overflow: "hidden",
          opacity: firstFrameReady ? 1 : 0,
        }}
      >
        <FeedVideoSurface
          player={player}
          visible={firstFrameReady}
          onFirstFrameRender={handleFirstFrameRender}
        />

        {showChrome && !commentsOpen &&
          video.moderationStatus &&
          video.moderationStatus !== "approved" && (
            <View style={{ position: "absolute", top: 50, left: 12, zIndex: 11 }}>
              <ModerationBadge status={video.moderationStatus} />
            </View>
          )}

        {showChrome && !commentsOpen && (
          <ContentTypeBadge
            contentType={video.contentType || "video"}
            position="top-left"
            size="medium"
          />
        )}

        {showChrome && !commentsOpen && (
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

        {showChrome && !commentsOpen && (
          <MediaPlayButton
            isPlaying={isPlaying}
            onPress={() => handleTogglePlay(setIsPlayTogglePending)}
            showOverlay={showOverlay}
            size="medium"
            disabled={isPlayTogglePending}
          />
        )}

        {showChrome && !commentsOpen && (
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
                fontFamily: "Rubik_600SemiBold",
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

        {showChrome && !commentsOpen && (
          <VideoProgressBar
            progress={Math.max(0, Math.min(1, videoProgress || 0))}
            isMuted={isMuted}
            onToggleMute={handleToggleMuteInternal}
            onSeekToPercent={seekToPercent}
            mutePosition="right"
            bottomOffset={24}
            currentMs={videoPositionMs}
            durationMs={
              videoDurationMs ||
              lastKnownDurationRef.current ||
              (video as any).duration * 1000 ||
              0
            }
            showControls={true}
            showFloatingLabel={true}
            enlargeOnDrag={true}
            knobSize={8}
            knobSizeDragging={10}
            trackHeights={{ normal: 4, dragging: 8 }}
            seekSyncTicks={4}
            seekMsTolerance={200}
            minProgressEpsilon={0.005}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
