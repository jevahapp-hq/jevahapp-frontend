import { Ionicons } from "@expo/vector-icons";
import { type ImageSource } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FeedMediaTypeOverlay } from "../../../../shared/components/FeedMediaTypeOverlay";
import { MediaPlayButton } from "../../../../shared/components/MediaPlayButton";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import { VideoProgressBar } from "../../../../shared/components/VideoProgressBar";
import { useVideoPlaybackControl } from "../../../../shared/hooks/useVideoPlaybackControl";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon } from "../../../../shared/utils/mediaTypeDetection";
import { useCommentModal } from "@/app/context/CommentModalContext";
import {
  DarkSnapshotFill,
  FEED_VIDEO_PLAYER_HEIGHT,
  FeedVideoStill,
  FeedVideoSurface,
  posterUriFromMedia,
  useInstantFeedVideoPlayer,
} from "../../video-feed";
import { normalizeDurationMs } from "../../../../shared/media/normalizeDurationMs";
import { getCachedDurationMs } from "./player/durationCache";
import { getPlayerDurationMs } from "./player/expoVideoAdapter";
import { useHealMissingDuration } from "./hooks/useHealMissingDuration";
import { useVideoCardPlayback } from "./hooks/useVideoCardPlayback";
import { useVideoCardSeek } from "./hooks/useVideoCardSeek";
import { useVideoCardTapLogic } from "./hooks/useVideoCardTapLogic";
import { savePlayhead } from "../../video-feed/playheadCache";
import {
  readPlayerCurrentTimeSec,
  runWithLivePlayer,
} from "../../video-feed/safeVideoPlayer";
import { frameForFeedVideo } from "../../video-feed/frameForFeedVideo";
import {
  peekFeedVideoAspect,
  useFeedVideoAspect,
} from "../../video-feed/useFeedVideoAspect";
import {
  snapshotPlayerFrame,
  useVideoFrameSnapshot,
} from "../../video-feed/videoFrameSnapshotCache";
import { isRetryableVideoSourceError } from "../../../../shared/utils/videoUrlManager";

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

/** Parked card. Same 9:16 column as the live player, last frame if we have one. */
function VideoPlayerSlot({
  video,
  url,
}: {
  video?: MediaItem;
  url?: string | null;
}) {
  const boxW = Dimensions.get("window").width;
  const snapshot = useVideoFrameSnapshot(url ?? null);
  const posterUri = posterUriFromMedia(video);
  const sideSource: ImageSource | null = snapshot
    ? (snapshot as ImageSource)
    : posterUri
      ? { uri: posterUri }
      : null;
  const fitted = frameForFeedVideo(
    url ? peekFeedVideoAspect(url) : null,
    boxW
  );
  const nineSixteen = fitted.portrait;
  const pictureW = nineSixteen ? fitted.width : boxW;
  const side = nineSixteen
    ? Math.max(0, Math.round((boxW - pictureW) / 2))
    : 0;
  return (
    <View
      collapsable={false}
      style={{
        height: FEED_VIDEO_PLAYER_HEIGHT,
        width: "100%",
        backgroundColor: "#000",
      }}
    >
      {nineSixteen && sideSource ? (
        <DarkSnapshotFill source={sideSource} />
      ) : null}
      <View
        style={{
          height: FEED_VIDEO_PLAYER_HEIGHT,
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {side > 0 ? (
          <View style={{ width: side, height: FEED_VIDEO_PLAYER_HEIGHT }} />
        ) : null}
        <View style={{ width: pictureW, height: FEED_VIDEO_PLAYER_HEIGHT }}>
          <FeedVideoStill
            item={video}
            url={url}
            height={FEED_VIDEO_PLAYER_HEIGHT}
            contentFit="cover"
          />
        </View>
      </View>
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
    return (
      <Pressable
        onPress={() => props.onTogglePlay(contentKey)}
        android_disableSound
        accessibilityRole="button"
        accessibilityLabel="Play or pause video"
      >
        <VideoPlayerSlot video={video} url={videoUrl} />
      </Pressable>
    );
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
  const [showOverlay, setShowOverlay] = useState(false);
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
    nativeFirstFrame,
    handleFirstFrameRender,
    invalidateNativeFirstFrame,
  } = useInstantFeedVideoPlayer({
    source: videoUrl,
    loop: true,
    timeUpdateEventInterval: 0.25,
  });

  useEffect(() => {
    onSurfaceReadyChange?.(firstFrameReady);
    return () => onSurfaceReadyChange?.(false);
  }, [firstFrameReady, onSurfaceReadyChange]);

  videoRef.current = player;

  const measuredAspect = useFeedVideoAspect(player, videoUrl);
  const frameAspect = measuredAspect ?? peekFeedVideoAspect(videoUrl);
  const [boxW, setBoxW] = useState(() => Dimensions.get("window").width);
  const fitted =
    boxW > 0 ? frameForFeedVideo(frameAspect, boxW) : null;
  const nineSixteen = !!fitted?.portrait;
  const videoWidth = nineSixteen && fitted ? fitted.width : boxW;
  const sideGap =
    nineSixteen && fitted && boxW > fitted.width
      ? Math.max(0, Math.round((boxW - fitted.width) / 2))
      : 0;
  const frameSnapshot = useVideoFrameSnapshot(videoUrl);
  const posterUri = posterUriFromMedia(video);
  const sideSource: ImageSource | null = frameSnapshot
    ? (frameSnapshot as ImageSource)
    : posterUri
      ? { uri: posterUri }
      : null;

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
    runWithLivePlayer(player, (p) => {
      if (!p.muted) p.muted = true;
      if ((Number(p.volume) || 0) !== 0) p.volume = 0;
      if (p.playing) p.pause();
    });
  }, [player, isFeedActive]);

  useEffect(() => {
    if (!player) return;

    const audiblyActive = isFeedActive && shouldPlayThisVideo;

    if (!audiblyActive) {
      runWithLivePlayer(player, (p) => {
        if (!p.muted) p.muted = true;
        if ((Number(p.volume) || 0) !== 0) p.volume = 0;
        const t = readPlayerCurrentTimeSec(p);
        if (t > 0.15) savePlayhead(videoUrl, t);
        snapshotPlayerFrame(videoUrl, p, t > 0.15 ? t : undefined);
        if (p.playing) p.pause();
      });
      return;
    }

    if (!firstFrameReady) return;
    runWithLivePlayer(player, (p) => {
      const targetMuted = isMuted;
      const targetVol = isMuted ? 0 : videoVolume;
      if (p.muted !== targetMuted) p.muted = targetMuted;
      if (Math.abs((Number(p.volume) || 0) - targetVol) > 0.02) {
        p.volume = targetVol;
      }
      if (!p.playing) p.play();
    });
    setShowOverlay(false);
  }, [
    shouldPlayThisVideo,
    isFeedActive,
    firstFrameReady,
    player,
    isMuted,
    videoVolume,
    videoUrl,
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
    if (!isPlaying) showOverlayPermanently();
    else showOverlayTemporarily();
  }, [isPlaying, showOverlayPermanently, showOverlayTemporarily]);

  useEffect(() => {
    if (shouldPlayThisVideo && firstFrameReady) {
      setShowOverlay(false);
    }
  }, [shouldPlayThisVideo, firstFrameReady]);

  useEffect(() => {
    if (!player) return;
    try {
      const sub = player.addListener("statusChange", ({ status, error }) => {
        if (status === "error" || error) {
          if (isRetryableVideoSourceError(error)) return;
          setFailedVideoLoad(true);
        }
      });
      return () => {
        try {
          sub.remove();
        } catch {
          // no-op
        }
      };
    } catch {
      return;
    }
  }, [player]);

  const handleVideoError = useCallback((error: unknown) => {
    if (isRetryableVideoSourceError(error)) return;
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
    onResumeSeek: invalidateNativeFirstFrame,
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

  const openFullscreen = useCallback(() => {
    const t = readPlayerCurrentTimeSec(player);
    if (t > 0.15) savePlayhead(videoUrl, t);
    onVideoTap(key, video, index);
  }, [videoUrl, player, onVideoTap, key, video, index]);

  if (failedVideoLoad || !player) {
    return (
      <Pressable
        onPress={() => onTogglePlay(key)}
        android_disableSound
        accessibilityRole="button"
        accessibilityLabel="Play or pause video"
      >
        <VideoPlayerSlot video={video} url={videoUrl} />
      </Pressable>
    );
  }

  const showChrome = !hideChrome;

  return (
    <View
      className="w-full relative"
      collapsable={false}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0) {
          setBoxW((current) => (Math.abs(current - next) < 1 ? current : next));
        }
      }}
      style={{
        height: FEED_VIDEO_PLAYER_HEIGHT,
        width: "100%",
        backgroundColor: "#000",
      }}
    >
      {nineSixteen && sideSource ? (
        <DarkSnapshotFill source={sideSource} />
      ) : null}
      <View
        collapsable={false}
        pointerEvents="box-none"
        style={{
          width: "100%",
          height: FEED_VIDEO_PLAYER_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
          {sideGap > 0 ? (
            <View style={{ width: sideGap, height: FEED_VIDEO_PLAYER_HEIGHT }} />
          ) : null}
          <View
            collapsable={false}
            style={{
              width: videoWidth > 0 ? videoWidth : "100%",
              height: FEED_VIDEO_PLAYER_HEIGHT,
            }}
          >
            <FeedVideoSurface
              player={player}
              visible
              inline
              useExoShutter={false}
              width={videoWidth > 0 ? videoWidth : undefined}
              height={FEED_VIDEO_PLAYER_HEIGHT}
              contentFit="cover"
              onFirstFrameRender={handleFirstFrameRender}
            />
            {!nativeFirstFrame ? (
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <FeedVideoStill
                  item={video}
                  url={videoUrl}
                  height={FEED_VIDEO_PLAYER_HEIGHT}
                  contentFit="cover"
                />
              </View>
            ) : null}
          </View>
          {sideGap > 0 ? (
            <View
              style={{
                width: Math.max(0, boxW - videoWidth - sideGap),
                height: FEED_VIDEO_PLAYER_HEIGHT,
              }}
            />
          ) : null}

          <Pressable
            onPress={handleVideoTap}
            android_disableSound
            accessibilityRole="button"
            accessibilityLabel="Play or pause video"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 48,
              zIndex: 18,
              elevation: 18,
            }}
          />

          <LinearGradient
            colors={["rgba(40,18,12,0.55)", "transparent"]}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 88,
              zIndex: 3,
            }}
          />
          <LinearGradient
            colors={["transparent", "rgba(40,18,12,0.72)"]}
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 110,
              zIndex: 3,
            }}
          />

          {showChrome &&
            video.moderationStatus &&
            video.moderationStatus !== "approved" && (
              <View
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  right: 56,
                  zIndex: 11,
                  overflow: "visible",
                  maxWidth: "100%",
                }}
              >
                <ModerationBadge status={video.moderationStatus} />
              </View>
            )}

          {showChrome && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10,
              }}
            >
              <FeedMediaTypeOverlay
                item={video}
                contentType={video.contentType || "video"}
                showCenter={false}
              />
            </View>
          )}

          {showChrome && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={openFullscreen}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                backgroundColor: "rgba(0,0,0,0.55)",
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
                zIndex: 20,
              }}
            >
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {showChrome && !isPlaying && (
            <MediaPlayButton
              isPlaying={isPlaying}
              onPress={() => handleTogglePlay(setIsPlayTogglePending)}
              showOverlay={showOverlay}
              size="medium"
              disabled={isPlayTogglePending}
            />
          )}

          {showChrome && (
            <View
              style={{
                position: "absolute",
                bottom: 36,
                left: 12,
                right: 12,
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                  color: "#FFFFFF",
                  lineHeight: 18,
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

          {showChrome ? (
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
              bottomOffset={10}
              enlargeOnDrag
              knobSize={8}
              knobSizeDragging={10}
              trackHeights={{ normal: 4, dragging: 8 }}
              seekDuringDrag
              liveSeekThrottleMs={32}
              enableHaptics
              verticalScrub={{ enabled: true, sensitivityBase: 60, maxSlowdown: 5 }}
              style={{ zIndex: 200, elevation: 200 }}
            />
          ) : null}
        </View>
    </View>
  );
}
