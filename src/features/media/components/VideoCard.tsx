import { useVideoPlayer } from "expo-video";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import { useMediaDeletion } from "../../../shared/hooks";
import { useContentActionModal } from "../../../shared/hooks/useContentActionModal";
import { isAdmin } from "../../../../app/utils/mediaDeleteAPI";
import { useVideoPlaybackControl } from "../../../shared/hooks/useVideoPlaybackControl";
import { VideoCardProps } from "../../../shared/types";
import { mediaApi } from "../../../core/api/MediaApi";
import { isValidUri } from "../../../shared/utils";
import {
    getBestVideoUrl,
    getVideoUrlFromMedia,
    handleVideoError as handleVideoErrorUtil,
} from "../../../shared/utils/videoUrlManager";
import { isAudioSermon, detectMediaType } from "../../../shared/utils";
import { VideoCardFooter } from "./VideoCard/VideoCardFooter";
import { VideoCardModals } from "./VideoCard/VideoCardModals";
import { VideoCardPlayerArea } from "./VideoCard/VideoCardPlayerArea";
import { useVideoCardInteractionStats } from "./VideoCard/hooks/useVideoCardInteractionStats";
import { useVideoCardPlayback } from "./VideoCard/hooks/useVideoCardPlayback";
import { useVideoCardSeek } from "./VideoCard/hooks/useVideoCardSeek";
import { useVideoCardTapLogic } from "./VideoCard/hooks/useVideoCardTapLogic";

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  index,
  modalKey,
  contentStats,
  userFavorites,
  globalFavoriteCounts,
  playingVideos,
  mutedVideos,
  progresses,
  videoVolume,
  currentlyVisibleVideo,
  onVideoTap,
  onTogglePlay,
  onToggleMute,
  onFavorite,
  onComment,
  onSave,
  onDownload,
  onShare,
  onDelete,
  onModalToggle,
  modalVisible,
  comments,
  checkIfDownloaded,
  getContentKey,
  getTimeAgo,
  getUserDisplayNameFromContent,
  getUserAvatarFromContent,
  onLayout,
  isAutoPlayEnabled = false,
}) => {
  const contentId = video._id || getContentKey(video);
  const key = getContentKey(video);
  const isMuted = mutedVideos[key] ?? false; // Ensure boolean, never undefined
  const progress = progresses[key] || 0;
  
  // View tracking state (thresholds: 3s or 25%, or completion) - declared early for use in useEffect
  const [hasTrackedView, setHasTrackedView] = useState(false);
  
  // Get duration from backend metadata (in seconds) as fallback
  const backendDurationSeconds = (video as any)?.duration;
  const backendDurationMs = backendDurationSeconds && Number.isFinite(backendDurationSeconds) && backendDurationSeconds > 0
    ? (backendDurationSeconds < 86400 ? backendDurationSeconds * 1000 : backendDurationSeconds) // Convert seconds to ms if < 24h, otherwise assume already ms
    : 0;

  // ✅ Use centralized utility for media type detection
  const mediaType = detectMediaType(video);
  const isAudioSermonValue = isAudioSermon(video);

  // Get video URL with proper fallbacks: fileUrl > playbackUrl > hlsUrl
  // NEVER use thumbnailUrl or imageUrl for video playback!
  const rawVideoUrl = !isAudioSermonValue ? getVideoUrlFromMedia(video) : null;
  const initialVideoUrl = rawVideoUrl && isValidUri(rawVideoUrl)
    ? getBestVideoUrl(rawVideoUrl)
    : null;

  // Resolved URL from backend (fresh playback URL on retry – Redis/CDN pattern)
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const effectiveVideoUrl = resolvedVideoUrl ?? initialVideoUrl;
  const videoUrl = effectiveVideoUrl;

  const hasTriedFreshUrlRef = useRef(false);

  // Initialize refs before useVideoPlayer hook (needed in callback)
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  const player = useVideoPlayer(videoUrl || "", (player) => {
    player.loop = false;
    player.muted = isMuted ?? false; // Ensure boolean, never undefined
    player.volume = (videoVolume ?? 1.0); // Ensure number, never undefined
    // Required: when 0, timeUpdate never fires; progress bar circle stays stuck
    player.timeUpdateEventInterval = 0.25; // Emit every 250ms for smooth progress updates
    // Pre-load video source for faster playback on subsequent loads
    if (videoUrl) {
      // Clear any existing timeout
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
      // Player will automatically load the source, but we can ensure it's ready
      // by checking status after a brief delay
      preloadTimeoutRef.current = setTimeout(() => {
        // Check if component is still mounted and player is still valid
        if (!isMountedRef.current) {
          return;
        }
        try {
          // Safely check player status - player may have been released
          if (player && typeof player.playing === 'boolean') {
            // Pre-buffer the video without playing
            // This ensures faster response when play is pressed
          }
        } catch (error) {
          // Player was released, ignore silently
          if (__DEV__) {
            console.warn('Video player was released before timeout callback:', error);
          }
        }
      }, 100) as NodeJS.Timeout;
    }
  });
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  // ✅ Persist video loaded state across re-renders for better UX (no thumbnails on revisit)
  const videoLoadedRef = useRef(false);
  const storeRef = useRef<any>(null);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isModalVisible, openModal, closeModal } = useContentActionModal();
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  
  // Check if user is admin
  useEffect(() => {
    isAdmin().then(setUserIsAdmin).catch(() => setUserIsAdmin(false));
  }, []);
  
  // Delete media functionality - using reusable hook
  const {
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm: handleDeleteConfirmInternal,
  } = useMediaDeletion({
    mediaItem: video,
    isModalVisible: isModalVisible || modalVisible === modalKey,
    onDeleteSuccess: (deletedVideo) => {
      closeModal();
      if (onDelete) {
        onDelete(deletedVideo);
      }
    },
  });

  // Handle delete button press
  const handleDeletePress = useCallback(() => {
    openDeleteModal();
  }, [openDeleteModal]);

  // Handle delete confirmation - DeleteMediaConfirmation handles deletion, this just updates UI
  const handleDeleteConfirm = useCallback(async () => {
    closeDeleteModal();
    closeModal();
    if (onDelete) {
      onDelete(video);
    }
  }, [video, closeDeleteModal, closeModal, onDelete]);

  // Update player settings when mute/volume changes
  useEffect(() => {
    if (player) {
      player.muted = isMuted;
      player.volume = videoVolume;
    }
  }, [player, isMuted, videoVolume]);

  // Sync playback state with global store
  const {
    isPlaying,
    toggle: togglePlayback,
    shouldPlayThisVideo,
  } = useVideoPlaybackControl({
    videoKey: key,
    videoRef: { current: player } as any, // Adapter for expo-video player
    enableAutoPlay: false, // Manual play only - Instagram/TikTok style
  });

  // Sync player playback with global state
  useEffect(() => {
    if (!player) return;
    
    if (shouldPlayThisVideo && !player.playing) {
      player.play();
    } else if (!shouldPlayThisVideo && player.playing) {
      player.pause();
    }
  }, [player, shouldPlayThisVideo]);

  // Video player registry is now handled by useVideoPlaybackControl hook

  // Overlay management: simple state based on play status
  const showOverlayTemporarily = useCallback(() => {
    setShowOverlay(true);
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    // Optional: auto-hide after a few seconds while playing
    overlayTimeoutRef.current = setTimeout(() => {
      setShowOverlay(false);
    }, 3000) as any;
  }, []);

  const hideOverlay = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    setShowOverlay(false);
  }, []);

  const showOverlayPermanently = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    setShowOverlay(true);
  }, []);

  // Handle external playing state changes (e.g., from scrolling)
  useEffect(() => {
    // State change handled silently for performance

    // When video is paused externally (like from scrolling), show overlay icon
    if (!isPlaying) {
      // Show play icon overlay persistently when paused
      showOverlayPermanently();
    } else {
      // When this video starts playing, briefly show a dimmed pause overlay
      // and then fade it away so the content is fully visible.
      showOverlayTemporarily();
    }
  }, [
    isPlaying,
    video.title,
    key,
    videoLoaded,
    showOverlayPermanently,
    showOverlayTemporarily,
  ]);

  // Initialize overlay state on mount - always show overlay initially
  useEffect(() => {
    showOverlayPermanently(); // Always show play icon on mount
  }, [showOverlayPermanently]); // Only run on mount

  // Audio player for audio sermons - must be before useVideoCardTapLogic (which uses audioState)
  const audioUrl =
    isAudioSermonValue && isValidUri(video.fileUrl) ? video.fileUrl : null;
  const [audioStateRaw, audioControls] = useAdvancedAudioPlayer(audioUrl, {
    audioKey: key,
    autoPlay: false,
    loop: false,
    volume: videoVolume,
    onPlaybackStatusUpdate: (status) => {
      if (status.duration > 0) {
        // Progress tracked by parent
      }
    },
    onError: (error) => {
      console.error(`❌ Audio sermon error for ${video.title}:`, error);
      setFailedVideoLoad(true);
    },
    onFinished: () => {},
  });
  // Defensive: ensure audioState is never undefined (avoids "Cannot read property 'isPlaying' of undefined")
  const audioState = audioStateRaw ?? {
    isPlaying: false,
    isLoading: false,
    isMuted: false,
    progress: 0,
    duration: 0,
    position: 0,
    error: null,
  };

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

  // Handle hover start - no autoplay functionality
  const handleHoverStart = useCallback(() => {
    // No autoplay - user must manually click to play
  }, [video.title]);

  // Handle hover end - video continues playing until scrolled past
  const handleHoverEnd = useCallback(() => {}, [video.title]);

  // Handle mute toggle
  const handleToggleMute = useCallback(() => {
    if (isAudioSermonValue) {
      // Handle audio sermon mute/unmute
      audioControls.toggleMute();
    } else {
      // Handle video mute/unmute
      onToggleMute(key);
    }
  }, [onToggleMute, key, isAudioSermonValue, audioState?.isMuted, audioControls]);

  // Fetch fresh playback URL from backend (Redis/CDN pattern – backend can return new signed or CDN URL)
  const fetchFreshPlaybackUrl = useCallback(async () => {
    if (!contentId || hasTriedFreshUrlRef.current || isAudioSermonValue) return;
    hasTriedFreshUrlRef.current = true;
    try {
      const result = await mediaApi.getMediaById(contentId);
      if (!result.success || !result.data) return;
      const data = result.data as any;
      const raw =
        data.fileUrl ?? data.playbackUrl ?? data.hlsUrl ?? data.url ?? "";
      if (!raw || typeof raw !== "string" || !isValidUri(raw)) return;
      const newUrl = getBestVideoUrl(raw.trim());
      if (isMountedRef.current && newUrl) {
        setResolvedVideoUrl(newUrl);
        setFailedVideoLoad(false);
        if (__DEV__) {
          console.log(
            `🔄 VideoCard: using fresh playback URL for ${video.title} (Redis/CDN retry)`
          );
        }
      }
    } catch (e) {
      if (__DEV__) console.warn("Fresh playback URL fetch failed:", e);
    }
  }, [contentId, isAudioSermonValue, video.title]);

  // Handle video error with intelligent retry: try fresh URL from backend first (Redis/CDN), then legacy retry
  const handleVideoError = useCallback(
    (error: any) => {
      const errorAnalysis = handleVideoErrorUtil(
        error,
        video.fileUrl,
        video.title
      );

      setFailedVideoLoad(true);

      // 1) Try fresh playback URL from backend (e.g. new signed URL or CDN URL from Redis)
      fetchFreshPlaybackUrl();

      // 2) Legacy: if retryable (e.g. expired signed URL), also allow UI retry after delay
      if (errorAnalysis.isRetryable) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setFailedVideoLoad(false);
          }
        }, 3000);
      }
    },
    [video.title, video.fileUrl, fetchFreshPlaybackUrl]
  );

  const {
    lastKnownDurationRef,
    videoPositionMs,
    videoProgress,
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
  });

  const { seekToPercent } = useVideoCardSeek({
    isAudioSermon: isAudioSermonValue,
    audioState,
    audioControls,
    player,
    videoPositionMs,
    lastKnownDurationRef,
    backendDurationMs,
  });

  // Note: Video player registration is now handled by useVideoPlaybackControl hook
  // This ensures proper registration/unregistration and prevents duplicate registrations

  // Note: Video playback sync is now handled by useVideoPlaybackControl hook
  // This useEffect is removed to prevent auto-play issues

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear preload timeout
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
        preloadTimeoutRef.current = null;
      }
      // Clear overlay timeout
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
      // Clear tap timeout
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const {
    likeCount,
    saveCount,
    commentCount,
    viewCount,
    userLikeState,
    userSaveState,
    isLoadingStats,
  } = useVideoCardInteractionStats({
    video,
    contentId,
    contentKey: key,
    contentStats,
    userFavorites,
    globalFavoriteCounts,
  });

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch {}
  }, []);

  const thumbnailSource = video?.imageUrl || video?.thumbnailUrl;
  const thumbnailUri =
    typeof thumbnailSource === "string"
      ? thumbnailSource
      : (thumbnailSource as any)?.uri;

  return (
    <View
      key={modalKey}
      className="flex flex-col mb-16"
      style={{ marginBottom: 64 }} // Extra spacing for better detection
      onLayout={
        onLayout
          ? (event) => onLayout(event, key, "video", video.fileUrl)
          : undefined
      }
    >
      <VideoCardPlayerArea
        video={video}
        contentKey={key}
        index={index}
        videoUrl={videoUrl}
        failedVideoLoad={failedVideoLoad}
        isAudioSermon={isAudioSermonValue}
        player={player}
        thumbnailUri={thumbnailUri}
        videoLoaded={videoLoaded}
        videoLoadedRef={videoLoadedRef}
        showOverlay={showOverlay}
        isPlaying={isPlaying}
        audioState={audioState}
        videoProgress={videoProgress}
        videoPositionMs={videoPositionMs}
        lastKnownDurationRef={lastKnownDurationRef}
        backendDurationMs={backendDurationMs}
        isMuted={isMuted}
        onVideoTap={onVideoTap}
        handleVideoTap={handleVideoTap}
        handleHoverStart={handleHoverStart}
        handleHoverEnd={handleHoverEnd}
        handleTogglePlay={handleTogglePlay}
        setIsPlayTogglePending={setIsPlayTogglePending}
        isPlayTogglePending={isPlayTogglePending}
        handleToggleMute={handleToggleMute}
        seekToPercent={seekToPercent}
      />

      <VideoCardFooter
        video={video}
        contentKey={key}
        modalKey={modalKey}
        contentId={contentId}
        getUserAvatarFromContent={getUserAvatarFromContent}
        getUserDisplayNameFromContent={getUserDisplayNameFromContent}
        getTimeAgo={getTimeAgo}
        viewCount={viewCount}
        userLikeState={userLikeState}
        likeCount={likeCount}
        likeBurstKey={likeBurstKey}
        setLikeBurstKey={setLikeBurstKey}
        onFavorite={onFavorite}
        onComment={onComment}
        commentCount={commentCount}
        userSaveState={userSaveState}
        saveCount={saveCount}
        onSave={onSave}
        onShare={onShare}
        isLoadingStats={isLoadingStats}
        openModal={openModal}
        onModalToggle={onModalToggle}
      />

      <VideoCardModals
        isModalVisible={isModalVisible}
        modalVisible={modalVisible}
        modalKey={modalKey}
        onModalToggle={onModalToggle}
        closeModal={closeModal}
        setShowDetailsModal={setShowDetailsModal}
        onSave={onSave}
        video={video}
        contentStats={contentStats}
        contentId={contentId}
        checkIfDownloaded={checkIfDownloaded}
        handleDeletePress={handleDeletePress}
        userIsAdmin={userIsAdmin}
        isOwner={isOwner}
        showDeleteModal={showDeleteModal}
        closeDeleteModal={closeDeleteModal}
        handleDeleteConfirm={handleDeleteConfirm}
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        showDetailsModal={showDetailsModal}
        onDownload={onDownload}
      />

      {/* AI Description Box removed in src version; exists only in app layer */}

      {/* Modal */}
      {/* Legacy inline popover removed in favor of sliding modal */}
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders while still responding to interaction updates
export default memo(VideoCard);
