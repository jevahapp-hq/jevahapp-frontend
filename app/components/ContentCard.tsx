import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PanResponder,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useCommentModal } from "../context/CommentModalContext";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { getSafeVideoUrl } from "../utils/videoUrlUtils";
import CommentIcon from "./CommentIcon";

const { width: screenWidth } = Dimensions.get("window");

interface ContentCardProps {
  content: {
    _id: string;
    title: string;
    description?: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    contentType: "video" | "audio" | "image";
    duration?: number;
    author: {
      _id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    likeCount: number;
    commentCount: number;
    shareCount: number;
    viewCount: number;
    createdAt: string;
    isLiked?: boolean;
    isBookmarked?: boolean;
  };
  onLike: (contentId: string, liked: boolean) => Promise<void>;
  onComment: (contentId: string) => void;
  onShare: (contentId: string) => Promise<void>;
  onAuthorPress: (authorId: string) => void;
  onSaveToLibrary?: (contentId: string, isBookmarked: boolean) => Promise<void>;
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
  onSaveToLibrary,
}) => {
  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>(
    {}
  );
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<
    Record<string, number>
  >({});
  const [contentStats, setContentStats] = useState<Record<string, any>>({});

  // Video URL management
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(
    content.mediaUrl
  );
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Advanced video behavior states
  const [isHovered, setIsHovered] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isFullVideoPlaying, setIsFullVideoPlaying] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);

  // Store hooks
  const globalVideoStore = useGlobalVideoStore();
  const libraryStore = useLibraryStore();
  const { comments } = useInteractionStore();
  const { showCommentModal } = useCommentModal();

  // Refs
  const videoRef = useRef<Video>(null);
  const modalKey = `content-${content._id}`;
  const key = `content-${content._id}`;

  // Get existing comments for this content
  const contentId = content._id;
  const currentComments = comments[contentId] || [];

  // Sample comments for testing
  const sampleComments = [
    {
      id: "1",
      userName: content.author.firstName || "User",
      avatar: content.author.avatar || "",
      timestamp: "3HRS AGO",
      comment: "Amazing content! God is working!",
      likes: 45,
      isLiked: false,
    },
    {
      id: "2",
      userName: "Another User",
      avatar: "",
      timestamp: "24HRS",
      comment: "This really touched my heart.",
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

  // Helper functions
  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const posted = new Date(createdAt);
    const diff = now.getTime() - posted.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return "NOW";
    if (minutes < 60) return `${minutes}MIN AGO`;
    if (hours < 24) return `${hours}HRS AGO`;
    return `${days}DAYS AGO`;
  };

  const getUserAvatarFromContent = (content: any) => {
    // Check if author has avatar
    if (content.author?.avatar) {
      return typeof content.author.avatar === "string"
        ? { uri: content.author.avatar }
        : content.author.avatar;
    }

    // Use Cloudinary default avatar like Jentezen Franklin
    return {
      uri: "https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_crop,g_face,r_max/w_200/lady.jpg",
    };
  };

  const getUserDisplayNameFromContent = (content: any) => {
    // Check if author has complete name
    if (content.author?.firstName && content.author?.lastName) {
      return `${content.author.firstName} ${content.author.lastName}`;
    }

    // Check if author has firstName only
    if (content.author?.firstName) {
      return content.author.firstName;
    }

    // Check if author has lastName only
    if (content.author?.lastName) {
      return content.author.lastName;
    }

    // Check if author exists but no name
    if (
      content.author &&
      (content.author._id === null || !content.author.firstName)
    ) {
      return "Jevah HQ";
    }

    // Final fallback
    return "Jevah HQ";
  };

  // Audio playback functions
  const playAudio = async () => {
    if (!content.mediaUrl) return;
    if (isAudioLoading) return;

    setIsAudioLoading(true);
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
          } else {
            await sound.playAsync();
            setIsPlaying(true);
          }
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: content.mediaUrl },
          {
            shouldPlay: true,
            isMuted: isMuted,
          }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setAudioDuration(status.durationMillis);
              setAudioProgress(
                (status.positionMillis || 0) / status.durationMillis
              );
            }
            if (status.didJustFinish) {
              setIsPlaying(false);
              setAudioProgress(0);
            }
          }
        });
      }
    } catch (error) {
      console.error("Audio playback error:", error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  // Advanced video behavior functions
  const handleVideoHover = () => {
    if (content.contentType === "video") {
      setIsHovered(true);
      setIsPreviewPlaying(true);
      // Start muted preview
      globalVideoStore.playVideo(modalKey);
      // Ensure video is muted for preview
      if (!globalVideoStore.mutedVideos[modalKey]) {
        globalVideoStore.toggleVideoMute(modalKey);
      }
    }
  };

  const handleVideoLeave = () => {
    if (content.contentType === "video") {
      setIsHovered(false);
      setIsPreviewPlaying(false);
      // Stop preview
      globalVideoStore.pauseVideo(modalKey);
    }
  };

  const handleVideoTap = () => {
    if (content.contentType === "video") {
      if (isFullVideoPlaying) {
        // Pause full video
        globalVideoStore.pauseVideo(modalKey);
        setIsFullVideoPlaying(false);
        setShowVideoControls(false);
      } else {
        // Start full video with sound
        globalVideoStore.playVideo(modalKey);
        // Ensure video is unmuted for full play
        if (globalVideoStore.mutedVideos[modalKey]) {
          globalVideoStore.toggleVideoMute(modalKey);
        }
        setIsFullVideoPlaying(true);
        setShowVideoControls(true);

        // Increment view count when user actively plays video
        if (!viewCounted) {
          incrementView();
        }
      }
    }
  };

  const toggleMute = () => {
    globalVideoStore.toggleVideoMute(modalKey);
  };

  // Interaction handlers
  const handleFavorite = async () => {
    try {
      await onLike(content._id, !content.isLiked);
      setUserFavorites((prev) => ({ ...prev, [key]: !content.isLiked }));
      setGlobalFavoriteCounts((prev) => ({
        ...prev,
        [key]: content.isLiked ? content.likeCount - 1 : content.likeCount + 1,
      }));
    } catch (error) {
      Alert.alert("Error", "Failed to update like");
    }
  };

  const handleComment = () => {
    // Call the onComment prop to let the parent handle the modal
    onComment(content._id);
  };

  const handleShare = async () => {
    try {
      await onShare(content._id);
      setContentStats((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          sheared: (prev[key]?.sheared || content.shareCount) + 1,
        },
      }));
    } catch (error) {
      Alert.alert("Error", "Failed to share content");
    }
  };

  const handleSaveToLibrary = async () => {
    if (onSaveToLibrary) {
      try {
        await onSaveToLibrary(content._id, content.isBookmarked || false);
        // Update local state to reflect the change
        setContentStats((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            saved: content.isBookmarked ? 0 : 1,
          },
        }));
      } catch (error) {
        Alert.alert("Error", "Failed to update library");
      }
    }
  };

  const handleSave = async () => {
    // Use the new save to library handler if available
    if (onSaveToLibrary) {
      await handleSaveToLibrary();
      return;
    }

    // Fallback to local library store
    const isSaved = contentStats[key]?.saved === 1;

    if (!isSaved) {
      // Save to library
      const libraryItem = {
        id: key,
        contentType: content.contentType,
        fileUrl: content.mediaUrl,
        title: content.title,
        speaker: getUserDisplayNameFromContent(content),
        uploadedBy: content.author._id,
        description: content.description,
        createdAt: content.createdAt,
        speakerAvatar: content.author.avatar,
        views: contentStats[key]?.views || content.viewCount,
        sheared: contentStats[key]?.sheared || content.shareCount,
        favorite: contentStats[key]?.favorite || content.likeCount,
        comment: contentStats[key]?.comment || content.commentCount,
        saved: 1,
        imageUrl: content.thumbnailUrl || content.mediaUrl,
        thumbnailUrl: content.thumbnailUrl,
        originalKey: key,
      };

      await libraryStore.addToLibrary(libraryItem);
    } else {
      await libraryStore.removeFromLibrary(key);
    }

    setContentStats((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        saved: isSaved ? 0 : 1,
      },
    }));
  };

  const incrementView = () => {
    if (!viewCounted) {
      setContentStats((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          views: (prev[key]?.views || content.viewCount) + 1,
        },
      }));
      setViewCounted(true);
    }
  };

  // Handle video URL refresh
  const handleVideoUrlRefresh = async () => {
    if (isRefreshingUrl) return;

    setIsRefreshingUrl(true);
    setVideoLoadError(null);

    try {
      console.log(`🔄 Refreshing video URL for: ${content.title}`);
      const safeUrl = await getSafeVideoUrl(content.mediaUrl, content._id);
      setCurrentVideoUrl(safeUrl);
      console.log(`✅ Updated video URL: ${safeUrl}`);
    } catch (error) {
      console.error(`❌ Failed to refresh video URL:`, error);
      setVideoLoadError("Failed to load video");
    } finally {
      setIsRefreshingUrl(false);
    }
  };

  // Pan responder for progress bar
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const x = Math.max(0, Math.min(gestureState.moveX - 50, 260));
      const pct = (x / 260) * 100;

      if (content.contentType === "video" && videoRef.current) {
        videoRef.current.getStatusAsync().then((status: any) => {
          if (status.isLoaded && status.durationMillis) {
            videoRef.current?.setPositionAsync(
              (pct / 100) * status.durationMillis
            );
          }
        });
      } else if (content.contentType === "audio" && sound) {
        sound.getStatusAsync().then((status: any) => {
          if (status.isLoaded && status.durationMillis) {
            sound.setPositionAsync((pct / 100) * status.durationMillis);
          }
        });
      }
    },
  });

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Initialize video URL on mount
  useEffect(() => {
    const initializeVideoUrl = async () => {
      if (content.contentType === "video" && content.mediaUrl) {
        try {
          const safeUrl = await getSafeVideoUrl(content.mediaUrl, content._id);
          setCurrentVideoUrl(safeUrl);
        } catch (error) {
          console.error("❌ Failed to initialize video URL:", error);
          setCurrentVideoUrl(content.mediaUrl); // Fallback to original
        }
      }
    };

    initializeVideoUrl();
  }, [content.mediaUrl, content._id, content.contentType]);

  // Render based on content type
  const renderMediaContent = () => {
    if (content.contentType === "video") {
      return (
        <TouchableWithoutFeedback onPress={handleVideoTap}>
          <View
            className="w-full h-[400px] overflow-hidden relative"
            onTouchStart={handleVideoHover}
            onTouchEnd={handleVideoLeave}
          >
            {/* Static thumbnail overlay - shown when not playing (only for non-video content) */}
            {content.contentType !== "video" &&
              !isPreviewPlaying &&
              !isFullVideoPlaying && (
                <Image
                  source={{ uri: content.thumbnailUrl || content.mediaUrl }}
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                  }}
                  resizeMode="cover"
                  onError={(error) => {
                    console.warn(
                      `❌ Thumbnail load error for ${content.title}:`,
                      error
                    );
                  }}
                />
              )}

            {/* Video loading indicator */}
            {isVideoLoading && (isPreviewPlaying || isFullVideoPlaying) && (
              <View className="absolute inset-0 justify-center items-center bg-black/20">
                <ActivityIndicator size="large" color="#FEA74E" />
                <Text className="text-white text-sm mt-2 font-rubik">
                  {isRefreshingUrl ? "Refreshing video..." : "Loading video..."}
                </Text>
              </View>
            )}

            {/* Video error indicator */}
            {videoLoadError && !isVideoLoading && (
              <View className="absolute inset-0 justify-center items-center bg-black/50">
                <View className="bg-white/90 p-4 rounded-lg mx-4">
                  <Text className="text-red-600 text-center font-rubik-semibold mb-2">
                    Video Unavailable
                  </Text>
                  <Text className="text-gray-700 text-center text-sm font-rubik mb-3">
                    {videoLoadError}
                  </Text>
                  <TouchableOpacity
                    onPress={handleVideoUrlRefresh}
                    disabled={isRefreshingUrl}
                    className="bg-[#FEA74E] px-4 py-2 rounded-lg"
                  >
                    <Text className="text-white text-center font-rubik-semibold">
                      {isRefreshingUrl ? "Retrying..." : "Retry"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Video player - always visible for videos */}
            <Video
              ref={videoRef}
              source={{ uri: currentVideoUrl }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode={ResizeMode.COVER}
              isMuted={globalVideoStore.mutedVideos[modalKey] ?? true} // Default muted
              volume={globalVideoStore.mutedVideos[modalKey] ? 0.0 : 1.0}
              shouldPlay={isPreviewPlaying || isFullVideoPlaying}
              useNativeControls={false}
              onLoadStart={() => {
                console.log(`🔄 Loading video: ${content.title}`);
                console.log(`🔗 Video URL: ${currentVideoUrl}`);
                setVideoLoadError(null);
              }}
              onLoad={() => {
                console.log(`✅ Video loaded successfully: ${content.title}`);
                setIsVideoLoading(false);
                setVideoLoadError(null);
              }}
              onError={(error: any) => {
                console.error(
                  `❌ Video loading error for ${content.title}:`,
                  error
                );
                console.error(`🔗 Failed URL: ${currentVideoUrl}`);
                setIsVideoLoading(false);
                setVideoLoadError("Video failed to load");

                // Auto-retry with URL refresh if this is the first failure
                if (!videoLoadError) {
                  console.log(`🔄 Auto-retrying with URL refresh...`);
                  setTimeout(() => {
                    handleVideoUrlRefresh();
                  }, 1000);
                } else {
                  // Show user-friendly error message for persistent failures
                  Alert.alert(
                    "Video Unavailable",
                    `The video "${content.title}" is currently unavailable. Please try again later.`,
                    [
                      { text: "Retry", onPress: handleVideoUrlRefresh },
                      { text: "OK" },
                    ]
                  );
                }
              }}
              onPlaybackStatusUpdate={(status: any) => {
                if (!status.isLoaded) return;
                const pct = status.durationMillis
                  ? (status.positionMillis / status.durationMillis) * 100
                  : 0;
                globalVideoStore.setVideoProgress(modalKey, pct);

                if (status.didJustFinish) {
                  videoRef.current?.setPositionAsync(0);
                  globalVideoStore.pauseVideo(modalKey);
                  globalVideoStore.setVideoCompleted(modalKey, true);
                  setIsFullVideoPlaying(false);
                  setShowVideoControls(false);
                }
              }}
            />

            {/* Right side actions */}
            <View className="flex-col absolute mt-[170px] ml-[360px]">
              <TouchableOpacity
                onPress={handleFavorite}
                className="flex-col justify-center items-center"
              >
                <MaterialIcons
                  name={userFavorites[key] ? "favorite" : "favorite-border"}
                  size={30}
                  color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {globalFavoriteCounts[key] || content.likeCount}
                </Text>
              </TouchableOpacity>
              <View className="flex-col justify-center items-center mt-6">
                <CommentIcon
                  comments={formattedComments}
                  size={30}
                  color="white"
                  showCount={true}
                  count={contentStats[key]?.comment || content.commentCount}
                  layout="vertical"
                />
              </View>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-col justify-center items-center mt-6"
              >
                <MaterialIcons
                  name={
                    contentStats[key]?.saved === 1
                      ? "bookmark"
                      : "bookmark-border"
                  }
                  size={30}
                  color={contentStats[key]?.saved === 1 ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {contentStats[key]?.saved === 1
                    ? (contentStats[key]?.saved || 0) + 1
                    : contentStats[key]?.saved || 0}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Centered Play/Pause Button - only show when not in preview mode */}
            {!isPreviewPlaying && (
              <View className="absolute inset-0 justify-center items-center">
                <TouchableOpacity onPress={handleVideoTap}>
                  <View
                    className={`${
                      isFullVideoPlaying ? "bg-black/30" : "bg-white/70"
                    } p-3 rounded-full`}
                  >
                    <Ionicons
                      name={isFullVideoPlaying ? "pause" : "play"}
                      size={32}
                      color={isFullVideoPlaying ? "#FFFFFF" : "#FEA74E"}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Preview indicator - show when hovering/previewing */}
            {isPreviewPlaying && !isFullVideoPlaying && (
              <View className="absolute top-4 right-4">
                <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                  <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  <Text className="text-white text-xs font-rubik">Preview</Text>
                </View>
              </View>
            )}

            {/* Content Type Icon */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 p-1 rounded-full">
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Video Title - show when paused */}
            {!globalVideoStore.playingVideos[modalKey] && (
              <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
                <Text
                  className="text-white font-semibold text-[14px]"
                  numberOfLines={2}
                >
                  {content.title}
                </Text>
              </View>
            )}

            {/* Bottom Controls - only show when in full play mode */}
            {showVideoControls && isFullVideoPlaying && (
              <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
                <View
                  className="flex-1 h-1 bg-white/30 rounded-full relative"
                  {...panResponder.panHandlers}
                >
                  <View
                    className="h-full bg-[#FEA74E] rounded-full"
                    style={{
                      width: `${globalVideoStore.progresses[modalKey] || 0}%`,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: `${globalVideoStore.progresses[modalKey] || 0}%`,
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
                <TouchableOpacity onPress={toggleMute}>
                  <Ionicons
                    name={
                      globalVideoStore.mutedVideos[modalKey]
                        ? "volume-mute"
                        : "volume-high"
                    }
                    size={20}
                    color="#FEA74E"
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      );
    } else if (content.contentType === "audio") {
      return (
        <TouchableWithoutFeedback onPress={() => {}}>
          <View className="w-full h-[400px] overflow-hidden relative">
            <Image
              source={{ uri: content.thumbnailUrl || content.mediaUrl }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode="cover"
              onError={(error) => {
                console.warn(
                  `❌ Audio thumbnail load error for ${content.title}:`,
                  error
                );
              }}
            />

            {/* Center Play/Pause button */}
            <View className="absolute inset-0 justify-center items-center">
              <TouchableOpacity
                onPress={playAudio}
                className="bg-white/70 p-3 rounded-full"
                activeOpacity={0.9}
              >
                {isAudioLoading ? (
                  <ActivityIndicator size="small" color="#FEA74E" />
                ) : (
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={32}
                    color="#FEA74E"
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Right side actions */}
            <View className="flex-col absolute mt-[170px] ml-[360px]">
              <TouchableOpacity
                onPress={handleFavorite}
                className="flex-col justify-center items-center"
              >
                <MaterialIcons
                  name={userFavorites[key] ? "favorite" : "favorite-border"}
                  size={30}
                  color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {globalFavoriteCounts[key] || content.likeCount}
                </Text>
              </TouchableOpacity>
              <View className="flex-col justify-center items-center mt-6">
                <CommentIcon
                  comments={formattedComments}
                  size={30}
                  color="white"
                  showCount={true}
                  count={contentStats[key]?.comment || content.commentCount}
                  layout="vertical"
                />
              </View>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-col justify-center items-center mt-6"
              >
                <MaterialIcons
                  name={
                    contentStats[key]?.saved === 1
                      ? "bookmark"
                      : "bookmark-border"
                  }
                  size={30}
                  color={contentStats[key]?.saved === 1 ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {contentStats[key]?.saved === 1
                    ? (contentStats[key]?.saved || 0) + 1
                    : contentStats[key]?.saved || 0}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Type Icon */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Bottom Controls */}
            <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
              <TouchableOpacity onPress={playAudio}>
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="#FEA74E"
                />
              </TouchableOpacity>
              <View
                className="flex-1 h-1 bg-white/30 rounded-full relative"
                {...panResponder.panHandlers}
              >
                <View
                  className="h-full bg-[#FEA74E] rounded-full"
                  style={{ width: `${audioProgress * 100}%` }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: `${audioProgress * 100}%`,
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
              <TouchableOpacity onPress={() => setIsMuted(!isMuted)}>
                <Ionicons
                  name={isMuted ? "volume-mute" : "volume-high"}
                  size={20}
                  color="#FEA74E"
                />
              </TouchableOpacity>
            </View>

            {/* Title overlay */}
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text
                className="text-white font-semibold text-[14px]"
                numberOfLines={2}
              >
                {content.title}
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    } else {
      // Image content
      return (
        <TouchableWithoutFeedback
          onPress={() => console.log("Open image:", content.title)}
        >
          <View className="w-full h-[400px] overflow-hidden relative">
            <Image
              source={{ uri: content.thumbnailUrl || content.mediaUrl }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode="cover"
              onError={(error) => {
                console.warn(
                  `❌ Image load error for ${content.title}:`,
                  error
                );
              }}
            />

            {/* Right side actions */}
            <View className="flex-col absolute mt-[170px] ml-[360px]">
              <TouchableOpacity
                onPress={handleFavorite}
                className="flex-col justify-center items-center"
              >
                <MaterialIcons
                  name={userFavorites[key] ? "favorite" : "favorite-border"}
                  size={30}
                  color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {globalFavoriteCounts[key] || content.likeCount}
                </Text>
              </TouchableOpacity>
              <View className="flex-col justify-center items-center mt-6">
                <CommentIcon
                  comments={formattedComments}
                  size={30}
                  color="white"
                  showCount={true}
                  count={contentStats[key]?.comment || content.commentCount}
                  layout="vertical"
                />
              </View>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-col justify-center items-center mt-6"
              >
                <MaterialIcons
                  name={
                    contentStats[key]?.saved === 1
                      ? "bookmark"
                      : "bookmark-border"
                  }
                  size={30}
                  color={contentStats[key]?.saved === 1 ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {contentStats[key]?.saved === 1
                    ? (contentStats[key]?.saved || 0) + 1
                    : contentStats[key]?.saved || 0}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Type Icon */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 p-1 rounded-full">
                <Ionicons name="image" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Image Title */}
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text
                className="text-white font-semibold text-[14px]"
                numberOfLines={2}
              >
                {content.title}
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    }
  };

  return (
    <View key={modalKey} className="flex flex-col mb-10">
      {renderMediaContent()}

      {/* Footer - matching your existing design exactly */}
      <View className="flex-row items-center justify-between mt-1 px-3">
        <View className="flex flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
            <Image
              source={getUserAvatarFromContent(content)}
              style={{ width: 30, height: 30, borderRadius: 999 }}
              resizeMode="cover"
              onError={(error) => {
                console.warn(
                  "❌ Failed to load speaker avatar:",
                  error.nativeEvent.error
                );
              }}
            />
          </View>
          <View className="ml-3">
            <View className="flex-row items-center">
              <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                {getUserDisplayNameFromContent(content)}
              </Text>
              <View className="flex flex-row mt-2 ml-2">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {getTimeAgo(content.createdAt)}
                </Text>
              </View>
            </View>
            <View className="flex-row mt-2">
              <View className="flex-row items-center">
                <AntDesign name="eyeo" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                  {contentStats[key]?.views ?? content.viewCount ?? 0}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleShare}
                className="flex-row items-center ml-4"
              >
                <Feather name="send" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {contentStats[key]?.sheared ?? content.shareCount ?? 0}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(!modalVisible)}
          className="mr-2"
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Modal with touch-outside-to-close functionality */}
      {modalVisible && (
        <>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
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
              onPress={handleShare}
              className="py-2 border-b border-gray-200 flex-row items-center justify-between"
            >
              <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
              <Feather name="send" size={22} color="#1D2939" />
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center justify-between mt-6"
              onPress={handleSave}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">
                {contentStats[key]?.saved === 1
                  ? "Remove from Library"
                  : "Save to Library"}
              </Text>
              <MaterialIcons
                name={
                  contentStats[key]?.saved === 1
                    ? "bookmark"
                    : "bookmark-border"
                }
                size={22}
                color="#1D2939"
              />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

export default React.memo(ContentCard);
