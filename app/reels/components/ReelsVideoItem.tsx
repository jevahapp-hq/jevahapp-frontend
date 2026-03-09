import { MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { MutableRefObject, useEffect, useState } from "react";
import {
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Skeleton from "../../../src/shared/components/Skeleton/Skeleton";
import { VideoProgressBar } from "../../../src/shared/components/VideoProgressBar/VideoProgressBar";
import { getBestVideoUrl, getVideoUrlFromMedia, handleVideoError } from "../../../src/shared/utils/videoUrlManager";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { ReelsActionButtons } from "./ReelsActionButtons";
import { ReelsMenu } from "./ReelsMenu";
import { ReelsSpeakerInfo } from "./ReelsSpeakerInfo";

export interface ReelsVideoItemProps {
  videoData: any;
  index: number;
  isActive: boolean;
  passedVideoKey?: string;
  videoRefs: MutableRefObject<Record<string, Video>>;
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
    passedVideoKey,
    videoRefs,
    screenHeight,
    screenWidth,
    isIOS,
    currentIndex_state,
    playingVideos,
    mutedVideos,
    videoDuration,
    videoPosition,
    isDragging,
    showPauseOverlay,
    userHasManuallyPaused,
    modalKey,
    currentVideo,
    video,
    enrichedVideoData,
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
    setIsDragging,
    setVideoDuration,
    setVideoPosition,
    triggerHapticFeedback,
    formatTime,
    globalVideoStore,
    mediaStore,
    source,
    menuVisible,
    isOwner,
    checkIfDownloaded,
    currentUser,
    getAvatarUrl,
  } = props;

  const videoVolume = 1.0;

  if (!videoData || !videoData.title) {
    return (
      <View
        style={{
          height: screenHeight,
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>Invalid video data</Text>
      </View>
    );
  }

  const enriched = UserProfileCache.enrichContentWithUserData(videoData);
  const speakerName = getSpeakerName(enriched, "Creator");
  const videoKey =
    passedVideoKey ||
    `reel-${enriched._id || enriched.id || index}-${enriched.title}-${speakerName}`;

  const rawVideoUrl = getVideoUrlFromMedia(enriched);
  if (!rawVideoUrl) {
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
          {enriched.title || "No title"}
        </Text>
      </View>
    );
  }

  const videoUrl = getBestVideoUrl(rawVideoUrl);

  if (__DEV__ && isActive) {
    console.log(`🎬 [ReelsVideoItem] Initializing player for ${enriched.title}:`, {
      id: enriched._id || enriched.id,
      videoKey,
      rawVideoUrl: rawVideoUrl?.substring(0, 100),
      resolvedUrl: videoUrl?.substring(0, 100),
      hasPlaybackUrl: !!enriched.playbackUrl,
      hasHlsUrl: !!enriched.hlsUrl
    });
  }

  mediaStore.getVideoCacheStatus(videoKey);

  const handleComment = (key: string) => onComment(key);
  const handleSave = (key: string) => onSave(key);
  const handleShare = (key: string) => onShare(key);

  const [localPosition, setLocalPosition] = useState(videoPosition);
  const [localDuration, setLocalDuration] = useState(videoDuration);

  // Sync with global props occasionally or when active changes
  useEffect(() => {
    if (isActive) {
      setLocalPosition(videoPosition);
      setLocalDuration(videoDuration);
    }
  }, [isActive, videoPosition, videoDuration]);

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
          <Video
            ref={(ref) => {
              if (ref) {
                const existingRef = videoRefs.current[videoKey];
                if (existingRef && existingRef !== ref) {
                  try {
                    existingRef.pauseAsync().catch(() => { });
                    globalVideoStore.unregisterVideoPlayer(videoKey);
                  } catch (e) { }
                }
                videoRefs.current[videoKey] = ref;
                globalVideoStore.registerVideoPlayer(videoKey, {
                  pause: async () => {
                    try {
                      await ref.pauseAsync();
                      globalVideoStore.setOverlayVisible(videoKey, true);
                    } catch (err) {
                      console.warn(`Failed to pause ${videoKey}:`, err);
                    }
                  },
                  showOverlay: () => {
                    globalVideoStore.setOverlayVisible(videoKey, true);
                  },
                  key: videoKey,
                });
              } else {
                delete videoRefs.current[videoKey];
                globalVideoStore.unregisterVideoPlayer(videoKey);
              }
            }}
            source={{
              uri: getBestVideoUrl(rawVideoUrl || ""),
              headers: {
                "User-Agent": "JevahApp/1.0",
                Accept: "video/*",
              },
            }}
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
            resizeMode={ResizeMode.COVER}
            isMuted={mutedVideos[videoKey] ?? false}
            volume={mutedVideos[videoKey] ? 0.0 : videoVolume}
            shouldPlay={isActive && (playingVideos[videoKey] ?? false)}
            useNativeControls={false}
            isLooping={true}
            onError={async (error) => {
              const errorDetails = (error as any)?.error || error;
              const errorAnalysis = handleVideoError(
                error as any,
                videoUrl,
                enriched.title
              );

              if (__DEV__) {
                console.log(`🕵️ [Reels Probe] Probing URL for ${enriched.title}:`, videoUrl);
                fetch(videoUrl, { method: 'HEAD' })
                  .then(res => console.log(`📡 [Reels Probe] Result: ${res.status} ${res.statusText}`))
                  .catch(err => console.error(`📡 [Reels Probe] Failed:`, err.message));
              }

              console.error(
                `❌ Video loading error in reels for ${enriched.title}:`,
                { errorDetails, errorAnalysis }
              );
              const ref = videoRefs.current[videoKey];
              if (ref) {
                try {
                  await ref.pauseAsync();
                  globalVideoStore.pauseVideo(videoKey);
                } catch { }
              }
              try {
                globalVideoStore.unregisterVideoPlayer(videoKey);
              } catch { }
            }}
            onLoad={(status: any) => {
              mediaStore.setVideoLoaded(videoKey, true);
              if (status.durationMillis) {
                setLocalDuration(status.durationMillis);
                setVideoDuration(status.durationMillis);
              }
              if (playingVideos[videoKey] && !userHasManuallyPaused) {
                const ref = videoRefs.current[videoKey];
                if (ref) ref.playAsync().catch(() => { });
              }
            }}
            onPlaybackStatusUpdate={(status) => {
              if (!isActive || !status.isLoaded) return;

              // High frequency local update for UI responsiveness
              if (status.positionMillis !== undefined && !isDragging) {
                setLocalPosition(status.positionMillis);
              }

              // Update duration if found
              if (status.durationMillis && (localDuration === 0 || localDuration !== status.durationMillis)) {
                setLocalDuration(status.durationMillis);
                setVideoDuration(status.durationMillis);
              }

              if (status.durationMillis && videoDuration === 0) {
                if (
                  !status.isPlaying &&
                  !playingVideos[videoKey] &&
                  !userHasManuallyPaused
                ) {
                  setTimeout(
                    () => globalVideoStore.playVideoGlobally(videoKey),
                    100
                  );
                }
              }

              // Only bubble up position to parent if significant or when dragging ends to avoid lag
              if (!isDragging && status.positionMillis !== undefined) {
                // Bubbling to parent less frequently helps responsiveness
                // but local position ensures bar is smooth
                if (Math.abs(status.positionMillis - videoPosition) > 1000) {
                  setVideoPosition(status.positionMillis);
                }
              }

              const pct = status.durationMillis
                ? (status.positionMillis / status.durationMillis) * 100
                : 0;
              globalVideoStore.setVideoProgress(videoKey, pct);
              const ref = videoRefs.current[videoKey];
              if (status.didJustFinish) {
                ref?.setPositionAsync(0).catch(() => { });
                globalVideoStore.pauseVideo(videoKey);
                triggerHapticFeedback();
              }
            }}
            shouldCorrectPitch={isIOS}
            progressUpdateIntervalMillis={isIOS ? 100 : 250}
          />

          {isActive && (!playingVideos[videoKey] || !videoDuration) && (
            <View
              className="absolute inset-0"
              style={{
                justifyContent: "flex-end",
                padding: getResponsiveSpacing(12, 16, 20),
              }}
              pointerEvents="none"
            >
              <View style={{ marginBottom: getResponsiveSpacing(8, 10, 12) }}>
                <Skeleton
                  dark
                  height={getResponsiveSize(20, 22, 24)}
                  width={"65%"}
                  borderRadius={0}
                />
              </View>
              <View style={{ marginBottom: getResponsiveSpacing(6, 8, 10) }}>
                <Skeleton
                  dark
                  height={getResponsiveSize(14, 16, 18)}
                  width={"40%"}
                  borderRadius={0}
                />
              </View>
              <Skeleton
                dark
                height={getResponsiveSize(6, 7, 8)}
                width={"90%"}
                borderRadius={0}
                style={{ opacity: 0.8 }}
              />
            </View>
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
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 16,
                  elevation: 8,
                }}
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
              <View
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <MaterialIcons
                  name="pause"
                  size={getResponsiveSize(50, 60, 70)}
                  color="rgba(255, 255, 255, 0.6)"
                />
              </View>
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
                onComment={handleComment}
                onSave={handleSave}
                onShare={handleShare}
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
                onSave={handleSave}
                onDelete={onDelete}
                onReport={onReport}
                onDownload={onDownload}
                onShare={handleShare}
              />
              <VideoProgressBar
                progress={localDuration > 0 ? localPosition / localDuration : 0}
                currentMs={localPosition}
                durationMs={localDuration}
                isMuted={mutedVideos[videoKey] ?? false}
                onToggleMute={() => onToggleMute(videoKey)}
                onSeekToPercent={(pct: number) => onSeek(videoKey, pct * 100)}
                showControls={true}
                bottomOffset={getResponsiveSpacing(80, 95, 115)} // Neatly below ReelsSpeakerInfo
                enlargeOnDrag={true}
                knobSize={8}
                knobSizeDragging={12}
                trackHeights={{ normal: 2, dragging: 6 }}
                enableHaptics={true}
                mutePosition="left"
                style={{ zIndex: 100 }} // Ensure it's on top of video and overlays in Reels
              />
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}
