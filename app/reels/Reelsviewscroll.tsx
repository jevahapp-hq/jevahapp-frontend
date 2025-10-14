import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Image,
    PanResponder,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

import Skeleton from "../../src/shared/components/Skeleton/Skeleton";
import ErrorBoundary from "../components/ErrorBoundary";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { useCommentModal } from "../context/CommentModalContext";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useReelsStore } from "../store/useReelsStore";
import allMediaAPI from "../utils/allMediaAPI";
import { audioConfig } from "../utils/audioConfig";
import { navigateMainTab } from "../utils/navigation";
import {
    getFavoriteState,
    getPersistedStats,
    persistStats,
    toggleFavorite,
} from "../utils/persistentStorage";
import { getUserAvatarFromContent } from "../utils/userValidation";

// ✅ Route Params Type
type Params = {
  title: string;
  speaker: string;
  timeAgo: string;
  views: string;
  sheared: string;
  saved: string;
  favorite: string;
  imageUrl: string;
  speakerAvatar: string;
  isLive?: string; // Optional
  category?: string;
  videoList?: string; // JSON string of video array
  currentIndex?: string; // Current video index in the list
};

export default function Reelsviewscroll() {
  const videoRefs = useRef<Record<string, Video>>({});
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Global video store for video management
  const globalVideoStore = useGlobalVideoStore();
  const reelsStore = useReelsStore();

  // Comment modal hook
  const { showCommentModal } = useCommentModal();

  // Get video states from global store
  const playingVideos = globalVideoStore.playingVideos;
  const mutedVideos = globalVideoStore.mutedVideos;
  const videoVolume = 1.0;

  // State for interaction functionality
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>(
    {}
  );
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<
    Record<string, number>
  >({});
  const [videoStats, setVideoStats] = useState<Record<string, any>>({});

  // Video progress and duration state
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoPosition, setVideoPosition] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Use library store for saving content
  const libraryStore = useLibraryStore();

  // Responsive dimensions
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;
  const isSmallScreen = screenHeight < 700;
  const isMediumScreen = screenHeight >= 700 && screenHeight < 800;
  const isLargeScreen = screenHeight >= 800;
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";

  // Ensure we always have data to render even if network fails
  const hasList =
    Array.isArray(reelsStore.videoList) && reelsStore.videoList.length > 0;
  useEffect(() => {
    if (!hasList) {
      // Provide a minimal fallback so UI doesn't go black
      reelsStore.setVideoList([
        {
          _id: "fallback",
          title: "Video",
          speaker: "",
          timeAgo: "",
          views: 0,
          sheared: 0,
          saved: 0,
          favorite: 0,
          fileUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          imageUrl:
            "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217",
          speakerAvatar: "",
          contentType: "video",
          description: "",
          createdAt: new Date().toISOString(),
          uploadedBy: "",
        } as any,
      ]);
      reelsStore.setCurrentIndex(0);
    }
  }, [hasList]);

  // Platform-specific responsive sizing functions
  const getResponsiveSize = (small: number, medium: number, large: number) => {
    let baseSize = isSmallScreen ? small : isMediumScreen ? medium : large;
    // iOS devices typically need slightly larger touch targets
    if (isIOS) baseSize *= 1.1;
    // Android devices benefit from slightly different scaling
    if (isAndroid) baseSize *= 1.05;
    return Math.round(baseSize);
  };

  const getResponsiveSpacing = (
    small: number,
    medium: number,
    large: number
  ) => {
    let baseSpacing = isSmallScreen ? small : isMediumScreen ? medium : large;
    // iOS devices prefer slightly more spacing
    if (isIOS) baseSpacing *= 1.15;
    return Math.round(baseSpacing);
  };

  const getResponsiveFontSize = (
    small: number,
    medium: number,
    large: number
  ) => {
    let baseFontSize = isSmallScreen ? small : isMediumScreen ? medium : large;
    // iOS devices typically have better font rendering, so we can use slightly smaller fonts
    if (isIOS) baseFontSize *= 0.95;
    // Android devices benefit from slightly larger fonts for better readability
    if (isAndroid) baseFontSize *= 1.05;
    return Math.round(baseFontSize);
  };

  // Platform-specific touch target sizes (minimum 44px for iOS, 48px for Android)
  const getTouchTargetSize = () => {
    return isIOS ? 44 : 48;
  };

  // Platform-specific haptic feedback
  const triggerHapticFeedback = () => {
    if (isIOS) {
      // iOS haptic feedback would be implemented here
      // You can use expo-haptics for this
    }
    // Android has built-in haptic feedback for touch events
  };

  const {
    title,
    speaker,
    timeAgo,
    views,
    sheared,
    saved,
    favorite,
    imageUrl,
    speakerAvatar,
    isLive = "false",
    category,
    videoList,
    currentIndex = "0",
  } = useLocalSearchParams() as Params;

  const live = isLive === "true";
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("Home");
  const [menuVisible, setMenuVisible] = useState<boolean>(false);

  // 🔁 Helper: try to refresh stale media URL from backend
  const tryRefreshMediaUrl = async (item: any): Promise<string | null> => {
    try {
      if (!item || !item.title) {
        console.warn("⚠️ Invalid item for URL refresh:", item);
        return null;
      }

      const response = await allMediaAPI.getAllMedia({
        search: item.title,
        contentType: item.contentType as any,
        limit: 1,
      });

      if (!response || !response.media || !Array.isArray(response.media)) {
        console.warn("⚠️ Invalid response from API:", response);
        return null;
      }

      const fresh = response.media[0];
      if (
        fresh?.fileUrl &&
        typeof fresh.fileUrl === "string" &&
        fresh.fileUrl.trim() !== ""
      ) {
        return fresh.fileUrl.trim();
      }

      return null;
    } catch (e) {
      console.log("🔁 Refresh media URL failed in reels:", e);
      return null;
    }
  };

  // Get video list from global store or parse from URL params
  const parsedVideoList =
    reelsStore.videoList.length > 0
      ? reelsStore.videoList
      : videoList
      ? (() => {
          try {
            console.log("🔍 Raw videoList param:", videoList);
            const parsed = JSON.parse(videoList);
            console.log("🔍 Parsed video list:", parsed);
            console.log("🔍 Parsed video list length:", parsed.length);
            return parsed;
          } catch (error) {
            console.error("❌ Failed to parse video list:", error);
            return [];
          }
        })()
      : [];

  const currentVideoIndex =
    reelsStore.currentIndex || parseInt(currentIndex) || 0;
  const [currentIndex_state, setCurrentIndex_state] =
    useState(currentVideoIndex);
  const lastIndexRef = useRef<number>(currentVideoIndex);

  // Animation and scroll state
  // Debug logging
  useEffect(() => {
    try {
      console.log(`🎬 ReelsViewScroll loaded with:`);
      console.log(`   - Video list length: ${parsedVideoList.length}`);
      console.log(`   - Current index: ${currentIndex_state}`);
      console.log(`   - VideoList param exists: ${!!videoList}`);
      console.log(
        `   - Reels store video list length: ${reelsStore.videoList.length}`
      );
      console.log(`   - Reels store current index: ${reelsStore.currentIndex}`);
      if (parsedVideoList.length > 0) {
        console.log(`   - First video: ${parsedVideoList[0]?.title}`);
        console.log(
          `   - Current video: ${parsedVideoList[currentIndex_state]?.title}`
        );
      }
    } catch (error) {
      console.error("❌ Error in debug logging:", error);
      setHasError(true);
      setErrorMessage("Failed to initialize video data");
    }
  }, [
    parsedVideoList,
    currentIndex_state,
    videoList,
    reelsStore.videoList,
    reelsStore.currentIndex,
  ]);

  // Get current video from the list or use passed parameters
  const currentVideo = (() => {
    try {
      if (
        parsedVideoList.length > 0 &&
        currentIndex_state < parsedVideoList.length
      ) {
        const video = parsedVideoList[currentIndex_state];
        if (video && video.title) {
          return video;
        }
      }

      // Fallback to passed parameters
      return {
        title: title || "Untitled Video",
        speaker: speaker || "Unknown Speaker",
        timeAgo: timeAgo || "Recently",
        views: parseInt(views) || 0,
        sheared: parseInt(sheared) || 0,
        saved: parseInt(saved) || 0,
        favorite: parseInt(favorite) || 0,
        imageUrl: imageUrl || "",
        speakerAvatar: speakerAvatar || "",
        fileUrl: imageUrl || "",
      };
    } catch (error) {
      console.error("❌ Error creating current video object:", error);
      // Return safe fallback
      return {
        title: "Untitled Video",
        speaker: "Unknown Speaker",
        timeAgo: "Recently",
        views: 0,
        sheared: 0,
        saved: 0,
        favorite: 0,
        imageUrl: "",
        speakerAvatar: "",
        fileUrl: "",
      };
    }
  })();

  // Create a unique key for this reel content
  const reelKey = `reel-${currentVideo.title}-${currentVideo.speaker}`;
  const modalKey = reelKey;

  // Create video object for consistency with VideoComponent pattern
  const video = {
    fileUrl: currentVideo.fileUrl || currentVideo.imageUrl || imageUrl,
    title: currentVideo.title,
    speaker: currentVideo.speaker,
    timeAgo: currentVideo.timeAgo,
    speakerAvatar: currentVideo.speakerAvatar,
    favorite: currentVideo.favorite || 0,
    views: currentVideo.views || 0,
    saved: currentVideo.saved || 0,
    sheared: currentVideo.sheared || 0,
    comment: 0,
  };

  // Initialize state on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load persisted data for this specific reel
        const stats = await getPersistedStats();
        setVideoStats(stats);

        // Load user favorite state
        const { isUserFavorite, globalCount } = await getFavoriteState(
          modalKey
        );
        setUserFavorites((prev) => ({ ...prev, [modalKey]: isUserFavorite }));
        setGlobalFavoriteCounts((prev) => ({
          ...prev,
          [modalKey]: globalCount,
        }));

        console.log(
          `✅ ReelsView: Loaded stats for ${title} - favorite: ${globalCount}`
        );
      } catch (error) {
        console.error("❌ ReelsView: Failed to load persisted data:", error);
        // Don't crash the app, just log the error
      }
    };

    initializeData();
  }, [modalKey, title]);

  // Cleanup function for video refs
  useEffect(() => {
    return () => {
      // Clean up video refs when component unmounts
      Object.values(videoRefs.current).forEach((ref) => {
        if (ref) {
          try {
            ref.unloadAsync();
          } catch (error) {
            console.log("Error unloading video ref:", error);
          }
        }
      });
      videoRefs.current = {};
    };
  }, []);

  // Error boundary - if there's an error, show a fallback UI
  if (hasError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 20 }}>
          Something went wrong
        </Text>
        <Text style={{ color: "#ccc", fontSize: 14, marginBottom: 30 }}>
          {errorMessage}
        </Text>
        <TouchableOpacity
          onPress={() => {
            setHasError(false);
            setErrorMessage("");
          }}
          style={{
            backgroundColor: "#FEA74E",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            backgroundColor: "transparent",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            marginTop: 10,
            borderWidth: 1,
            borderColor: "#FEA74E",
          }}
        >
          <Text style={{ color: "#FEA74E", fontSize: 16 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleFavorite = async (key: string) => {
    console.log("🔄 Favorite button clicked for reel:", title);

    try {
      // Toggle user's favorite state using the utility function
      const result = await toggleFavorite(key);

      // Update local state
      setUserFavorites((prev) => ({ ...prev, [key]: result.isUserFavorite }));
      setGlobalFavoriteCounts((prev) => ({
        ...prev,
        [key]: result.globalCount,
      }));

      console.log(
        `✅ Favorite updated for ${title}: user=${result.isUserFavorite}, global=${result.globalCount}`
      );
    } catch (error) {
      console.error("Error handling favorite:", error);
    }
  };

  const handleComment = async (key: string) => {
    console.log("🔄 Comment button clicked for reel:", title);

    // Create mock comments for the reel (you can replace this with actual comments from your backend)
    const mockComments = [
      {
        id: "1",
        userName: "John Doe",
        avatar: "",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        comment: "Great video! Really enjoyed this content.",
        likes: 5,
        isLiked: false,
      },
      {
        id: "2",
        userName: "Jane Smith",
        avatar: "",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        comment: "Amazing! Thanks for sharing.",
        likes: 3,
        isLiked: true,
      },
      {
        id: "3",
        userName: "Mike Johnson",
        avatar: "",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        comment: "This is exactly what I needed!",
        likes: 1,
        isLiked: false,
      },
    ];

    // Show the comment modal with the reel's comments
    showCommentModal(mockComments, key);

    // Update comment count (optional - you might want to do this after actually posting a comment)
    const currentStats = videoStats[key] || {};
    const newCommentCount = (currentStats.comment || video.comment || 0) + 1;

    // Update stats
    setVideoStats((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        comment: newCommentCount,
      },
    }));

    // Persist the stats
    const updatedStats = { ...currentStats, comment: newCommentCount };
    // Get all current stats and update this specific key
    const getAllStats = async () => {
      const allStats = await getPersistedStats();
      allStats[key] = updatedStats;
      persistStats(allStats);
    };
    getAllStats();

    console.log(`💬 Comment modal opened for reel: ${title}`);
  };

  const handleSave = async (key: string) => {
    console.log("🔄 Save button clicked for reel:", title);

    try {
      // Check current user-specific save state from library store
      const isCurrentlyUserSaved = libraryStore.isItemSaved(key);

      if (isCurrentlyUserSaved) {
        // Remove from library
        libraryStore.removeFromLibrary(key);
        console.log(`❌ Removed from library: ${title}`);
      } else {
        // Create a LibraryItem object to save
        const reelToSave = {
          id: key,
          title,
          speaker,
          timeAgo,
          contentType: "Reel" as const,
          fileUrl: imageUrl, // Using imageUrl as the content URL for reels
          thumbnailUrl: imageUrl,
          originalKey: key,
          createdAt: new Date().toISOString(),
        };

        // Add to library
        libraryStore.addToLibrary(reelToSave);
        console.log(`✅ Added to library: ${title}`);
      }
    } catch (error) {
      console.error("Error handling save:", error);
    }
  };

  const handleShare = async (key: string) => {
    console.log("📤 Share button clicked for reel:", title);

    try {
      const shareOptions = {
        title: currentVideo.title,
        message: `Check out this video: ${currentVideo.title}`,
        url: currentVideo.fileUrl || currentVideo.imageUrl || imageUrl,
      };

      const result = await Share.share(shareOptions);

      // Only record if user actually shared
      if (result.action === Share.sharedAction) {
        const currentStats = videoStats[key] || {};
        const newSharedCount =
          (currentStats.sheared || parseInt(sheared) || 0) + 1;

        setVideoStats((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            sheared: newSharedCount,
          },
        }));

        const updatedStats = { ...currentStats, sheared: newSharedCount };
        const allStats = await getPersistedStats();
        allStats[key] = updatedStats;
        persistStats(allStats);
        console.log(`✅ Share count updated for ${title}: ${newSharedCount}`);
      }

      // Close any open menu after sharing
      setMenuVisible(false);
    } catch (error) {
      console.error("Error handling share:", error);
      setMenuVisible(false);
    }
  };

  // Toggle video play/pause when tapped
  const toggleVideoPlay = () => {
    const isCurrentlyPlaying = playingVideos[modalKey] ?? false;
    console.log(
      `🎬 Reels: Toggle video play - modalKey: ${modalKey}, isCurrentlyPlaying: ${isCurrentlyPlaying}`
    );

    if (isCurrentlyPlaying) {
      console.log(`🎬 Reels: Pausing video ${modalKey}`);
      globalVideoStore.pauseVideo(modalKey);
    } else {
      console.log(`🎬 Reels: Playing video ${modalKey}`);
      globalVideoStore.playVideoGlobally(modalKey);
    }
  };

  // Video seeking function - improved for better responsiveness
  const seekToPosition = async (videoKey: string, position: number) => {
    const ref = videoRefs.current[videoKey];
    if (!ref || videoDuration <= 0) {
      console.warn("⚠️ Cannot seek: video ref not available or duration is 0");
      return;
    }

    try {
      const seekTime = Math.max(
        0,
        Math.min((position / 100) * videoDuration, videoDuration)
      );

      // Update state BEFORE seeking for immediate UI feedback (circle moves instantly)
      setVideoPosition(seekTime);
      console.log(
        `🎯 Setting position to ${seekTime.toFixed(2)}ms (${position.toFixed(
          1
        )}%)`
      );

      // Then perform the actual seek on the video
      await ref.setPositionAsync(seekTime);

      console.log(`✅ Video seeked successfully`);
    } catch (error) {
      console.error("❌ Error seeking video:", error);
      // On error, try to get actual position from video and sync state
      try {
        const status = await ref.getStatusAsync();
        if (status.isLoaded && status.positionMillis !== undefined) {
          setVideoPosition(status.positionMillis);
          console.log(
            `🔄 Synced position from video: ${status.positionMillis}ms`
          );
        }
      } catch (statusError) {
        console.error("❌ Error getting video status:", statusError);
      }
    }
  };

  // Progress bar dimensions and calculations
  const progressBarWidth = screenWidth - getResponsiveSpacing(24, 32, 40); // Responsive margins
  const progressPercentage =
    videoDuration > 0 ? (videoPosition / videoDuration) * 100 : 0;

  // Create pan responder inside renderVideoItem for proper video ref access
  const createPanResponder = (videoKey: string, progressBarRef: any) => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        // Pause video while dragging for better UX
        globalVideoStore.pauseVideo(videoKey);

        // Calculate position based on touch location within the progress bar
        const touchX = evt.nativeEvent.locationX;
        const newProgress = Math.max(
          0,
          Math.min(100, (touchX / progressBarWidth) * 100)
        );
        seekToPosition(videoKey, newProgress);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Use absolute position instead of relative movement
        const touchX = evt.nativeEvent.locationX;
        const newProgress = Math.max(
          0,
          Math.min(100, (touchX / progressBarWidth) * 100)
        );
        seekToPosition(videoKey, newProgress);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        // Resume playback after seeking
        setTimeout(() => {
          globalVideoStore.playVideoGlobally(videoKey);
        }, 100);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        // Resume playback if gesture is terminated
        setTimeout(() => {
          globalVideoStore.playVideoGlobally(videoKey);
        }, 100);
      },
    });
  };

  // Toggle mute function
  const toggleMute = (key: string) => {
    globalVideoStore.toggleVideoMute(key);
  };

  // Initialize video audio on mount with platform-specific optimizations
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        await audioConfig.configureForVideoPlayback();
        console.log("✅ ReelsView: Audio session configured for", Platform.OS);
      } catch (error) {
        console.error(
          "❌ ReelsView: Failed to initialize audio session:",
          error
        );
      }
    };

    initializeAudio();
  }, []);

  // Auto-play or switch play target immediately when the active key changes
  useEffect(() => {
    // Reset progress state for new video
    setVideoDuration(0);
    setVideoPosition(0);
    // Ensure only the active video plays
    globalVideoStore.pauseAllVideos();
    // Add a small delay to ensure the video component is ready
    setTimeout(() => {
      globalVideoStore.playVideoGlobally(modalKey);
      console.log(
        `🎬 Reels: Auto-playing video ${modalKey} in full screen mode`
      );
    }, 100);
    // Close action menu when switching videos
    setMenuVisible(false);
  }, [modalKey]);

  // Additional effect to ensure video plays on initial mount
  useEffect(() => {
    if (modalKey && !playingVideos[modalKey]) {
      console.log(
        `🎬 Reels: Ensuring video ${modalKey} starts playing on mount`
      );
      setTimeout(() => {
        globalVideoStore.playVideoGlobally(modalKey);
      }, 200);
    }
  }, [modalKey, playingVideos]);

  // Function to render a single video item
  const renderVideoItem = (
    videoData: any,
    index: number,
    isActive: boolean = false,
    passedVideoKey?: string
  ) => {
    // Validate video data first
    if (!videoData || !videoData.title) {
      console.warn("⚠️ Invalid video data:", videoData);
      return (
        <View
          key={`error-${index}`}
          style={{
            height: screenHeight,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>
            Invalid video data
          </Text>
        </View>
      );
    }

    const videoKey =
      passedVideoKey || `reel-${videoData.title}-${videoData.speaker}`;
    const [refreshedUrl, setRefreshedUrl] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 🔁 Refresh URL on mount if needed
    useEffect(() => {
      const refreshIfNeeded = async () => {
        try {
          if (!videoData.fileUrl || String(videoData.fileUrl).trim() === "") {
            setIsRefreshing(true);
            const fresh = await tryRefreshMediaUrl(videoData);
            setRefreshedUrl(fresh);
            setIsRefreshing(false);
          }
        } catch (error) {
          console.error("❌ Error refreshing video URL:", error);
          setIsRefreshing(false);
        }
      };
      refreshIfNeeded();
    }, [videoData.fileUrl]);

    const videoUrl = refreshedUrl || videoData.fileUrl || videoData.imageUrl;

    // Validate video URL
    if (!videoUrl || String(videoUrl).trim() === "") {
      console.warn("⚠️ No valid video URL for:", videoData.title);
      return (
        <View
          key={videoKey}
          style={{
            height: screenHeight,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16 }}>
            Video not available
          </Text>
        </View>
      );
    }

    return (
      <View
        key={videoKey}
        style={{
          height: screenHeight,
          width: "100%",
          backgroundColor: "#000000", // Ensure black background for full screen
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            if (isActive) {
              console.log("🎬 Video tap detected");
              triggerHapticFeedback(); // Add haptic feedback for video tap
              toggleVideoPlay();
            }
          }}
          onLongPress={() => {
            if (isActive) {
              console.log("🎬 Long press detected");
              triggerHapticFeedback(); // Add haptic feedback for long press
            }
          }}
        >
          <View
            className="w-full h-full"
            onTouchStart={(e) =>
              isActive && console.log("🎬 Touch start at:", e.nativeEvent.pageY)
            }
            onTouchEnd={(e) =>
              isActive && console.log("🎬 Touch end at:", e.nativeEvent.pageY)
            }
            accessibilityLabel={`${
              playingVideos[videoKey] ? "Pause" : "Play"
            } video`}
            accessibilityRole="button"
            accessibilityHint="Double tap to like, long press for more options"
          >
            {/* Debug: Log current video state */}
            {isActive &&
              (() => {
                console.log(
                  `🎬 Reels: Rendering video ${videoKey} - shouldPlay: ${
                    isActive && (playingVideos[videoKey] ?? false)
                  }, isActive: ${isActive}`
                );
                return null;
              })()}
            <Video
              ref={(ref) => {
                if (ref && isActive) videoRefs.current[videoKey] = ref;
              }}
              source={{ uri: videoUrl || "" }}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              resizeMode={ResizeMode.COVER}
              isMuted={mutedVideos[videoKey] ?? false}
              volume={mutedVideos[videoKey] ? 0.0 : videoVolume}
              shouldPlay={isActive && (playingVideos[videoKey] ?? false)}
              useNativeControls={false}
              isLooping={true}
              onError={async (error) => {
                console.log(
                  `❌ Video loading error in reels for ${videoData.title}:`,
                  error
                );
                try {
                  // Try to refresh URL on error
                  if (!refreshedUrl) {
                    setIsRefreshing(true);
                    const fresh = await tryRefreshMediaUrl(videoData);
                    setRefreshedUrl(fresh);
                    setIsRefreshing(false);
                  }
                } catch (refreshError) {
                  console.error(
                    "❌ Failed to refresh video URL:",
                    refreshError
                  );
                  setIsRefreshing(false);
                  // Show error state to user
                  setErrorMessage("Failed to load video");
                  setHasError(true);
                }
              }}
              onPlaybackStatusUpdate={(status) => {
                if (!isActive || !status.isLoaded) return;

                // Debug logging for video status
                if (status.isPlaying !== undefined) {
                  console.log(
                    `🎬 Reels: Video ${videoKey} status - isPlaying: ${status.isPlaying}, isLoaded: ${status.isLoaded}, position: ${status.positionMillis}`
                  );
                }

                // Update duration when first loaded
                if (status.durationMillis && videoDuration === 0) {
                  setVideoDuration(status.durationMillis);
                  console.log(
                    `🎬 Reels: Video ${videoKey} duration set to ${status.durationMillis}ms`
                  );

                  // Ensure video starts playing when first loaded
                  if (!status.isPlaying && !playingVideos[videoKey]) {
                    console.log(
                      `🎬 Reels: Video ${videoKey} loaded but not playing, starting playback`
                    );
                    setTimeout(() => {
                      globalVideoStore.playVideoGlobally(videoKey);
                    }, 100);
                  }
                }

                // Update position only if not dragging - this ensures the circle stays where user dragged it
                if (!isDragging && status.positionMillis !== undefined) {
                  setVideoPosition(status.positionMillis);
                  console.log(
                    `📍 Position updated: ${status.positionMillis}ms (not dragging)`
                  );
                } else if (isDragging) {
                  console.log(
                    `🖱️ Dragging - maintaining position: ${videoPosition}ms`
                  );
                }

                const pct = status.durationMillis
                  ? (status.positionMillis / status.durationMillis) * 100
                  : 0;
                globalVideoStore.setVideoProgress(videoKey, pct);
                const ref = videoRefs.current[videoKey];
                if (status.didJustFinish) {
                  ref?.setPositionAsync(0);
                  globalVideoStore.pauseVideo(videoKey);
                  // Trigger haptic feedback on video completion
                  triggerHapticFeedback();
                }
              }}
              // Platform-specific video optimizations
              shouldCorrectPitch={isIOS}
              progressUpdateIntervalMillis={isIOS ? 100 : 250}
            />

            {/* Skeleton overlay while loading or when source is refreshing */}
            {isActive &&
              (!playingVideos[videoKey] || isRefreshing || !videoDuration) && (
                <View
                  className="absolute inset-0"
                  style={{
                    justifyContent: "flex-end",
                    padding: getResponsiveSpacing(12, 16, 20),
                  }}
                  pointerEvents="none"
                >
                  <View
                    style={{ marginBottom: getResponsiveSpacing(8, 10, 12) }}
                  >
                    <Skeleton
                      dark
                      height={getResponsiveSize(20, 22, 24)}
                      width={"65%"}
                      borderRadius={8}
                    />
                  </View>
                  <View
                    style={{ marginBottom: getResponsiveSpacing(6, 8, 10) }}
                  >
                    <Skeleton
                      dark
                      height={getResponsiveSize(14, 16, 18)}
                      width={"40%"}
                      borderRadius={8}
                    />
                  </View>
                  <Skeleton
                    dark
                    height={getResponsiveSize(6, 7, 8)}
                    width={"90%"}
                    borderRadius={4}
                    style={{ opacity: 0.8 }}
                  />
                </View>
              )}

            {/* Play/Pause Overlay - Glass Effect */}
            {isActive && !playingVideos[videoKey] && (
              <View
                className="absolute inset-0 justify-center items-center"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                }}
              >
                <TouchableOpacity
                  onPress={toggleVideoPlay}
                  activeOpacity={0.8}
                  accessibilityLabel="Play video"
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: getResponsiveSize(45, 55, 65),
                      padding: getResponsiveSpacing(16, 20, 24),
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.3)",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.2,
                      shadowRadius: 16,
                      elevation: 8,
                      // Glass effect with backdrop blur (iOS)
                      ...(Platform.OS === "ios" && {
                        backdropFilter: "blur(20px)",
                      }),
                    }}
                  >
                    <MaterialIcons
                      name="play-arrow"
                      size={getResponsiveSize(50, 60, 70)}
                      color="#FFFFFF"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Show UI elements for active video */}
            {isActive && (
              <>
                {/* Action Buttons - Vertical right side like TikTok */}
                <View
                  style={{
                    position: "absolute",
                    right: getResponsiveSpacing(8, 10, 12),
                    top: screenHeight * 0.3,
                    flexDirection: "column",
                    alignItems: "center",
                    gap: getResponsiveSpacing(8, 10, 12),
                    zIndex: 20,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      triggerHapticFeedback();
                      handleFavorite(videoKey);
                    }}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      padding: getResponsiveSpacing(8, 10, 12),
                      minWidth: getTouchTargetSize(),
                      minHeight: getTouchTargetSize(),
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel={`${
                      userFavorites[videoKey] ? "Unlike" : "Like"
                    } this video`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name={
                        userFavorites[videoKey] ? "favorite" : "favorite-border"
                      }
                      size={getResponsiveSize(28, 32, 36)}
                      color={userFavorites[videoKey] ? "#D22A2A" : "#FFFFFF"}
                    />
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(9, 10, 11),
                        color: "#FFFFFF",
                        marginTop: getResponsiveSpacing(2, 4, 5),
                        fontFamily: "Rubik-SemiBold",
                        textShadowColor: "rgba(0, 0, 0, 0.5)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {globalFavoriteCounts[videoKey] || video.favorite || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      triggerHapticFeedback();
                      handleComment(videoKey);
                    }}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      padding: getResponsiveSpacing(8, 10, 12),
                      minWidth: getTouchTargetSize(),
                      minHeight: getTouchTargetSize(),
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel="Add comment to this video"
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="chatbubble-sharp"
                      size={getResponsiveSize(28, 32, 36)}
                      color="white"
                    />
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(9, 10, 11),
                        color: "#FFFFFF",
                        marginTop: getResponsiveSpacing(2, 4, 5),
                        fontFamily: "Rubik-SemiBold",
                        textShadowColor: "rgba(0, 0, 0, 0.5)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {videoStats[videoKey]?.comment === 1
                        ? (video.comment ?? 0) + 1
                        : video.comment ?? 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      triggerHapticFeedback();
                      handleSave(videoKey);
                    }}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      padding: getResponsiveSpacing(8, 10, 12),
                      minWidth: getTouchTargetSize(),
                      minHeight: getTouchTargetSize(),
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel={`${
                      libraryStore.isItemSaved(modalKey)
                        ? "Remove from"
                        : "Save to"
                    } library`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name={
                        libraryStore.isItemSaved(videoKey)
                          ? "bookmark"
                          : "bookmark-border"
                      }
                      size={getResponsiveSize(28, 32, 36)}
                      color={
                        libraryStore.isItemSaved(videoKey)
                          ? "#FEA74E"
                          : "#FFFFFF"
                      }
                    />
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(9, 10, 11),
                        color: "#FFFFFF",
                        marginTop: getResponsiveSpacing(2, 4, 5),
                        fontFamily: "Rubik-SemiBold",
                        textShadowColor: "rgba(0, 0, 0, 0.5)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {videoStats[videoKey]?.totalSaves || video.saved || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      triggerHapticFeedback();
                      handleShare(videoKey);
                    }}
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      padding: getResponsiveSpacing(8, 10, 12),
                      minWidth: getTouchTargetSize(),
                      minHeight: getTouchTargetSize(),
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel="Share this video"
                    accessibilityRole="button"
                  >
                    <Feather
                      name="send"
                      size={getResponsiveSize(28, 32, 36)}
                      color="white"
                    />
                    <Text
                      style={{
                        fontSize: getResponsiveFontSize(9, 10, 11),
                        color: "#FFFFFF",
                        marginTop: getResponsiveSpacing(2, 4, 5),
                        fontFamily: "Rubik-SemiBold",
                        textShadowColor: "rgba(0, 0, 0, 0.5)",
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {videoStats[videoKey]?.sheared || video.sheared || 0}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Speaker Info Section - Enhanced user experience */}
                <View
                  style={{
                    position: "absolute",
                    bottom: getResponsiveSpacing(100, 120, 140),
                    left: getResponsiveSpacing(12, 16, 20),
                    right: getResponsiveSpacing(12, 16, 20),
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    zIndex: 20,
                  }}
                >
                  {/* Avatar and Name Row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    {/* Avatar */}
                    <TouchableOpacity
                      style={{
                        width: getResponsiveSize(36, 40, 44),
                        height: getResponsiveSize(36, 40, 44),
                        borderRadius: getResponsiveSize(18, 20, 22),
                        backgroundColor: "#f3f4f6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: getResponsiveSpacing(10, 12, 14),
                        borderWidth: 2,
                        borderColor: "rgba(255, 255, 255, 0.3)",
                      }}
                      activeOpacity={0.8}
                      accessibilityLabel={`${
                        videoData.speaker || "Unknown"
                      } profile picture`}
                      accessibilityRole="image"
                    >
                      <Image
                        source={getUserAvatarFromContent(videoData)}
                        style={{
                          width: getResponsiveSize(24, 28, 32),
                          height: getResponsiveSize(24, 28, 32),
                          borderRadius: getResponsiveSize(12, 14, 16),
                        }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>

                    {/* Speaker Name and Time - Now next to avatar */}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: getResponsiveFontSize(12, 14, 16),
                            color: "#FFFFFF",
                            fontWeight: "600",
                            fontFamily: "Rubik-SemiBold",
                            textShadowColor: "rgba(0, 0, 0, 0.5)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                            marginRight: getResponsiveSpacing(6, 8, 10),
                          }}
                          numberOfLines={1}
                          accessibilityLabel={`Posted by ${
                            videoData.speaker || "Unknown"
                          }`}
                        >
                          {videoData.speaker || "No Speaker"}
                        </Text>
                        <Text
                          style={{
                            fontSize: getResponsiveFontSize(9, 10, 11),
                            color: "#D0D5DD",
                            fontFamily: "Rubik",
                            textShadowColor: "rgba(0, 0, 0, 0.5)",
                            textShadowOffset: { width: 0, height: 1 },
                            textShadowRadius: 3,
                          }}
                          accessibilityLabel={`Posted ${
                            videoData.timeAgo || "recently"
                          }`}
                        >
                          {videoData.timeAgo || "No Time"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Menu Button */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerHapticFeedback();
                      setMenuVisible((v) => !v);
                    }}
                    style={{
                      width: getResponsiveSize(36, 40, 44),
                      height: getResponsiveSize(36, 40, 44),
                      borderRadius: getResponsiveSize(18, 20, 22),
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      alignItems: "center",
                      justifyContent: "center",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel="More options menu"
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={getResponsiveSize(16, 18, 20)}
                      color="#3A3E50"
                    />
                  </TouchableOpacity>
                </View>

                {/* Action Menu - Improved positioning */}
                {menuVisible && (
                  <>
                    <TouchableWithoutFeedback
                      onPress={() => setMenuVisible(false)}
                    >
                      <View className="absolute inset-0 z-10" />
                    </TouchableWithoutFeedback>

                    <View
                      style={{
                        position: "absolute",
                        bottom: 200,
                        right: 100,
                        backgroundColor: "#FFFFFF",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 8,
                        elevation: 5,
                        borderRadius: 16,
                        padding: 16,
                        width: 180,
                        zIndex: 20,
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: "#f3f4f6",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: "#1D2939",
                            fontSize: 14,
                            fontFamily: "Rubik",
                          }}
                        >
                          View Details
                        </Text>
                        <Ionicons
                          name="eye-outline"
                          size={22}
                          color="#1D2939"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleShare(videoKey)}
                        style={{
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: "#f3f4f6",
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: "#1D2939",
                            fontSize: 14,
                            fontFamily: "Rubik",
                          }}
                        >
                          Share
                        </Text>
                        <Feather name="send" size={22} color="#1D2939" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          paddingVertical: 10,
                          marginTop: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                        onPress={() => {
                          handleSave(videoKey);
                          setMenuVisible(false);
                        }}
                      >
                        <Text
                          style={{
                            color: "#1D2939",
                            fontSize: 14,
                            fontFamily: "Rubik",
                          }}
                        >
                          {libraryStore.isItemSaved(videoKey)
                            ? "Remove from Library"
                            : "Save to Library"}
                        </Text>
                        <MaterialIcons
                          name={
                            libraryStore.isItemSaved(videoKey)
                              ? "bookmark"
                              : "bookmark-border"
                          }
                          size={22}
                          color="#1D2939"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{
                          paddingVertical: 10,
                          borderTopWidth: 1,
                          borderTopColor: "#f3f4f6",
                          marginTop: 6,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text
                          style={{
                            color: "#1D2939",
                            fontSize: 14,
                            fontFamily: "Rubik",
                          }}
                        >
                          Download
                        </Text>
                        <Ionicons
                          name="download-outline"
                          size={24}
                          color="#090E24"
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Draggable Progress Bar - Enhanced user experience */}
                <View
                  style={{
                    position: "absolute",
                    bottom: getResponsiveSpacing(60, 80, 100),
                    left: getResponsiveSpacing(12, 16, 20),
                    right: getResponsiveSpacing(12, 16, 20),
                    zIndex: 15,
                  }}
                >
                  <View
                    {...createPanResponder(videoKey, null).panHandlers}
                    style={{
                      paddingVertical: getResponsiveSpacing(12, 16, 20),
                      marginTop: -getResponsiveSpacing(12, 16, 20),
                      marginBottom: -getResponsiveSpacing(12, 16, 20),
                    }}
                    accessibilityLabel="Video progress bar - slide to seek"
                    accessibilityRole="adjustable"
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: Math.round(progressPercentage),
                    }}
                    accessibilityHint="Double tap and hold to drag, or tap to seek to position"
                  >
                    <View
                      style={{
                        height: getResponsiveSize(4, 5, 6),
                        backgroundColor: "rgba(255, 255, 255, 0.3)",
                        borderRadius: getResponsiveSize(2, 2.5, 3),
                        position: "relative",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2,
                      }}
                    >
                      <View
                        style={{
                          height: "100%",
                          backgroundColor: "#FEA74E",
                          borderRadius: getResponsiveSize(2, 2.5, 3),
                          width: `${progressPercentage}%`,
                          shadowColor: "#FEA74E",
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 4,
                          elevation: 3,
                        }}
                      />

                      <View
                        style={{
                          position: "absolute",
                          top: -getResponsiveSize(6, 8, 10),
                          width: getResponsiveSize(16, 20, 24),
                          height: getResponsiveSize(16, 20, 24),
                          backgroundColor: "#FFFFFF",
                          borderRadius: getResponsiveSize(8, 10, 12),
                          borderWidth: 3,
                          borderColor: "#FEA74E",
                          left: `${Math.max(
                            0,
                            Math.min(progressPercentage, 100)
                          )}%`,
                          transform: [
                            { translateX: -getResponsiveSize(8, 10, 12) },
                          ],
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                          elevation: 5,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </TouchableWithoutFeedback>
      </View>
    );
  };

  // Create array of all videos for smooth scrolling
  const allVideos =
    parsedVideoList.length > 0 ? parsedVideoList : [currentVideo];

  console.log("🔍 AllVideos array:", allVideos);
  console.log("🔍 AllVideos length:", allVideos.length);
  console.log("🔍 Current video:", currentVideo);
  console.log("🔍 Current index state:", currentIndex_state);
  console.log("🔍 Parsed video list length:", parsedVideoList.length);
  console.log("🔍 Reels store video list length:", reelsStore.videoList.length);
  console.log("🔍 Reels store current index:", reelsStore.currentIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle scroll-based navigation (update active index immediately while scrolling)
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const scrollY = contentOffset.y;
    const index = Math.round(scrollY / screenHeight);

    // Ensure index is within bounds
    const clampedIndex = Math.max(0, Math.min(index, allVideos.length - 1));

    if (
      clampedIndex !== lastIndexRef.current &&
      clampedIndex >= 0 &&
      clampedIndex < allVideos.length
    ) {
      lastIndexRef.current = clampedIndex;
      setCurrentIndex_state(clampedIndex);

      // Compute the reel key for the new active index
      const activeVideo = allVideos[clampedIndex];
      const activeKey = activeVideo
        ? `reel-${activeVideo.title}-${activeVideo.speaker || "unknown"}`
        : `reel-index-${clampedIndex}`;

      // Pause all other videos and play the active one using the global play
      globalVideoStore.playVideoGlobally(activeKey);

      console.log(
        `🎬 Active index while scrolling: ${clampedIndex}: ${allVideos[clampedIndex]?.title}`
      );
    }
  };

  // Initialize scroll position when component mounts
  useEffect(() => {
    if (scrollViewRef.current && parsedVideoList.length > 0) {
      const initialOffset = currentIndex_state * screenHeight;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: initialOffset,
          animated: false,
        });

        // Auto-play the initial video using reel key
        const initialVideo = allVideos[currentIndex_state];
        const initialKey = initialVideo
          ? `reel-${initialVideo.title}-${initialVideo.speaker || "unknown"}`
          : `reel-index-${currentIndex_state}`;
        globalVideoStore.playVideoGlobally(initialKey);
      }, 100);
    }
  }, []);

  // Handle scroll end to ensure proper video playback
  const handleScrollEnd = () => {
    const activeVideo = allVideos[currentIndex_state];
    const activeKey = activeVideo
      ? `reel-${activeVideo.title}-${activeVideo.speaker || "unknown"}`
      : `reel-index-${currentIndex_state}`;
    globalVideoStore.playVideoGlobally(activeKey);
  };

  return (
    <ErrorBoundary>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        pagingEnabled={true}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate={isIOS ? "normal" : "fast"}
        bounces={isIOS}
        scrollEnabled={true}
        nestedScrollEnabled={false}
        contentContainerStyle={{
          height: screenHeight * allVideos.length,
        }}
      >
        {allVideos.map((videoData: any, index: number) => {
          try {
            console.log(`🔍 Rendering video ${index}:`, videoData);
            console.log(`🔍 Video ${index} has title:`, !!videoData.title);
            console.log(`🔍 Video ${index} has speaker:`, !!videoData.speaker);
            console.log(`🔍 Video ${index} has fileUrl:`, !!videoData.fileUrl);
            const isActive = index === currentIndex_state;
            const videoKey = `reel-${videoData.title}-${
              videoData.speaker || "unknown"
            }`;

            return (
              <View
                key={videoKey}
                style={{
                  height: screenHeight,
                  width: "100%",
                  backgroundColor: "#000000", // Ensure black background
                }}
              >
                {renderVideoItem(videoData, index, isActive, videoKey)}
              </View>
            );
          } catch (error) {
            console.error("❌ Error rendering video in map:", error);
            return (
              <View
                key={`error-${index}`}
                style={{
                  height: screenHeight,
                  width: "100%",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 16 }}>
                  Failed to load video
                </Text>
              </View>
            );
          }
        })}
      </ScrollView>

      {/* Clean Header - Back, Title, Close */}
      <View
        style={{
          position: "absolute",
          top: getResponsiveSpacing(40, 48, 56) + (isIOS ? 20 : 0),
          left: 0,
          right: 0,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: getResponsiveSpacing(16, 20, 24),
          zIndex: 50,
        }}
      >
        {/* Back Arrow */}
        <TouchableOpacity
          onPress={() => {
            triggerHapticFeedback();
            if (router.canGoBack?.()) {
              router.back();
            } else {
              router.replace({
                pathname: "/categories/AllContentTikTok",
                params: {
                  defaultCategory: category,
                },
              });
            }
          }}
          style={{
            padding: getResponsiveSpacing(8, 10, 12),
            minWidth: getTouchTargetSize(),
            minHeight: getTouchTargetSize(),
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <MaterialIcons
            name="arrow-back"
            size={getResponsiveSize(24, 28, 32)}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Title */}
        <Text
          style={{
            fontSize: getResponsiveFontSize(18, 20, 22),
            color: "#FFFFFF",
            fontWeight: "600",
            fontFamily: "Rubik-SemiBold",
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
        >
          Reels
        </Text>

        {/* Close Icon */}
        <TouchableOpacity
          onPress={() => {
            triggerHapticFeedback();
            if (router.canGoBack?.()) {
              router.back();
            } else {
              router.replace({
                pathname: "/categories/AllContentTikTok",
                params: {
                  defaultCategory: category,
                },
              });
            }
          }}
          style={{
            padding: getResponsiveSpacing(8, 10, 12),
            minWidth: getTouchTargetSize(),
            minHeight: getTouchTargetSize(),
            alignItems: "center",
            justifyContent: "center",
          }}
          activeOpacity={0.7}
          accessibilityLabel="Close video player"
          accessibilityRole="button"
        >
          <MaterialIcons
            name="close"
            size={getResponsiveSize(24, 28, 32)}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Nav - Enhanced for better platform compatibility */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: "transparent",
          pointerEvents: "box-none",
          paddingBottom: isIOS ? 20 : 0,
        }}
      >
        <BottomNavOverlay
          selectedTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            triggerHapticFeedback();
            navigateMainTab(tab as any);
          }}
        />
      </View>

      {/* Comment Modal removed; global instance in app/_layout handles it */}
    </ErrorBoundary>
  );
}
