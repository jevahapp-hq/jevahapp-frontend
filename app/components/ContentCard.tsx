import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons,
} from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useCommentModal } from "../context/CommentModalContext";
import { useSafeLibraryStore } from "../hooks/useSafeLibraryStore";
import SocketManager from "../services/SocketManager";
import { useGlobalMediaStore } from "../store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import CommentIcon from "./CommentIcon";
import { CompactAudioControls } from "./CompactAudioControls";

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
    authorInfo?: {
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
    isLive?: boolean;
    liveViewers?: number;
  };
  onLike: (contentId: string, liked: boolean) => Promise<void>;
  onComment: (contentId: string) => void;
  onShare: (contentId: string) => Promise<void>;
  onAuthorPress: (authorId: string) => void;
  onSaveToLibrary?: (contentId: string, isBookmarked: boolean) => Promise<void>;
  socketManager?: SocketManager | null;
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onLike,
  onComment,
  onShare,
  onAuthorPress,
  onSaveToLibrary,
  socketManager,
}) => {
  console.log("🔍 DEBUG: ContentCard rendered with props:");
  console.log("🔍 DEBUG: onSaveToLibrary prop:", !!onSaveToLibrary);
  console.log("🔍 DEBUG: onSaveToLibrary function:", typeof onSaveToLibrary);
  console.log("🔍 DEBUG: All props:", {
    onLike: !!onLike,
    onComment: !!onComment,
    onShare: !!onShare,
    onAuthorPress: !!onAuthorPress,
    onSaveToLibrary: !!onSaveToLibrary,
  });
  console.log("🔍 DEBUG: Content ID:", content._id);
  console.log("🔍 DEBUG: Content title:", content.title);
  console.log("🔍 DEBUG: ContentCard component is rendering");
  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewCounted, setViewCounted] = useState(false);
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>(
    {}
  );
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<
    Record<string, number>
  >({});
  const [contentStats, setContentStats] = useState<Record<string, any>>({});

  // Map API response structure to expected structure
  // API returns fileUrl, but ContentCard expects mediaUrl
  const mappedContent = {
    ...content,
    mediaUrl: content.mediaUrl || (content as any).fileUrl,
    // Map other fields that might be different
    likeCount: content.likeCount || (content as any).favoriteCount || 0,
    commentCount: content.commentCount || 0,
    shareCount: content.shareCount || 0,
    viewCount: content.viewCount || 0,
    // Map author structure with proper fallbacks
    author: content.author ||
      content.authorInfo || {
        _id:
          (content as any).uploadedBy?._id ||
          (content as any).uploadedBy ||
          "unknown",
        firstName: (content as any).uploadedBy?.firstName || "Unknown",
        lastName: (content as any).uploadedBy?.lastName || "User",
        avatar: (content as any).uploadedBy?.avatar,
      },
  };

  // SAFE LIBRARY STORE - Never fails, always returns a valid store
  const safeLibraryStore = useSafeLibraryStore();

  // Direct store reference as backup
  const directLibraryStore = useLibraryStore();

  // Check if item is saved - this will NEVER crash
  const isItemInLibrary = React.useMemo(() => {
    try {
      // Try safe store first
      let result = safeLibraryStore.isItemSaved(content._id);
      let storeSource = "safe";

      // If safe store returns false and direct store is loaded, try direct store
      if (!result && directLibraryStore.isLoaded) {
        result = directLibraryStore.isItemSaved(content._id);
        storeSource = "direct";
      }

      console.log(
        `🔍 Item ${content._id} saved status:`,
        result,
        `(from ${storeSource} store)`
      );
      console.log(`🔍 Safe store loaded:`, safeLibraryStore.isLoaded);
      console.log(`🔍 Direct store loaded:`, directLibraryStore.isLoaded);
      console.log(
        `🔍 Safe store items count:`,
        safeLibraryStore.savedItems?.length || 0
      );
      console.log(
        `🔍 Direct store items count:`,
        directLibraryStore.savedItems?.length || 0
      );
      console.log(
        `🔍 Direct store items:`,
        directLibraryStore.savedItems?.map((item) => item.id) || []
      );
      return result;
    } catch (error) {
      console.warn("⚠️ Error calling isItemSaved:", error);
      return false;
    }
  }, [safeLibraryStore, directLibraryStore, content._id]);

  // Real-time state
  const [isLiked, setIsLiked] = useState(mappedContent.isLiked || false);
  const [likeCount, setLikeCount] = useState(mappedContent.likeCount || 0);
  const [commentCount, setCommentCount] = useState(
    mappedContent.commentCount || 0
  );
  const [shareCount, setShareCount] = useState(mappedContent.shareCount || 0);
  const [viewerCount, setViewerCount] = useState(
    mappedContent.liveViewers || 0
  );
  const [isBookmarked, setIsBookmarked] = useState(
    mappedContent.isBookmarked || isItemInLibrary || false
  );

  // Ensure store is loaded
  React.useEffect(() => {
    if (!directLibraryStore.isLoaded) {
      console.log("🔄 Loading library store...");
      directLibraryStore.loadSavedItems();
    }
  }, [directLibraryStore]);

  // Sync local bookmark state with store state
  React.useEffect(() => {
    console.log(
      `🔄 Syncing bookmark state for ${content._id}:`,
      isItemInLibrary
    );
    setIsBookmarked(isItemInLibrary);
  }, [isItemInLibrary]);

  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isLive, setIsLive] = useState(mappedContent.isLive || false);

  // Animation values
  const likeAnimation = useRef(new Animated.Value(1)).current;
  const heartAnimation = useRef(new Animated.Value(0)).current;
  const commentAnimation = useRef(new Animated.Value(1)).current;
  const livePulseAnimation = useRef(new Animated.Value(1)).current;

  // Video URL management - use the same approach as library
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  // Function to convert signed URLs to public URLs (same as AllContentTikTok)
  const convertToPublicUrl = (signedUrl: string): string => {
    if (!signedUrl) return signedUrl;

    try {
      const url = new URL(signedUrl);
      // Remove AWS signature parameters
      const paramsToRemove = [
        "X-Amz-Algorithm",
        "X-Amz-Content-Sha256",
        "X-Amz-Credential",
        "X-Amz-Date",
        "X-Amz-Expires",
        "X-Amz-Signature",
        "X-Amz-SignedHeaders",
        "x-amz-checksum-mode",
        "x-id",
      ];

      paramsToRemove.forEach((param) => {
        url.searchParams.delete(param);
      });

      // Convert to public URL format
      const publicUrl = url.toString();
      console.log(
        `🔗 ContentCard Converted URL: ${signedUrl.substring(
          0,
          100
        )}... → ${publicUrl.substring(0, 100)}...`
      );

      return publicUrl;
    } catch (error) {
      console.warn("⚠️ ContentCard Error converting URL:", error);
      return signedUrl; // Return original if conversion fails
    }
  };

  // Use the same URL validation and fallback as library
  const isValidUri = (u: any) =>
    typeof u === "string" &&
    u.trim().length > 0 &&
    /^https?:\/\//.test(u.trim());

  // Log the content to see what URLs are available
  console.log(`🔍 ContentCard ${content.title} URLs:`, {
    mediaUrl: content.mediaUrl,
    fileUrl: (content as any).fileUrl,
    thumbnailUrl: content.thumbnailUrl,
    contentType: content.contentType,
    mappedMediaUrl: mappedContent.mediaUrl,
  });

  // Use the mapped content for video URL
  const rawVideoUrl = mappedContent.mediaUrl;

  // Convert signed URL to public URL for videos (same logic as AllContentTikTok)
  const videoUrl =
    content.contentType === "video" && rawVideoUrl
      ? convertToPublicUrl(rawVideoUrl)
      : rawVideoUrl;

  // For videos, always use the mediaUrl (actual video file), not thumbnail
  const safeVideoUri =
    content.contentType === "video"
      ? isValidUri(videoUrl)
        ? String(videoUrl).trim()
        : rawVideoUrl ||
          "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      : mappedContent.thumbnailUrl ||
        mappedContent.mediaUrl ||
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  console.log(`🎬 ContentCard Video URL for "${content.title}":`, {
    contentType: content.contentType,
    rawMediaUrl: rawVideoUrl,
    convertedVideoUrl: videoUrl,
    finalSafeUrl: safeVideoUri,
    thumbnailUrl: mappedContent.thumbnailUrl,
    isValid: isValidUri(videoUrl),
    isUsingFallback: safeVideoUri.includes("BigBuckBunny"),
    isVideoContent: content.contentType === "video",
  });

  // Use the same simple video states as library
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoOverlay, setShowVideoOverlay] = useState(true);

  // Store hooks
  const globalVideoStore = useGlobalVideoStore();
  const globalMediaStore = useGlobalMediaStore();
  const { comments } = useInteractionStore();
  const { showCommentModal } = useCommentModal();

  // Refs
  const videoRef = useRef<Video>(null);
  const modalKey = `content-${content._id}`;
  const key = `content-${content._id}`;

  // Socket.IO integration
  useEffect(() => {
    if (socketManager) {
      // Join content room for real-time updates
      socketManager.joinContentRoom(content._id, "media");

      // Set up real-time event handlers for this specific content
      const originalHandlers = {
        onContentReaction: socketManager.handleContentReaction,
        onCountUpdate: socketManager.handleCountUpdate,
        onViewerCountUpdate: socketManager.handleViewerCountUpdate,
      };

      socketManager.setEventHandlers({
        ...originalHandlers,
        onContentReaction: (data: any) => {
          if (data.contentId === content._id) {
            setIsLiked(data.liked);
            setLikeCount(data.count);
            animateLike();
          }
          originalHandlers.onContentReaction?.(data);
        },
        onCountUpdate: (data: any) => {
          if (data.contentId === content._id) {
            setLikeCount(data.likeCount);
            setCommentCount(data.commentCount);
            setShareCount(data.shareCount);
          }
          originalHandlers.onCountUpdate?.(data);
        },
        onViewerCountUpdate: (data: any) => {
          if (data.contentId === content._id) {
            setViewerCount(data.viewerCount);
          }
          originalHandlers.onViewerCountUpdate?.(data);
        },
      });
    }

    return () => {
      if (socketManager) {
        socketManager.leaveContentRoom(content._id, "media");
      }
    };
  }, [content._id, socketManager]);

  // Get existing comments for this content
  const contentId = content._id;
  const currentComments = comments[contentId] || [];

  // Sample comments for testing
  const sampleComments = [
    {
      id: "1",
      userName:
        content.author?.firstName || content.authorInfo?.firstName || "User",
      avatar: content.author?.avatar || content.authorInfo?.avatar || "",
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

  // Animation functions
  const animateLike = () => {
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Heart animation
    Animated.sequence([
      Animated.timing(heartAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateComment = () => {
    Animated.sequence([
      Animated.timing(commentAnimation, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(commentAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Live stream pulse animation
  useEffect(() => {
    if (isLive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(livePulseAnimation, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(livePulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [isLive, livePulseAnimation]);

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
    // Use mappedContent for consistent data structure
    const author = mappedContent.author;

    // Check if author has avatar
    if (author?.avatar) {
      return typeof author.avatar === "string"
        ? { uri: author.avatar }
        : author.avatar;
    }

    // Use Cloudinary default avatar like Jentezen Franklin
    return {
      uri: "https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_crop,g_face,r_max/w_200/lady.jpg",
    };
  };

  const getUserDisplayNameFromContent = (content: any) => {
    // Use mappedContent for consistent data structure
    const author = mappedContent.author;

    // Check if author has complete name
    if (author?.firstName && author?.lastName) {
      return `${author.firstName} ${author.lastName}`;
    }

    // Check if author has firstName only
    if (author?.firstName) {
      return author.firstName;
    }

    // Check if author has lastName only
    if (author?.lastName) {
      return author.lastName;
    }

    // Check if author exists but no name
    if (author && (author._id === null || !author.firstName)) {
      return "Jevah HQ";
    }

    // Final fallback
    return "Jevah HQ";
  };

  // Video toggle function using global media store
  const toggleVideoPlay = () => {
    if (content.contentType === "video") {
      // Use global media store to ensure only one media plays at a time
      globalMediaStore.playMediaGlobally(modalKey, "video");

      // Toggle current video state
      const newPlayingState = !isVideoPlaying;
      setIsVideoPlaying(newPlayingState);
      setShowVideoOverlay(!newPlayingState);

      if (newPlayingState) {
        // Increment view count when user plays video
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
      // Optimistic update
      const newLikedState = !isLiked;
      const newLikeCount = newLikedState ? likeCount + 1 : likeCount - 1;

      setIsLiked(newLikedState);
      setLikeCount(newLikeCount);
      animateLike();

      // Send real-time like
      if (socketManager) {
        socketManager.sendLike(content._id, "media");
      }

      // Call API
      await onLike(content._id, newLikedState);
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!isLiked);
      setLikeCount(likeCount);
    }
  };

  const handleComment = () => {
    // Call the onComment prop to let the parent handle the modal
    onComment(content._id);
  };

  const handleShare = async () => {
    try {
      await onShare(content._id);
      setShareCount(shareCount + 1);
    } catch (error) {
      console.error("Error sharing content:", error);
    }
  };

  const handleDoubleTap = () => {
    if (!isLiked) {
      handleFavorite();
    }
  };

  const handleLongPress = () => {
    // Directly toggle save to library without showing alert
    handleSaveToLibrary();
  };

  const handleSaveToLibrary = async () => {
    console.log("🔍 DEBUG: handleSaveToLibrary called");
    console.log("🔍 DEBUG: onSaveToLibrary exists:", !!onSaveToLibrary);
    console.log("🔍 DEBUG: Current isItemInLibrary state:", isItemInLibrary);
    console.log("🔍 DEBUG: Content ID:", content._id);
    console.log("🔍 DEBUG: Content title:", content.title);

    if (onSaveToLibrary) {
      try {
        console.log("🔍 DEBUG: Starting bookmark process...");

        // Update local state optimistically for instant UI feedback
        const newBookmarkState = !isItemInLibrary;
        console.log("🔍 DEBUG: New bookmark state:", newBookmarkState);

        setIsBookmarked(newBookmarkState);
        console.log("🔍 DEBUG: Local state updated to:", newBookmarkState);

        // Update content stats
        setContentStats((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            saved: newBookmarkState ? 1 : 0,
          },
        }));
        console.log("🔍 DEBUG: Content stats updated");

        // Call the API
        console.log(
          "🔍 DEBUG: Calling onSaveToLibrary with:",
          content._id,
          isItemInLibrary
        );
        await onSaveToLibrary(content._id, isItemInLibrary);

        console.log("✅ DEBUG: Bookmark API call successful");
        console.log("✅ DEBUG: Final bookmark state:", newBookmarkState);
      } catch (error) {
        console.log("❌ DEBUG: Bookmark API call failed:", error);

        // Rollback on error - revert to previous state
        const previousBookmarkState = isItemInLibrary; // Revert to original state
        setIsBookmarked(previousBookmarkState);
        setContentStats((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            saved: previousBookmarkState ? 1 : 0,
          },
        }));
        console.log(
          "❌ DEBUG: Rolled back to previous state:",
          previousBookmarkState
        );
      }
    } else {
      console.log("❌ DEBUG: onSaveToLibrary is not available!");
    }
  };

  const handleSave = async () => {
    console.log("🔍 DEBUG: handleSave called (bookmark icon clicked)");
    console.log("🔍 DEBUG: onSaveToLibrary available:", !!onSaveToLibrary);
    console.log("🔍 DEBUG: handleSave function executed successfully");

    // Use the new save to library handler if available
    if (onSaveToLibrary) {
      console.log("🔍 DEBUG: Using onSaveToLibrary handler");
      await handleSaveToLibrary();
      return;
    }

    console.log("🔍 DEBUG: Using fallback library store");

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
        uploadedBy: content.author?._id || content.authorInfo?._id,
        description: content.description,
        createdAt: content.createdAt,
        speakerAvatar: content.author?.avatar || content.authorInfo?.avatar,
        views: contentStats[key]?.views || content.viewCount,
        sheared: contentStats[key]?.sheared || content.shareCount,
        favorite: contentStats[key]?.favorite || content.likeCount,
        comment: contentStats[key]?.comment || content.commentCount,
        saved: 1,
        imageUrl: content.thumbnailUrl || content.mediaUrl,
        thumbnailUrl: content.thumbnailUrl,
        originalKey: key,
      };

      await safeLibraryStore.addToLibrary(libraryItem);
    } else {
      await safeLibraryStore.removeFromLibrary(key);
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

  // Handle video URL refresh - try to get fresh URL from API
  const handleVideoUrlRefresh = async () => {
    if (isRefreshingUrl) return;

    setIsRefreshingUrl(true);
    setVideoLoadError(null);

    try {
      console.log(`🔄 Retrying video for: ${content.title}`);

      // Try to refresh the content data from the parent component
      // This would ideally call the API again to get fresh URLs
      console.log(`🔄 Original URL: ${videoUrl}`);
      console.log(`🔄 Current safe URL: ${safeVideoUri}`);

      // For now, just clear the error and let the component re-render
      // In a real implementation, you'd want to call the API to get fresh URLs
      setVideoLoadError(null);

      // Force a re-render by updating the video state
      setIsVideoPlaying(false);
      setShowVideoOverlay(true);
    } catch (error) {
      console.error(`❌ Failed to refresh video URL:`, error);
      setVideoLoadError("Failed to refresh video URL");
    } finally {
      setIsRefreshingUrl(false);
    }
  };

  // Simple debug - same as library
  useEffect(() => {
    console.log(
      `🔍 Video States for ${content.title}: isPlaying=${isVideoPlaying}, showOverlay=${showVideoOverlay}`
    );
  }, [isVideoPlaying, showVideoOverlay, content.title]);

  // Force video to play/pause when states change
  useEffect(() => {
    if (content.contentType === "video") {
      const shouldPlay = isVideoPlaying;
      console.log(`🎬 Video state changed - shouldPlay: ${shouldPlay}`);

      // Add a small delay to ensure video ref is ready
      const timeoutId = setTimeout(() => {
        if (videoRef.current) {
          if (shouldPlay) {
            console.log(`▶️ Forcing video to play: ${content.title}`);
            videoRef.current.playAsync().catch((error) => {
              console.warn(`⚠️ Failed to play video: ${error}`);
            });
          } else {
            console.log(`⏸️ Forcing video to pause: ${content.title}`);
            videoRef.current.pauseAsync().catch((error) => {
              console.warn(`⚠️ Failed to pause video: ${error}`);
            });
          }
        } else {
          console.warn(`⚠️ Video ref not available for: ${content.title}`);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isVideoPlaying, content.contentType, content.title]);

  // Render based on content type
  const renderMediaContent = () => {
    if (content.contentType === "video") {
      return (
        <TouchableWithoutFeedback
          onPress={toggleVideoPlay}
          onLongPress={handleLongPress}
        >
          <View className="w-full h-[400px] overflow-hidden relative">
            {/* Video player - EXACT same as library */}
            <Video
              ref={videoRef}
              source={{ uri: safeVideoUri }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isVideoPlaying}
              isLooping={false}
              isMuted={false}
              useNativeControls={false}
              onLoad={() => {
                console.log(
                  `✅ Video loaded successfully: ${content.title}`,
                  safeVideoUri
                );
              }}
              onError={(e) => {
                console.warn(
                  "Video failed to load in ContentCard:",
                  content.title,
                  safeVideoUri,
                  e
                );
                console.warn("Error details:", {
                  error: (e as any)?.nativeEvent?.error,
                  code: (e as any)?.nativeEvent?.code,
                  message: (e as any)?.nativeEvent?.message,
                });
                setIsVideoPlaying(false);
                setShowVideoOverlay(true);
                setVideoLoadError(
                  `Failed to load video: ${
                    (e as any)?.nativeEvent?.message || "Unknown error"
                  }`
                );
              }}
              onPlaybackStatusUpdate={(status) => {
                if (!status.isLoaded) return;
                if (status.didJustFinish) {
                  setIsVideoPlaying(false);
                  setShowVideoOverlay(true);
                  console.log(`🎬 Video completed: ${content.title}`);
                }
              }}
            />

            {/* Right side actions */}
            <View className="flex-col absolute mt-[170px] ml-[360px]">
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <TouchableOpacity
                  onPress={handleFavorite}
                  className="flex-col justify-center items-center"
                >
                  <MaterialIcons
                    name={isLiked ? "favorite" : "favorite-border"}
                    size={30}
                    color={isLiked ? "#D22A2A" : "#FFFFFF"}
                  />
                  <Text className="text-[10px] text-white font-rubik-semibold">
                    {likeCount}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View
                style={{ transform: [{ scale: commentAnimation }] }}
              >
                <View className="flex-col justify-center items-center mt-6">
                  <CommentIcon
                    comments={formattedComments}
                    size={30}
                    color="white"
                    showCount={true}
                    count={commentCount}
                    layout="vertical"
                  />
                </View>
              </Animated.View>
              <TouchableOpacity
                onPress={handleSaveToLibrary}
                className="flex-col justify-center items-center mt-6"
              >
                <MaterialIcons
                  name={isBookmarked ? "bookmark" : "bookmark-border"}
                  size={30}
                  color={isBookmarked ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {isItemInLibrary ? 1 : 0}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Play/Pause Overlay - EXACT same as library */}
            {!isVideoPlaying && showVideoOverlay && (
              <>
                <View className="absolute inset-0 justify-center items-center">
                  <View className="bg-white/70 p-4 rounded-full">
                    <Ionicons name="play" size={40} color="#FEA74E" />
                  </View>
                </View>

                <View className="absolute bottom-4 left-4 right-4">
                  <Text
                    className="text-white font-rubik-bold text-sm"
                    numberOfLines={2}
                  >
                    {content.title}
                  </Text>
                </View>
              </>
            )}

            {/* Video Load Error Overlay */}
            {videoLoadError && (
              <View className="absolute inset-0 justify-center items-center bg-black/50">
                <View className="bg-white/90 p-4 rounded-lg mx-4 items-center">
                  <Ionicons name="warning" size={32} color="#FF6B6B" />
                  <Text className="text-red-600 font-rubik-bold text-sm mt-2 text-center">
                    Video Unavailable
                  </Text>
                  <Text className="text-gray-600 font-rubik text-xs mt-1 text-center">
                    {videoLoadError}
                  </Text>
                  <TouchableOpacity
                    onPress={handleVideoUrlRefresh}
                    className="bg-[#FEA74E] px-4 py-2 rounded-lg mt-2"
                    disabled={isRefreshingUrl}
                  >
                    <Text className="text-white font-rubik-bold text-xs">
                      {isRefreshingUrl ? "Retrying..." : "Retry"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Double-tap heart animation */}
            <Animated.View
              style={[
                {
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  marginTop: -40,
                  marginLeft: -40,
                  zIndex: 1000,
                },
                {
                  opacity: heartAnimation,
                  transform: [
                    {
                      scale: heartAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1.5],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialIcons name="favorite" size={80} color="#e91e63" />
            </Animated.View>

            {/* Content Type Icon */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 p-1 rounded-full">
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Video Title - show when paused */}
            {!globalVideoStore.playingVideos[modalKey] && (
              <View className="absolute bottom-16 left-3 right-3 px-4 py-2 rounded-md">
                <Text
                  className="text-white font-semibold text-[14px]"
                  numberOfLines={2}
                >
                  {content.title}
                </Text>
              </View>
            )}

            {/* Bottom Controls - only show when playing */}
            {isVideoPlaying && (
              <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
                <View className="flex-1 h-1 bg-white/30 rounded-full relative">
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
              source={{
                uri: mappedContent.thumbnailUrl || mappedContent.mediaUrl,
              }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode="cover"
              onError={(error) => {
                console.warn(
                  `❌ Audio thumbnail load error for ${content.title}:`,
                  error
                );
              }}
            />

            {/* Right side actions */}
            <View className="flex-col absolute mt-[170px] ml-[360px]">
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <TouchableOpacity
                  onPress={handleFavorite}
                  className="flex-col justify-center items-center"
                >
                  <MaterialIcons
                    name={isLiked ? "favorite" : "favorite-border"}
                    size={30}
                    color={isLiked ? "#D22A2A" : "#FFFFFF"}
                  />
                  <Text className="text-[10px] text-white font-rubik-semibold">
                    {likeCount}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View
                style={{ transform: [{ scale: commentAnimation }] }}
              >
                <View className="flex-col justify-center items-center mt-6">
                  <CommentIcon
                    comments={formattedComments}
                    size={30}
                    color="white"
                    showCount={true}
                    count={commentCount}
                    layout="vertical"
                  />
                </View>
              </Animated.View>
              <TouchableOpacity
                onPress={handleSaveToLibrary}
                className="flex-col justify-center items-center mt-6"
              >
                <MaterialIcons
                  name={isBookmarked ? "bookmark" : "bookmark-border"}
                  size={30}
                  color={isBookmarked ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {isItemInLibrary ? 1 : 0}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Type Icon */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Compact Audio Controls - Using Advanced Audio System */}
            <View className="absolute bottom-3 left-3 right-3">
              <CompactAudioControls
                audioUrl={mappedContent.mediaUrl}
                audioKey={content._id}
                className="bg-black/50 rounded-lg"
              />
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
              source={{
                uri: mappedContent.thumbnailUrl || mappedContent.mediaUrl,
              }}
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
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <TouchableOpacity
                  onPress={handleFavorite}
                  className="flex-col justify-center items-center"
                >
                  <MaterialIcons
                    name={isLiked ? "favorite" : "favorite-border"}
                    size={30}
                    color={isLiked ? "#D22A2A" : "#FFFFFF"}
                  />
                  <Text className="text-[10px] text-white font-rubik-semibold">
                    {likeCount}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View
                style={{ transform: [{ scale: commentAnimation }] }}
              >
                <View className="flex-col justify-center items-center mt-6">
                  <CommentIcon
                    comments={formattedComments}
                    size={30}
                    color="white"
                    showCount={true}
                    count={commentCount}
                    layout="vertical"
                  />
                </View>
              </Animated.View>
              <TouchableOpacity
                onPress={handleSaveToLibrary}
                className="flex-col justify-center items-center mt-6"
              >
                <MaterialIcons
                  name={isBookmarked ? "bookmark" : "bookmark-border"}
                  size={30}
                  color={isBookmarked ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {isItemInLibrary ? 1 : 0}
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

              {/* Live Stream Indicator */}
              {isLive && (
                <Animated.View
                  style={{
                    transform: [{ scale: livePulseAnimation }],
                    marginLeft: 8,
                    marginTop: 2,
                  }}
                >
                  <View className="flex-row items-center bg-red-500 px-2 py-1 rounded-full">
                    <View className="w-2 h-2 bg-white rounded-full mr-1" />
                    <Text className="text-white text-[10px] font-rubik-semibold">
                      LIVE
                    </Text>
                  </View>
                </Animated.View>
              )}

              <View className="flex flex-row mt-2 ml-2">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {getTimeAgo(content.createdAt)}
                </Text>
              </View>
            </View>
            <View className="flex-row mt-2">
              <View className="flex-row items-center">
                <AntDesign name="eye" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                  {contentStats[key]?.views ?? mappedContent.viewCount ?? 0}
                </Text>
              </View>

              {/* Live Viewer Count */}
              {isLive && viewerCount > 0 && (
                <View className="flex-row items-center ml-4">
                  <Ionicons name="people" size={16} color="#ef4444" />
                  <Text className="text-[10px] text-red-500 ml-1 font-rubik-semibold">
                    {viewerCount} watching
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleShare}
                className="flex-row items-center ml-4"
              >
                <Feather name="send" size={24} color="#98A2B3" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {contentStats[key]?.sheared ?? mappedContent.shareCount ?? 0}
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
              onPress={handleSaveToLibrary}
            >
              <Text className="text-[#1D2939] font-rubik ml-2">
                {isBookmarked ? "Remove from Library" : "Save to Library"}
              </Text>
              <MaterialIcons
                name={isBookmarked ? "bookmark" : "bookmark-border"}
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

export default ContentCard;
