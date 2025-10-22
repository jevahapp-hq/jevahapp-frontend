import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Image,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import Skeleton from "../../../shared/components/Skeleton/Skeleton";
import VideoControlsOverlay from "../../../shared/components/VideoControlsOverlay";
import { useHydrateContentStats } from "../../../shared/hooks/useHydrateContentStats";
import { VideoCardProps } from "../../../shared/types";
import { isValidUri, isValidVideoUrl } from "../../../shared/utils";
import { getBestVideoUrl, handleVideoError as handleVideoErrorUtil } from "../../../shared/utils/videoUrlManager";

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
  const { showCommentModal } = useCommentModal();

  const contentId = video._id || getContentKey(video);
  const key = getContentKey(video);
  const isPlaying = playingVideos[key] || false;
  const isMuted = mutedVideos[key] || false;
  const progress = progresses[key] || 0;

  // Debug logging
  console.log(`🎬 VideoCard rendering: ${video.title}`, {
    key,
    contentId,
    fileUrl: video.fileUrl,
    isValidUrl: isValidUri(video.fileUrl),
    isPlaying,
    isMuted,
    progress,
    isAutoPlayEnabled,
    currentlyVisibleVideo,
    showIndicator: isAutoPlayEnabled && isPlaying,
  });

  // Track last known duration from playback updates
  const lastKnownDurationRef = useRef(0);
  const seekBySeconds = useCallback(
    async (deltaSec: number) => {
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
    },
    [progress]
  );

  const seekToPercent = useCallback(async (percent: number) => {
    const durationMs = lastKnownDurationRef.current || 0;
    if (!videoRef.current || durationMs <= 0) return;
    const clamped = Math.max(0, Math.min(percent, 1));
    try {
      await videoRef.current.setPositionAsync(clamped * durationMs);
    } catch (e) {
      console.warn("Video seekToPercent failed", e);
    }
  }, []);

  // Handle video tap
  const handleVideoTap = useCallback(() => {
    onVideoTap(key, video, index);
  }, [onVideoTap, key, video, index]);

  // Handle hover start - no autoplay functionality
  const handleHoverStart = useCallback(() => {
    console.log(`👆 Hover started on video: ${video.title}`);
    // No autoplay - user must manually click to play
  }, [video.title]);

  // Handle hover end - video continues playing until scrolled past
  const handleHoverEnd = useCallback(() => {
    console.log(`👆 Hover ended on video: ${video.title}`);
    // Don't pause on hover end - let it continue playing
    // Only pause when scrolled past or another video is hovered
  }, [video.title]);

  // Handle play/pause toggle
  const handleTogglePlay = useCallback(() => {
    console.log("🎮 VideoCard togglePlay called with key:", key);
    onTogglePlay(key);
  }, [onTogglePlay, key]);

  // Handle mute toggle
  const handleToggleMute = useCallback(() => {
    onToggleMute(key);
  }, [onToggleMute, key]);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback(() => {
    setShowOverlay((prev) => !prev);
  }, []);

  // Handle video error with intelligent retry mechanism
  const handleVideoError = useCallback(
    (error: any) => {
      // Use the enhanced error handler
      const errorAnalysis = handleVideoErrorUtil(error, video.fileUrl, video.title);
      
      // Set failed state
      setFailedVideoLoad(true);
      
      // If it's a retryable error (expired signed URL), retry with converted URL
      if (errorAnalysis.isRetryable) {
        console.log(`🔄 Retryable error detected - expired signed URL`);
        console.log(`🔧 Will retry with converted URL: ${errorAnalysis.suggestedUrl}`);
        
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
      console.log(`📱 Video load status for ${video.title}:`, {
        isLoaded: status.isLoaded,
        hasError: status.error,
        duration: status.durationMillis,
        canPlay: status.canPlay,
        canPlaySlowForward: status.canPlaySlowForward
      });
      
      if (status.isLoaded) {
        console.log(`✅ Video loaded successfully: ${video.title}`);
        setFailedVideoLoad(false);
        setVideoLoaded(true);
      } else if (status.error) {
        console.error(`❌ Video load error for ${video.title}:`, status.error);
        setFailedVideoLoad(true);
      }
    },
    [video.title]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
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
      onLayout={onLayout ? (event) => onLayout(event, key, "video", video.fileUrl) : undefined}
    >
      <TouchableWithoutFeedback 
        onPress={handleVideoTap}
        onTouchStart={handleHoverStart}
        onTouchEnd={handleHoverEnd}
      >
        <View className="w-full h-[400px] overflow-hidden relative">
          {/* Video Player or Thumbnail */}
          {!failedVideoLoad && isValidVideoUrl(video.fileUrl) ? (
            <Video
              ref={videoRef}
              source={{ 
                uri: getBestVideoUrl(video.fileUrl),
                headers: {
                  'User-Agent': 'JevahApp/1.0',
                  'Accept': 'video/*'
                }
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
                console.log(`🔄 Video loading started: ${video.title}`);
                setVideoLoaded(false);
              }}
              progressUpdateInterval={1000}
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
            /* Fallback Thumbnail with Error Message */
            <View className="w-full h-full justify-center items-center bg-gray-100">
              <Image
                source={
                  thumbnailUri
                    ? { uri: thumbnailUri }
                    : {
                        uri: "https://via.placeholder.com/400x400/cccccc/ffffff?text=Video",
                      }
                }
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                }}
                resizeMode="cover"
                onError={() => {
                  console.warn(`❌ Thumbnail failed to load for: ${video.title}`);
                }}
              />
              {failedVideoLoad && (
                <View className="absolute inset-0 justify-center items-center bg-black/50">
                  <View className="flex-col items-center space-y-4">
                    {/* Reload Button - Above */}
                    <TouchableOpacity 
                      onPress={() => {
                        console.log(`🔄 Manual retry for: ${video.title}`);
                        setFailedVideoLoad(false);
                      }}
                      className="bg-black/50 p-4 rounded-full"
                    >
                      <Ionicons name="refresh" size={48} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    {/* Play Button - Centered */}
                    <TouchableOpacity 
                      onPress={handleVideoTap}
                      className="bg-white/70 p-4 rounded-full"
                    >
                      <Ionicons name="play" size={40} color="#FEA74E" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Skeleton overlay while video prepares */}
          {!videoLoaded && !failedVideoLoad && isValidVideoUrl(video.fileUrl) && (
            <View
              className="absolute inset-0"
              style={{ justifyContent: "flex-end", padding: 12 }}
              pointerEvents="none"
            >
              <View style={{ marginBottom: 8 }}>
                <Skeleton dark variant="text" width={"60%"} />
              </View>
              <View style={{ marginBottom: 6 }}>
                <Skeleton dark variant="text" width={"40%"} />
              </View>
              <Skeleton
                dark
                height={6}
                width={"90%"}
                borderRadius={4}
                style={{ opacity: 0.85 }}
              />
            </View>
          )}

          {/* Content Type Icon - Top Left */}
          <View className="absolute top-4 left-4">
            <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </View>
          </View>


          
          {/* Loading Arrow Indicator */}
          {failedVideoLoad && (
            <View className="absolute top-20 right-4">
              <View className="bg-black/50 px-3 py-2 rounded-full">
                <Ionicons name="refresh" size={24} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* Play Button Overlay - tap to start; hides while playing or when video failed to load */}
          {!isPlaying && !failedVideoLoad && (
            <View
              className="absolute inset-0 justify-center items-center bg-black/10"
              pointerEvents="box-none"
            >
              <TouchableOpacity onPress={handleTogglePlay} activeOpacity={0.9}>
                <View className="bg-white/70 p-4 rounded-full">
                  <Ionicons
                    name="play"
                    size={40}
                    color="#FEA74E"
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Video Controls - Bottom (modular overlay) */}
          <VideoControlsOverlay
            progress={progress}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onSeekRelative={seekBySeconds}
            onSeekToPercent={seekToPercent}
            currentMs={
              lastKnownDurationRef.current > 0
                ? progress * lastKnownDurationRef.current
                : 0
            }
            durationMs={lastKnownDurationRef.current}
          />

          {/* Title Overlay - positioned just above the progress bar */}
          <View className="absolute bottom-8 left-3 right-3 px-4 py-2 rounded-md">
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={2}
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.8)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {video.title}
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer */}
      <View className="flex-row items-center justify-between mt-1 px-3">
        {/* Left: avatar, name/time, then eye/comment/share */}
        <View className="flex flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
            {!avatarErrored ? (
              <Image
                source={getUserAvatarFromContent(video)}
                style={{ width: 30, height: 30, borderRadius: 999 }}
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
              <Text className="text-[14px] font-rubik-semibold text-[#344054]">
                {firstInitial}
              </Text>
            )}
          </View>
          <View className="ml-3">
            <View className="flex-row items-center">
              <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                {getUserDisplayNameFromContent(video)}
              </Text>
              <View className="flex flex-row mt-2 ml-2">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {getTimeAgo(video.createdAt)}
                </Text>
              </View>
            </View>
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
          </View>
        </View>
        {/* Right: options (three dots) */}
        <TouchableOpacity
          onPress={() => {
            console.log("⋯ More pressed for", modalKey);
            onModalToggle(modalVisible === modalKey ? null : modalKey);
          }}
          className="mr-2"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
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

export default VideoCard;
