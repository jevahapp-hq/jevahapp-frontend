import { memo, useEffect, useMemo, useState, type MutableRefObject } from "react";
import {
  Image,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Skeleton from "../../../src/shared/components/Skeleton/Skeleton";
import { VideoProgressBar } from "../../../src/shared/components/VideoProgressBar/VideoProgressBar";
import { getBestVideoUrl, getVideoUrlFromMedia } from "../../../src/shared/utils/videoUrlManager";
import { useGlobalVideoStore } from "../../store/useGlobalVideoStore";
import { getBottomNavHeight } from "../../utils/responsiveOptimized";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { ReelsActionButtons } from "./ReelsActionButtons";
import { ReelsMenu } from "./ReelsMenu";
import { ReelsSpeakerInfo } from "./ReelsSpeakerInfo";
import ReelsVideoPlayer from "./ReelsVideoPlayer";
import type { VideoPlayer } from "expo-video";

export interface ReelsVideoItemProps {
  videoData: any;
  index: number;
  isActive: boolean;
  passedVideoKey?: string;
  videoRefs: MutableRefObject<Record<string, VideoPlayer>>;
  screenHeight: number;
  screenWidth: number;
  isIOS: boolean;
  currentIndex_state: number;
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
  source?: string;
  menuVisible: boolean;
  isOwner: boolean;
  checkIfDownloaded: (id: string) => boolean;
  currentUser: any;
  getAvatarUrl: (user: any) => string | null;
}

/**
 * ReelsVideoItem - Performance optimized item for Reels FlatList
 */
export const ReelsVideoItem = memo((props: ReelsVideoItemProps) => {
  const {
    videoData,
    index,
    isActive,
    passedVideoKey,
    videoRefs,
    screenHeight,
    isIOS,
    currentIndex_state,
    videoDuration,
    videoPosition,
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
    setIsDragging,
    setVideoDuration,
    setVideoPosition,
    triggerHapticFeedback,
    globalVideoStore,
    source,
    menuVisible,
    isOwner,
    checkIfDownloaded,
    currentUser,
    getAvatarUrl,
  } = props;

  const [localPosition, setLocalPosition] = useState(videoPosition);
  const [localDuration, setLocalDuration] = useState(videoDuration);

  // Memoize data processing
  const enriched = useMemo(() => UserProfileCache.enrichContentWithUserData(videoData), [videoData]);
  const speakerName = useMemo(() => getSpeakerName(enriched, "Creator"), [enriched, getSpeakerName]);
  const videoKey = useMemo(() =>
    passedVideoKey || `reel-${enriched._id || enriched.id || index}-${enriched.title}-${speakerName}`,
    [passedVideoKey, enriched, index, speakerName]
  );

  const videoUrl = useMemo(() => {
    const raw = getVideoUrlFromMedia(enriched);
    return raw ? getBestVideoUrl(raw) : null;
  }, [enriched]);

  const isPlaying = useGlobalVideoStore(
    (s) => s.playingVideos[videoKey] ?? false
  );
  const isMuted = useGlobalVideoStore(
    (s) => s.mutedVideos[videoKey] ?? false
  );
  // Mount active + ±1 so swipe-in doesn't wait on cold native player alloc.
  const shouldMountPlayer = Math.abs(index - currentIndex_state) <= 1;

  const posterUri = useMemo(() => {
    const raw =
      enriched?.thumbnailUrl ||
      enriched?.coverImageUrl ||
      enriched?.imageUrl ||
      null;
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object" && typeof raw.uri === "string") return raw.uri;
    return null;
  }, [enriched]);

  // Track if we should render skeletons
  const showSkeletons = isActive && (!isPlaying || !localDuration);

  // Sync with global props when active — skip position while scrubbing
  useEffect(() => {
    if (!isActive) return;
    if (!isDragging) setLocalPosition(videoPosition);
    setLocalDuration(videoDuration);
  }, [isActive, videoPosition, videoDuration, isDragging]);

  if (!enriched || !enriched.title || !videoUrl) {
    return (
      <View style={{ height: screenHeight, width: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 16 }}>{!videoUrl ? "Video not available" : "Invalid video data"}</Text>
      </View>
    );
  }

  return (
    <View style={{ height: screenHeight, width: "100%", backgroundColor: "#000000" }}>
      <TouchableWithoutFeedback onPress={() => isActive && onToggleVideoPlay()}>
        <View style={{ width: "100%", height: "100%" }}>
          {shouldMountPlayer ? (
            <ReelsVideoPlayer
              videoKey={videoKey}
              contentId={String(enriched._id || enriched.id || "")}
              videoUrl={videoUrl}
              isActive={isActive}
              isMuted={isMuted}
              videoVolume={1.0}
              isPlaying={isPlaying}
              videoRefs={videoRefs}
              onToggleVideoPlay={onToggleVideoPlay}
              setVideoDuration={setVideoDuration}
              setVideoPosition={setVideoPosition}
              setLocalPosition={setLocalPosition}
              setLocalDuration={setLocalDuration}
              isDragging={isDragging}
              localDuration={localDuration}
              videoPosition={videoPosition}
              globalVideoStore={globalVideoStore}
              showPauseOverlay={showPauseOverlay}
              getResponsiveSize={getResponsiveSize}
              triggerHapticFeedback={triggerHapticFeedback}
            />
          ) : (
            <View style={{ width: "100%", height: "100%", backgroundColor: "#000" }}>
              {posterUri ? (
                <Image
                  source={{ uri: posterUri }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : null}
            </View>
          )}

          {showSkeletons && (
            <View className="absolute inset-0" style={{ justifyContent: "flex-end", padding: getResponsiveSpacing(12, 16, 20), zIndex: 5 }} pointerEvents="none">
              <View style={{ marginBottom: getResponsiveSpacing(8, 10, 12) }}>
                <Skeleton dark height={getResponsiveSize(20, 22, 24)} width={"65%"} borderRadius={0} />
              </View>
              <View style={{ marginBottom: getResponsiveSpacing(6, 8, 10) }}>
                <Skeleton dark height={getResponsiveSize(14, 16, 18)} width={"40%"} borderRadius={0} />
              </View>
              <Skeleton dark height={getResponsiveSize(6, 7, 8)} width={"90%"} borderRadius={0} style={{ opacity: 0.8 }} />
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
                onComment={() => onComment(videoKey)}
                onSave={() => onSave(videoKey)}
                onShare={() => onShare(videoKey)}
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
                onSave={() => onSave(videoKey)}
                onDelete={onDelete}
                onReport={onReport}
                onDownload={onDownload}
                onShare={() => onShare(videoKey)}
              />
            </>
          )}
        </View>
      </TouchableWithoutFeedback>

      {isActive ? (
        <VideoProgressBar
          progress={localDuration > 0 ? localPosition / localDuration : 0}
          currentMs={localPosition}
          durationMs={localDuration > 0 ? localDuration : videoDuration}
          isMuted={isMuted}
          onToggleMute={() => onToggleMute(videoKey)}
          onSeekToPercent={(pct: number) => {
            const clamped = Math.max(0, Math.min(1, pct));
            const dur =
              localDuration > 0
                ? localDuration
                : videoDuration > 0
                  ? videoDuration
                  : 0;
            if (dur > 0) setLocalPosition(clamped * dur);
            onSeek(videoKey, clamped);
          }}
          onScrubStart={() => setIsDragging(true)}
          onScrubEnd={() => setIsDragging(false)}
          showControls
          bottomOffset={getBottomNavHeight() + getResponsiveSpacing(6, 8, 10)}
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
});

