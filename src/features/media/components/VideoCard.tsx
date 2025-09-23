import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  InteractionManager,
  PanResponder,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AIDescriptionBox from "../../../shared/components/AIDescriptionBox";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import { InteractionButtons } from "../../../shared/components/InteractionButtons";
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

  // Pan responder for seeking
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const x = Math.max(0, Math.min(gestureState.moveX - 50, 260));
      const pct = (x / 260) * 100;

      if (isPlaying && videoRef.current) {
        InteractionManager.runAfterInteractions(() => {
          if (videoRef.current && isMountedRef.current) {
            videoRef.current
              .getStatusAsync()
              .then((status: AVPlaybackStatus) => {
                if (
                  status.isLoaded &&
                  status.durationMillis &&
                  isMountedRef.current
                ) {
                  const position = (pct / 100) * status.durationMillis;
                  videoRef.current?.setPositionAsync(position);
                }
              })
              .catch((error) => {
                console.warn("Video seek error:", error);
              });
          }
        });
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

  const thumbnailSource = video?.imageUrl || video?.thumbnailUrl;
  const thumbnailUri =
    typeof thumbnailSource === "string"
      ? thumbnailSource
      : (thumbnailSource as any)?.uri;

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
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded) {
                  // Update progress if needed
                  if (status.positionMillis && status.durationMillis) {
                    const newProgress =
                      status.positionMillis / status.durationMillis;
                    // Note: Progress updates should be handled by parent component
                  }
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
          <View className="absolute bottom-3 left-3 right-3">
            <View className="flex-row items-center justify-between bg-black/50 rounded-lg px-3 py-2">
              {/* Progress Bar */}
              <View className="flex-1 h-1 bg-white/30 rounded-full mx-2">
                <View
                  className="h-full bg-white rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>

              {/* Mute Button */}
              <TouchableOpacity onPress={handleToggleMute} className="ml-2">
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-high"}
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

      {/* Footer with User Info and Interactions */}
      <View className="flex-row items-center justify-between mt-1 px-3">
        {/* Tapping anywhere in the user-info section opens full (reels) view */}
        <View className="flex flex-row items-center flex-1">
          {/* User Avatar */}
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
            <Image
              source={getUserAvatarFromContent(video)}
              style={{ width: 30, height: 30, borderRadius: 999 }}
              resizeMode="cover"
            />
          </View>

          {/* User Info */}
          <View className="ml-3 flex-1">
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

            {/* Interaction Buttons */}
            <View className="mt-2">
              <InteractionButtons
                item={video}
                contentId={contentId}
                onLike={() => onFavorite(key, video)}
                onComment={() => onComment(key, video)}
                onSave={() => onSave(key, video)}
                onShare={() => onShare(key, video)}
                onDownload={() => onDownload(video)}
                userLikeState={userLikeState}
                userSaveState={userSaveState}
                likeCount={likeCount}
                saveCount={saveCount}
                commentCount={commentCount}
                viewCount={viewCount}
                isDownloaded={checkIfDownloaded(video._id || video.fileUrl)}
                layout="horizontal"
              />
            </View>
          </View>
        </View>

        {/* More Options */}
        <TouchableOpacity
          onPress={() =>
            onModalToggle(modalVisible === modalKey ? "" : modalKey)
          }
          className="mr-2"
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Slide-up Content Action Modal */}
      <ContentActionModal
        isVisible={modalVisible === modalKey}
        onClose={() => onModalToggle("")}
        onViewDetails={() => {}}
        onSaveToLibrary={() => onSave(modalKey, video)}
        onShare={() => onShare(modalKey, video)}
        onDownload={() => onDownload(video)}
        isSaved={!!contentStats[contentId]?.userInteractions?.saved}
        isDownloaded={checkIfDownloaded(video._id || video.fileUrl)}
        contentTitle={video.title}
      />

      {/* AI Description Box */}
      <AIDescriptionBox
        description={video.description}
        enhancedDescription={video.enhancedDescription}
        bibleVerses={video.bibleVerses}
        title={video.title}
        authorName={getUserDisplayNameFromContent(video)}
        contentType={video.contentType}
        category={video.category}
      />

      {/* Modal */}
      {/* Legacy inline popover removed in favor of sliding modal */}

      {/* Debug Info (Development Only) */}
      {__DEV__ && (
        <View className="mx-3 mt-2 p-2 bg-blue-100 rounded">
          <Text className="text-xs text-blue-800">
            Debug: {video.title} | Playing: {isPlaying ? "Yes" : "No"} | Muted:{" "}
            {isMuted ? "Yes" : "No"} | Progress: {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
};

export default VideoCard;
