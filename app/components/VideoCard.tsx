import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  InteractionManager,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { VideoCardProps } from "../types/media";
import CommentIcon from "./CommentIcon";

export default function VideoCard({
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
}: VideoCardProps) {
  const [refreshedUrl, setRefreshedUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const videoRef = useRef<Video>(null);
  const isMountedRef = useRef(true);

  const key = getContentKey(video);
  const stats = contentStats[key] || {};
  const isSermon = video.contentType === "sermon";

  // Proper cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Safely cleanup video on main thread
      InteractionManager.runAfterInteractions(() => {
        if (videoRef.current && isMountedRef.current === false) {
          try {
            // Only cleanup if component is unmounted
            videoRef.current = null;
          } catch (error) {
            console.warn("Video cleanup error:", error);
          }
        }
      });
    };
  }, []);

  // Get existing comments for this video
  const contentId = video._id || modalKey;
  const currentComments = comments[contentId] || [];

  // Sample comments for testing
  const sampleComments = [
    {
      id: "1",
      userName: "Joseph Eluwa",
      avatar: "",
      timestamp: "3HRS AGO",
      comment: "Wow!! My Faith has just been renewed.",
      likes: 193,
      isLiked: false,
    },
    {
      id: "2",
      userName: "Liz Elizabeth",
      avatar: "",
      timestamp: "24HRS",
      comment: "This video really touched my heart. God is working!",
      likes: 45,
      isLiked: false,
    },
    {
      id: "3",
      userName: "Chris Evans",
      avatar: "",
      timestamp: "3 DAYS AGO",
      comment: "Amazing message! Thank you for sharing this.",
      likes: 23,
      isLiked: false,
    },
  ];

  const formattedComments =
    currentComments.length > 0
      ? currentComments.map((comment: any) => ({
          id: comment.id,
          userName: comment.username || "Anonymous",
          avatar: comment.userAvatar || "",
          timestamp: comment.timestamp,
          comment: comment.comment,
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false,
        }))
      : sampleComments;

  const videoUrl = refreshedUrl || video.fileUrl;

  // Debug: Log the shouldPlay value
  const shouldPlayValue = playingVideos[modalKey] ?? false;
  console.log(
    `🎥 Video ${modalKey} shouldPlay:`,
    shouldPlayValue,
    "playingVideos:",
    playingVideos
  );

  // Handle play/pause button click (local playback)
  const handlePlayButtonPress = () => {
    console.log("▶️ Play button pressed for:", modalKey);
    console.log("▶️ Current playing state:", playingVideos[modalKey]);
    console.log("▶️ All playing videos:", playingVideos);
    console.log("▶️ onTogglePlay function:", typeof onTogglePlay);
    console.log("▶️ Video ref exists:", !!videoRef.current);

    onTogglePlay(modalKey);

    // Check state after a short delay
    setTimeout(() => {
      console.log("▶️ State after toggle - playing:", playingVideos[modalKey]);
      console.log("▶️ All playing videos after:", playingVideos);
    }, 100);
  };

  // Handle clicking outside play button (go to fullscreen)
  const handleVideoAreaPress = () => {
    console.log("🎬 Video area tapped - going to fullscreen:", modalKey);
    console.log("🎬 Video data:", { title: video.title, index, modalKey });
    console.log("🎬 onVideoTap function:", typeof onVideoTap);

    // Ensure we have all required parameters
    if (onVideoTap && video && typeof index === "number") {
      console.log("✅ All parameters valid, calling onVideoTap");
      onVideoTap(modalKey, video, index);
    } else {
      console.error("❌ Missing required parameters for onVideoTap:", {
        onVideoTap: !!onVideoTap,
        video: !!video,
        index: typeof index,
        modalKey,
      });
    }
  };

  const panResponder = {
    panHandlers: {
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt: any, gestureState: any) => {
        const x = Math.max(0, Math.min(gestureState.moveX - 50, 260));
        const pct = (x / 260) * 100;

        // Ensure video operations happen on main thread
        InteractionManager.runAfterInteractions(() => {
          if (
            videoRef.current?.getStatusAsync &&
            videoRef.current?.setPositionAsync &&
            isMountedRef.current
          ) {
            videoRef.current
              .getStatusAsync()
              .then((status: any) => {
                if (
                  status.isLoaded &&
                  status.durationMillis &&
                  isMountedRef.current
                ) {
                  videoRef.current?.setPositionAsync(
                    (pct / 100) * status.durationMillis
                  );
                }
              })
              .catch((error) => {
                console.warn("Video seek error:", error);
              });
          }
        });
      },
    },
  };

  return (
    <View key={modalKey} className="flex flex-col mb-10">
      <TouchableWithoutFeedback onPress={handleVideoAreaPress}>
        <View className="w-full h-[400px] overflow-hidden relative">
          <Video
            ref={videoRef}
            source={{
              uri:
                videoUrl &&
                videoUrl.trim() &&
                videoUrl.trim() !== "https://example.com/placeholder.mp4"
                  ? videoUrl.trim()
                  : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode={ResizeMode.COVER}
            isMuted={mutedVideos[modalKey] ?? false}
            volume={mutedVideos[modalKey] ? 0.0 : videoVolume}
            shouldPlay={shouldPlayValue}
            useNativeControls={false}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded || !isMountedRef.current) return;

              const pct = status.durationMillis
                ? (status.positionMillis / status.durationMillis) * 100
                : 0;

              if (status.didJustFinish) {
                // Increment view count when video completes
                if (!viewCounted && isMountedRef.current) {
                  setViewCounted(true);
                  console.log(
                    `✅ Video completed, view counted for: ${video.title}`
                  );
                }

                // Safely reset video position on main thread
                InteractionManager.runAfterInteractions(() => {
                  if (videoRef.current && isMountedRef.current) {
                    videoRef.current.setPositionAsync(0).catch((error) => {
                      console.warn("Video reset error:", error);
                    });
                  }
                });

                console.log("Video finished:", modalKey);
              }
            }}
          />

          {/* Centered Play/Pause Button */}
          <View className="absolute inset-0 justify-center items-center">
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); // Prevent event bubbling to parent
                handlePlayButtonPress();
              }}
            >
              <View
                className={`${
                  playingVideos[modalKey] ? "bg-black/30" : "bg-white/70"
                } p-3 rounded-full`}
              >
                <Ionicons
                  name={playingVideos[modalKey] ? "pause" : "play"}
                  size={32}
                  color={playingVideos[modalKey] ? "#FFFFFF" : "#FEA74E"}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Auto-play indicator */}
          {playingVideos[modalKey] && currentlyVisibleVideo === modalKey && (
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                <Text className="text-white text-xs font-rubik">
                  Auto-playing
                </Text>
              </View>
            </View>
          )}

          {/* Content Type Icon */}
          <View className="absolute top-4 left-4">
            <View className="bg-black/50 p-1 rounded-full">
              <Ionicons
                name={isSermon ? "person" : "videocam"}
                size={16}
                color="#FFFFFF"
              />
            </View>
          </View>

          {/* Video Title - show when paused */}
          {!playingVideos[modalKey] && (
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text
                className="text-white font-semibold text-[14px]"
                numberOfLines={2}
              >
                {video.title}
              </Text>
            </View>
          )}

          {/* Bottom Controls */}
          <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
            <View
              className="flex-1 h-1 bg-white/30 rounded-full relative"
              {...panResponder.panHandlers}
            >
              <View
                className="h-full bg-[#FEA74E] rounded-full"
                style={{ width: `${progresses[modalKey] || 0}%` }}
              />
              <View
                style={{
                  position: "absolute",
                  left: `${progresses[modalKey] || 0}%`,
                  transform: [{ translateX: -6 }],
                  top: -5,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#FEA74E",
                }}
              />
            </View>
            <TouchableOpacity onPress={() => onToggleMute(modalKey)}>
              <Ionicons
                name={mutedVideos[modalKey] ? "volume-mute" : "volume-high"}
                size={20}
                color="#FEA74E"
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer */}
      <View className="flex-row items-center justify-between mt-1 px-3">
        <View className="flex flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
            <Image
              source={getUserAvatarFromContent(video)}
              style={{ width: 30, height: 30, borderRadius: 999 }}
              resizeMode="cover"
              onError={(error) => {
                console.warn(
                  "❌ Failed to load video speaker avatar:",
                  error.nativeEvent.error
                );
              }}
            />
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
            <View className="flex-row mt-2 items-center justify-between pl-2 pr-8">
              <View className="flex-row items-center mr-6">
                <MaterialIcons name="visibility" size={28} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {stats.views ?? video.views ?? 0}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onFavorite(key, video)}
                className="flex-row items-center mr-6"
              >
                <MaterialIcons
                  name={userFavorites[key] ? "favorite" : "favorite-border"}
                  size={28}
                  color={userFavorites[key] ? "#D22A2A" : "#98A2B3"}
                />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {globalFavoriteCounts[key] || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center mr-6"
                onPress={() => onComment(key, video)}
              >
                <CommentIcon
                  comments={formattedComments}
                  size={28}
                  color="#98A2B3"
                  showCount={true}
                  count={
                    stats.comment === 1
                      ? (video.comment ?? 0) + 1
                      : video.comment ?? 0
                  }
                  layout="horizontal"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onSave(key, video)}
                className="flex-row items-center mr-6"
              >
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                  size={28}
                  color={stats.saved === 1 ? "#FEA74E" : "#98A2B3"}
                />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {stats.saved === 1
                    ? (video.saved ?? 0) + 1
                    : video.saved ?? 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => onDownload(video)}
              >
                <Ionicons
                  name={
                    checkIfDownloaded(video._id || video.fileUrl)
                      ? "checkmark-circle"
                      : "download-outline"
                  }
                  size={28}
                  color={
                    checkIfDownloaded(video._id || video.fileUrl)
                      ? "#256E63"
                      : "#98A2B3"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() =>
            onModalToggle(modalVisible === modalKey ? "" : modalKey)
          }
          className="mr-2"
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Modal */}
      {modalVisible === modalKey && (
        <>
          <TouchableWithoutFeedback onPress={() => onModalToggle("")}>
            <View className="absolute inset-0 z-40" />
          </TouchableWithoutFeedback>

          <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[170px] h-[180]">
            <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
              <Text className="text-[#1D2939] font-rubik ml-2">
                View Details
              </Text>
              <Ionicons name="eye-outline" size={22} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onShare(modalKey, video)}
              className="py-2 border-b border-gray-200 flex-row items-center justify-between"
            >
              <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
              <Feather name="send" size={22} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-between mt-6"
              onPress={() => onSave(modalKey, video)}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">
                {stats.saved === 1 ? "Remove from Library" : "Save to Library"}
              </Text>
              <MaterialIcons
                name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                size={22}
                color="#1D2939"
              />
            </TouchableOpacity>
            <TouchableOpacity
              className="py-2 flex-row items-center justify-between border-t border-gray-200 mt-2"
              onPress={() => onDownload(video)}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">
                {checkIfDownloaded(video._id || video.fileUrl)
                  ? "Downloaded"
                  : "Download"}
              </Text>
              <Ionicons
                name={
                  checkIfDownloaded(video._id || video.fileUrl)
                    ? "checkmark-circle"
                    : "download-outline"
                }
                size={24}
                color={
                  checkIfDownloaded(video._id || video.fileUrl)
                    ? "#256E63"
                    : "#090E24"
                }
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
