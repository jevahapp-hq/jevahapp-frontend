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
import { useAdvancedAudioPlayer } from "../../../../app/hooks/useAdvancedAudioPlayer";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import { ContentTypeBadge } from "../../../shared/components/ContentTypeBadge";
import { PlayOverlay } from "../../../shared/components/PlayOverlay";
import Skeleton from "../../../shared/components/Skeleton/Skeleton";
import { VideoProgressBar } from "../../../shared/components/VideoProgressBar";
import { useHydrateContentStats } from "../../../shared/hooks/useHydrateContentStats";
import { VideoCardProps } from "../../../shared/types";
import { isValidUri } from "../../../shared/utils";

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
}) => {
  const videoRef = useRef<Video>(null);
  const isMountedRef = useRef(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [failedVideoLoad, setFailedVideoLoad] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlayTogglePending, setIsPlayTogglePending] = useState(false);
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
      console.log(`🏁 Audio sermon finished: ${video.title}`);
    },
  });

  // Debug logging
  console.log(`🎬 VideoCard rendering: ${video.title}`, {
    key,
    contentId,
    fileUrl: video.fileUrl,
    isValidUrl: isValidUri(video.fileUrl),
    isPlaying,
    isMuted,
    progress,
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

  // Handle video tap
  const handleVideoTap = useCallback(() => {
    onVideoTap(key, video, index);
  }, [onVideoTap, key, video, index]);

  // Handle play/pause toggle with immediate feedback and debounce
  const handleTogglePlay = useCallback(() => {
    if (isPlayTogglePending) return; // Prevent double-taps

    console.log(
      "🎮 VideoCard togglePlay called with key:",
      key,
      "isAudioSermon:",
      isAudioSermon
    );
    setIsPlayTogglePending(true);

    // Immediate visual feedback - toggle overlay state instantly
    setShowOverlay(false);

    if (isAudioSermon) {
      // Handle audio sermon play/pause
      if (audioState.isPlaying) {
        audioControls.pause();
      } else {
        audioControls.play();
      }
    } else {
      // Call the actual video toggle
      onTogglePlay(key);
    }

    // Show overlay again after a brief delay and reset pending state
    setTimeout(() => {
      setShowOverlay(true);
      setIsPlayTogglePending(false);
    }, 150);
  }, [
    onTogglePlay,
    key,
    isPlayTogglePending,
    isAudioSermon,
    audioState.isPlaying,
    audioControls,
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

  // Handle video error
  const handleVideoError = useCallback(
    (error: any) => {
      console.error(`❌ Video error for ${video.title}:`, error);
      setFailedVideoLoad(true);
    },
    [video.title]
  );

  // Handle video load
  const handleVideoLoad = useCallback(
    (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        console.log(`✅ Video loaded successfully: ${video.title}`);
        setFailedVideoLoad(false);
        setVideoLoaded(true);
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
    <View key={modalKey} className="flex flex-col mb-10">
      <TouchableWithoutFeedback onPress={handleVideoTap}>
        <View className="w-full h-[400px] overflow-hidden relative">
          {/* Video Player or Thumbnail */}
          {!failedVideoLoad && isValidUri(video.fileUrl) && !isAudioSermon ? (
            <Video
              ref={videoRef}
              source={{ uri: video.fileUrl }}
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
            showOverlay={showOverlay}
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

export default VideoCard;
