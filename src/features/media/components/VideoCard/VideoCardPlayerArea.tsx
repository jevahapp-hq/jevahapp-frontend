import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { useAdvancedAudioPlayer } from "../../../../../app/hooks/useAdvancedAudioPlayer";
import { ContentTypeBadge } from "../../../../shared/components/ContentTypeBadge";
import { MediaPlayButton } from "../../../../shared/components/MediaPlayButton";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import { TikTokProgressBar } from "../../../../shared/components/VideoProgressBar";
import { useVideoPlaybackControl } from "../../../../shared/hooks/useVideoPlaybackControl";
import type { MediaItem } from "../../../../shared/types";
import { isAudioSermon, isValidUri } from "../../../../shared/utils";
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
  onLayout?: (event: any, key: string, type: "video" | "music", uri?: string) => void;
}

export function VideoCardPlayerArea(props: VideoCardPlayerAreaProps) {
  return <ActiveVideoPlayerContent {...props} />;
}

function ActiveVideoPlayerContent(props: VideoCardPlayerAreaProps) {
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

  const player = useVideoPlayer(
    videoUrl ? { uri: videoUrl, useCaching: true } : "",
    (p) => {
      p.loop = false;
      p.muted = isMuted;
      p.volume = videoVolume;
      // 100ms ticks keep the scrubber moving while the video plays
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
  });

  const { seekToPercent } = useVideoCardSeek({
    isAudioSermon: isAudioSermonValue,
    audioState,
    audioControls,
    player,
    videoPositionMs,
    lastKnownDurationRef,
    backendDurationMs: (video as any).duration ? (video as any).duration * 1000 : 0,
    setVideoPositionMs,
    setVideoProgress,
    suppressAutoLoopRef,
  });

  const handleScrubStart = useCallback(() => {
    suppressAutoLoopRef.current = true;
  }, []);

  const handleScrubEnd = useCallback(() => {
    // Brief hold so timeUpdate doesn't fight the settle
    setTimeout(() => {
      suppressAutoLoopRef.current = false;
    }, 350);
  }, []);

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
    onVideoTap,
    audioControlsPause: audioControls?.pause ?? (() => {}),
    togglePlayback,
    player,
    showOverlayPermanently,
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

  return (
    <View className="w-full h-[400px] overflow-hidden relative bg-black">
      <TouchableWithoutFeedback onPress={handleVideoTap}>
        <View className="absolute inset-0">
          {videoUrl && !isAudioSermonValue && player && (
            <VideoView
              key={videoUrl || key}
              player={player}
              style={{ width: "100%", height: "100%", position: "absolute", backgroundColor: "black" }}
              contentFit="cover"
              nativeControls={false}
              fullscreenOptions={{ enable: false }}
              useExoShutter={false}
            />
          )}

          {video.moderationStatus && video.moderationStatus !== "approved" && (
            <View style={{ position: "absolute", top: 50, left: 12, zIndex: 11 }}>
              <ModerationBadge status={video.moderationStatus} />
            </View>
          )}

          <ContentTypeBadge contentType={video.contentType || "video"} position="top-left" size="medium" />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onVideoTap(key, video, index)}
            style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, flexDirection: "row", alignItems: "center", zIndex: 10 }}
          >
            <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <MediaPlayButton
            isPlaying={isAudioSermonValue ? (audioState?.isPlaying ?? false) : isPlaying}
            onPress={() => handleTogglePlay(setIsPlayTogglePending)}
            showOverlay={showOverlay}
            size="medium"
            disabled={isPlayTogglePending}
          />

          <View style={{ position: "absolute", bottom: 64, left: 12, right: 12, paddingHorizontal: 10, paddingVertical: 6, pointerEvents: "none" }}>
            <Text style={{ fontSize: 12, fontFamily: "Rubik_600SemiBold", color: "#FFFFFF", lineHeight: 16, textShadowColor: "rgba(0, 0, 0, 0.75)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }} numberOfLines={1} ellipsizeMode="tail">
              {video.title}
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Outside play-tap layer so pan wins — scrub owns this player */}
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
              ((video as any).duration ? (video as any).duration * 1000 : 0) ||
              0
        }
        showControls={true}
        debug={__DEV__ && false}
        config={{
          showFloatingLabel: true,
          enlargeOnDrag: true,
          knobSize: 8,
          knobSizeDragging: 12,
          trackHeight: 3,
          trackHeightDragging: 8,
          seekDuringDrag: true,
          liveSeekThrottleMs: 48,
          seekSyncTicks: 2,
          seekMsTolerance: 250,
          minProgressEpsilon: 0.005,
        }}
      />
    </View>
  );
}
