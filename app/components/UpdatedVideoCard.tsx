// Example: Updated Video Card component using the new backend interaction system
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
    Image,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useCommentModal } from "../context/CommentModalContext";
import { usePlaybackView } from "../hooks/useContentView";
import { useDownloadStore } from "../store/useDownloadStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useInteractionStore } from "../store/useInteractionStore";
import {
    convertToDownloadableItem,
    useDownloadHandler,
} from "../utils/downloadUtils";
import {
    getUserAvatarFromContent,
    getUserDisplayNameFromContent,
} from "../utils/userValidation";
import { useThreadSafeVideo } from "../utils/videoPlayerUtils";
import InteractionButtons from "./InteractionButtons";
import BaseVideoCard from "./media/BaseVideoCard";
import PlayOverlay from "./media/PlayOverlay";
import TypeBadge from "./media/TypeBadge";

interface VideoCardProps {
  video: {
    _id?: string;
    id?: string;
    fileUrl: string;
    title: string;
    speaker: string;
    uploadedBy?:
      | string
      | {
          _id: string;
          firstName: string;
          lastName: string;
          email: string;
          avatar?: string;
        };
    timeAgo: string;
    speakerAvatar: any;
    imageUrl?: any;
    contentType?: string;
  };
  index: number;
  isModalView?: boolean; // Whether this is in modal/fullscreen view
}

export default function UpdatedVideoCard({
  video,
  index,
  isModalView = false,
}: VideoCardProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { showCommentModal } = useCommentModal();

  const videoRef = useRef<Video>(null);

  // Thread-safe video operations
  const threadSafeVideo = useThreadSafeVideo(videoRef);

  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();

  // Load downloaded items on component mount
  useEffect(() => {
    loadDownloadedItems();
  }, [loadDownloadedItems]);

  // Cleanup video on unmount
  useEffect(() => {
    return () => {
      threadSafeVideo.unload().catch((error) => {
        console.warn("Video cleanup error:", error);
      });
    };
  }, [threadSafeVideo]);

  // Generate consistent content ID
  const contentId = video._id || video.id || `${video.fileUrl}_${index}`;
  const contentType = video.contentType || "video";

  // ✅ Use global video store for cross-component video management
  const globalVideoStore = useGlobalVideoStore();
  const videoKey = `updated-video-${contentId}`;

  // ✅ Get video state from global store
  const isPlaying = globalVideoStore.playingVideos[videoKey] ?? false;
  const showOverlay = globalVideoStore.showOverlay[videoKey] ?? true;

  // Use the playback view hook to track when user watches the video
  const { viewDuration, hasTrackedView } = usePlaybackView({
    contentId,
    contentType: contentType as any,
    isPlaying,
    threshold: 5, // Track view after 5 seconds of playback
  });

  // Load initial stats when component mounts
  const { loadContentStats } = useInteractionStore();

  useEffect(() => {
    loadContentStats(contentId);
  }, [contentId, loadContentStats]);

  const togglePlay = async () => {
    try {
      // Preferred: global control to pause others and play this
      globalVideoStore.playVideoGlobally(videoKey);

      // Fallback: if playback doesn't start shortly, attempt direct play
      setTimeout(async () => {
        try {
          const status: any = await videoRef.current?.getStatusAsync?.();
          if (!status?.isLoaded) {
            await videoRef.current?.loadAsync(
              { uri: video.fileUrl || "" },
              { shouldPlay: true }
            );
            return;
          }
          if (!status?.isPlaying) {
            await videoRef.current?.playAsync?.();
          }
        } catch (e) {
          // last-resort attempt
          try {
            await videoRef.current?.playAsync?.();
          } catch {}
        }
      }, 150);
    } catch (error) {
      console.error("Error toggling video playback:", error);
      try {
        await videoRef.current?.playAsync?.();
      } catch {}
    }
  };

  const handlePlaybackStatusUpdate = (status: any) => {
    if (!status.isLoaded) return;

    // Handle video completion
    if (status.didJustFinish) {
      globalVideoStore.pauseVideo(videoKey);
      globalVideoStore.setVideoCompleted(videoKey, true);
    }
  };

  // Get user avatar and display name from content data
  const userAvatar = getUserAvatarFromContent(video);
  const userDisplayName = getUserDisplayNameFromContent(video);

  return (
    <BaseVideoCard className="mb-6">
      {/* Video Player Section */}
      <View className="relative">
        <TouchableOpacity
          onPress={togglePlay}
          className="w-full h-[250px] bg-black"
          activeOpacity={0.9}
        >
          <Video
            ref={videoRef}
            source={{ uri: video.fileUrl || "" }}
            style={{ width: "100%", height: "100%" }}
            resizeMode={ResizeMode.COVER}
            isMuted={false}
            shouldPlay={isPlaying}
            useNativeControls={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            posterSource={
              video.imageUrl
                ? typeof video.imageUrl === "string"
                  ? { uri: video.imageUrl }
                  : (video.imageUrl as any)
                : undefined
            }
          />

          {/* Play Button Overlay */}
          {!isPlaying && showOverlay && (
            <PlayOverlay isPlaying={false} onPress={togglePlay} />
          )}

          {/* Content Type Badge */}
          <TypeBadge
            type={
              (contentType.includes("video")
                ? "video"
                : contentType.includes("sermon")
                ? "sermon"
                : "audio") as any
            }
          />

          {/* Interaction Buttons moved outside parent Touchable to avoid touch conflicts */}

          {/* Video Title Overlay */}
          {!isPlaying && showOverlay && (
            <View className="absolute bottom-4 left-4 right-4">
              <Text
                className="text-white font-rubik-semibold text-sm"
                numberOfLines={2}
              >
                {video.title}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Interaction Buttons (only in modal view) - placed outside the Touchable to ensure first-tap reliability */}
        {isModalView && (
          <View className="absolute right-4 bottom-16" pointerEvents="box-none">
            <InteractionButtons
              contentId={contentId}
              contentType={contentType as any}
              contentTitle={video.title}
              contentUrl={video.fileUrl}
              layout="vertical"
              iconSize={30}
              onCommentPress={() =>
                showCommentModal(
                  [],
                  contentId,
                  "media",
                  userDisplayName
                )
              }
            />
          </View>
        )}
      </View>

      {/* Video Info Section (for feed view) */}
      {!isModalView && (
        <View className="p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-gray-900 font-rubik-semibold text-base mb-1">
                {video.title}
              </Text>

              <View className="flex-row items-center mb-2">
                <Image
                  source={userAvatar}
                  className="w-6 h-6 rounded-full mr-2"
                  resizeMode="cover"
                />
                <Text className="text-gray-600 font-rubik text-sm">
                  {userDisplayName}
                </Text>
                <Text className="text-gray-400 font-rubik text-sm ml-2">
                  • {video.timeAgo}
                </Text>
              </View>

              {/* Horizontal Interaction Stats */}
              <InteractionButtons
                contentId={contentId}
                contentType={contentType as any}
                contentTitle={video.title}
                contentUrl={video.fileUrl}
                layout="horizontal"
                iconSize={20}
                onCommentPress={() =>
                  showCommentModal(
                    [],
                    contentId,
                    "media",
                    userDisplayName
                  )
                }
              />
            </View>

            {/* Menu Button */}
            <TouchableOpacity
              onPress={() => setModalVisible(!modalVisible)}
              className="p-2"
            >
              <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Action Menu */}
          {modalVisible && (
            <>
              <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                <View className="absolute inset-0 z-10" />
              </TouchableWithoutFeedback>

              <View className="absolute top-12 right-4 bg-white shadow-lg rounded-lg p-3 z-20 w-40">
                <TouchableOpacity className="py-2 flex-row items-center">
                  <Ionicons name="eye-outline" size={20} color="#374151" />
                  <Text className="text-gray-700 font-rubik ml-3">
                    View Details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="py-2 flex-row items-center"
                  onPress={async () => {
                    try {
                      const downloadableItem = convertToDownloadableItem(
                        video,
                        "video"
                      );
                      const result = await handleDownload(downloadableItem);
                      if (result.success) {
                        setModalVisible(false);
                        // Force re-render to update download status
                        await loadDownloadedItems();
                      }
                    } catch (error) {
                      console.error("Download error:", error);
                    }
                  }}
                >
                  <Ionicons
                    name={
                      checkIfDownloaded(video._id || video.fileUrl)
                        ? "checkmark-circle"
                        : "download-outline"
                    }
                    size={20}
                    color={
                      checkIfDownloaded(video._id || video.fileUrl)
                        ? "#256E63"
                        : "#374151"
                    }
                  />
                  <Text className="text-gray-700 font-rubik ml-3">
                    {checkIfDownloaded(video._id || video.fileUrl)
                      ? "Downloaded"
                      : "Download"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity className="py-2 flex-row items-center">
                  <Ionicons name="flag-outline" size={20} color="#374151" />
                  <Text className="text-gray-700 font-rubik ml-3">Report</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* View tracking indicator (for development/debugging) */}
          {__DEV__ && (
            <View className="mt-2 p-2 bg-gray-100 rounded">
              <Text className="text-xs text-gray-600 font-mono">
                View Duration: {viewDuration}s | Tracked:{" "}
                {hasTrackedView ? "Yes" : "No"}
              </Text>
            </View>
          )}
        </View>
      )}

    </BaseVideoCard>
  );
}

// Usage example in your VideoComponent:
/*
import UpdatedVideoCard from '../components/UpdatedVideoCard';

// In your render method:
{videos.map((video, index) => (
  <UpdatedVideoCard
    key={video._id || index}
    video={video}
    index={index}
    isModalView={false} // Set to true for full-screen modal view
  />
))}
*/
