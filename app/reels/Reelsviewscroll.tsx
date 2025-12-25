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

import MediaDetailsModal from "../../src/shared/components/MediaDetailsModal";
import ReportMediaModal from "../../src/shared/components/ReportMediaModal";
import Skeleton from "../../src/shared/components/Skeleton/Skeleton";
import { useMediaDeletion } from "../../src/shared/hooks/useMediaDeletion";
import { getBestVideoUrl } from "../../src/shared/utils/videoUrlManager";
import { getBottomNavHeight } from "../../utils/responsive";
import { DeleteMediaConfirmation } from "../components/DeleteMediaConfirmation";
import ErrorBoundary from "../components/ErrorBoundary";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { useCommentModal } from "../context/CommentModalContext";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import {
  useContentCount,
  useContentStats,
  useInteractionStore,
  useUserInteraction,
} from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaPlaybackStore } from "../store/useMediaPlaybackStore";
import { useReelsStore } from "../store/useReelsStore";
import allMediaAPI from "../utils/allMediaAPI";
import { audioConfig } from "../utils/audioConfig";
import { useDownloadHandler } from "../utils/downloadUtils";
import { navigateMainTab } from "../utils/navigation";
import {
  getPersistedStats,
  persistStats,
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
  source?: string; // Source component that navigated to reels
};

export default function Reelsviewscroll() {
  // ✅ ALL HOOKS MUST BE CALLED AT THE TOP LEVEL, BEFORE ANY CONDITIONAL LOGIC OR useEffect
  
  // Router and params hooks - MUST be called first
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
    source,
  } = useLocalSearchParams() as Params;
  const router = useRouter();

  // Refs
  const videoRefs = useRef<Record<string, Video>>({});
  const lastIndexRef = useRef<number>(0);
  // Note: currentVideoIndex is computed later; avoid referencing it here (would crash at runtime).
  const scrollStartIndexRef = useRef<number>(0);

  // State hooks
  const [hasError, setHasError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [videoStats, setVideoStats] = useState<Record<string, any>>({});
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoPosition, setVideoPosition] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [reelsProgressBarWidth, setReelsProgressBarWidth] = useState<number>(0);
  const [showPauseOverlay, setShowPauseOverlay] = useState<boolean>(false);
  const [userHasManuallyPaused, setUserHasManuallyPaused] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("Home");
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Custom hooks
  const globalVideoStore = useGlobalVideoStore();
  const mediaStore = useMediaPlaybackStore();
  const reelsStore = useReelsStore();
  const { showCommentModal } = useCommentModal();
  const libraryStore = useLibraryStore();
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  // Unified interaction store (likes/saves/etc.)
  const toggleLike = useInteractionStore((s) => s.toggleLike);
  const loadContentStats = useInteractionStore((s) => s.loadContentStats);

  // Get video states from global store
  const playingVideos = globalVideoStore.playingVideos;
  const mutedVideos = globalVideoStore.mutedVideos;
  const videoVolume = 1.0;

  // Parse video list and current index - prioritize reels store, fallback to URL param
  const parsedVideoList = (() => {
    if (reelsStore.videoList.length > 0) {
      return reelsStore.videoList;
    }
    
    if (videoList) {
      try {
        const parsed = JSON.parse(videoList);
        // Set in store for future use
        reelsStore.setVideoList(parsed);
        return parsed;
      } catch (error) {
        console.error("❌ Failed to parse video list:", error);
        return [];
      }
    }
    
    console.warn("⚠️ No video list found in store or params");
    return [];
  })();

  const currentVideoIndex = reelsStore.currentIndex !== undefined && reelsStore.currentIndex !== null
    ? reelsStore.currentIndex
    : parseInt(currentIndex) || 0;
  const [currentIndex_state, setCurrentIndex_state] = useState(currentVideoIndex);
  lastIndexRef.current = currentVideoIndex;

  // Get current video from the list or use passed parameters (computed early for useMediaDeletion hook)
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

  // Create a unique key for this reel content (for video playback tracking, stats, etc.)
  const reelKey = `reel-${currentVideo.title}-${currentVideo.speaker}`;
  const modalKey = reelKey;
  
  // Extract real contentId for API calls (comments, interactions, etc.)
  // Prefer _id or id from the video object, fallback to synthetic key only if needed
  const contentId = currentVideo._id || currentVideo.id || null;
  const contentIdForHooks = (contentId || "") as string;
  const canUseBackendLikes = Boolean(contentIdForHooks);
  const activeContentType = (currentVideo.contentType || "video") as string;

  // Read like state for the currently active reel (one reel at a time -> hooks are safe here).
  const activeStats = useContentStats(contentIdForHooks);
  const activeIsLiked = useUserInteraction(contentIdForHooks, "liked");
  const activeLikesCount = useContentCount(contentIdForHooks, "likes");

  // Hydrate stats when we have a real content id.
  useEffect(() => {
    if (!canUseBackendLikes) return;
    if (!activeStats) {
      loadContentStats(contentIdForHooks, activeContentType);
    }
  }, [
    canUseBackendLikes,
    activeStats,
    loadContentStats,
    contentIdForHooks,
    activeContentType,
  ]);

  // Media deletion functionality - MUST be called before useEffect hooks
  const {
    isOwner,
    showDeleteModal,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm: handleDeleteConfirmInternal,
  } = useMediaDeletion({
    mediaItem: currentVideo,
    isModalVisible: menuVisible,
  });

  // Responsive dimensions (not hooks, just calculations)
  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;
  const isSmallScreen = screenHeight < 700;
  const isMediumScreen = screenHeight >= 700 && screenHeight < 800;
  const isLargeScreen = screenHeight >= 800;
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const live = isLive === "true";

  // Ensure we always have data to render even if network fails
  const hasList = Array.isArray(reelsStore.videoList) && reelsStore.videoList.length > 0;
  
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

  // Handle back navigation based on source component
  const handleBackNavigation = () => {
    triggerHapticFeedback();

    // Downloads: always return to the Downloads screen (tab-like behavior)
    if (source === "Downloads") {
      router.replace("/downloads/DownloadsScreen");
      return;
    }

    // Special handling for AllContentTikTok: Always use explicit navigation
    // to preserve category context (even if router.canGoBack() is true)
    // This ensures we return to the correct category (VIDEO, E-BOOKS, etc.) not ALL
    if (source === "AllContentTikTok") {
      // Navigate back to HomeScreen with the specific category the user was viewing
      // This preserves the category context instead of defaulting to "ALL"
      const categoryToPass = category || "ALL";
      // Use replace instead of push to ensure params update properly
      router.replace({
        pathname: "/categories/HomeScreen",
        params: {
          default: "Home",
          defaultCategory: categoryToPass, // Category is in ContentType format (videos, music, e-books, etc.)
        },
      });
      return;
    }

    // For other sources, try router.back() first to maintain proper navigation stack
    if (router.canGoBack?.()) {
      router.back();
    } else {
      // Only use replace/push as fallback when canGoBack is not available

      if (source === "VideoComponent") {
        // Navigate back to VideoComponent
        router.push("/categories/VideoComponent");
      } else if (source === "SermonComponent") {
        // Navigate back to SermonComponent
        router.push("/categories/SermonComponent");
      } else if (source === "LiveComponent") {
        // Navigate back to LiveComponent
        router.push("/categories/LiveComponent");
      } else if (source === "ExploreSearch") {
        // Navigate back to ExploreSearch
        router.push("/ExploreSearch/ExploreSearch");
      } else if (source === "HorizontalVideoSection") {
        // Navigate back to home
        router.push("/");
      } else {
        // Default fallback to HomeScreen with the specific category if available
        router.push({
          pathname: "/categories/HomeScreen",
          params: {
            default: "Home",
            defaultCategory: category || "ALL",
          },
        });
      }
    }
  };

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
      console.error("❌ Refresh media URL failed in reels:", e);
      return null;
    }
  };


  // Animation and scroll state


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
      } catch (error) {
        console.error("❌ ReelsView: Failed to load persisted data:", error);
        // Don't crash the app, just log the error
      }
    };

    initializeData();
  }, [modalKey, title]);

  // Smarter cleanup - pause instead of unload to prevent constant reloading
  useEffect(() => {
    return () => {
      // Instead of unloading videos (which causes reload), just pause them
      Object.values(videoRefs.current).forEach((ref) => {
        if (ref) {
          try {
            // Pause the video but keep it loaded for faster resume
            ref.pauseAsync();
          } catch (error) {
            // Silently handle pause errors during cleanup
          }
        }
      });
      // Don't clear the refs - keep them for faster resume
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

  const handleLike = async () => {
    try {
      if (!canUseBackendLikes) {
        console.warn("⚠️ ReelsView: Missing real contentId; cannot like reliably.");
        return;
      }
      await toggleLike(contentIdForHooks, activeContentType);
    } catch (error) {
      console.error("❌ Error toggling like in reels:", error);
    }
  };

  const handleComment = async (key: string) => {
    // Use real contentId for comments API (required for backend to work)
    // Fallback to synthetic key only if no real ID exists (shouldn't happen in production)
    const commentContentId = contentId || key;
    
    // Open modal with empty array - backend will load comments immediately
    // Pass contentType explicitly to ensure correct backend routing
    showCommentModal([], commentContentId, "media", currentVideo.speaker);

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
  };

  const handleSave = async (key: string) => {
    try {
      // Check current user-specific save state from library store
      const isCurrentlyUserSaved = libraryStore.isItemSaved(key);

      if (isCurrentlyUserSaved) {
        // Remove from library
        libraryStore.removeFromLibrary(key);
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
      }
    } catch (error) {
      console.error("❌ Error handling save:", error);
    }
  };

  const handleShare = async (key: string) => {
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
      }

      // Close any open menu after sharing
      setMenuVisible(false);
    } catch (error) {
      console.error("❌ Error handling share:", error);
      setMenuVisible(false);
    }
  };

  // Handle download
  const handleDownloadAction = async () => {
    try {
      const downloadableItem = {
        id: currentVideo._id || modalKey,
        title: currentVideo.title || title,
        description: currentVideo.description || "",
        author: currentVideo.speaker || speaker || "Unknown",
        contentType: "video" as const,
        fileUrl: currentVideo.fileUrl || imageUrl,
        thumbnailUrl: currentVideo.imageUrl || imageUrl,
      };
      
      await handleDownload(downloadableItem);
      setMenuVisible(false);
    } catch (error) {
      console.error("Error downloading video:", error);
    }
  };

  // Handle view details
  const handleViewDetails = () => {
    setMenuVisible(false);
    setShowDetailsModal(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    await handleDeleteConfirmInternal();
    setMenuVisible(false);
  };

  // Toggle video play/pause when tapped
  const toggleVideoPlay = () => {
    const isCurrentlyPlaying = playingVideos[modalKey] ?? false;

    // 🚀 Update last accessed time for cache optimization
    mediaStore.updateLastAccessed(modalKey);

    if (isCurrentlyPlaying) {
      globalVideoStore.pauseVideo(modalKey);
      // Mark that user has manually paused the video
      setUserHasManuallyPaused(true);
    } else {
      globalVideoStore.playVideoGlobally(modalKey);
      // Reset the manual pause flag when user manually plays
      setUserHasManuallyPaused(false);
    }

    // Show pause overlay temporarily when video is playing
    if (isCurrentlyPlaying) {
      setShowPauseOverlay(true);
      // Hide the pause overlay after 1 second
      setTimeout(() => {
        setShowPauseOverlay(false);
      }, 1000);
    } else {
      setShowPauseOverlay(false);
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

      // Then perform the actual seek on the video
      await ref.setPositionAsync(seekTime);
    } catch (error) {
      console.error("❌ Error seeking video:", error);
      // On error, try to get actual position from video and sync state
      try {
        const status = await ref.getStatusAsync();
        if (status.isLoaded && status.positionMillis !== undefined) {
          setVideoPosition(status.positionMillis);
        }
      } catch (statusError) {
        console.error("❌ Error getting video status:", statusError);
      }
    }
  };

  // Format time helper function (MM:SS format)
  const formatTime = (ms: number): string => {
    // Validate and clamp input to prevent invalid displays
    if (!Number.isFinite(ms) || ms < 0 || isNaN(ms)) {
      return "0:00";
    }
    
    // Clamp to reasonable maximum (24 hours)
    const clampedMs = Math.min(ms, 24 * 60 * 60 * 1000);
    
    const totalSeconds = Math.floor(clampedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Progress bar dimensions and calculations
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
        const width = Math.max(1, reelsProgressBarWidth || screenWidth);
        const newProgress = Math.max(
          0,
          Math.min(100, (touchX / width) * 100)
        );
        seekToPosition(videoKey, newProgress);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Use absolute position instead of relative movement
        const touchX = evt.nativeEvent.locationX;
        const width = Math.max(1, reelsProgressBarWidth || screenWidth);
        const newProgress = Math.max(
          0,
          Math.min(100, (touchX / width) * 100)
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
      } catch (error) {
        console.error(
          "❌ ReelsView: Failed to initialize audio session:",
          error
        );
      }
    };

    initializeAudio();
  }, []);

  // 🚀 Periodic video cache cleanup for memory optimization
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      mediaStore.cleanupVideoCache();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [mediaStore]);

  // Auto-play or switch play target immediately when the active key changes
  useEffect(() => {
    // Early return if modalKey is not available yet
    if (!modalKey) return;

    // Reset progress state for new video
    setVideoDuration(0);
    setVideoPosition(0);
    setShowPauseOverlay(false); // Reset pause overlay state
    setUserHasManuallyPaused(false); // Reset manual pause flag for new video
    // Ensure only the active video plays
    globalVideoStore.pauseAllVideos();

    // 🚀 Update last accessed time for cache optimization
    mediaStore.updateLastAccessed(modalKey);

    // Add a small delay to ensure the video component is ready
    const timeoutId = setTimeout(() => {
      try {
        globalVideoStore.playVideoGlobally(modalKey);
      } catch (error) {
        console.error("Error playing video:", error);
      }
    }, 100);

    // Close action menu when switching videos
    setMenuVisible(false);

    // Cleanup timeout on unmount or dependency change
    return () => {
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalKey]); // Only depend on modalKey, not mediaStore (which can change frequently)

  // Additional effect to ensure video plays on initial mount
  useEffect(() => {
    if (modalKey && !playingVideos[modalKey] && !userHasManuallyPaused) {
      const timeoutId = setTimeout(() => {
        try {
          globalVideoStore.playVideoGlobally(modalKey);
        } catch (error) {
          console.error("Error playing video on mount:", error);
        }
      }, 200);

      // Cleanup timeout on unmount or dependency change
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [modalKey, playingVideos, userHasManuallyPaused]);

  // Function to render a single video item
  // NOTE: This helper MUST NOT use hooks internally (to avoid breaking Rules of Hooks).
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

    // Use direct fileUrl/imageUrl - prioritize fileUrl, fallback to imageUrl
    const videoUrl = videoData.fileUrl || videoData.imageUrl || videoData.url || "";
    
    // Validate video URL
    if (!videoUrl || String(videoUrl).trim() === "") {
      console.warn("⚠️ No valid video URL for:", videoData.title, "Data:", videoData);
      return (
        <View
          key={videoKey}
          style={{
            height: screenHeight,
            width: "100%",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, marginBottom: 10 }}>
            Video not available
          </Text>
          <Text style={{ color: "#888", fontSize: 12 }}>
            {videoData.title || "No title"}
          </Text>
        </View>
      );
    }

    // 🚀 Check video cache status for optimization (no hooks, pure call)
    mediaStore.getVideoCacheStatus(videoKey);

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
              triggerHapticFeedback(); // Add haptic feedback for video tap
              toggleVideoPlay();
            }
          }}
          onLongPress={() => {
            if (isActive) {
              triggerHapticFeedback(); // Add haptic feedback for long press
            }
          }}
        >
          <View
            className="w-full h-full"
            accessibilityLabel={`${
              playingVideos[videoKey] ? "Pause" : "Play"
            } video`}
            accessibilityRole="button"
            accessibilityHint="Double tap to like, long press for more options"
          >
            <Video
              ref={(ref) => {
                if (ref && isActive) videoRefs.current[videoKey] = ref;
              }}
              source={{
                uri: getBestVideoUrl(videoUrl || ""),
                headers: {
                  "User-Agent": "JevahApp/1.0",
                  Accept: "video/*",
                },
              }}
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
                console.error(
                  `❌ Video loading error in reels for ${videoData.title}:`,
                  error
                );
              }}
              onLoad={() => {
                // 🚀 Mark video as loaded in cache for optimization
                mediaStore.setVideoLoaded(videoKey, true);
              }}
              onPlaybackStatusUpdate={(status) => {
                if (!isActive || !status.isLoaded) return;

                // Update duration when first loaded
                if (status.durationMillis && videoDuration === 0) {
                  setVideoDuration(status.durationMillis);

                  // Ensure video starts playing when first loaded (only if user hasn't manually paused)
                  if (
                    !status.isPlaying &&
                    !playingVideos[videoKey] &&
                    !userHasManuallyPaused
                  ) {
                    setTimeout(() => {
                      globalVideoStore.playVideoGlobally(videoKey);
                    }, 100);
                  }
                }

                // Update position only if not dragging - this ensures the circle stays where user dragged it
                if (!isDragging && status.positionMillis !== undefined) {
                  setVideoPosition(status.positionMillis);
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

            {/* Reload button removed - no per-item error state tracking without hooks */}

            {/* Skeleton overlay while loading or when source is refreshing */}
            {isActive &&
              (!playingVideos[videoKey] || !videoDuration) && (
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
                      borderRadius={0}
                    />
                  </View>
                  <View
                    style={{ marginBottom: getResponsiveSpacing(6, 8, 10) }}
                  >
                    <Skeleton
                      dark
                      height={getResponsiveSize(14, 16, 18)}
                      width={"40%"}
                      borderRadius={0}
                    />
                  </View>
                  <Skeleton
                    dark
                    height={getResponsiveSize(6, 7, 8)}
                    width={"90%"}
                    borderRadius={0}
                    style={{ opacity: 0.8 }}
                  />
                </View>
              )}

            {/* Play Overlay - Glass Effect */}
            {isActive && !playingVideos[videoKey] && (
              <View
                className="absolute inset-0 justify-center items-center"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                }}
              >
                {/* Show play button when video is paused */}
                <TouchableOpacity
                  onPress={toggleVideoPlay}
                  activeOpacity={0.8}
                  accessibilityLabel="Play video"
                  accessibilityRole="button"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <MaterialIcons
                    name="play-arrow"
                    size={getResponsiveSize(50, 60, 70)}
                    color="rgba(255, 255, 255, 0.6)"
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Pause Overlay - Shows temporarily when user taps on playing video */}
            {isActive && showPauseOverlay && playingVideos[videoKey] && (
              <View
                className="absolute inset-0 justify-center items-center"
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.1)",
                  zIndex: 30,
                }}
                pointerEvents="none"
              >
                <View
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.2,
                    shadowRadius: 16,
                    elevation: 8,
                  }}
                >
                  <MaterialIcons
                    name="pause"
                    size={getResponsiveSize(50, 60, 70)}
                    color="rgba(255, 255, 255, 0.6)"
                  />
                </View>
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
                      handleLike();
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
                      activeIsLiked ? "Unlike" : "Like"
                    } this video`}
                    accessibilityRole="button"
                  >
                    <MaterialIcons
                      name={
                        activeIsLiked ? "favorite" : "favorite-border"
                      }
                      size={getResponsiveSize(28, 32, 36)}
                      color={activeIsLiked ? "#D22A2A" : "#FFFFFF"}
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
                      {canUseBackendLikes
                        ? activeLikesCount
                        : (videoData?.likeCount ??
                            videoData?.likes ??
                            videoData?.favorite ??
                            video.favorite ??
                            0)}
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
                      name="chatbubble-outline"
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
                    bottom: getResponsiveSpacing(100, 120, 140), // Position above progress bar for proper centering
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
                        width: getResponsiveSize(28, 32, 36), // Reduced size
                        height: getResponsiveSize(28, 32, 36), // Reduced size
                        borderRadius: getResponsiveSize(14, 16, 18), // Reduced radius
                        backgroundColor: "#f3f4f6",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: getResponsiveSpacing(8, 10, 12), // Reduced margin
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
                          width: getResponsiveSize(20, 24, 28), // Reduced size
                          height: getResponsiveSize(20, 24, 28), // Reduced size
                          borderRadius: getResponsiveSize(10, 12, 14), // Reduced radius
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
                        {/* Show video title if coming from profile page (AccountScreen), otherwise show speaker name */}
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
                          accessibilityLabel={
                            source === "AccountScreen"
                              ? `Video: ${videoData.title || "Untitled"}`
                              : `Posted by ${videoData.speaker || "Unknown"}`
                          }
                        >
                          {source === "AccountScreen"
                            ? videoData.title || "Untitled Video"
                            : videoData.speaker || "No Speaker"}
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
                      width: getResponsiveSize(28, 32, 36), // Reduced size
                      height: getResponsiveSize(28, 32, 36), // Reduced size
                      borderRadius: getResponsiveSize(14, 16, 18), // Reduced radius
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
                      size={getResponsiveSize(14, 16, 18)} // Reduced icon size
                      color="#3A3E50"
                    />
                  </TouchableOpacity>
                </View>

                {/* Action Menu - White background popup with ContentActionModal options */}
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
                      {/* View Details */}
                      <TouchableOpacity
                        onPress={() => {
                          handleViewDetails();
                          setMenuVisible(false);
                        }}
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

                      {/* Save to Library / Remove from Library */}
                      <TouchableOpacity
                        onPress={() => {
                          handleSave(modalKey);
                          setMenuVisible(false);
                        }}
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
                          {libraryStore.isItemSaved(modalKey)
                            ? "Remove from Library"
                            : "Save to Library"}
                        </Text>
                        <MaterialIcons
                          name={
                            libraryStore.isItemSaved(modalKey)
                              ? "bookmark"
                              : "bookmark-border"
                          }
                          size={22}
                          color="#1D2939"
                        />
                      </TouchableOpacity>

                      {/* Delete - Only show if owner */}
                      {isOwner && (
                        <TouchableOpacity
                          onPress={() => {
                            openDeleteModal();
                            setMenuVisible(false);
                          }}
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
                              color: "#FF6B6B",
                              fontSize: 14,
                              fontFamily: "Rubik",
                            }}
                          >
                            Delete
                          </Text>
                          <Ionicons
                            name="trash-outline"
                            size={22}
                            color="#FF6B6B"
                          />
                        </TouchableOpacity>
                      )}

                      {/* Report - Only show if not owner */}
                      {!isOwner && (
                        <TouchableOpacity
                          onPress={() => {
                            setShowReportModal(true);
                            setMenuVisible(false);
                          }}
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
                              color: "#FF6B6B",
                              fontSize: 14,
                              fontFamily: "Rubik",
                            }}
                          >
                            Report
                          </Text>
                          <Ionicons
                            name="flag-outline"
                            size={22}
                            color="#FF6B6B"
                          />
                        </TouchableOpacity>
                      )}

                      {/* Download / Remove Download */}
                      <TouchableOpacity
                        onPress={() => {
                          handleDownloadAction();
                          setMenuVisible(false);
                        }}
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
                          {checkIfDownloaded(currentVideo._id || modalKey)
                            ? "Remove Download"
                            : "Download"}
                        </Text>
                        <Ionicons
                          name={
                            checkIfDownloaded(currentVideo._id || modalKey)
                              ? "checkmark-circle"
                              : "download-outline"
                          }
                          size={24}
                          color={
                            checkIfDownloaded(currentVideo._id || modalKey)
                              ? "#256E63"
                              : "#090E24"
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Draggable Progress Bar with Timer - Enhanced user experience */}
                <View
                  style={{
                    position: "absolute",
                    // Keep the progress bar above the BottomNav + floating FAB (especially on iOS)
                    bottom: getBottomNavHeight() + getResponsiveSpacing(-18, -16, -14),
                    left: 0,
                    right: 0,
                    // Ensure the timer/seek UI isn't covered by the avatar/speaker overlay
                    zIndex: 30,
                  }}
                >
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      paddingBottom: 12,
                      paddingTop: 6,
                      bottom: 0, // Match VideoProgressBar positioning
                      width: "100%",
                    }}
                  >
                    {/* Full-width Reels progress bar (subtle unless dragging) */}
                    <View
                      {...createPanResponder(videoKey, null).panHandlers}
                      style={{
                        width: "100%",
                        position: "relative",
                        height: isDragging ? 48 : 40, // thicker/clearer while dragging
                      }}
                      onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w && Math.abs(w - reelsProgressBarWidth) > 0.5) {
                          setReelsProgressBarWidth(w);
                        }
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
                      {/* Time labels - always visible (even when not dragging/playing) */}
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          left: 12,
                          right: 12,
                          top: 8, // keep off the very top edge
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingRight: 44, // leave room for mute button
                          zIndex: 35,
                          opacity: isDragging ? 1 : 0.9,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: isDragging
                              ? "rgba(0, 0, 0, 0.35)"
                              : "rgba(0, 0, 0, 0.22)",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.98)",
                              fontSize: 10,
                              fontFamily: "Rubik-Medium",
                              textShadowColor: "rgba(0, 0, 0, 0.65)",
                              textShadowOffset: { width: 0, height: 1 },
                              textShadowRadius: 2,
                            }}
                          >
                            {videoDuration > 0 ? formatTime(videoPosition) : "0:00"}
                          </Text>
                        </View>
                        <View
                          style={{
                            backgroundColor: isDragging
                              ? "rgba(0, 0, 0, 0.35)"
                              : "rgba(0, 0, 0, 0.22)",
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 8,
                          }}
                        >
                          <Text
                            style={{
                              color: "rgba(255, 255, 255, 0.98)",
                              fontSize: 10,
                              fontFamily: "Rubik-Medium",
                              textShadowColor: "rgba(0, 0, 0, 0.65)",
                              textShadowOffset: { width: 0, height: 1 },
                              textShadowRadius: 2,
                            }}
                          >
                            {videoDuration > 0 ? formatTime(videoDuration) : "0:00"}
                          </Text>
                        </View>
                      </View>

                      {/* Background Track */}
                      <View
                        style={{
                          height: isDragging ? 6 : 2,
                          backgroundColor: isDragging
                            ? "rgba(255, 255, 255, 0.45)"
                            : "rgba(255, 255, 255, 0.15)",
                          borderRadius: 999,
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top:
                            ((isDragging ? 48 : 40) - (isDragging ? 6 : 2)) / 2,
                        }}
                      />

                      {/* Progress Fill - Orange */}
                      <View
                        style={{
                          height: isDragging ? 6 : 2,
                          backgroundColor: isDragging
                            ? "rgba(254, 167, 78, 0.95)"
                            : "rgba(254, 167, 78, 0.25)",
                          borderRadius: 999,
                          width: `${progressPercentage}%`,
                          position: "absolute",
                          left: 0,
                          top:
                            ((isDragging ? 48 : 40) - (isDragging ? 6 : 2)) / 2,
                        }}
                      />

                      {/* Draggable knob (only obvious while dragging) */}
                      <View
                        style={{
                          position: "absolute",
                          top: ((isDragging ? 48 : 40) - 16) / 2,
                          width: 16,
                          height: 16,
                          backgroundColor: "#FFFFFF",
                          borderRadius: 8,
                          borderWidth: 3,
                          borderColor: "#FEA74E",
                          left: `${Math.max(0, Math.min(progressPercentage, 100))}%`,
                          transform: [{ translateX: -8 }],
                          opacity: isDragging ? 1 : 0,
                          zIndex: 10,
                        }}
                      />

                      {/* Mute Button - positioned on the right */}
                      <TouchableOpacity
                        onPress={() => toggleMute(videoKey)}
                        style={{
                          position: "absolute",
                          right: 12,
                          // Lift slightly so it doesn't touch the progress bar / track
                          top: isDragging ? -2 : 4,
                          backgroundColor: isDragging
                            ? "rgba(0, 0, 0, 0.65)"
                            : "rgba(0, 0, 0, 0.35)",
                          padding: 6,
                          borderRadius: 16,
                        }}
                        activeOpacity={0.7}
                        accessibilityLabel={`${
                          mutedVideos[videoKey] ? "Unmute" : "Mute"
                        } video`}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name={
                            mutedVideos[videoKey]
                              ? "volume-mute"
                              : "volume-high"
                          }
                          size={16}
                          color="rgba(255, 255, 255, 0.95)"
                        />
                      </TouchableOpacity>
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
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle scroll-based navigation (update active index immediately while scrolling)
  const handleScroll = (event: any) => {
    try {
      // Safety check for event structure
      if (!event?.nativeEvent?.contentOffset) {
        return;
      }

      const { contentOffset } = event.nativeEvent;
      const scrollY = contentOffset.y;
      
      // Validate scrollY is a number
      if (typeof scrollY !== 'number' || isNaN(scrollY)) {
        return;
      }

      // Validate allVideos array
      if (!Array.isArray(allVideos) || allVideos.length === 0) {
        return;
      }

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
        try {
          const activeVideo = allVideos[clampedIndex];
          const activeKey = activeVideo
            ? `reel-${activeVideo.title}-${activeVideo.speaker || "unknown"}`
            : `reel-index-${clampedIndex}`;

          // 🚀 Update last accessed time for active video
          try {
            mediaStore.updateLastAccessed(activeKey);
          } catch (error) {
            console.warn("⚠️ Error updating last accessed:", error);
          }

          // Pause all other videos and play the active one using the global play (only if user hasn't manually paused)
          if (!userHasManuallyPaused) {
            try {
              globalVideoStore.playVideoGlobally(activeKey);
            } catch (error) {
              console.warn("⚠️ Error playing video globally:", error);
            }
          }
        } catch (error) {
          console.warn("⚠️ Error processing active video in handleScroll:", error);
        }
      }
    } catch (error) {
      console.error("❌ Error in handleScroll:", error);
      // Don't throw - allow scrolling to continue
    }
  };

  // Initialize scroll position when component mounts and ensure video plays
  useEffect(() => {
    if (scrollViewRef.current && parsedVideoList.length > 0) {
      const initialOffset = currentIndex_state * screenHeight;
      
      // Initialize scroll start index
      scrollStartIndexRef.current = currentIndex_state;
      
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
        
        // Ensure video plays immediately
        globalVideoStore.playVideoGlobally(initialKey);
      }, 100);
      } else {
      console.warn("⚠️ Cannot initialize scroll - no videos or scrollViewRef");
    }
  }, [parsedVideoList.length, currentIndex_state]);

  // Handle scroll end to ensure proper video playback and limit to one video per scroll
  const handleScrollEnd = (event?: any) => {
    try {
      if (!scrollViewRef.current) return;
      
      // Get the final scroll position
      let finalScrollY = currentIndex_state * screenHeight;
      if (event?.nativeEvent?.contentOffset?.y !== undefined) {
        const scrollY = event.nativeEvent.contentOffset.y;
        if (typeof scrollY === 'number' && !isNaN(scrollY)) {
          finalScrollY = scrollY;
        }
      }
      
      // Calculate the index from scroll position
      const finalIndex = Math.round(finalScrollY / screenHeight);
      const startIndex = scrollStartIndexRef.current;
      
      // Validate array bounds
      if (!Array.isArray(allVideos) || allVideos.length === 0) {
        console.warn("⚠️ No videos available for scroll end handling");
        return;
      }
      
      // Constrain to only move one video at a time from the starting position
      let targetIndex = finalIndex;
      const maxAllowedIndex = Math.min(startIndex + 1, allVideos.length - 1);
      const minAllowedIndex = Math.max(startIndex - 1, 0);
      
      // Clamp to only allow adjacent videos (one video away)
      if (targetIndex > maxAllowedIndex) {
        targetIndex = maxAllowedIndex;
      } else if (targetIndex < minAllowedIndex) {
        targetIndex = minAllowedIndex;
      }
      
      // Ensure index is within bounds
      targetIndex = Math.max(0, Math.min(targetIndex, allVideos.length - 1));
      
      // Only snap if we need to constrain the scroll (moved more than one video)
      if (targetIndex !== finalIndex && scrollViewRef.current) {
        try {
          const targetY = targetIndex * screenHeight;
          scrollViewRef.current.scrollTo({
            y: targetY,
            animated: true,
          });
        } catch (scrollError) {
          console.warn("⚠️ Error scrolling to target position:", scrollError);
        }
      }
      
      // Update state if different
      if (targetIndex !== currentIndex_state) {
        setCurrentIndex_state(targetIndex);
        lastIndexRef.current = targetIndex;
      }
      
      // Update the scroll start index to the current position for next scroll
      scrollStartIndexRef.current = targetIndex;
      
      // Only auto-play if user hasn't manually paused
      if (!userHasManuallyPaused && allVideos[targetIndex]) {
        try {
          const activeVideo = allVideos[targetIndex];
          const activeKey = activeVideo
            ? `reel-${activeVideo.title}-${activeVideo.speaker || "unknown"}`
            : `reel-index-${targetIndex}`;
          globalVideoStore.playVideoGlobally(activeKey);
        } catch (playError) {
          console.warn("⚠️ Error playing video on scroll end:", playError);
        }
      }
    } catch (error) {
      console.error("❌ Error in handleScrollEnd:", error);
      // Don't throw - allow app to continue functioning
    }
  };
  
  // Handle scroll begin drag to track starting position
  const handleScrollBeginDrag = () => {
    scrollStartIndexRef.current = currentIndex_state;
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
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={(event) => handleScrollEnd(event)}
        onMomentumScrollEnd={(event) => handleScrollEnd(event)}
        scrollEventThrottle={16}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="normal"
        bounces={isIOS}
        scrollEnabled={true}
        nestedScrollEnabled={false}
        contentContainerStyle={{
          height: screenHeight * allVideos.length,
        }}
      >
        {allVideos.map((videoData: any, index: number) => {
          try {
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
          onPress={handleBackNavigation}
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
          onPress={handleBackNavigation}
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
      
      {/* Delete Confirmation Modal */}
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={currentVideo._id || ""}
        mediaTitle={currentVideo.title || "this video"}
        onClose={closeDeleteModal}
        onSuccess={handleDeleteConfirm}
      />

      {/* Report Modal */}
      <ReportMediaModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        mediaId={currentVideo._id || ""}
        mediaTitle={currentVideo.title || title}
      />

      {/* Media Details Modal */}
      <MediaDetailsModal
        visible={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        mediaItem={currentVideo}
      />
    </ErrorBoundary>
  );
}
