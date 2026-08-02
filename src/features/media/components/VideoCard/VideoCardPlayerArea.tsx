import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useGlobalVideoStore } from "../../../../../app/store/useGlobalVideoStore";
import { ContentTypeBadge } from "../../../../shared/components/ContentTypeBadge";
import { MediaPlayButton } from "../../../../shared/components/MediaPlayButton";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import { VideoProgressBar } from "../../../../shared/components/VideoProgressBar";
import { useVideoPlaybackControl } from "../../../../shared/hooks/useVideoPlaybackControl";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon } from "../../../../shared/utils";
import { getVideoUrlCandidates } from "../../../../shared/utils/videoUrlManager";
import {
  FEED_VIDEO_PLAYER_HEIGHT,
  FeedVideoSurface,
  useInstantFeedVideoPlayer,
} from "../../video-feed";
import { useVideoFrameSnapshot } from "../../video-feed/videoFrameSnapshotCache";
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
  /** Most Recent hero — no priming play overlay; prioritize first paint. */
  isHero?: boolean;
  /** Hidden category panes must never output audio. */
  isFeedActive?: boolean;
  /**
   * True while this video is still the feed's viewport video. Decides
   * what "not playing" means: paused in view (user tapped — hold the
   * position so play resumes from there) vs. left the viewport (park
   * back at frame 0 so the next view starts from the beginning).
   */
  isViewportVisible?: boolean;
  /** Fires when the first decoded frame is ready (Instagram-style reveal). */
  onSurfaceReadyChange?: (ready: boolean) => void;
}

/**
 * Clipped slot — same size as a live player (stops FlashList overlap)
 * for cells outside the decoder mount window. No thumbnails/spinners:
 * only the video's own ~0.02s frame (if already captured), same path as
 * All Content / Power of Faith.
 */
function VideoPlayerSlot({ videoUrl }: { videoUrl?: string | null }) {
  const frameSnapshot = useVideoFrameSnapshot(videoUrl ?? null);
  return (
    <View
      collapsable={false}
      style={{
        height: FEED_VIDEO_PLAYER_HEIGHT,
        width: "100%",
        overflow: "hidden",
        backgroundColor: "#000000",
      }}
    >
      {frameSnapshot ? (
        <Image
          source={frameSnapshot}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
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
    videoUrl,
    shouldRenderPlayer = false,
    isHero = false,
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
    return <VideoPlayerSlot videoUrl={videoUrl} />;
  }

  // No `key={contentKey}` here on purpose: this cell gets recycled to a new
  // video constantly while scrolling. Keying by content forced a full
  // unmount/remount (brand-new decoder, thumbnail refetch, firstFrameReady
  // reset from scratch) on every recycle, which is exactly what
  // useInstantFeedVideoPlayer's recycle path was built to avoid.
  return (
    <VideoCardPlayerInner {...props} videoUrl={videoUrl} isHero={isHero} />
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
    isViewportVisible = false,
    isHero = false,
    onSurfaceReadyChange,
  } = props;

  const contentId = video._id || getContentKey(video);
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [, setVideoLoaded] = useState(false);
  const videoLoadedRef = useRef(false);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const storeRef = useRef<any>(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const playVideoGlobally = useGlobalVideoStore((s) => s.playVideoGlobally);
  const didResumeAfterRevealRef = useRef(false);

  const videoRef = useRef<VideoPlayer | null>(null);

  const alternateSources = getVideoUrlCandidates(video).filter(
    (u) => u !== videoUrl
  );

  const {
    player,
    firstFrameReady,
    loadTimedOut,
    handleFirstFrameRender,
    freezeOnFirstFrame,
    retryLoad,
    kickMutedPlay,
  } = useInstantFeedVideoPlayer({
    source: videoUrl,
    alternateSources,
    enablePreroll: isFeedActive,
    isHero,
  });

  // Video's own ~0.02s frame only — never API thumbnails/posters.
  const frameSnapshot = useVideoFrameSnapshot(videoUrl);

  useEffect(() => {
    setFailedVideoLoad(false);
    didResumeAfterRevealRef.current = false;
  }, [videoUrl]);

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

    // Hero cells: once decoded, always try to play when the feed is active —
    // don't require a second viewability pass (that race left Most Recent
    // stuck on a static frame looking like an audio cover).
    const shouldBeAudible =
      isFeedActive && (isViewportVisible || (isHero && isFeedActive));

    if (shouldBeAudible) {
      // First reveal: restore store "playing" if priming dropped it, then
      // start audible playback. Later runs honor the user's pause.
      if (!didResumeAfterRevealRef.current) {
        didResumeAfterRevealRef.current = true;
        if (!shouldPlayThisVideo) {
          playVideoGlobally(key);
        }
        player.muted = isMuted;
        player.volume = isMuted ? 0 : videoVolume;
        if (!player.playing) player.play();
        setShowOverlay(false);
        return;
      }

      if (shouldPlayThisVideo) {
        player.muted = isMuted;
        player.volume = isMuted ? 0 : videoVolume;
        if (!player.playing) player.play();
        setShowOverlay(false);
      } else {
        // Manual pause while still in view — hold position (no rewind).
        player.muted = true;
        player.volume = 0;
        if (player.playing) player.pause();
      }
      return;
    }

    // Neighbors, hidden tabs, primed cards, and videos scrolled out of
    // view: silence + park back at frame 0 so the next view starts clean.
    // Never freeze the hero while its feed is active (viewport race).
    if (isHero && isFeedActive) return;

    didResumeAfterRevealRef.current = false;
    player.muted = true;
    player.volume = 0;
    if (player.playing) player.pause();
    freezeOnFirstFrame();
  }, [
    shouldPlayThisVideo,
    isFeedActive,
    isViewportVisible,
    firstFrameReady,
    player,
    isMuted,
    videoVolume,
    freezeOnFirstFrame,
    playVideoGlobally,
    key,
    isHero,
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

  // While decoding, never route through togglePlay — cold-start often marks
  // the video "playing" already, so a tap would pause and kill pre-roll.
  const forcePlayWhilePriming = useCallback(
    (k: string) => {
      if (!firstFrameReady) {
        playVideoGlobally(k);
        kickMutedPlay();
        return;
      }
      onTogglePlay(k);
    },
    [firstFrameReady, playVideoGlobally, kickMutedPlay, onTogglePlay]
  );

  const { handleVideoTap, handleTogglePlay, tapTimeoutRef } =
    useVideoCardTapLogic({
      key,
      video,
      index,
      isPlaying,
      isAudioSermon: false,
      audioIsPlaying: false,
      onTogglePlay: forcePlayWhilePriming,
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

  const handleRetry = useCallback(() => {
    setFailedVideoLoad(false);
    retryLoad();
  }, [retryLoad]);

  const handlePlayPress = useCallback(
    (setPending: (v: boolean) => void) => {
      if (!firstFrameReady) {
        setPending(true);
        forcePlayWhilePriming(key);
        setTimeout(() => setPending(false), 50);
        return;
      }
      handleTogglePlay(setPending);
    },
    [firstFrameReady, forcePlayWhilePriming, key, handleTogglePlay]
  );

  if (!player) {
    return <VideoPlayerSlot videoUrl={videoUrl} />;
  }

  const showLoadError = failedVideoLoad || loadTimedOut;

  // Snapshot as static bg until live video paints. No spinner / API thumbnail.
  const showPlayChrome = !showLoadError;
  const showFullChrome = firstFrameReady && !showLoadError;

  return (
    <TouchableWithoutFeedback onPress={showLoadError ? undefined : handleVideoTap}>
      <View
        className="w-full relative"
        collapsable={false}
        style={{
          height: FEED_VIDEO_PLAYER_HEIGHT,
          overflow: "hidden",
          backgroundColor: "#000000",
        }}
      >
        {/* Underlay: video's own ~0.02s frame (scroll-back / brief gap). */}
        {frameSnapshot ? (
          <Image
            source={frameSnapshot}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        {/* Always show live surface so iOS can paint + Most Recent can unmute. */}
        <FeedVideoSurface
          player={player}
          visible
          onFirstFrameRender={handleFirstFrameRender}
        />

        {showLoadError && (
          <View
            pointerEvents="auto"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.55)" },
            ]}
          >
            {frameSnapshot ? (
              <Image
                source={frameSnapshot}
                contentFit="cover"
                style={[StyleSheet.absoluteFill, { opacity: 0.35 }]}
              />
            ) : null}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleRetry}
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="refresh-circle"
                size={56}
                color="rgba(255,255,255,0.92)"
              />
              <Text
                style={{
                  marginTop: 10,
                  color: "#FFFFFF",
                  fontFamily: "Rubik_500Medium",
                  fontSize: 13,
                }}
              >
                Tap to retry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showFullChrome &&
          video.moderationStatus &&
          video.moderationStatus !== "approved" && (
            <View style={{ position: "absolute", top: 50, left: 12, zIndex: 11 }}>
              <ModerationBadge status={video.moderationStatus} />
            </View>
          )}

        {showFullChrome && (
          <ContentTypeBadge
            contentType={video.contentType || "video"}
            position="top-left"
            size="medium"
          />
        )}

        {showFullChrome && (
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

        {/* Hero: never show a center control while priming — it reads as a
            logo/spinner on black or static artwork. Other cells keep the
            priming overlay so users know the cell is interactive. */}
        {showPlayChrome && (firstFrameReady || !isHero) && (
          <MediaPlayButton
            isPlaying={firstFrameReady ? isPlaying : false}
            onPress={() => handlePlayPress(setIsPlayTogglePending)}
            showOverlay={
              isHero
                ? showOverlay && firstFrameReady
                : showOverlay || !firstFrameReady
            }
            size="medium"
            disabled={isPlayTogglePending}
          />
        )}

        {showFullChrome && (
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

        {showFullChrome && (
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
