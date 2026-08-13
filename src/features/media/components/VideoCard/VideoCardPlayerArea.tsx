import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useCommentModal } from "../../../../../app/context/CommentModalContext";
import { useAdvancedAudioPlayer } from "../../../../../app/hooks/useAdvancedAudioPlayer";
import { ContentTypeBadge } from "../../../../shared/components/ContentTypeBadge";
import { MediaPlayButton } from "../../../../shared/components/MediaPlayButton";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import { TikTokProgressBar } from "../../../../shared/components/VideoProgressBar";
import { useVideoPlaybackControl } from "../../../../shared/hooks/useVideoPlaybackControl";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon, isGifImage, isGifContent, isValidUri } from "../../../../shared/utils";
import { PERF, perfMark, perfMeasure } from "../../../../shared/utils/perfMarks";
import { useVideoCardPlayback } from "./hooks/useVideoCardPlayback";
import { useVideoCardSeek } from "./hooks/useVideoCardSeek";
import { useVideoCardTapLogic } from "./hooks/useVideoCardTapLogic";
import { useHealMissingDuration } from "./hooks/useHealMissingDuration";
import { normalizeDurationToMs } from "./player/normalizeDuration";
import { getVideoSourceContentType } from "../../../../shared/utils/videoUrlManager";

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
  onLayout?: (event: any, key: string, type: "video" | "music", uri?: string) => void;
  /** Comments open on this card — strip chrome, keep play + seek */
  commentsFocused?: boolean;
}

export function VideoCardPlayerArea(props: VideoCardPlayerAreaProps) {
  if (isGifImage(props.video)) {
    return <GifImagePlayerContent {...props} />;
  }
  return <ActiveVideoPlayerContent {...props} />;
}

function GifImagePlayerContent({
  video,
  contentKey: key,
  index,
  videoUrl,
  onVideoTap,
  commentsFocused = false,
}: VideoCardPlayerAreaProps) {
  const uri =
    videoUrl ||
    (typeof video.fileUrl === "string" ? video.fileUrl : null) ||
    (typeof video.imageUrl === "string" ? video.imageUrl : null);

  return (
    <View className="w-full h-[400px] overflow-hidden relative bg-black">
      <TouchableWithoutFeedback onPress={() => onVideoTap(key, video, index)}>
        <View className="absolute inset-0">
          {uri ? (
            <ExpoImage
              source={{ uri }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              cachePolicy="disk"
              autoplay
            />
          ) : null}

          {!commentsFocused &&
          video.moderationStatus &&
          video.moderationStatus !== "approved" ? (
            <View style={{ position: "absolute", top: 50, left: 12, zIndex: 11 }}>
              <ModerationBadge status={video.moderationStatus} />
            </View>
          ) : null}

          {!commentsFocused ? (
            <ContentTypeBadge
              contentType={video.contentType || "gif"}
              position="top-left"
              size="medium"
            />
          ) : null}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

function ActiveVideoPlayerContent(props: VideoCardPlayerAreaProps) {
  const {
    video,
    contentKey: key,
    index,
    isActive: _isActive,
    videoUrl,
    videoVolume,
    isMuted,
    onVideoTap,
    onTogglePlay,
    onToggleMute,
    getContentKey,
    commentsFocused = false,
  } = props;

  const contentId = video._id || getContentKey(video);
  const isAudioSermonValue = isAudioSermon(video);
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoLoadedRef = useRef(false);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const storeRef = useRef<any>(null);
  const suppressAutoLoopRef = useRef(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const ttffMeasuredRef = useRef(false);

  const posterUri = useMemo(() => {
    const raw =
      (video as any).thumbnailUrl ??
      (video as any).coverImageUrl ??
      (video as any).imageUrl ??
      null;
    if (typeof raw === "string" && isValidUri(raw)) return raw;
    if (raw && typeof raw === "object" && typeof raw.uri === "string" && isValidUri(raw.uri)) {
      return raw.uri;
    }
    return null;
  }, [video]);

  useEffect(() => {
    if (!videoUrl) return;
    ttffMeasuredRef.current = false;
    perfMark(`video.ttff.start:${key}`);
  }, [videoUrl, key]);

  useEffect(() => {
    if (!videoLoaded || ttffMeasuredRef.current) return;
    ttffMeasuredRef.current = true;
    perfMeasure(PERF.VIDEO_TTFF, `video.ttff.start:${key}`);
  }, [videoLoaded, key]);

  const player = useVideoPlayer(
    videoUrl
      ? {
          uri: videoUrl,
          useCaching: true,
          ...(getVideoSourceContentType(
            videoUrl,
            (video as any).fileMimeType || (video as any).mimeType
          )
            ? {
                contentType: getVideoSourceContentType(
                  videoUrl,
                  (video as any).fileMimeType || (video as any).mimeType
                ),
              }
            : {}),
        }
      : "",
    (p) => {
      p.loop = isGifContent(video) && !isGifImage(video);
      p.muted = isMuted || isGifContent(video);
      p.volume = videoVolume;
      p.timeUpdateEventInterval = 0.1;
    }
  );

  // Sync player settings (minimal re-renders)
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
      player.volume = videoVolume;
    }
  }, [player, isMuted, videoVolume]);

  const {
    isPlaying,
    toggle: togglePlayback,
    shouldPlayThisVideo,
  } = useVideoPlaybackControl({
    videoKey: key,
    videoRef: { current: player } as any,
    enableAutoPlay: false,
  });

  // Direct imperative play/pause - no dependency on the sync effect chain
  useEffect(() => {
    if (!player) return;
    if (shouldPlayThisVideo && !player.playing) {
      player.play();
    } else if (!shouldPlayThisVideo && player.playing) {
      player.pause();
    }
  }, [player, shouldPlayThisVideo]);

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
  }, [isPlaying]);

  const audioUrl = isAudioSermonValue && isValidUri(video.fileUrl) ? video.fileUrl : null;
  const [audioStateRaw, audioControls] = useAdvancedAudioPlayer(audioUrl, {
    audioKey: key,
    autoPlay: false,
    loop: false,
    volume: videoVolume,
    onError: () => setFailedVideoLoad(true),
  });

  const audioState = audioStateRaw ?? { isPlaying: false, progress: 0, isMuted: false, position: 0, duration: 0 };

  const handleVideoError = useCallback(() => {
    setFailedVideoLoad(true);
  }, []);

  const healedDurationMs = useHealMissingDuration({
    mediaId: contentId,
    durationSec: (video as any).duration ?? (video as any).durationSec,
    processingStatus: (video as any).processingStatus,
    enabled: !isAudioSermonValue,
  });

  const mediaDurationMs = useMemo(() => {
    const v = video as any;
    // Prefer already-ms fields; never treat them as seconds.
    if (typeof v.durationMs === "number" && v.durationMs > 0) {
      return Math.min(v.durationMs, 24 * 60 * 60 * 1000);
    }
    const fromApi = normalizeDurationToMs(v.duration ?? v.durationSec);
    return Math.max(fromApi, healedDurationMs);
  }, [video, healedDurationMs]);

  const {
    lastKnownDurationRef,
    videoDurationMs,
    videoPositionMs,
    videoProgress,
    setVideoPositionMs,
    setVideoProgress,
  } = useVideoCardPlayback({
    player,
    isAudioSermon: isAudioSermonValue,
    videoTitle: video.title,
    contentId,
    contentType: video.contentType || "media",
    isPlaying,
    handleVideoError,
    setFailedVideoLoad,
    setVideoLoaded,
    videoLoadedRef,
    hasTrackedView,
    setHasTrackedView,
    storeRef,
    isMountedRef,
    suppressAutoLoopRef,
    initialDurationMs: mediaDurationMs,
  });

  const { seekToPercent } = useVideoCardSeek({
    isAudioSermon: isAudioSermonValue,
    audioState,
    audioControls,
    player,
    videoPositionMs,
    lastKnownDurationRef,
    backendDurationMs: mediaDurationMs,
    mediaId: contentId,
    setVideoPositionMs,
    setVideoProgress,
    suppressAutoLoopRef,
  });

  const isStillProcessing = ["processing", "pending"].includes(
    String((video as any).processingStatus || "").toLowerCase()
  );

  // Incomplete/transcoding files often fire playToEnd early — looping looks like
  // the video "vanishes" then flashes. Hold loop until processing is ready.
  useEffect(() => {
    if (isStillProcessing) suppressAutoLoopRef.current = true;
  }, [isStillProcessing]);

  const handleScrubStart = useCallback(() => {
    suppressAutoLoopRef.current = true;
  }, []);

  const handleScrubEnd = useCallback(() => {
    // Brief hold so timeUpdate doesn't fight the settle
    setTimeout(() => {
      if (!isStillProcessing) suppressAutoLoopRef.current = false;
    }, 350);
  }, [isStillProcessing]);

  const {
    handleVideoTap,
    handleTogglePlay,
    tapTimeoutRef,
  } = useVideoCardTapLogic({
    key,
    video,
    index,
    isPlaying,
    isAudioSermon: isAudioSermonValue,
    audioIsPlaying: audioState?.isPlaying ?? false,
    onTogglePlay,
    audioControlsPause: audioControls?.pause ?? (() => {}),
    audioControlsPlay: audioControls?.play ?? undefined,
    togglePlayback,
    player,
    showOverlayPermanently,
    showOverlayTemporarily,
    hideOverlay,
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  const handleToggleMuteInternal = useCallback(() => {
    if (isAudioSermonValue) audioControls.toggleMute();
    else onToggleMute(key);
  }, [onToggleMute, key, isAudioSermonValue, audioControls]);

  const PLAYER_H = 400;
  const { mediaPeekHeight, isVisible: commentSheetOpen } = useCommentModal();
  // Use sheet-open (not per-card focus) — focus can flicker when chrome collapses
  // and the bar would snap back under the sheet.
  const progressTop = commentSheetOpen
    ? Math.max(56, Math.min(PLAYER_H - 44, mediaPeekHeight - 52))
    : undefined;

  return (
    <View className="w-full h-[400px] overflow-hidden relative bg-black">
      <TouchableWithoutFeedback onPress={handleVideoTap}>
        <View className="absolute inset-0">
          {/* Keep cover under the player until the first frame is ready (no poster→player swap). */}
          {!!posterUri && !videoLoaded && (
            <Image
              source={{ uri: posterUri }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
              }}
              resizeMode="cover"
            />
          )}
          {videoUrl && !isAudioSermonValue && player && (
            <VideoView
              // Stable key — URL patches during processing must not remount
              key={key}
              player={player}
              style={{ width: "100%", height: "100%", position: "absolute", backgroundColor: "transparent" }}
              contentFit="cover"
              nativeControls={false}
              fullscreenOptions={{ enable: false }}
              useExoShutter={false}
            />
          )}

          {!commentsFocused && video.moderationStatus && video.moderationStatus !== "approved" && (
            <View style={{ position: "absolute", top: 50, left: 12, zIndex: 11 }}>
              <ModerationBadge status={video.moderationStatus} />
            </View>
          )}

          {!commentsFocused ? (
            <ContentTypeBadge contentType={video.contentType || "video"} position="top-left" size="medium" />
          ) : null}

          {!commentsFocused ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onVideoTap(key, video, index)}
              style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", zIndex: 10 }}
            >
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <MediaPlayButton
            isPlaying={isAudioSermonValue ? (audioState?.isPlaying ?? false) : isPlaying}
            onPress={() => handleTogglePlay(setIsPlayTogglePending)}
            showOverlay={commentsFocused || commentSheetOpen || showOverlay}
            size="medium"
            disabled={isPlayTogglePending}
            offsetY={commentSheetOpen ? -36 : 0}
          />

          {!commentsFocused ? (
            <View style={{ position: "absolute", bottom: 64, left: 12, right: 12, paddingHorizontal: 10, paddingVertical: 6, pointerEvents: "none" }}>
              <Text style={{ fontSize: 12, fontFamily: "Rubik_600SemiBold", color: "#FFFFFF", lineHeight: 16, textShadowColor: "rgba(0, 0, 0, 0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={1} ellipsizeMode="tail">
                {video.title}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableWithoutFeedback>

      {/* Absolute overlay above VideoView native surface (zIndex alone is not enough) */}
      <View
        pointerEvents="box-none"
        style={{
          ...StyleSheet.absoluteFillObject,
          zIndex: 50,
          elevation: 50,
        }}
      >
        <TikTokProgressBar
          progress={isAudioSermonValue ? (audioState?.progress ?? 0) : Math.max(0, Math.min(1, videoProgress || 0))}
          isMuted={isAudioSermonValue ? (audioState?.isMuted ?? false) : isMuted}
          onToggleMute={handleToggleMuteInternal}
          onSeekToPercent={seekToPercent}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          currentMs={isAudioSermonValue ? (audioState?.position ?? 0) : videoPositionMs}
          durationMs={
            isAudioSermonValue
              ? (audioState?.duration ?? 0)
              : videoDurationMs ||
                lastKnownDurationRef.current ||
                mediaDurationMs ||
                0
          }
          showControls={true}
          top={progressTop}
          bottomOffset={14}
          debug={__DEV__ && false}
          config={{
            showFloatingLabel: true,
            showTimeLabels: true,
            enlargeOnDrag: true,
            knobSize: 10,
            knobSizeDragging: 14,
            trackHeight: 4,
            trackHeightDragging: 8,
            seekDuringDrag: true,
            liveSeekThrottleMs: 48,
            seekSyncTicks: 2,
            seekMsTolerance: 250,
            minProgressEpsilon: 0.005,
          }}
        />
      </View>
    </View>
  );
}
