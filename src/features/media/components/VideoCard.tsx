import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import { VideoCardSkeleton } from "../../../shared/components";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import { ContentTypeBadge } from "../../../shared/components/ContentTypeBadge";
import { PlayOverlay } from "../../../shared/components/PlayOverlay";
import { VideoProgressBar } from "../../../shared/components/VideoProgressBar";
import { useHydrateContentStats } from "../../../shared/hooks/useHydrateContentStats";
import { VideoCardProps } from "../../../shared/types";
import { isValidUri } from "../../../shared/utils";
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
  const videoRef = useRef<Video>(null);
  const isMountedRef = useRef(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const overlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showCommentModal } = useCommentModal();

  // Media type detection for sermon content
  const getMediaType = useCallback(() => {
    const contentType = video.contentType?.toLowerCase() || "";

    if (contentType === "sermon") {
      // Sermons can be audio or video, check file extension
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

    // For non-sermon content, assume video
    return "video";
  }, [video.contentType, video.fileUrl]);

  const mediaType = getMediaType();
  const isAudioSermon = mediaType === "audio";

  const contentId = video._id || getContentKey(video);
  const key = getContentKey(video);
  const isPlaying = playingVideos[key] || false;
  const isMuted = mutedVideos[key] || false;
  const progress = progresses[key] || 0;

  // Overlay management functions
  const showOverlayTemporarily = useCallback(() => {
    setOverlayVisible(true);
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }

    // Hide overlay after 3 seconds
    overlayTimeoutRef.current = setTimeout(() => {
      setOverlayVisible(false);
    }, 3000) as any;
  }, []);

  const hideOverlay = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    setOverlayVisible(false);
  }, []);

  const showOverlayPermanently = useCallback(() => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    setOverlayVisible(true);
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
        videoRefExists: !!videoRef.current,
      }
    );

    // When video is paused externally (like from scrolling), show overlay
    if (!isPlaying) {
      showOverlayPermanently();
    }
    // Don't auto-hide overlay when playing - let user control it manually
  }, [isPlaying, video.title, key, videoLoaded, showOverlayPermanently]);

  // Initialize overlay state on mount - always show overlay initially
  useEffect(() => {
    showOverlayPermanently(); // Always show controls on mount
  }, []); // Only run on mount

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
        // Handle video seeking
        const durationMs = lastKnownDurationRef.current || 0;
        if (!videoRef.current || durationMs <= 0) return;
        const currentMs = Math.max(
          0,
          Math.min(progress * durationMs, durationMs)
        );
        const nextMs = Math.max(
          0,
          Math.min(currentMs + deltaSec * 1000, durationMs)
        );
        try {
          await videoRef.current.setPositionAsync(nextMs);
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
        // Handle video seeking
        const durationMs = lastKnownDurationRef.current || 0;
        if (!videoRef.current || durationMs <= 0) return;
        const clamped = Math.max(0, Math.min(percent, 1));
        try {
          await videoRef.current.setPositionAsync(clamped * durationMs);
        } catch (e) {
          console.warn("Video seekToPercent failed", e);
        }
      }
    },
    [isAudioSermon, audioState.duration, audioControls]
  );

  // Handle hover start - no autoplay functionality
  const handleHoverStart = useCallback(() => {
    console.log(`👆 Hover started on video: ${video.title}`);
    // No autoplay - user must manually click to play
  }, [video.title]);

  // Handle video area tap - pause if playing, otherwise navigate to fullscreen
  const handleVideoTap = useCallback(async () => {
    if (isPlaying) {
      console.log(
        "👆 Video tapped while playing - pausing and showing controls"
      );

      // Pause the video directly and show overlay
      onTogglePlay(key); // Update global state

      try {
        if (videoRef.current) {
          await videoRef.current.pauseAsync();
        }
      } catch (error) {
        console.error("❌ Direct video pause failed:", error);
      }

      showOverlayPermanently(); // Show pause controls
    } else {
      // If not playing, navigate to fullscreen
      console.log("👆 Video tapped while paused - navigating to fullscreen");
      onVideoTap(key, video, index);
    }
  }, [
    isPlaying,
    onTogglePlay,
    key,
    onVideoTap,
    video,
    index,
    showOverlayPermanently,
  ]);

  // Handle hover end - video continues playing until scrolled past
  const handleHoverEnd = useCallback(() => {
    console.log(`👆 Hover ended on video: ${video.title}`);
    // Don't pause on hover end - let it continue playing
    // Only pause when scrolled past or another video is hovered
  }, [video.title]);

  // Handle play/pause toggle with direct video control and immediate overlay hide/show
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
    setIsPlayTogglePending(true);

    if (isAudioSermon) {
      // Handle audio sermon play/pause
      if (audioState.isPlaying) {
        audioControls.pause();
        showOverlayPermanently(); // Show controls when paused
      } else {
        audioControls.play();
        hideOverlay(); // Hide overlay immediately when playing
      }
    } else {
      // First update the global state
      onTogglePlay(key);

      // Then directly control the video to ensure it plays
      try {
        if (videoRef.current) {
          if (isPlaying) {
            console.log("⏸️ Pausing video and showing overlay:", key);
            await videoRef.current.pauseAsync();
            showOverlayPermanently(); // Show pause controls
          } else {
            console.log(
              "▶️ Playing video and hiding overlay immediately:",
              key
            );
            await videoRef.current.playAsync();
            // Hide overlay immediately for clean viewing
            hideOverlay();
          }
        } else {
          console.warn("❌ Video ref not available for direct control:", key);
        }
      } catch (error) {
        console.error("❌ Direct video control failed:", error);
      }
    }

    // Reset pending state
    setTimeout(() => {
      setIsPlayTogglePending(false);
    }, 150);
  }, [
    onTogglePlay,
    key,
    isPlayTogglePending,
    isAudioSermon,
    audioState.isPlaying,
    audioControls,
    isPlaying,
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

  // Handle video load with better error handling
  const handleVideoLoad = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        console.log(`📱 Video load status for ${video.title}:`, {
          isLoaded: status.isLoaded,
          duration: status.durationMillis,
          key,
          shouldPlay: isPlaying,
        });

        console.log(
          `✅ Video loaded successfully and ready for playback: ${video.title}`
        );
        setFailedVideoLoad(false);
        setVideoLoaded(true);

        // If the video should be playing according to state, start it now
        if (isPlaying && videoRef.current) {
          console.log(
            "🚀 Video loaded and should be playing - starting playback immediately:",
            key
          );
          videoRef.current.playAsync().catch((error) => {
            console.error("❌ Failed to start playback after load:", error);
          });
        }
      } else {
        console.error(`❌ Video load error for ${video.title}:`, status);
        setFailedVideoLoad(true);
      }
    },
    [video.title, key, isPlaying]
  );

  // Watch for playing state changes and directly control video
  useEffect(() => {
    const handleVideoPlayStateChange = async () => {
      if (!videoRef.current || isAudioSermon) return;

      try {
        const status = await videoRef.current.getStatusAsync();
        if (!status.isLoaded) {
          console.log("📱 Video not loaded yet, waiting...", key);
          return;
        }

        if (isPlaying && !status.isPlaying) {
          console.log(
            "▶️ State says playing but video is paused - starting playback:",
            key
          );
          await videoRef.current.playAsync();
        } else if (!isPlaying && status.isPlaying) {
          console.log(
            "⏸️ State says paused but video is playing - pausing:",
            key
          );
          await videoRef.current.pauseAsync();
        }
      } catch (error) {
        console.error("❌ Error syncing video playback state:", error);
      }
    };

    // Small delay to ensure video is ready
    const timeoutId = setTimeout(handleVideoPlayStateChange, 100);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, key, isAudioSermon]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clear overlay timeout
      if (overlayTimeoutRef.current) {
        clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  // Get interaction state
  const userLikeState =
    contentStats[contentId]?.userInteractions?.liked ||
    userFavorites[key] ||
    false;
  const userSaveState =
    contentStats[contentId]?.userInteractions?.saved || false;
  const likeCount =
    contentStats[contentId]?.likes || globalFavoriteCounts[key] || 0;
  const saveCount = contentStats[contentId]?.saves || 0;
  const commentCount = contentStats[contentId]?.comments || 0;
  const viewCount = contentStats[contentId]?.views || video.views || 0;
  const stats = contentStats[contentId] || {};
  useHydrateContentStats(contentId, "media");

  // View tracking state (thresholds: 3s or 25%, or completion) & avatar fallback initial
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [avatarErrored, setAvatarErrored] = useState(false);
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
          {!failedVideoLoad && isValidUri(video.fileUrl) && !isAudioSermon ? (
            <Video
              ref={videoRef}
              source={{
                uri: getBestVideoUrl(video.fileUrl),
                headers: {
                  "User-Agent": "JevahApp/1.0",
                  Accept: "video/*",
                },
              }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
              }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isPlaying}
              isMuted={isMuted}
              volume={videoVolume}
              onError={handleVideoError}
              onLoad={handleVideoLoad}
              onLoadStart={() => {
                console.log(`🔄 Video loading started: ${video.title}`, {
                  key,
                  shouldPlay: isPlaying,
                  videoUrl: getBestVideoUrl(video.fileUrl),
                });
                setVideoLoaded(false);
              }}
              progressUpdateIntervalMillis={1000}
              onPlaybackStatusUpdate={async (status) => {
                if (!status?.isLoaded) return;
                const positionMs = Number(status.positionMillis || 0);
                const durationMs = Number(status.durationMillis || 0);
                const progress = durationMs > 0 ? positionMs / durationMs : 0;
                // Cache duration for pan responder
                lastKnownDurationRef.current = durationMs;

                const qualifies =
                  status.isPlaying && (positionMs >= 3000 || progress >= 0.25);
                const finished = Boolean(status.didJustFinish);

                // Auto-restart video when finished
                if (finished && isMountedRef.current) {
                  try {
                    // Reset to beginning and play immediately
                    await videoRef.current?.setPositionAsync(0);
                    // The video will continue playing automatically due to shouldPlay prop
                  } catch (error) {
                    console.warn("Failed to restart video:", error);
                  }
                }

                if (!isMountedRef.current) return;
                if (!hasTrackedView && (qualifies || finished)) {
                  try {
                    const result = await contentInteractionAPI.recordView(
                      contentId,
                      "media",
                      {
                        durationMs: finished ? durationMs : positionMs,
                        progressPct: Math.round(progress * 100),
                        isComplete: finished,
                      }
                    );
                    setHasTrackedView(true);
                    if (
                      result?.totalViews != null &&
                      storeRef.current?.mutateStats
                    ) {
                      storeRef.current.mutateStats(contentId, () => ({
                        views: Number(result.totalViews) || 0,
                      }));
                    }
                  } catch {}
                }
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

          {/* Play/Pause Overlay */}
          <PlayOverlay
            isPlaying={isAudioSermon ? audioState.isPlaying : isPlaying}
            onPress={handleTogglePlay}
            showOverlay={overlayVisible}
            size="medium"
            immediateFeedback={true}
            disabled={isPlayTogglePending}
          />

          {/* Video/Audio Progress Bar */}
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

      {/* Footer */}
      <View className="px-3 mt-1">
        {/* Interaction Bar - positioned above author info */}
        <View className="flex-row items-center justify-between mb-3">
          <CardFooterActions
            viewCount={viewCount}
            liked={!!userLikeState}
            likeCount={likeCount}
            likeBurstKey={likeBurstKey}
            likeColor="#FF1744"
            onLike={() => {
              setLikeBurstKey((k) => k + 1);
              onFavorite(key, video);
            }}
            commentCount={commentCount || video.comment || 0}
            onComment={() => {
              try {
                console.log("🗨️ Comment icon pressed (video)", {
                  key,
                  contentId,
                  title: video.title,
                });
                showCommentModal([], String(contentId));
              } catch {}
              onComment(key, video);
            }}
            saved={!!userSaveState}
            saveCount={saveCount}
            onSave={() => {
              onSave(modalKey, video);
            }}
            onShare={() => onShare(modalKey, video)}
            contentType="media"
            contentId={contentId}
            useEnhancedComponents={false}
          />
          {/* Right: options (three dots) */}
          <TouchableOpacity
            onPress={() => {
              console.log("⋯ More pressed for", modalKey);
              onModalToggle(modalVisible === modalKey ? null : modalKey);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Author Information - below interaction bar */}
        <View className="flex-row items-center mb-2">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative">
            {!avatarErrored ? (
              <Image
                source={getUserAvatarFromContent(video)}
                style={{ width: 24, height: 24, borderRadius: 999 }}
                resizeMode="cover"
                onError={(error) => {
                  setAvatarErrored(true);
                  console.warn(
                    "❌ Failed to load video speaker avatar:",
                    error.nativeEvent.error
                  );
                }}
              />
            ) : (
              <Text className="text-[12px] font-rubik-semibold text-[#344054]">
                {firstInitial}
              </Text>
            )}
          </View>
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className="text-[13px] font-rubik-semibold text-[#344054]">
                {getUserDisplayNameFromContent(video)}
              </Text>
              <View className="w-1 h-1 bg-orange-400 rounded-full mx-2" />
              <Text className="text-[10px] text-gray-500 font-rubik">
                {getTimeAgo(video.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Video Title/Description - below author info */}
        <View className="ml-13">
          <Text className="text-[12px] font-rubik text-[#344054] leading-5">
            {video.title}
          </Text>
        </View>
      </View>

      {/* Slide-up Content Action Modal */}
      <ContentActionModal
        isVisible={modalVisible === modalKey}
        onClose={() => onModalToggle(null)}
        onViewDetails={() => {}}
        onSaveToLibrary={() => onSave(modalKey, video)}
        onShare={() => onShare(modalKey, video)}
        onDownload={() => onDownload(video)}
        isSaved={!!contentStats[contentId]?.userInteractions?.saved}
        isDownloaded={checkIfDownloaded(video._id || video.fileUrl)}
        contentTitle={video.title}
      />

      {/* AI Description Box removed in src version; exists only in app layer */}

      {/* Modal */}
      {/* Legacy inline popover removed in favor of sliding modal */}
    </View>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(VideoCard, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.video._id === nextProps.video._id &&
    prevProps.video.title === nextProps.video.title &&
    prevProps.video.fileUrl === nextProps.video.fileUrl &&
    prevProps.playingVideos[prevProps.modalKey] ===
      nextProps.playingVideos[nextProps.modalKey] &&
    prevProps.mutedVideos[prevProps.modalKey] ===
      nextProps.mutedVideos[nextProps.modalKey] &&
    prevProps.progresses[prevProps.modalKey] ===
      nextProps.progresses[nextProps.modalKey]
  );
});
