import { memo, useEffect, useMemo, useState } from "react";
import {
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Skeleton from "../../../src/shared/components/Skeleton/Skeleton";
import { VideoProgressBar } from "../../../src/shared/components/VideoProgressBar/VideoProgressBar";
import { getBestVideoUrl, getVideoUrlFromMedia } from "../../../src/shared/utils/videoUrlManager";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { ReelsActionButtons } from "./ReelsActionButtons";
import { ReelsMenu } from "./ReelsMenu";
import { ReelsSpeakerInfo } from "./ReelsSpeakerInfo";
import ReelsVideoPlayer from "./ReelsVideoPlayer";

import { Video } from "expo-av";
import { MutableRefObject } from "react";

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
    mediaStore,
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

  const isPlaying = playingVideos[videoKey] ?? false;
  const isMuted = mutedVideos[videoKey] ?? false;

  // Track if we should render skeletons
  const showSkeletons = isActive && (!isPlaying || !localDuration);

  // Sync with global props when active
  useEffect(() => {
    if (isActive) {
      setLocalPosition(videoPosition);
      setLocalDuration(videoDuration);
    }
  }, [isActive, videoPosition, videoDuration]);

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
            setIsDragging={setIsDragging}
            isDragging={isDragging}
            localDuration={localDuration}
            videoPosition={videoPosition}
            globalVideoStore={globalVideoStore}
            mediaStore={mediaStore}
            userHasManuallyPaused={userHasManuallyPaused}
            showPauseOverlay={showPauseOverlay}
            getResponsiveSize={getResponsiveSize}
            triggerHapticFeedback={triggerHapticFeedback}
            isIOS={isIOS}
          />

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
          durationMs={localDuration}
          isMuted={isMuted}
          onToggleMute={() => onToggleMute(videoKey)}
          onSeekToPercent={(pct: number) => onSeek(videoKey, pct * 100)}
          onScrubStart={() => setIsDragging(true)}
          onScrubEnd={() => setIsDragging(false)}
          showControls={true}
          bottomOffset={getResponsiveSpacing(120, 135, 155)}
          enlargeOnDrag={true}
          knobSize={8}
          knobSizeDragging={12}
          trackHeights={{ normal: 2, dragging: 6 }}
          seekDuringDrag={true}
          liveSeekThrottleMs={48}
          enableHaptics={true}
          mutePosition="left"
          style={{ zIndex: 100 }}
        />
      ) : null}
    </View>
  );
});

