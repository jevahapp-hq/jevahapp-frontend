import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  PanResponder,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import { CommentIcon } from "../../../shared/components/CommentIcon";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import LikeBurst from "../../../shared/components/LikeBurst";
import { UI_CONFIG } from "../../../shared/constants";
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
  });

  // Track last known duration to avoid calling getStatusAsync during pan
  const lastKnownDurationRef = useRef(0);
  const lastSeekTsRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);

  // Pan responder for seeking (avoids getStatusAsync; uses cached duration)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_evt, gestureState) => {
      if (!isMountedRef.current) return;
      const x = Math.max(0, Math.min(gestureState.moveX - 50, 260));
      const pct = Math.max(0, Math.min((x / 260) * 100, 100));
      const duration = lastKnownDurationRef.current;
      if (isPlaying && videoRef.current && duration > 0) {
        const position = (pct / 100) * duration;
        const now = Date.now();
        if (now - lastSeekTsRef.current >= 75) {
          lastSeekTsRef.current = now;
          try {
            videoRef.current.setPositionAsync(position);
          } catch (error) {
            console.warn("Video seek error:", error);
          }
        } else {
          pendingSeekRef.current = position;
        }
      }
    },
    onPanResponderRelease: () => {
      if (!isMountedRef.current) return;
      const finalPos = pendingSeekRef.current;
      pendingSeekRef.current = null;
      if (videoRef.current && typeof finalPos === "number") {
        try {
          videoRef.current.setPositionAsync(finalPos);
        } catch (error) {
          console.warn("Video seek release error:", error);
        }
      }
    },
  });

  // Handle video tap
  const handleVideoTap = useCallback(() => {
    onVideoTap(key, video, index);
  }, [onVideoTap, key, video, index]);

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
          {!failedVideoLoad && isValidUri(video.fileUrl) ? (
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
            /* Fallback Thumbnail */
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
            />
          )}

          {/* Content Type Icon - Top Left */}
          <View className="absolute top-4 left-4">
            <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </View>
          </View>

          {/* Play/Pause Overlay */}
          {showOverlay && (
            <View
              className="absolute inset-0 justify-center items-center bg-black/20"
              pointerEvents="box-none"
            >
              <TouchableOpacity onPress={handleTogglePlay} activeOpacity={0.9}>
                <View className="bg-white/70 p-4 rounded-full">
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={40}
                    color={UI_CONFIG.COLORS.SECONDARY}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Video Controls - Bottom */}
          <View className="absolute bottom-4 left-3 right-3">
            {/* Controls row with progress bar */}
            <View className="flex-row items-center">
              {/* Progress Bar */}
              <View className="flex-1 h-1.5 bg-white/30 rounded-full mr-3">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>

              <TouchableOpacity
                onPress={handleToggleMute}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-high-outline"}
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Title Overlay */}
          <View className="absolute bottom-12 left-3 right-3 px-4 py-2 rounded-md">
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
            <View className="flex-row mt-2 items-center pl-2">
              <View className="flex-row items-center mr-6">
                <MaterialIcons name="visibility" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {viewCount}
                </Text>
              </View>
              <TouchableOpacity
                className="flex-row items-center mr-6"
                onPress={() => {
                  setLikeBurstKey((k) => k + 1);
                  onFavorite(key, video);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons
                  name={userLikeState ? "favorite" : "favorite-border"}
                  size={28}
                  color={userLikeState ? "#FF1744" : "#98A2B3"}
                />
                {/* Like burst overlay anchored near the icon */}
                <LikeBurst
                  triggerKey={likeBurstKey}
                  color="#FF1744"
                  size={14}
                  style={{ marginLeft: -6, marginTop: -8 }}
                />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {likeCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center mr-6"
                onPress={() => {
                  try {
                    console.log("🗨️ Comment icon pressed (video)", {
                      key,
                      contentId,
                      title: video.title,
                    });
                    // Open global comment modal immediately (loads server data inside)
                    showCommentModal([], String(contentId));
                  } catch {}
                  // Keep parent handler for any side-effects (optional)
                  onComment(key, video);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CommentIcon
                  comments={formattedComments}
                  size={26}
                  color="#98A2B3"
                  showCount={true}
                  count={commentCount || video.comment || 0}
                  layout="horizontal"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const wasSaved = Boolean(userSaveState);
                  onSave(modalKey, video);
                  const message = wasSaved
                    ? "Removed from library"
                    : "Saved to library";
                  try {
                    Alert.alert("Library", message);
                  } catch {}
                }}
                className="flex-row items-center mr-6"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={
                    userSaveState
                      ? ("bookmark" as any)
                      : ("bookmark-outline" as any)
                  }
                  size={26}
                  color={userSaveState ? "#FEA74E" : "#98A2B3"}
                />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {saveCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onShare(modalKey, video)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="send" size={26} color="#98A2B3" />
              </TouchableOpacity>
            </View>
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
