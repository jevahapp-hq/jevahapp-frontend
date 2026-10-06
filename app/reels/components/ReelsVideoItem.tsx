import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type MutableRefObject } from "react";
import {
  Pressable,
  StyleSheet,
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
import {
  layoutAspectFromMedia,
  videoSourceUrls,
} from "../../../src/features/media/video-feed/displayedVideoAspect";
import { rememberFeedVideoAspect } from "../../../src/features/media/video-feed/feedVideoAspectCache";
import { ensureDisplayedAspect } from "../../../src/features/media/video-feed/measureDisplayedAspect";
import { reelVideoKey } from "../reelScrollIndex";
import { beginReelTouch, getAudibleReel, androidReelMayHear, reelTouchMovedDuringGesture, subscribeAudibleReel } from "../reelAudible";
import { getPlayhead } from "../../../src/features/media/video-feed/playheadCache";
import {
  getReelDurationMs,
  getReelPositionMs,
  publishReelPlayheadNow,
  reelPlayheadSnapshot,
  subscribeReelPlayhead,
} from "../reelPlayheadStore";
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
  /** False right after opening, while the feed is still releasing its players. */
  neighborPlayers?: boolean;
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
    videoDuration,
    videoPosition: _videoPosition,
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

  const knownDurationMs = useMemo(() => {
    const id = String(videoData?._id || videoData?.id || "");
    return (
      videoDuration ||
      getCachedDurationMs(id) ||
      normalizeDurationMs(videoData?.duration) ||
      0
    );
  }, [videoData, videoDuration]);
  const [durationReady, setDurationReady] = useState(
    () => knownDurationMs > 0 || getReelDurationMs(passedVideoKey || reelVideoKey(videoData, index)) > 0
  );
  const setLocalPosition = useCallback(
    (ms: number) => {
      publishReelPlayheadNow(passedVideoKey || reelVideoKey(videoData, index), ms);
    },
    [passedVideoKey, videoData, index]
  );
  const setLocalDuration = useCallback(
    (ms: number) => {
      const key = passedVideoKey || reelVideoKey(videoData, index);
      publishReelPlayheadNow(key, getReelPositionMs(key), ms);
      setDurationReady(true);
    },
    [passedVideoKey, videoData, index]
  );

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

  // Boolean snapshot: a swipe only re-renders the page you left and the page
  // you landed on. Returning the audible key re-rendered every mounted reel.
  const showChrome = useSyncExternalStore(
    subscribeAudibleReel,
    () => {
      const key = getAudibleReel();
      if (key == null) return isActive && androidReelMayHear(videoKey);
      return key === videoKey;
    },
    () => isActive && androidReelMayHear(videoKey)
  );
  const isPlaying = useGlobalVideoStore(
    (s) => s.playingVideos[videoKey] ?? false
  );
  const isMuted = useGlobalVideoStore(
    (s) => s.mutedVideos[videoKey] ?? false
  );
  // Neighbors load paused, so a swipe lands on a painted frame instead of a
  // black page or cover art while a new player starts from nothing.
  const shouldMountPlayer = hasPlayerSlot(props);
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
  useEffect(() => {
    if (!videoUrl) return;
    const urls = videoSourceUrls(enriched, videoUrl);
    const stored = layoutAspectFromMedia(enriched);
    if (stored != null) {
      for (const source of urls) rememberFeedVideoAspect(source, stored);
      return;
    }
    ensureDisplayedAspect(videoUrl, { allowPlayer: false, also: urls, priority: isActive });
  }, [videoUrl, enriched, isActive]);

  const showSkeletons =
    showChrome && !!videoUrl && !imageUri && !durationReady && knownDurationMs <= 0;

  useEffect(() => {
    if (!videoUrl) return;
    const savedMs = getPlayhead(videoUrl) * 1000;
    const existing = getReelPositionMs(videoKey);
    const duration = getReelDurationMs(videoKey) || knownDurationMs;
    if (existing <= 0 && savedMs > 150) {
      publishReelPlayheadNow(videoKey, savedMs, duration || undefined);
    } else if (duration > 0 && getReelDurationMs(videoKey) !== duration) {
      publishReelPlayheadNow(videoKey, existing, duration);
    }
    if ((duration || savedMs) > 0) setDurationReady(true);
  }, [videoKey, videoUrl, knownDurationMs]);

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
          posterUri={null}
          screenHeight={screenHeight}
          screenWidth={screenWidth}
          isActive={isActive}
          warmNext={index === props.currentIndex_state + 1}
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

      <View pointerEvents="box-none" collapsable={false} style={styles.chrome}>
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
          const scrolled =
            dx > 28 ||
            dy > 28 ||
            (isIOS && reelTouchMovedDuringGesture());
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
          zIndex: 8,
          elevation: 0,
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

      <View pointerEvents="box-none" style={styles.chrome}>
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
            visible={menuVisible && showChrome}
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
          {videoUrl && !imageUri ? (
            <ReelScrubber
              videoKey={videoKey}
              fallbackDurationMs={knownDurationMs}
              isMuted={isMuted}
              onToggleMute={() => onToggleMute(videoKey)}
              onSeek={onSeek}
              onScrubStart={() => setIsDragging(true)}
              onScrubEnd={() => setIsDragging(false)}
              bottomOffset={getBottomNavHeight() + getResponsiveSpacing(6, 8, 10)}
            />
          ) : null}
      </View>
      </View>
    </View>
  );
}, sameReelRender);

const ReelScrubber = memo(function ReelScrubber({
  videoKey,
  fallbackDurationMs,
  isMuted,
  onToggleMute,
  onSeek,
  onScrubStart,
  onScrubEnd,
  bottomOffset,
}: {
  videoKey: string;
  fallbackDurationMs: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onSeek: (videoKey: string, position: number) => void;
  onScrubStart: () => void;
  onScrubEnd: () => void;
  bottomOffset: number;
}) {
  const head = useSyncExternalStore(
    (listener) => subscribeReelPlayhead(videoKey, listener),
    () => reelPlayheadSnapshot(videoKey),
    () => reelPlayheadSnapshot(videoKey)
  );
  const durationMs = head.durationMs > 0 ? head.durationMs : fallbackDurationMs;
  return (
    <VideoProgressBar
      progress={durationMs > 0 ? head.positionMs / durationMs : 0}
      currentMs={head.positionMs}
      durationMs={durationMs}
      isMuted={isMuted}
      onToggleMute={onToggleMute}
      onSeekToPercent={(pct: number) => {
        const clamped = Math.max(0, Math.min(1, pct));
        if (durationMs > 0) {
          publishReelPlayheadNow(videoKey, clamped * durationMs, durationMs);
        }
        onSeek(videoKey, clamped);
      }}
      onScrubStart={onScrubStart}
      onScrubEnd={onScrubEnd}
      showControls
      bottomOffset={bottomOffset}
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
  );
});

const styles = StyleSheet.create({
  chrome: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    elevation: 40,
    backgroundColor: "transparent",
  },
});

function hasPlayerSlot(props: ReelsVideoItemProps): boolean {
  const distance = Math.abs(props.index - props.currentIndex_state);
  return distance === 0 || (distance === 1 && props.neighborPlayers !== false);
}

/**
 * A reel that stays off screen only cares about its own media and whether
 * its player is mounted. Every other prop belongs to the reel on screen, and
 * re-rendering all mounted pages on each swipe delayed the next swipe's
 * pause/play on Android.
 */
function sameReelRender(
  prev: ReelsVideoItemProps,
  next: ReelsVideoItemProps
): boolean {
  if (prev.isActive || next.isActive) {
    const keys = Object.keys(next) as (keyof ReelsVideoItemProps)[];
    if (keys.length !== Object.keys(prev).length) return false;
    return keys.every(
      (key) => key === "videoPosition" || prev[key] === next[key]
    );
  }
  const warming = (item: ReelsVideoItemProps) =>
    item.index === item.currentIndex_state + 1;
  return (
    prev.videoData === next.videoData &&
    prev.index === next.index &&
    prev.passedVideoKey === next.passedVideoKey &&
    prev.screenHeight === next.screenHeight &&
    prev.screenWidth === next.screenWidth &&
    prev.isIOS === next.isIOS &&
    prev.source === next.source &&
    hasPlayerSlot(prev) === hasPlayerSlot(next) &&
    warming(prev) === warming(next)
  );
}