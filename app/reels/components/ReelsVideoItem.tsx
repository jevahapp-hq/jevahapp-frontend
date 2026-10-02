import { memo, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Image } from "expo-image";
import {
  Pressable,
  Text,
  View,
} from "react-native";
import Skeleton from "../../../src/shared/components/Skeleton/Skeleton";
import { VideoProgressBar } from "../../../src/shared/components/VideoProgressBar/VideoProgressBar";
import { getCachedDurationMs } from "../../../src/features/media/components/VideoCard/player/durationCache";
import { normalizeDurationMs } from "../../../src/shared/media/normalizeDurationMs";
import { getBestVideoUrl, getVideoUrlFromMedia } from "../../../src/shared/utils/videoUrlManager";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import { getBottomNavHeight } from "../../utils/responsiveOptimized";
import { UserProfileCache } from "../../utils/cache/UserProfileCache";
import { ReelsActionButtons } from "./ReelsActionButtons";
import { ReelsMenu } from "./ReelsMenu";
import { ReelsSpeakerInfo } from "./ReelsSpeakerInfo";
import ReelsVideoPlayer from "./ReelsVideoPlayer";
import type { VideoPlayer } from "expo-video";
import { posterUriFromMedia } from "../../../src/features/media/video-feed";
import { reelVideoKey } from "../reelScrollIndex";
import { beginReelTouch, reelTouchMovedDuringGesture } from "../reelAudible";
import { reelSharpFit } from "../reelFrame";
import { peekReelImageAspect, reelImageUri, rememberReelImageAspect } from "../reelMedia";
import { ReelMediaStage, ReelSharpPicture } from "./ReelMediaStage";

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
  onToggleVideoPlay: (videoKey?: string) => void;
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
  /** Uploader-only description editing. */
  canEditDescription?: boolean;
  onEditDescription?: () => void;
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
    screenWidth,
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
    canEditDescription,
    onEditDescription,
  } = props;

  const [localPosition, setLocalPosition] = useState(videoPosition);
  const [localDuration, setLocalDuration] = useState(() => {
    const id = String(videoData?._id || videoData?.id || "");
    return (
      videoDuration ||
      getCachedDurationMs(id) ||
      normalizeDurationMs(videoData?.duration) ||
      0
    );
  });

  // Memoize data processing
  const enriched = useMemo(() => UserProfileCache.enrichContentWithUserData(videoData), [videoData]);
  const speakerName = useMemo(() => getSpeakerName(enriched, "Creator"), [enriched, getSpeakerName]);
  const videoKey = useMemo(
    () => passedVideoKey || reelVideoKey(videoData, index),
    [passedVideoKey, videoData, index]
  );

  const videoUrl = useMemo(() => {
    const raw = getVideoUrlFromMedia(enriched);
    return raw ? getBestVideoUrl(raw) : null;
  }, [enriched]);
  const imageUri = useMemo(() => reelImageUri(enriched), [enriched]);
  const [imageAspect, setImageAspect] = useState<number | null>(() =>
    peekReelImageAspect(imageUri)
  );

  useEffect(() => {
    setImageAspect(peekReelImageAspect(imageUri));
  }, [imageUri]);

  const isPlaying = useGlobalVideoStore(
    (s) => s.playingVideos[videoKey] ?? false
  );
  const isMuted = useGlobalVideoStore(
    (s) => s.mutedVideos[videoKey] ?? false
  );
  const distance = Math.abs(index - currentIndex_state);
  const shouldMountPlayer = distance <= 1;
  const tapOriginRef = useRef<{ x: number; y: number } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleThisReel = () => {
    if (!videoUrl || imageUri) return;
    onToggleVideoPlay(videoKey);
  };
  const clearTapTimer = () => {
    if (!tapTimerRef.current) return;
    clearTimeout(tapTimerRef.current);
    tapTimerRef.current = null;
  };
  const waitingPoster = posterUriFromMedia(enriched);

  // Track if we should render skeletons
  const showSkeletons = isActive && !!videoUrl && !imageUri && (!isPlaying || !localDuration);

  /**
   * Adopt the parent's position/duration only when this item *becomes* active
   * (or the parent's duration first arrives).
   *
   * This used to depend on `videoPosition` too, which made it a two-way sync:
   * the player pushes position up to the parent while the parent pushed it back
   * down here, so a one-step rounding disagreement had each render schedule the
   * other's setState until React hit the update-depth limit. While active, the
   * player writes `localPosition` directly — this effect must not fight it.
   */
  useEffect(() => {
    if (!isActive) return;
    if (!isDragging) setLocalPosition(videoPosition);
    // A 0 from the parent is "not loaded yet", not a real length. Copying it
    // wiped the duration the feed card already knew (stuck at 0:00 / 0:00).
    if (videoDuration > 0) setLocalDuration(videoDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, videoDuration]);

  if (!enriched || !enriched.title || (!videoUrl && !imageUri)) {
    return (
      <View style={{ height: screenHeight, width: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 16 }}>{!videoUrl && !imageUri ? "Media not available" : "Invalid media"}</Text>
      </View>
    );
  }

  return (
    <View
      collapsable={false}
      style={{
        height: screenHeight,
        width: screenWidth,
        backgroundColor: "#000",
      }}
    >
      {videoUrl && !imageUri && shouldMountPlayer ? (
        <ReelsVideoPlayer
          videoKey={videoKey}
          contentId={String(enriched._id || enriched.id || "")}
          videoUrl={videoUrl}
          screenHeight={screenHeight}
          screenWidth={screenWidth}
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
          globalVideoStore={globalVideoStore}
          showPauseOverlay={showPauseOverlay}
          getResponsiveSize={getResponsiveSize}
          triggerHapticFeedback={triggerHapticFeedback}
        />
      ) : videoUrl && !imageUri && waitingPoster ? (
        <Image
          source={{ uri: waitingPoster }}
          style={{ width: screenWidth, height: screenHeight }}
          contentFit="cover"
          cachePolicy="memory-disk"
          pointerEvents="none"
        />
      ) : imageUri ? (
        <ReelMediaStage
          mediaKey={imageUri || videoKey}
          boxWidth={screenWidth}
          boxHeight={screenHeight}
          aspect={imageAspect}
          blurUri={null}
          blurSource={null}
        >
          {(fitted) => (
            <ReelSharpPicture
              uri={imageUri}
              contentFit={reelSharpFit(fitted)}
              onAspect={
                imageUri
                  ? (next) => {
                      rememberReelImageAspect(imageUri, next);
                      setImageAspect((current) =>
                        current != null && Math.abs(current - next) < 0.01
                          ? current
                          : next
                      );
                    }
                  : undefined
              }
            />
          )}
        </ReelMediaStage>
      ) : null}

      <Pressable
        onPressIn={(event) => {
          beginReelTouch();
          tapOriginRef.current = {
            x: event.nativeEvent.pageX,
            y: event.nativeEvent.pageY,
          };
          clearTapTimer();
          // iOS delivers this only after the list decides the touch is a tap.
          // Android delivers it at finger-down, so a timer here pauses the
          // reel the moment the title and buttons finish appearing.
          if (isIOS) {
            tapTimerRef.current = setTimeout(() => {
              tapTimerRef.current = null;
              if (reelTouchMovedDuringGesture()) return;
              toggleThisReel();
            }, 32);
          }
        }}
        onPressOut={(event) => {
          const start = tapOriginRef.current;
          tapOriginRef.current = null;
          if (!start) return;
          const dx = Math.abs(event.nativeEvent.pageX - start.x);
          const dy = Math.abs(event.nativeEvent.pageY - start.y);
          const scrolled = dx > 10 || dy > 10 || reelTouchMovedDuringGesture();
          if (scrolled) {
            clearTapTimer();
            return;
          }
          if (tapTimerRef.current) {
            clearTapTimer();
            toggleThisReel();
            return;
          }
          if (!isIOS) toggleThisReel();
        }}
        unstable_pressDelay={0}
        android_disableSound
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          // Android was letting this layer sit on the heart, comment, save, and share.
          right: isIOS ? 0 : 112,
          bottom: isIOS ? 48 : 210,
          zIndex: isIOS ? 8 : 40,
          elevation: isIOS ? 0 : 48,
        }}
      />

      {showSkeletons && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: getResponsiveSpacing(12, 16, 20),
            zIndex: 9,
          }}
        >
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
            contentId={String(
              enriched._id || enriched.id || currentVideo?._id || currentVideo?.id || ""
            )}
            screenHeight={screenHeight}
            activeIsLiked={activeIsLiked}
            activeLikesCount={activeLikesCount}
            canUseBackendLikes={canUseBackendLikes}
            videoStats={videoStats}
            video={video}
            enrichedVideoData={enriched}
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
            canEditDescription={canEditDescription}
            onEditDescription={onEditDescription}
          />
          <ReelsMenu
            visible={menuVisible}
            modalKey={modalKey}
            contentId={String(
              enriched._id || enriched.id || currentVideo?._id || currentVideo?.id || ""
            )}
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

      {isActive && videoUrl && !imageUri ? (
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
          knobSize={8}
          knobSizeDragging={12}
          trackHeights={{ normal: 4, dragging: 8 }}
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