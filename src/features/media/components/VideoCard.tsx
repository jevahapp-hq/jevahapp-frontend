import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image } from "expo-image";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Text, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import { DeleteMediaConfirmation } from "../../../../app/components/DeleteMediaConfirmation";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import { isAdmin } from "../../../../app/utils/mediaDeleteAPI";
import { AvatarWithInitialFallback } from "../../../shared/components/AvatarWithInitialFallback/AvatarWithInitialFallback";
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
import { useLoadingStats } from "../../../shared/hooks/useLoadingStats";
import { useVideoPlaybackControl } from "../../../shared/hooks/useVideoPlaybackControl";
import { VideoCardProps } from "../../../shared/types";
import { detectMediaType, getUploadedBy, isAudioSermon, isValidUri } from "../../../shared/utils";
import {
  getBestVideoUrl,
  handleVideoError as handleVideoErrorUtil,
} from "../../../shared/utils/videoUrlManager";

export const LazyVideoPlayerWrapper = memo(({
  activeVideoUrl,
  isMuted,
  videoVolume,
  onPlayerReady,
  onPlayerUnmount,
  thumbnailUri,
  onVideoReady,
}: any) => {
  // Create player immediately with the URL
  const player = useVideoPlayer(activeVideoUrl, (p) => {
    p.loop = false;
    p.muted = isMuted ?? false;
    p.volume = videoVolume ?? 1.0;
  });
  
  // Track video ready state
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    if (player) {
      player.muted = isMuted;
      player.volume = videoVolume;
    }
  }, [player, isMuted, videoVolume]);

  useEffect(() => {
    if (!player) return;
    
    // Listen for player status changes
    const subscription = player.addListener('statusChange', (status: any) => {
      if (status.status === 'readyToPlay') {
        setIsVideoReady(true);
        onVideoReady?.(true);
      } else if (status.status === 'error') {
        onVideoReady?.(false);
      }
    });
    
    onPlayerReady(player);
    
    return () => {
      subscription.remove();
      onPlayerUnmount();
    };
  }, [player, onPlayerReady, onPlayerUnmount, onVideoReady]);

  return (
    <>
      {/* 🌟 Video - Always visible immediately */}
      <VideoView
        player={player}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          backgroundColor: "transparent", // Transparent - thumbnail shows through
        }}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: false }}
      />
    </>
  );
});

// Fallback video to guarantee something playable is always available
const FALLBACK_VIDEO_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

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

  // 🚀 CRITICAL FIX: Ultra-fast video URL resolution with inline caching
  // Using direct property access instead of function calls for maximum speed
  const videoUrl = useMemo(() => {
    if (isAudioSermonValue) return null;

    // Direct property access - faster than function calls
    const rawUrl = video?.fileUrl || (video as any)?.playbackUrl || (video as any)?.hlsUrl;
    
    if (!rawUrl || typeof rawUrl !== "string" || rawUrl.trim() === '') {
      return FALLBACK_VIDEO_URL;
    }

    const trimmedUrl = rawUrl.trim();
    
    // Fast path: local files don't need processing
    if (trimmedUrl.startsWith('file://') || trimmedUrl.startsWith('/')) {
      return trimmedUrl;
    }

    // Fast path: check if already a public URL (no AWS signature params)
    if (!trimmedUrl.includes('X-Amz-Algorithm')) {
      return trimmedUrl;
    }

    // Slow path: convert signed URL (only for AWS signed URLs)
    try {
      return getBestVideoUrl(trimmedUrl);
    } catch {
      return trimmedUrl;
    }
  }, [isAudioSermonValue, video?.fileUrl, (video as any)?.playbackUrl, (video as any)?.hlsUrl]);

  // ✅ Track retry attempts to prevent infinite loops
  const retryCountRef = useRef(0);
  const maxRetries = 2;

  // Initialize refs before useVideoPlayer hook (needed in callback)
  // In React Native, setTimeout returns a number, not NodeJS.Timeout
  const preloadTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // ✅ Load videos immediately for faster display, but only play when visible
  const isCurrentlyVisible = currentlyVisibleVideo === key;
  
  // Provide URL immediately so video can start loading/pre-buffering
  const activeVideoUrl = videoUrl || "";

  // The player is now fully managed by the LazyVideoPlayerWrapper so we cleanly unmount decoders
  const [player, setPlayer] = useState<any>(null);

  const handlePlayerReady = useCallback((p: any) => {
    setPlayer(p);
  }, []);

  const handlePlayerUnmount = useCallback(() => {
    setPlayer(null);
  }, []);
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  // ✅ Persist video loaded state across re-renders for better UX (no thumbnails on revisit)
  const videoLoadedRef = useRef(false);
  // Local playback state for video (non-audio) so the progress bar
  // always reflects the real player position, even if the parent
  // store's `progresses[key]` is stale.
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoPositionMs, setVideoPositionMs] = useState(0);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  // In React Native, setTimeout returns a number, not NodeJS.Timeout
  const overlayTimeoutRef = useRef<number | null>(null);
  const toggleProcessingRef = useRef(false); // Ref for debouncing play toggle
  const { showCommentModal } = useCommentModal();
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

  // Double-tap detection
  // In React Native, setTimeout returns a number, not NodeJS.Timeout
  const tapTimeoutRef = useRef<number | null>(null);
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

    try {
      if (shouldPlayThisVideo && !player.playing) {
        player.play();
      } else if (!shouldPlayThisVideo && player.playing) {
        player.pause();
      }
    } catch (error) {
      // Ignored: player might be unmounting or destroyed
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
    }, 3000);
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

  // Audio player for audio sermons
  const audioUrl =
    isAudioSermonValue && isValidUri(video.fileUrl) ? video.fileUrl : null;
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
      if (isAudioSermonValue) {
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
        const durationMs =
          lastKnownDurationRef.current || backendDurationMs || 0;
        if (!player || durationMs <= 0) return;
        // Use the last known position rather than external `progress`
        // so that skipping is stable even if the parent store isn't
        // updating progresses for this video.
        const currentMs = Math.max(0, Math.min(videoPositionMs, durationMs));
        const nextMs = Math.max(
          0,
          Math.min(currentMs + deltaSec * 1000, durationMs)
        );
        try {
          // Verify player exists before getting/setting properties
          if (player && typeof player.currentTime !== 'undefined') {
            player.currentTime = nextMs / 1000; // expo-video uses seconds
          }
        } catch (e) {
          console.warn("Video seekBySeconds failed (player likely unmounted)", e);
        }
      }
    },
    [
      progress,
      isAudioSermonValue,
      audioState.position,
      audioState.duration,
      audioControls,
      player,
      videoPositionMs,
      backendDurationMs,
    ]
  );

  const seekToPercent = useCallback(
    async (percent: number) => {
      if (isAudioSermonValue) {
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
          // Verify player exists before getting/setting properties
          if (player && typeof player.currentTime !== 'undefined') {
            player.currentTime = (clamped * durationMs) / 1000; // expo-video uses seconds
          }
        } catch (e) {
          console.warn("Video seekToPercent failed (player likely unmounted)", e);
        }
      }
    },
    [isAudioSermonValue, audioState.duration, audioControls, player]
  );

  // Handle hover start - no autoplay functionality
  const handleHoverStart = useCallback(() => {
    // No autoplay - user must manually click to play
  }, [video.title]);

  // Handle video area tap - SIMPLIFIED & RELIABLE
  const handleVideoTap = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    const isCurrentlyPlaying =
      isPlaying || (isAudioSermonValue && audioState.isPlaying);

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
      tapCountRef.current = 0;

      // Pause if playing
      if (isCurrentlyPlaying) {
        if (isAudioSermonValue) {
          audioControls.pause();
        } else {
          // Use modular hook for pause
          togglePlayback();
          if (player) {
            try {
              // Verify player exists before calling methods
              if (typeof player.pause === 'function') {
                player.pause();
              }
            } catch (error) {
              console.warn("❌ Pause failed (player likely unmounted):", error);
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
        // ✅ One-click play/pause: Use onTogglePlay for both video and audio for consistent behavior
        // This ensures proper integration with global media store (audio pauses video and vice versa)
        onTogglePlay(key);
      }

      tapCountRef.current = 0;
      tapTimeoutRef.current = null;
    }, 200); // Reduced to 200ms for faster responsiveness (like Instagram/TikTok)
  }, [
    isPlaying,
    onTogglePlay,
    key,
    onVideoTap,
    video,
    index,
    showOverlayPermanently,
    isAudioSermonValue,
    audioControls,
    audioState.isPlaying,
    togglePlayback,
  ]);

  // Handle hover end - video continues playing until scrolled past
  const handleHoverEnd = useCallback(() => {
    // Don't pause on hover end - let it continue playing
    // Only pause when scrolled past or another video is hovered
  }, [video.title]);

  // Handle play/pause toggle - now using modular hook with improved responsiveness
  const handleTogglePlay = useCallback(async () => {
    // ✅ Immediate visual feedback - update state first for instant response
    setIsPlayTogglePending(true);

    // Use ref-based debounce for immediate response while preventing double-taps
    if (toggleProcessingRef.current) {
      setIsPlayTogglePending(false);
      return; // Prevent double-taps but allow UI feedback
    }

    // Clear any pending tap detection when play icon is clicked
    tapCountRef.current = 0;
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    toggleProcessingRef.current = true;

    // ✅ Immediate execution for responsive feel - use onTogglePlay for both video and audio
    try {
      // ✅ Use onTogglePlay for ALL media types (video and audio) to ensure proper global media management
      // This ensures audio sermons pause videos and vice versa
      onTogglePlay(key);

      // Update overlay state immediately for instant visual feedback
      if (isAudioSermonValue) {
        if (audioState.isPlaying) {
          showOverlayPermanently();
        } else {
          hideOverlay();
        }
      } else {
        if (isPlaying) {
          showOverlayPermanently();
        } else {
          hideOverlay();
        }
      }
    } catch (error) {
      console.error("Error in handleTogglePlay:", error);
    } finally {
      // Reset pending state quickly for better responsiveness
      setTimeout(() => {
        toggleProcessingRef.current = false;
        setIsPlayTogglePending(false);
      }, 50); // Reduced to 50ms for faster response
    }
  }, [
    key,
    isAudioSermonValue,
    audioState.isPlaying,
    isPlaying,
    onTogglePlay,
    showOverlayPermanently,
    hideOverlay,
  ]);

  // Handle mute toggle
  const handleToggleMute = useCallback(() => {
    if (isAudioSermonValue) {
      // Handle audio sermon mute/unmute
      audioControls.toggleMute();
    } else {
      // Handle video mute/unmute
      onToggleMute(key);
    }
  }, [onToggleMute, key, isAudioSermonValue, audioState.isMuted, audioControls]);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  // ✅ Handle video error with intelligent retry mechanism
  const handleVideoError = useCallback(
    (error: any) => {
      console.error(`❌ Video error for "${video.title}":`, error);
      
      // Extract error details
      const errorCode = error?.error?.code || error?.code;
      const errorMessage = error?.error?.localizedDescription || error?.message || 'Unknown error';
      
      // Check for specific error types
      const isRateLimitError = 
        errorMessage?.toLowerCase().includes('too many requests') ||
        errorMessage?.toLowerCase().includes('rate limit') ||
        errorCode === 429;
      
      const isNetworkError = 
        errorMessage?.toLowerCase().includes('network') ||
        errorCode === -1001 || // NSURLErrorTimedOut
        errorCode === -1009;   // NSURLErrorNotConnectedToInternet
      
      const isAuthError = 
        errorCode === 403 ||
        errorMessage?.toLowerCase().includes('forbidden') ||
        errorMessage?.toLowerCase().includes('unauthorized');

      // Use the enhanced error handler
      const errorAnalysis = handleVideoErrorUtil(
        error,
        video.fileUrl,
        video.title
      );

      // Log specific error type
      if (isRateLimitError) {
        console.warn(`⏳ Rate limit hit for video: ${video.title}. Will retry with backoff.`);
      } else if (isAuthError) {
        console.warn(`🔒 Auth error for video: ${video.title}. URL may be expired.`);
      } else if (isNetworkError) {
        console.warn(`📡 Network error for video: ${video.title}.`);
      }

      // Retry logic with exponential backoff - but NOT for rate limit errors
      // Rate limit errors should wait longer before retrying
      if (retryCountRef.current < maxRetries && !isRateLimitError) {
        retryCountRef.current += 1;
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 5000);
        
        console.log(`🔄 Retrying video load (attempt ${retryCountRef.current}/${maxRetries}) for: ${video.title} in ${backoffDelay}ms`);

        setTimeout(() => {
          if (isMountedRef.current) {
            setFailedVideoLoad(false);
            setVideoLoaded(false);
          }
        }, backoffDelay);
      } else if (isRateLimitError) {
        // For rate limits, wait longer (10-30 seconds) and don't count as a retry
        const rateLimitDelay = 10000 + Math.random() * 20000; // 10-30s random delay
        console.log(`⏳ Rate limit for ${video.title}, waiting ${Math.round(rateLimitDelay/1000)}s before retry...`);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            setFailedVideoLoad(false);
            setVideoLoaded(false);
          }
        }, rateLimitDelay);
      } else {
        // After max retries, show error state with thumbnail fallback
        console.warn(`⚠️ Video load failed after ${maxRetries} retries: ${video.title}`);
        setFailedVideoLoad(true);
      }
    },
    [video.title, video.fileUrl, videoUrl]
  );

  // Handle video load and progress tracking with expo-video
  useEffect(() => {
    if (!player || isAudioSermonValue) return;

    // Track duration when ready
    const statusSubscription = player.addListener('statusChange', (status: any) => {
      if (status.status === 'readyToPlay') {
        setFailedVideoLoad(false);
        setVideoLoaded(true);
        videoLoadedRef.current = true; // ✅ Persist video loaded state (no thumbnails on revisit)
        if (player.duration && Number.isFinite(player.duration) && player.duration > 0) {
          const durationMs = Math.min(player.duration * 1000, 24 * 60 * 60 * 1000); // Max 24 hours
          if (!isNaN(durationMs)) {
            lastKnownDurationRef.current = durationMs;
          }
        }

        if (isPlaying) {
          try {
            player.play();
          } catch (e) {
            // Ignored if destroyed
          }
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

      // Ensure safe access to NativeSharedObject properties
      let isPlayingNative = false;
      let pCurrentTime = 0;
      let pDuration = 0;
      try {
        isPlayingNative = player.playing;
        pCurrentTime = player.currentTime || 0;
        pDuration = player.duration || 0;
      } catch (e) {
        return; // Player destroyed, abort interval
      }

      const currentTime = pCurrentTime;
      const duration = pDuration;

      // Validate and clamp duration (prevent invalid values)
      const durationMs = Math.max(0, Math.min(duration * 1000, 24 * 60 * 60 * 1000)); // Max 24 hours
      const positionMs = Math.max(0, Math.min(currentTime * 1000, durationMs));

      // Only update duration ref if it's valid and finite
      if (Number.isFinite(durationMs) && durationMs > 0 && !isNaN(durationMs)) {
        lastKnownDurationRef.current = durationMs;
      }

      const progress = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;
      // Keep local video progress/position in sync with the player so
      // the UI progress bar always moves smoothly with playback.
      setVideoPositionMs(positionMs);
      setVideoProgress(progress);

      const qualifies = isPlayingNative && (positionMs >= 3000 || progress >= 0.25);
      const finished = pCurrentTime >= pDuration && pDuration > 0;

      // Auto-restart video when finished
      if (finished && isMountedRef.current) {
        try {
          player.currentTime = 0;
          if (isPlayingNative) {
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
          }).catch(() => { });
        } catch { }
      }
    }, 1000);

    return () => {
      statusSubscription.remove();
      clearInterval(progressInterval);
    };
  }, [player, video.title, isPlaying, isAudioSermonValue, contentId, hasTrackedView]);

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
  const isLoadingStats = useLoadingStats(contentId);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const storeRef = useRef<any>(null);
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      storeRef.current = useInteractionStore.getState();
    } catch { }
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
        <View className="w-full h-[400px] overflow-hidden relative" style={{ backgroundColor: '#1a1a1a' }}>
          {/* 🎬 VIDEO ONLY - No thumbnails ever */}
          {!isAudioSermonValue ? (
            <>
              {/* VIDEO LAYER - Only thing visible */}
              <View 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 2,
                }}
              >
                <LazyVideoPlayerWrapper
                  activeVideoUrl={activeVideoUrl}
                  isMuted={isMuted}
                  videoVolume={videoVolume}
                  onPlayerReady={handlePlayerReady}
                  onPlayerUnmount={handlePlayerUnmount}
                  thumbnailUri={thumbnailUri}
                  onVideoReady={(ready: boolean) => {
                    if (ready) {
                      setVideoLoaded(true);
                      videoLoadedRef.current = true;
                    }
                  }}
                />
              </View>
              
              {/* ERROR STATE - Simple retry button, no thumbnail */}
              {failedVideoLoad && (
                <View 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 3,
                    backgroundColor: '#1a1a1a',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      retryCountRef.current = 0;
                      setFailedVideoLoad(false);
                      setVideoLoaded(false);
                    }}
                    style={{
                      backgroundColor: '#FEA74E',
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 24,
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontFamily: 'Rubik_600SemiBold',
                    }}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : null}

          {/* Content Type Badge */}
          <ContentTypeBadge
            contentType={video.contentType || "video"}
            position="top-left"
            size="medium"
          />

          {/* Fullscreen / expand button (opens reels viewer) - positioned top-right */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              // ✅ Ensure fullscreen button click navigates to reels
              onVideoTap(key, video, index);
            }}
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
          </TouchableOpacity>

          {/* Play/Pause Overlay */}
          <MediaPlayButton
            isPlaying={isAudioSermonValue ? audioState.isPlaying : isPlaying}
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
            progress={
              isAudioSermonValue
                ? audioState.progress
                : Math.max(0, Math.min(1, videoProgress || 0))
            }
            isMuted={isAudioSermonValue ? audioState.isMuted : isMuted}
            onToggleMute={handleToggleMute}
            onSeekToPercent={seekToPercent}
            // Lift the controls row up so it's visually closer to the title overlay
            // while still anchored near the bottom of the video frame.
            bottomOffset={24}
            currentMs={
              isAudioSermonValue
                ? (Number.isFinite(audioState.position) && audioState.position >= 0
                  ? audioState.position
                  : 0)
                : videoPositionMs
            }
            durationMs={
              isAudioSermonValue
                ? (Number.isFinite(audioState.duration) && audioState.duration > 0
                  ? audioState.duration
                  : 0)
                : (Number.isFinite(lastKnownDurationRef.current) && lastKnownDurationRef.current > 0
                  ? lastKnownDurationRef.current
                  : (backendDurationMs > 0 ? backendDurationMs : 0))
            }
            showControls={true}
            // Pro config to avoid jumpbacks and ensure usability
            showFloatingLabel={true}
            enlargeOnDrag={true}
            knobSize={8}
            knobSizeDragging={10}
            trackHeights={{ normal: 4, dragging: 8 }}
            seekSyncTicks={4}
            seekMsTolerance={200}
            minProgressEpsilon={0.005}
          />
        </View>
      </TouchableWithoutFeedback>

      {/* Footer with User Info and compact left-aligned stats/actions - matching MusicCard */}
      <View
        className="flex-row items-center justify-between mt-2 px-2"
        style={{ zIndex: 100 }}
        pointerEvents="box-none"
      >
        <View className="flex flex-row items-center" pointerEvents="box-none">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
            {/* Avatar with initial fallback */}
            <AvatarWithInitialFallback
              imageSource={getUserAvatarFromContent(video) as any}
              name={getUserDisplayNameFromContent(video)}
              size={30}
              fontSize={14}
              backgroundColor="transparent"
              textColor="#344054"
            />
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
                // ✅ Only trigger burst animation when LIKING (not unliking)
                if (!userLikeState) {
                  setLikeBurstKey((k) => k + 1);
                }
                onFavorite(key, video);
              }}
              commentCount={commentCount || video.comment || 0}
              onComment={() => {
                try {
                  showCommentModal([], String(contentId));
                } catch { }
                onComment(key, video);
              }}
              saved={!!userSaveState}
              saveCount={saveCount || 0}
              onSave={() => {
                // Call the prop function (avoid shadowing by using the prop directly)
                const saveHandler = onSave;
                saveHandler(modalKey, video);
              }}
              isLoading={isLoadingStats}
              contentType="media"
              contentId={contentId}
              onShare={() => onShare(modalKey, video)}
              useEnhancedComponents={false}
            />
          </View>
        </View>
        <View style={{ zIndex: 1001 }}>
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
        showDelete={userIsAdmin || isOwner}
        onReport={() => setShowReportModal(true)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={video._id || ""}
        mediaTitle={video.title || "this media"}
        onClose={closeDeleteModal}
        onSuccess={handleDeleteConfirm}
        isAdmin={userIsAdmin}
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
