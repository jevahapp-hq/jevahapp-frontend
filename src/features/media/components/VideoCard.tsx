import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Image, Text, TouchableWithoutFeedback, View } from "react-native";
import { DeleteMediaConfirmation } from "../../../../app/components/DeleteMediaConfirmation";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import { VideoCardSkeleton } from "../../../shared/components";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import { ContentTypeBadge } from "../../../shared/components/ContentTypeBadge";
import MediaDetailsModal from "../../../shared/components/MediaDetailsModal";
import { MediaPlayButton } from "../../../shared/components/MediaPlayButton";
import ReportMediaModal from "../../../shared/components/ReportMediaModal";
import ThreeDotsMenuButton from "../../../shared/components/ThreeDotsMenuButton/ThreeDotsMenuButton";
import { VideoProgressBar } from "../../../shared/components/VideoProgressBar";
import { useMediaDeletion } from "../../../shared/hooks";
import { useContentActionModal } from "../../../shared/hooks/useContentActionModal";
import { useHydrateContentStats } from "../../../shared/hooks/useHydrateContentStats";
import { useVideoPlaybackControl } from "../../../shared/hooks/useVideoPlaybackControl";
import { VideoCardProps } from "../../../shared/types";
import { getUploadedBy, isValidUri } from "../../../shared/utils";
import {
  getBestVideoUrl,
  handleVideoError as handleVideoErrorUtil,
} from "../../../shared/utils/videoUrlManager";

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

  // Media type detection - needs to be before useVideoPlayer
  const getMediaType = useCallback(() => {
    const contentType = video.contentType?.toLowerCase() || "";

    // Handle sermons - can be audio or video based on file extension
    if (contentType === "sermon") {
      const fileUrl = video.fileUrl?.toLowerCase() || "";
      if (
        fileUrl.includes(".mp4") ||
        fileUrl.includes(".mov") ||
        fileUrl.includes(".avi") ||
        fileUrl.includes(".webm") ||
        fileUrl.includes(".mkv")
      ) {
        return "video";
      }
      return "audio";
    }

    // Live, videos, and other video content types are all videos
    if (
      contentType === "live" ||
      contentType === "video" ||
      contentType === "videos"
    ) {
      return "video";
    }

    // Default to video for any other content type with a video file
    return "video";
  }, [video.contentType, video.fileUrl]);

  const mediaType = getMediaType();
  const isAudioSermon = mediaType === "audio";

  const videoUrl = !isAudioSermon && isValidUri(video.fileUrl) 
    ? getBestVideoUrl(video.fileUrl)
    : null;
  const player = useVideoPlayer(videoUrl || "", (player) => {
    player.loop = false;
    player.muted = isMuted ?? false; // Ensure boolean, never undefined
    player.volume = (videoVolume ?? 1.0); // Ensure number, never undefined
  });
  const isMountedRef = useRef(true);
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showCommentModal } = useCommentModal();
  const { isModalVisible, openModal, closeModal } = useContentActionModal();
  
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

  // Double-tap detection
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);


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
    console.log(
      `🎬 VideoCard ${video.title} playing state changed externally:`,
      {
        key,
        isPlaying,
        playingVideos: Object.keys(playingVideos).filter(
          (k) => playingVideos[k]
        ),
        videoLoaded,
        videoRefExists: !!player,
      }
    );

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

  // Audio player for audio sermons
  const audioUrl =
    isAudioSermon && isValidUri(video.fileUrl) ? video.fileUrl : null;
  const [audioState, audioControls] = useAdvancedAudioPlayer(audioUrl, {
    audioKey: key,
    autoPlay: false,
    loop: false,
    volume: videoVolume,
    onPlaybackStatusUpdate: (status) => {
      // Update global progress for audio sermons
      if (status.duration > 0) {
        const audioProgress = status.position / status.duration;
        // This will be handled by the parent component's progress tracking
      }
    },
    onError: (error) => {
      console.error(`❌ Audio sermon error for ${video.title}:`, error);
      setFailedVideoLoad(true);
    },
    onFinished: () => {
      // Audio playback completed
    },
  });

  // Track last known duration from playback updates
  const lastKnownDurationRef = useRef(0);
  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
      if (isAudioSermon) {
        // Handle audio seeking
        const currentPosition = audioState.position;
        const duration = audioState.duration;
        if (duration <= 0) return;
        const nextMs = Math.max(
          0,
          Math.min(currentPosition + deltaSec * 1000, duration)
        );
        try {
          await audioControls.seekTo(nextMs);
        } catch (e) {
          console.warn("Audio seekBySeconds failed", e);
        }
      } else {
        // Handle video seeking with expo-video
        const durationMs = lastKnownDurationRef.current || 0;
        if (!player || durationMs <= 0) return;
        const currentMs = Math.max(
          0,
          Math.min(progress * durationMs, durationMs)
        );
        const nextMs = Math.max(
          0,
          Math.min(currentMs + deltaSec * 1000, durationMs)
        );
        try {
          player.currentTime = nextMs / 1000; // expo-video uses seconds
        } catch (e) {
          console.warn("Video seekBySeconds failed", e);
        }
      }
    },
    [
      progress,
      isAudioSermon,
      audioState.position,
      audioState.duration,
      audioControls,
      player,
    ]
  );

  const seekToPercent = useCallback(
    async (percent: number) => {
      if (isAudioSermon) {
        // Handle audio seeking
        const duration = audioState.duration;
        if (duration <= 0) return;
        const clamped = Math.max(0, Math.min(percent, 1));
        try {
          await audioControls.seekTo(clamped * duration);
        } catch (e) {
          console.warn("Audio seekToPercent failed", e);
        }
      } else {
        // Handle video seeking with expo-video
        const durationMs = lastKnownDurationRef.current || 0;
        if (!player || durationMs <= 0) return;
        const clamped = Math.max(0, Math.min(percent, 1));
        try {
          player.currentTime = (clamped * durationMs) / 1000; // expo-video uses seconds
        } catch (e) {
          console.warn("Video seekToPercent failed", e);
        }
      }
    },
    [isAudioSermon, audioState.duration, audioControls, player]
  );

  // Handle hover start - no autoplay functionality
  const handleHoverStart = useCallback(() => {
    console.log(`👆 Hover started on video: ${video.title}`);
    // No autoplay - user must manually click to play
  }, [video.title]);

  // Handle video area tap - SIMPLIFIED & RELIABLE
  const handleVideoTap = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    const isCurrentlyPlaying =
      isPlaying || (isAudioSermon && audioState.isPlaying);

    // Reset if too much time passed (400ms window for double-tap)
    if (timeSinceLastTap > 400) {
      tapCountRef.current = 0;
    }

    tapCountRef.current += 1;
    lastTapRef.current = now;

    // Clear any existing timeout
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    // Double-tap detected (2 taps within time window)
    if (tapCountRef.current === 2 && timeSinceLastTap <= 400) {
      console.log("👆👆 Double tap - navigating to reels");
      tapCountRef.current = 0;

      // Pause if playing
      if (isCurrentlyPlaying) {
        if (isAudioSermon) {
          audioControls.pause();
        } else {
          // Use modular hook for pause
          togglePlayback();
          if (player) {
            try {
              player.pause();
            } catch (error) {
              console.error("❌ Pause failed:", error);
            }
          }
        }
      }

      // Navigate to reels
      onVideoTap(key, video, index);
      return;
    }

    // Single tap - wait to confirm it's not a double-tap, then toggle (like reels mode)
    tapTimeoutRef.current = setTimeout(async () => {
      if (tapCountRef.current === 1) {
        if (isCurrentlyPlaying) {
          console.log("👆 Single tap - pausing video");
          showOverlayPermanently();

          if (isAudioSermon) {
            audioControls.pause();
          } else {
            // Use modular hook for pause
            togglePlayback();
            if (player) {
              try {
                player.pause();
              } catch (error) {
                console.error("❌ Pause failed:", error);
              }
            }
          }
        } else {
          console.log(
            "👆 Single tap on paused video - no action (play icon handles it)"
          );
        }
      }

      tapCountRef.current = 0;
      tapTimeoutRef.current = null;
    }, 400) as any; // 400ms to detect double-tap
  }, [
    isPlaying,
    onTogglePlay,
    key,
    onVideoTap,
    video,
    index,
    showOverlayPermanently,
    isAudioSermon,
    audioControls,
    audioState.isPlaying,
    togglePlayback,
  ]);

  // Handle hover end - video continues playing until scrolled past
  const handleHoverEnd = useCallback(() => {
    console.log(`👆 Hover ended on video: ${video.title}`);
    // Don't pause on hover end - let it continue playing
    // Only pause when scrolled past or another video is hovered
  }, [video.title]);

  // Handle play/pause toggle - now using modular hook
  const handleTogglePlay = useCallback(async () => {
    if (isPlayTogglePending) return; // Prevent double-taps

    console.log(
      "🎮 VideoCard togglePlay called with key:",
      key,
      "isAudioSermon:",
      isAudioSermon,
      "currentlyPlaying:",
      isPlaying
    );

    // Clear any pending tap detection when play icon is clicked
    tapCountRef.current = 0;
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    setIsPlayTogglePending(true);

    if (isAudioSermon) {
      // Handle audio sermon play/pause
      if (audioState.isPlaying) {
        audioControls.pause();
        showOverlayPermanently();
      } else {
        hideOverlay();
        audioControls.play();
      }
    } else {
      // Use modular hook for video playback control
      togglePlayback();

      // Update overlay state
      if (isPlaying) {
        showOverlayPermanently();
      } else {
        hideOverlay();
      }
    }

    // Reset pending state
    setTimeout(() => {
      setIsPlayTogglePending(false);
    }, 150);
  }, [
    key,
    isPlayTogglePending,
    isAudioSermon,
    audioState.isPlaying,
    audioControls,
    isPlaying,
    togglePlayback,
    showOverlayPermanently,
    hideOverlay,
  ]);

  // Handle mute toggle
  const handleToggleMute = useCallback(() => {
    if (isAudioSermon) {
      // Handle audio sermon mute/unmute
      audioControls.toggleMute();
    } else {
      // Handle video mute/unmute
      onToggleMute(key);
    }
  }, [onToggleMute, key, isAudioSermon, audioState.isMuted, audioControls]);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  // Handle video error with intelligent retry mechanism
  const handleVideoError = useCallback(
    (error: any) => {
      // Use the enhanced error handler
      const errorAnalysis = handleVideoErrorUtil(
        error,
        video.fileUrl,
        video.title
      );

      // Set failed state
      setFailedVideoLoad(true);

      // If it's a retryable error (expired signed URL), retry with converted URL
      if (errorAnalysis.isRetryable) {
        console.log(`🔄 Retryable error detected - expired signed URL`);
        console.log(
          `🔧 Will retry with converted URL: ${errorAnalysis.suggestedUrl}`
        );

        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`🔄 Retrying video load for: ${video.title}`);
            setFailedVideoLoad(false);
          }
        }, 3000); // Retry after 3 seconds
      } else {
        console.log(`❌ Non-retryable error - network or server issue`);
      }
    },
    [video.title, video.fileUrl]
  );

  // Handle video load and progress tracking with expo-video
  useEffect(() => {
    if (!player || isAudioSermon) return;

    // Track duration when ready
    const statusSubscription = player.addListener('statusChange', (status) => {
      if (status.status === 'readyToPlay') {
        console.log(`✅ Video loaded successfully: ${video.title}`);
        setFailedVideoLoad(false);
        setVideoLoaded(true);
        if (player.duration) {
          lastKnownDurationRef.current = player.duration * 1000; // Convert to ms
        }
        
        if (isPlaying) {
          player.play();
        }
      } else if (status.status === 'error') {
        console.error(`❌ Video load error for ${video.title}:`, status);
        setFailedVideoLoad(true);
        handleVideoError(status);
      }
    });

    // Track progress and view completion
    const progressInterval = setInterval(() => {
      if (!player || !isMountedRef.current) return;
      
      const currentTime = player.currentTime || 0;
      const duration = player.duration || 0;
      const positionMs = currentTime * 1000;
      const durationMs = duration * 1000;
      const progress = durationMs > 0 ? positionMs / durationMs : 0;
      
      lastKnownDurationRef.current = durationMs;

      const qualifies = player.playing && (positionMs >= 3000 || progress >= 0.25);
      const finished = player.currentTime >= player.duration && player.duration > 0;

      // Auto-restart video when finished
      if (finished && isMountedRef.current) {
        try {
          player.currentTime = 0;
          if (player.playing) {
            player.play();
          }
        } catch (error) {
          console.warn("Failed to restart video:", error);
        }
      }

      // Track view
      if (!hasTrackedView && (qualifies || finished)) {
        try {
          contentInteractionAPI.recordView(
            contentId,
            "media",
            {
              durationMs: finished ? durationMs : positionMs,
              progressPct: Math.round(progress * 100),
              isComplete: finished,
            }
          ).then((result) => {
            setHasTrackedView(true);
            if (
              result?.totalViews != null &&
              storeRef.current?.mutateStats
            ) {
              storeRef.current.mutateStats(contentId, () => ({
                views: Number(result.totalViews) || 0,
              }));
            }
          }).catch(() => {});
        } catch {}
      }
    }, 1000);

    return () => {
      statusSubscription.remove();
      clearInterval(progressInterval);
    };
  }, [player, video.title, isPlaying, isAudioSermon, contentId, hasTrackedView]);

  // Note: Video player registration is now handled by useVideoPlaybackControl hook
  // This ensures proper registration/unregistration and prevents duplicate registrations

  // Note: Video playback sync is now handled by useVideoPlaybackControl hook
  // This useEffect is removed to prevent auto-play issues

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
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

  // Get interaction state
  const bookmarkCount =
    typeof (video as any)?.bookmarkCount === "number"
      ? (video as any).bookmarkCount
      : undefined;
  const stats = contentStats[contentId] || {};
  const fallbackLikeCount =
    globalFavoriteCounts[key] ??
    video.likeCount ??
    video.totalLikes ??
    video.likes ??
    video.favorite ??
    0;
  const fallbackSaveCount =
    video.saves ??
    video.saved ??
    (video as any)?.saveCount ??
    bookmarkCount ??
    0;
  const fallbackCommentCount =
    video.commentCount ??
    video.comments ??
    video.comment ??
    0;
  const fallbackViewCount =
    video.viewCount ??
    video.totalViews ??
    video.views ??
    0;
  const backendUserLiked =
    contentStats[contentId]?.userInteractions?.liked ??
    (video as any)?.hasLiked ??
    (video as any)?.userHasLiked ??
    userFavorites[key];
  const backendUserSaved =
    contentStats[contentId]?.userInteractions?.saved ??
    (video as any)?.hasBookmarked ??
    (video as any)?.isBookmarked;
  const userLikeState = Boolean(backendUserLiked);
  const userSaveState = Boolean(backendUserSaved);
  const likeCount =
    stats?.likes != null
      ? Math.max(stats.likes, fallbackLikeCount)
      : fallbackLikeCount;
  const saveCount =
    stats?.saves != null
      ? Math.max(stats.saves, fallbackSaveCount)
      : fallbackSaveCount;
  const commentCount =
    stats?.comments != null
      ? Math.max(stats.comments, fallbackCommentCount)
      : fallbackCommentCount;
  const viewCount =
    stats?.views != null
      ? Math.max(stats.views, fallbackViewCount)
      : fallbackViewCount;
  useHydrateContentStats(contentId, "media");

  // View tracking state (thresholds: 3s or 25%, or completion) & avatar fallback initial
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [avatarErrored, setAvatarErrored] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const storeRef = useRef<any>(null);
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch {}
  }, []);

  // Build formatted comments for the CommentIcon
  const currentComments = comments[contentId] || [];
  const formattedComments = currentComments.map((comment: any) => ({
    id: comment.id,
    userName: comment.username || "Anonymous",
    avatar: comment.userAvatar || "",
    timestamp: comment.timestamp,
    comment: comment.comment,
    likes: comment.likes || 0,
    isLiked: comment.isLiked || false,
  }));

  const thumbnailSource = video?.imageUrl || video?.thumbnailUrl;
  const thumbnailUri =
    typeof thumbnailSource === "string"
      ? thumbnailSource
      : (thumbnailSource as any)?.uri;

  let displayNameSafe: string = "Unknown";
  try {
    const maybe = getUserDisplayNameFromContent(video as any);
    displayNameSafe =
      typeof maybe === "string" && maybe.trim().length > 0 ? maybe : "Unknown";
  } catch {}
  const firstInitial = (displayNameSafe || "?").trim().charAt(0).toUpperCase();

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
      <TouchableWithoutFeedback
        onPress={handleVideoTap}
        onPressIn={handleHoverStart}
        onPressOut={handleHoverEnd}
      >
        <View className="w-full h-[400px] overflow-hidden relative">
          {/* Video Player or Thumbnail */}
          {!failedVideoLoad && isValidUri(video.fileUrl) && !isAudioSermon && player ? (
            <VideoView
              player={player}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
              }}
              contentFit="cover"
              nativeControls={false}
              fullscreenOptions={{ enterFullscreenButton: false }}
              onLoadStart={() => {
                console.log(`🔄 Video loading started: ${video.title}`, {
                  key,
                  shouldPlay: isPlaying,
                  videoUrl: getBestVideoUrl(video.fileUrl),
                });
                setVideoLoaded(false);
              }}
            />
          ) : (
            /* Thumbnail for audio sermons or fallback */
            <Image
              source={
                thumbnailUri
                  ? { uri: thumbnailUri }
                  : {
                      uri: "https://via.placeholder.com/400x400/cccccc/ffffff?text=Audio",
                    }
              }
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
              }}
              resizeMode="cover"
            />
          )}

          {/* Skeleton overlay while video/audio prepares */}
          {!videoLoaded &&
            !failedVideoLoad &&
            isValidUri(video.fileUrl) &&
            !isAudioSermon && (
              <View className="absolute inset-0" pointerEvents="none">
                <VideoCardSkeleton dark={true} />
              </View>
            )}

          {/* Content Type Badge */}
          <ContentTypeBadge
            contentType={video.contentType || "video"}
            position="top-left"
            size="medium"
          />

          {/* Fullscreen / expand button (opens reels viewer) - positioned top-right */}
          <TouchableWithoutFeedback
            onPress={() => onVideoTap(key, video, index)}
          >
            <View
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                backgroundColor: "rgba(0,0,0,0.6)",
                borderRadius: 6,
                paddingHorizontal: 8,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
                zIndex: 10,
              }}
            >
              <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            </View>
          </TouchableWithoutFeedback>

          {/* Play/Pause Overlay */}
          <MediaPlayButton
            isPlaying={isAudioSermon ? audioState.isPlaying : isPlaying}
            onPress={handleTogglePlay}
            showOverlay={showOverlay}
            size="medium"
            disabled={isPlayTogglePending}
          />

          {/* Title Overlay - positioned above progress bar */}
          <View
            style={{
              position: "absolute",
              bottom: 52,
              left: 12,
              right: 12,
              paddingHorizontal: 10,
              paddingVertical: 6,
              pointerEvents: "none",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Rubik_600SemiBold",
                color: "#FFFFFF",
                lineHeight: 16,
                textShadowColor: "rgba(0, 0, 0, 0.75)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {video.title && video.title.length > 70
                ? `${video.title.substring(0, 70)}...`
                : video.title}
            </Text>
          </View>

          {/* Video/Audio Progress Bar - Full width with proper margins */}
          <VideoProgressBar
            progress={isAudioSermon ? audioState.progress : progress}
            isMuted={isAudioSermon ? audioState.isMuted : isMuted}
            onToggleMute={handleToggleMute}
            onSeekToPercent={seekToPercent}
            currentMs={
              isAudioSermon
                ? audioState.position
                : lastKnownDurationRef.current > 0
                ? progress * lastKnownDurationRef.current
                : 0
            }
            durationMs={
              isAudioSermon ? audioState.duration : lastKnownDurationRef.current
            }
            showControls={true}
            // Pro config to avoid jumpbacks and ensure usability
            showFloatingLabel={true}
            enlargeOnDrag={true}
            knobSize={20}
            knobSizeDragging={24}
            trackHeights={{ normal: 4, dragging: 8 }}
            seekSyncTicks={4}
            seekMsTolerance={200}
            minProgressEpsilon={0.005}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Footer with User Info and compact left-aligned stats/actions - matching MusicCard */}
      <View className="flex-row items-center justify-between mt-2 px-3">
        <View className="flex flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
            {/* Avatar with initial fallback */}
            {!avatarErrored ? (
              <Image
                source={getUserAvatarFromContent(video)}
                style={{ width: 30, height: 30, borderRadius: 999 }}
                resizeMode="cover"
                onError={() => setAvatarErrored(true)}
              />
            ) : (
              <Text className="text-[14px] font-semibold text-[#344054]">
                {firstInitial}
              </Text>
            )}
          </View>
          <View className="ml-3">
            <View className="flex-row items-center">
              <Text className="text-sm font-semibold text-gray-800">
                {getUserDisplayNameFromContent(video)}
              </Text>
              <View className="flex flex-row mt-1 ml-2">
                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">
                  {getTimeAgo(video.createdAt)}
                </Text>
              </View>
            </View>
            <CardFooterActions
              viewCount={viewCount}
              liked={!!userLikeState}
              likeCount={likeCount}
              likeBurstKey={likeBurstKey}
              likeColor="#D22A2A"
              onLike={() => {
                setLikeBurstKey((k) => k + 1);
                onFavorite(key, video);
              }}
              commentCount={commentCount || video.comment || 0}
              onComment={() => {
                try {
                  showCommentModal([], String(contentId));
                } catch {}
                onComment(key, video);
              }}
              saved={!!userSaveState}
              saveCount={saveCount || 0}
              onSave={() => {
                onSave(modalKey, video);
              }}
              onShare={() => onShare(modalKey, video)}
              contentType="media"
              contentId={contentId}
              useEnhancedComponents={false}
            />
          </View>
        </View>
        <ThreeDotsMenuButton
          onPress={() => {
            openModal();
            // Also update parent if callback exists
            if (onModalToggle) {
              onModalToggle(modalKey);
            }
          }}
        />
      </View>

      {/* Slide-up Content Action Modal */}
      <ContentActionModal
        isVisible={isModalVisible || modalVisible === modalKey}
        onClose={() => {
          closeModal();
          if (onModalToggle) {
            onModalToggle(null);
          }
        }}
        onViewDetails={() => {
          // Close the action modal and open the details sheet for this media
          closeModal();
          setShowDetailsModal(true);
        }}
        onSaveToLibrary={() => onSave(modalKey, video)}
        onDownload={() => onDownload(video)}
        isSaved={!!contentStats[contentId]?.userInteractions?.saved}
        isDownloaded={checkIfDownloaded(video._id || video.fileUrl)}
        contentTitle={video.title}
        mediaId={video._id}
        uploadedBy={getUploadedBy(video)}
        mediaItem={video}
        onDelete={handleDeletePress}
        showDelete={isOwner}
        onReport={() => setShowReportModal(true)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={video._id || ""}
        mediaTitle={video.title || "this media"}
        onClose={closeDeleteModal}
        onSuccess={handleDeleteConfirm}
      />

      {/* Report Modal */}
      <ReportMediaModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        mediaId={video._id || ""}
        mediaTitle={video.title}
      />

      {/* Media Details Slider */}
      <MediaDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        mediaItem={video}
      />

      {/* AI Description Box removed in src version; exists only in app layer */}

      {/* Modal */}
      {/* Legacy inline popover removed in favor of sliding modal */}
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders while still responding to interaction updates
export default memo(VideoCard);
