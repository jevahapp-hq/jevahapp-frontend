import { MaterialIcons } from "@expo/vector-icons";
import type { VideoPlayer } from "expo-video";
import { VideoView } from "expo-video";
import { MutableRefObject, useEffect, useMemo, useRef } from "react";
import {
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { VideoProgressBar } from "../../../src/shared/components/VideoProgressBar/VideoProgressBar";
import {
  getBestVideoUrl,
  getVideoUrlFromMedia,
} from "../../../src/shared/utils/videoUrlManager";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { useReelsExpoVideoPlayer } from "../hooks/useReelsExpoVideoPlayer";
import { getReelVideoKey } from "../utils/reelVideoKey";
import { ReelsActionButtons } from "./ReelsActionButtons";
import { ReelsMenu } from "./ReelsMenu";
import { ReelsSpeakerInfo } from "./ReelsSpeakerInfo";

export interface ReelsVideoItemProps {
  videoData: any;
  index: number;
  isActive: boolean;
  /** Mount decoder for active ± neighbors only. */
  shouldMountPlayer: boolean;
  passedVideoKey?: string;
  videoRefs: MutableRefObject<Record<string, VideoPlayer>>;
  screenHeight: number;
  screenWidth: number;
  isIOS: boolean;
  currentIndex_state: number;
  playingVideos: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  videoDuration: number;
  videoPosition: number;
  isDragging: boolean;
  showPauseOverlay: boolean;
  userHasManuallyPaused: boolean;
  modalKey: string;
  currentVideo: any;
  video: any;
  enrichedVideoData: any;
  activeIsLiked: boolean;
  activeLikesCount: number;
  canUseBackendLikes: boolean;
  videoStats: Record<string, any>;
  libraryStore: any;
  getSpeakerName: (videoData: any, fallback?: string) => string;
  getResponsiveSize: (s: number, m: number, l: number) => number;
  getResponsiveSpacing: (s: number, m: number, l: number) => number;
  getResponsiveFontSize: (s: number, m: number, l: number) => number;
  getTouchTargetSize: () => number;
  onToggleVideoPlay: () => void;
  onSeek: (videoKey: string, position: number) => void;
  onToggleMute: (key: string) => void;
  onLike: () => void;
  onComment: (key: string) => void;
  onSave: (key: string) => void;
  onShare: (key: string) => void;
  onViewDetails: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onReport: () => void;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  setIsDragging: (v: boolean) => void;
  setVideoDuration: (d: number) => void;
  setVideoPosition: (p: number) => void;
  triggerHapticFeedback: () => void;
  formatTime: (ms: number) => string;
  globalVideoStore: any;
  mediaStore: any;
  source?: string;
  menuVisible: boolean;
  isOwner: boolean;
  checkIfDownloaded: (id: string) => boolean;
  currentUser: any;
  getAvatarUrl: (user: any) => string | null;
}

export function ReelsVideoItem(props: ReelsVideoItemProps) {
  const {
    videoData,
    index,
    isActive,
    shouldMountPlayer,
    passedVideoKey,
    videoRefs,
    screenHeight,
    playingVideos,
    mutedVideos,
    isDragging,
    showPauseOverlay,
    userHasManuallyPaused,
    modalKey,
    currentVideo,
    video,
    activeIsLiked,
    activeLikesCount,
    canUseBackendLikes,
    videoStats,
    libraryStore,
    getSpeakerName,
    getResponsiveSize,
    getResponsiveSpacing,
    getResponsiveFontSize,
    getTouchTargetSize,
    onToggleVideoPlay,
    onSeek,
    onToggleMute,
    onLike,
    onComment,
    onSave,
    onShare,
    onViewDetails,
    onDownload,
    onDelete,
    onReport,
    onMenuToggle,
    onMenuClose,
    setVideoDuration,
    setVideoPosition,
    triggerHapticFeedback,
    globalVideoStore,
    mediaStore,
    source,
    menuVisible,
    isOwner,
    checkIfDownloaded,
    currentUser,
    getAvatarUrl,
    videoPosition,
  } = props;

  const hasValidData = !!(videoData && videoData.title);
  const enriched = useMemo(
    () =>
      hasValidData
        ? UserProfileCache.enrichContentWithUserData(videoData)
        : null,
    [hasValidData, videoData]
  );

  const speakerName = enriched
    ? getSpeakerName(enriched, "Creator")
    : "Creator";
  const videoKey =
    passedVideoKey ||
    getReelVideoKey(enriched || videoData || {}, index, speakerName);

  const rawVideoUrl = enriched ? getVideoUrlFromMedia(enriched) : null;
  const videoUrl = rawVideoUrl ? getBestVideoUrl(rawVideoUrl) : null;
  const isMuted = mutedVideos[videoKey] ?? false;
  // Active reel autoplays unless the user explicitly paused. Do not require
  // playingVideos[key] — store keys used to diverge from the cell key.
  const shouldPlay =
    isActive &&
    !userHasManuallyPaused &&
    (playingVideos[videoKey] ?? playingVideos[modalKey] ?? true);

  const {
    player,
    firstFrameReady,
    positionMs,
    durationMs,
    seekToMs,
    handleFirstFrameRender,
  } = useReelsExpoVideoPlayer({
    source: videoUrl,
    isActive,
    shouldPlay,
    isMuted,
    volume: 1,
    shouldMount: shouldMountPlayer && !!videoUrl,
  });

  const lastReportedDurationRef = useRef(0);
  const didMarkLoadedRef = useRef(false);
  const registerVideoPlayer = globalVideoStore.registerVideoPlayer;
  const unregisterVideoPlayer = globalVideoStore.unregisterVideoPlayer;
  const setOverlayVisible = globalVideoStore.setOverlayVisible;

  useEffect(() => {
    if (!player || !shouldMountPlayer) {
      delete videoRefs.current[videoKey];
      try {
        unregisterVideoPlayer(videoKey);
      } catch {
        // no-op
      }
      return;
    }

    videoRefs.current[videoKey] = player;
    registerVideoPlayer(videoKey, {
      pause: async () => {
        try {
          player.pause();
          player.muted = true;
          player.volume = 0;
          setOverlayVisible(videoKey, true);
        } catch {
          // no-op
        }
      },
      play: async () => {
        try {
          player.play();
        } catch {
          // no-op
        }
      },
      showOverlay: () => {
        setOverlayVisible(videoKey, true);
      },
      key: videoKey,
    });

    return () => {
      delete videoRefs.current[videoKey];
      try {
        unregisterVideoPlayer(videoKey);
      } catch {
        // no-op
      }
    };
  }, [
    player,
    shouldMountPlayer,
    videoKey,
    videoRefs,
    registerVideoPlayer,
    unregisterVideoPlayer,
    setOverlayVisible,
  ]);

  // Report duration once (or when it actually changes) — never every tick.
  useEffect(() => {
    if (!isActive || durationMs <= 0) return;
    if (Math.abs(durationMs - lastReportedDurationRef.current) < 250) return;
    lastReportedDurationRef.current = durationMs;
    setVideoDuration(durationMs);
    if (!didMarkLoadedRef.current) {
      didMarkLoadedRef.current = true;
      try {
        mediaStore.setVideoLoaded?.(videoKey, true);
      } catch {
        // no-op
      }
    }
  }, [isActive, durationMs, setVideoDuration, mediaStore, videoKey]);

  // Keep parent position loosely in sync without store progress spam (that
  // re-rendered the whole FlatList every 100ms and blew the update depth).
  useEffect(() => {
    if (!isActive || isDragging) return;
    if (Math.abs(positionMs - (videoPosition || 0)) > 1000) {
      setVideoPosition(positionMs);
    }
  }, [isActive, isDragging, positionMs, setVideoPosition, videoPosition]);

  if (!hasValidData) {
    return (
      <View
        style={{
          height: screenHeight,
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>Invalid video data</Text>
      </View>
    );
  }

  if (!rawVideoUrl || !enriched) {
    return (
      <View
        style={{
          height: screenHeight,
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16, marginBottom: 10 }}>
          Video not available
        </Text>
        <Text style={{ color: "#888", fontSize: 12 }}>
          {videoData?.title || "No title"}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        height: screenHeight,
        width: "100%",
        backgroundColor: "#000000",
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          if (isActive) {
            triggerHapticFeedback();
            onToggleVideoPlay();
          }
        }}
        onLongPress={() => {
          if (isActive) triggerHapticFeedback();
        }}
      >
        <View
          className="w-full h-full"
          accessibilityLabel={`${playingVideos[videoKey] ? "Pause" : "Play"} video`}
          accessibilityRole="button"
          accessibilityHint="Double tap to like, long press for more options"
        >
          {player ? (
            <VideoView
              player={player}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: isActive ? 1 : 0,
              }}
              contentFit="cover"
              nativeControls={false}
              fullscreenOptions={{ enable: false }}
              allowsPictureInPicture={false}
              useExoShutter={false}
              surfaceType="textureView"
              onFirstFrameRender={handleFirstFrameRender}
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: "#000" }} />
          )}

          {isActive && !firstFrameReady && (
            <View
              className="absolute inset-0"
              style={{ backgroundColor: "#000" }}
              pointerEvents="none"
            />
          )}

          {isActive && !playingVideos[videoKey] && (
            <View
              className="absolute inset-0 justify-center items-center"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
            >
              <TouchableOpacity
                onPress={onToggleVideoPlay}
                activeOpacity={0.8}
                accessibilityLabel="Play video"
                accessibilityRole="button"
              >
                <MaterialIcons
                  name="play-arrow"
                  size={getResponsiveSize(50, 60, 70)}
                  color="rgba(255, 255, 255, 0.6)"
                />
              </TouchableOpacity>
            </View>
          )}

          {isActive && showPauseOverlay && playingVideos[videoKey] && (
            <View
              className="absolute inset-0 justify-center items-center"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.1)",
                zIndex: 30,
              }}
              pointerEvents="none"
            >
              <MaterialIcons
                name="pause"
                size={getResponsiveSize(50, 60, 70)}
                color="rgba(255, 255, 255, 0.6)"
              />
            </View>
          )}

          {isActive && (
            <>
              <ReelsActionButtons
                videoKey={videoKey}
                modalKey={modalKey}
                screenHeight={screenHeight}
                activeIsLiked={activeIsLiked}
                activeLikesCount={activeLikesCount}
                canUseBackendLikes={canUseBackendLikes}
                videoStats={videoStats}
                video={video}
                enrichedVideoData={enriched}
                libraryStore={libraryStore}
                onLike={onLike}
                onComment={onComment}
                onSave={onSave}
                onShare={onShare}
                getResponsiveSpacing={getResponsiveSpacing}
                getResponsiveSize={getResponsiveSize}
                getResponsiveFontSize={getResponsiveFontSize}
                getTouchTargetSize={getTouchTargetSize}
                triggerHapticFeedback={triggerHapticFeedback}
              />
              <ReelsSpeakerInfo
                enrichedVideoData={enriched}
                source={source}
                menuVisible={menuVisible}
                onMenuToggle={onMenuToggle}
                getSpeakerName={getSpeakerName}
                getResponsiveSpacing={getResponsiveSpacing}
                getResponsiveSize={getResponsiveSize}
                getResponsiveFontSize={getResponsiveFontSize}
                triggerHapticFeedback={triggerHapticFeedback}
                currentUser={currentUser ?? undefined}
                getAvatarUrl={getAvatarUrl}
              />
              <ReelsMenu
                visible={menuVisible}
                modalKey={modalKey}
                currentVideo={currentVideo}
                isOwner={isOwner}
                libraryStore={libraryStore}
                checkIfDownloaded={checkIfDownloaded}
                onClose={onMenuClose}
                onViewDetails={onViewDetails}
                onSave={onSave}
                onDelete={onDelete}
                onReport={onReport}
                onDownload={onDownload}
                onShare={onShare}
              />
              <VideoProgressBar
                progress={durationMs > 0 ? positionMs / durationMs : 0}
                currentMs={positionMs}
                durationMs={durationMs}
                isMuted={isMuted}
                onToggleMute={() => onToggleMute(videoKey)}
                onSeekToPercent={(pct: number) => {
                  seekToMs(pct * durationMs);
                  onSeek(videoKey, pct * 100);
                }}
                showControls={true}
                bottomOffset={getResponsiveSpacing(80, 95, 115)}
                enlargeOnDrag={true}
                knobSize={8}
                knobSizeDragging={12}
                trackHeights={{ normal: 2, dragging: 6 }}
                enableHaptics={true}
                mutePosition="left"
                style={{ zIndex: 100 }}
              />
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}
