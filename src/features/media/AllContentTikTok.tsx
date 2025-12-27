import { Audio } from "expo-av";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Shared imports
import { UI_CONFIG } from "../../shared/constants";
import { ContentType, MediaItem } from "../../shared/types";
import {
    categorizeContent,
    filterContentByType,
    getContentKey,
    getMostRecentItem,
    getTimeAgo,
    getUserAvatarFromContent,
    getUserDisplayNameFromContent,
    transformApiResponseToMediaItem,
} from "../../shared/utils";

// Feature-specific imports
import Skeleton from "../../shared/components/Skeleton/Skeleton";
import { useMedia } from "../../shared/hooks/useMedia";

// Component imports
import { Ionicons } from "@expo/vector-icons";
import { ContentErrorBoundary } from "../../../app/components/ContentErrorBoundary";
import SuccessCard from "../../../app/components/SuccessCard";
import EbookCard from "./components/EbookCard";
import MusicCard from "./components/MusicCard";
import VideoCard from "./components/VideoCard";

// Import original stores and hooks (these will be bridged)
import { useCommentModal } from "../../../app/context/CommentModalContext";
import { useVideoNavigation } from "../../../app/hooks/useVideoNavigation";
import SocketManager from "../../../app/services/SocketManager";
import { useDownloadStore } from "../../../app/store/useDownloadStore";
import { useGlobalMediaStore } from "../../../app/store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../../../app/store/useGlobalVideoStore";
import { useInteractionStore } from "../../../app/store/useInteractionStore";
import { useLibraryStore } from "../../../app/store/useLibraryStore";
import {
    convertToDownloadableItem,
    useDownloadHandler,
} from "../../../app/utils/downloadUtils";
import {
    getPersistedStats,
    getViewed,
} from "../../../app/utils/persistentStorage";
import TokenUtils from "../../../app/utils/tokenUtils";

export interface AllContentTikTokProps {
  contentType?: ContentType | "ALL";
}

export const AllContentTikTok: React.FC<AllContentTikTokProps> = ({
  contentType = "ALL",
}) => {
  const router = useRouter();

  // Media data from the new hook
  const {
    allContent,
    defaultContent,
    loading,
    error,
    refreshAllContent,
    getFilteredContent,
    hasContent,
  } = useMedia({ immediate: true });

  // Global state from original stores
  const globalMediaStore = useGlobalMediaStore();
  const globalVideoStore = useGlobalVideoStore();

  // Get global video state - FIX: Read from the same store we write to with REACTIVE SUBSCRIPTIONS
  const playingVideos = useGlobalVideoStore((s) => s.playingVideos);
  const mutedVideos = useGlobalVideoStore((s) => s.mutedVideos);
  const progresses = useGlobalVideoStore((s) => s.progresses);
  const showOverlay = useGlobalVideoStore((s) => s.showOverlay);
  const currentlyPlayingVideo = useGlobalVideoStore(
    (s) => s.currentlyPlayingVideo
  );
  const isAutoPlayEnabled = useGlobalVideoStore((s) => s.isAutoPlayEnabled);
  const pauseAllVideos = useGlobalVideoStore((s) => s.pauseAllVideos);
  const toggleVideoMuteAction = useGlobalVideoStore((s) => s.toggleVideoMute);
  const enableAutoPlay = useGlobalVideoStore((s) => s.enableAutoPlay);

  // Create functions to match what components expect
  const playMedia = useCallback((key: string, type: "video" | "audio") => {
    // ✅ Use unified media store for both video and audio to handle mutual pausing
    // This ensures video pauses audio and audio pauses video
    globalMediaStore.playMediaGlobally(key, type);
  }, [globalMediaStore]);

  const pauseMedia = useCallback((key: string) => {
    globalVideoStore.pauseVideo(key);
  }, [globalVideoStore]);

  const toggleMute = (key: string) => {
    globalVideoStore.toggleVideoMute(key);
  };

  const { showCommentModal } = useCommentModal();
  const { comments } = useInteractionStore();
  const libraryStore = useLibraryStore();
  const { loadDownloadedItems } = useDownloadStore();
  const { navigateToReels } = useVideoNavigation();

  // Interaction store
  const {
    contentStats,
    toggleLike,
    toggleSave,
    loadContentStats,
    loadingInteraction,
  } = useInteractionStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState<string | null>(null);

  // Success card state
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const toggleModal = useCallback((val: string | null) => {
    setModalVisible(val);
  }, []);
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Audio playback state
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [soundMap, setSoundMap] = useState<Record<string, Audio.Sound>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [pausedAudioMap, setPausedAudioMap] = useState<Record<string, number>>(
    {}
  );
  const [audioProgressMap, setAudioProgressMap] = useState<
    Record<string, number>
  >({});
  const [audioDurationMap, setAudioDurationMap] = useState<
    Record<string, number>
  >({});
  const [audioMuteMap, setAudioMuteMap] = useState<Record<string, boolean>>({});

  // Refs for audio state
  const playingAudioIdRef = useRef<string | null>(null);
  const soundMapRef = useRef<Record<string, Audio.Sound>>({});

  // Socket manager state
  const [socketManager, setSocketManager] = useState<SocketManager | null>(
    null
  );
  const [realTimeCounts, setRealTimeCounts] = useState<Record<string, any>>({});

  // Video control state
  const videoRefs = useRef<Record<string, any>>({});
  const isMountedRef = useRef(true);
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const [viewCounted, setViewCounted] = useState<Record<string, boolean>>({});

  // Scroll-based auto-play state
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentlyVisibleVideo, setCurrentlyVisibleVideo] = useState<
    string | null
  >(null);
  const contentLayoutsRef = useRef<
    Record<
      string,
      { y: number; height: number; type: "video" | "music"; uri?: string }
    >
  >({});
  const lastScrollYRef = useRef<number>(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(
    null
  );
  const [hoverBasedAutoplay, setHoverBasedAutoplay] = useState(false);
  const [lastHoveredVideo, setLastHoveredVideo] = useState<string | null>(null);
  const [hoveredVideos, setHoveredVideos] = useState<Set<string>>(new Set());
  const lastScrollY = useRef<number>(0);
  const lastSwitchTimeRef = useRef<number>(0);

  // Helper functions to get state for specific keys
  const getVideoState = (key: string) => ({
    isPlaying: playingVideos[key] ?? false,
    isMuted: mutedVideos[key] ?? false,
    progress: progresses[key] ?? 0,
    showOverlay: showOverlay[key] ?? false,
  });
  const isVideoPlaying = (key: string) => playingVideos[key] ?? false;
  const isVideoMuted = (key: string) => mutedVideos[key] ?? false;
  const getVideoProgress = (key: string) => progresses[key] ?? 0;
  const getVideoOverlay = (key: string) => showOverlay[key] ?? false;

  // Transform and filter content
  const mediaList: MediaItem[] = useMemo(() => {
    const sourceData = allContent.length > 0 ? allContent : defaultContent;

    if (!sourceData || !Array.isArray(sourceData)) {
      return [];
    }

    return sourceData.map(transformApiResponseToMediaItem);
  }, [allContent, defaultContent]);

  // Filter content based on contentType
  const filteredMediaList = useMemo(() => {
    return filterContentByType(mediaList, contentType);
  }, [mediaList, contentType]);

  // Categorize content
  const categorizedContent = useMemo(() => {
    return categorizeContent(filteredMediaList);
  }, [filteredMediaList]);

  // Most recent item
  const mostRecentItem = useMemo(() => {
    const allItems = [
      ...categorizedContent.videos,
      ...categorizedContent.music,
      ...categorizedContent.ebooks,
      ...categorizedContent.sermons,
    ];

    return getMostRecentItem(allItems);
  }, [categorizedContent]);

  // Update refs when state changes
  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  useEffect(() => {
    soundMapRef.current = soundMap;
  }, [soundMap]);

  // Autoplay disabled - users must manually click to play videos
  useEffect(() => {
    // Videos require manual play interaction
  }, []);

  // Manual video play is always allowed - only disable automatic startup
  useEffect(() => {
    // No automatic video start - videos will only play when manually clicked
    // This prevents unwanted video switching on page load
  }, []);

  // Periodic autoplay check disabled - manual play still works
  useEffect(() => {
    // No periodic autoplay checks - prevents automatic video switching
    // Manual video play via play button is always allowed
  }, []);

  // Initialize SocketManager for real-time features
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        console.log("🔌 AllContentTikTok: Initializing Socket.IO...");

        const authToken = await TokenUtils.getAuthToken();
        const tokenInfo = await TokenUtils.getTokenInfo();

        console.log("🔑 Token retrieval:", {
          ...tokenInfo,
          tokenPreview: authToken
            ? TokenUtils.getTokenPreview(authToken)
            : "null",
        });

        if (!authToken || authToken.trim() === "") {
          console.log(
            "⚠️ No valid auth token found, skipping Socket.IO initialization"
          );
          return;
        }

        if (!TokenUtils.isValidJWTFormat(authToken)) {
          console.warn(
            "⚠️ Invalid token format detected, skipping Socket.IO initialization"
          );
          return;
        }

        const manager = new SocketManager({
          serverUrl: "https://jevahapp-backend.onrender.com",
          authToken,
        });

        const socket = (manager as any).socket;
        if (socket) {
          socket.on("content-reaction", (data: any) => {
            console.log("📡 Real-time like update:", data);
            setRealTimeCounts((prev) => ({
              ...prev,
              [data.contentId]: {
                ...prev[data.contentId],
                likes: data.totalLikes,
                liked: data.liked,
              },
            }));
          });

          socket.on("content-comment", (data: any) => {
            console.log("📡 Real-time comment update:", data);
            setRealTimeCounts((prev) => ({
              ...prev,
              [data.contentId]: {
                ...prev[data.contentId],
                comments: data.totalComments,
              },
            }));
          });
        }

        try {
          await manager.connect();
          setSocketManager(manager);
          console.log("✅ Socket.IO initialized successfully");
        } catch (connectError) {
          console.warn(
            "⚠️ Socket connection failed, continuing without real-time features:",
            connectError
          );
        }
      } catch (error) {
        console.error("❌ Failed to initialize Socket.IO:", error);
      }
    };

    initializeSocket();

    return () => {
      if (socketManager) {
        socketManager.disconnect();
      }
    };
  }, []);


  // Load content stats for all visible items so user-liked/bookmarked states persist
  useEffect(() => {
    const loadStatsForVisibleContent = async () => {
      const items = filteredMediaList || [];
      if (items.length === 0) return;

      // Prefer batch metadata when available
      const ids = items.map((i) => i._id).filter(Boolean) as string[];
      try {
        await useInteractionStore
          .getState()
          .loadBatchContentStats(ids, "media");
      } catch (e) {
        for (const item of items) {
          const id = item?._id;
          const type = item?.contentType as any;
          if (!id) continue;
          try {
            await loadContentStats(id, type);
          } catch (error) {
            console.warn(`⚠️ Failed to load stats for ${type} ${id}:`, error);
          }
        }
      }
    };

    loadStatsForVisibleContent();
  }, [filteredMediaList, loadContentStats]);

  // Load persisted data
  useEffect(() => {
    const loadAllData = async () => {
      console.log("📱 AllContent: Loading persisted data...");
      setIsLoadingContent(true);

      try {
        const [stats, viewed, libraryLoaded] = await Promise.all([
          getPersistedStats(),
          getViewed(),
          libraryStore.isLoaded
            ? Promise.resolve()
            : libraryStore.loadSavedItems(),
        ]);

        setPreviouslyViewed(viewed || []);
        console.log(
          `✅ AllContent: Loaded ${
            mediaList.length
          } media items and stats for ${Object.keys(stats || {}).length} items`
        );
      } catch (error) {
        console.error("❌ Error loading AllContent data:", error);
      } finally {
        setIsLoadingContent(false);
      }
    };

    if (mediaList.length > 0) {
      loadAllData();
    } else {
      setIsLoadingContent(false);
    }
  }, [mediaList.length]);

  // Helper functions to get interaction state from backend
  const getUserLikeState = (contentId: string) => {
    const stats = contentStats[contentId];
    return stats?.userInteractions?.liked || false;
  };

  const getLikeCount = (contentId: string) => {
    const stats = contentStats[contentId];
    return stats?.likes || 0;
  };

  const getUserSaveState = (contentId: string) => {
    const stats = contentStats[contentId];
    return stats?.userInteractions?.saved || false;
  };

  const getSaveCount = (contentId: string) => {
    const stats = contentStats[contentId];
    return stats?.saves || 0;
  };

  const getCommentCount = (contentId: string) => {
    const stats = contentStats[contentId];
    return stats?.comments || 0;
  };

  // Audio playback functions
  const playAudio = async (uri: string, id: string) => {
    if (!uri || uri.trim() === "") {
      console.warn("🚨 Audio URI is empty or invalid:", { uri, id });
      return;
    }

    if (isLoadingAudio) {
      console.log("🚨 Audio is already loading, skipping...");
      return;
    }

    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      console.warn("🚨 Audio URI is not a valid HTTP/HTTPS URL:", { uri, id });
      return;
    }

    console.log(`🎵 Playing audio "${id}":`, {
      audioUri: uri,
      id,
      uriLength: uri.length,
    });

    setIsLoadingAudio(true);

    try {
      playMedia(id, "audio");

      if (playingAudioId && playingAudioId !== id && soundMap[playingAudioId]) {
        try {
          const currentSound = soundMap[playingAudioId];
          if (currentSound) {
            const status = await currentSound.getStatusAsync();
            if (status.isLoaded) {
              await currentSound.pauseAsync();
              setPausedAudioMap((prev) => ({
                ...prev,
                [playingAudioId]: status.positionMillis ?? 0,
              }));
            }
          }
        } catch (error) {
          console.warn("⚠️ Error pausing current audio:", error);
        }
      }

      const existing = soundMap[id];
      if (existing) {
        try {
          const status = await existing.getStatusAsync();
          if (status.isLoaded) {
            if (status.isPlaying) {
              const pos = status.positionMillis ?? 0;
              await existing.pauseAsync();
              setPausedAudioMap((prev) => ({ ...prev, [id]: pos }));
              setPlayingAudioId(null);
            } else {
              const resumePos = pausedAudioMap[id] ?? 0;
              await existing.playFromPositionAsync(resumePos);
              setPlayingAudioId(id);
            }
            setIsLoadingAudio(false);
            return;
          }
        } catch (error) {
          console.warn("⚠️ Error with existing sound:", error);
        }
      }

      const resumePos = pausedAudioMap[id] ?? 0;
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isMuted: audioMuteMap[id] ?? false,
          positionMillis: resumePos,
        }
      );

      setSoundMap((prev) => ({ ...prev, [id]: sound }));
      setPlayingAudioId(id);

      const initial = await sound.getStatusAsync();
      if (initial.isLoaded && typeof initial.durationMillis === "number") {
        const safeDur = initial.durationMillis || 1;
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));
        setAudioProgressMap((prev) => ({
          ...prev,
          [id]: (resumePos || 0) / safeDur,
        }));
      }

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded || typeof status.durationMillis !== "number")
          return;
        const safeDur = status.durationMillis || 1;
        setAudioProgressMap((prev) => ({
          ...prev,
          [id]: (status.positionMillis || 0) / safeDur,
        }));
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));

        if (status.didJustFinish) {
          try {
            await sound.unloadAsync();
          } catch {}
          setSoundMap((prev) => {
            const u = { ...prev };
            delete u[id];
            return u;
          });
          setPlayingAudioId((curr) => (curr === id ? null : curr));
          setPausedAudioMap((prev) => ({ ...prev, [id]: 0 }));
          setAudioProgressMap((prev) => ({ ...prev, [id]: 0 }));
        }
      });
    } catch (err) {
      console.error("❌ Audio playback error:", err);
      setPlayingAudioId(null);
      setSoundMap((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const pauseAllAudio = useCallback(async () => {
    try {
      const ids = Object.keys(soundMap);
      for (const id of ids) {
        const snd = soundMap[id];
        if (snd) {
          try {
            const status = await snd.getStatusAsync();
            if (status.isLoaded) {
              await snd.pauseAsync();
            }
          } catch (error) {
            console.warn(`⚠️ Error pausing audio ${id}:`, error);
          }
        }
      }
      setPlayingAudioId(null);
    } catch (error) {
      console.warn("⚠️ Error in pauseAllAudio:", error);
    }
  }, [soundMap]);

  // ✅ Pause both videos and audio for scroll autopause functionality
  const pauseAllMedia = useCallback(() => {
    globalVideoStore.pauseAllVideos();
    pauseAllAudio();
  }, [globalVideoStore, pauseAllAudio]);

  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  const handleDownloadPress = async (item: MediaItem) => {
    const downloadableItem = convertToDownloadableItem(
      item,
      item.contentType as "video" | "audio" | "ebook"
    );
    const result = await handleDownload(downloadableItem);
    if (result.success) {
      setSuccessMessage("Downloaded successfully!");
      setShowSuccessCard(true);
      await loadDownloadedItems();
    }
  };

  // Event handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllContent();
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllContent]);

  const handleVideoTap = useCallback(
    (key: string, video: MediaItem, index: number) => {
      // Build a display name function compatible with navigation signature
      const buildDisplayName = (speaker?: string, uploadedBy?: string) => {
        if (speaker && typeof speaker === "string" && speaker.trim().length > 0)
          return speaker;
        if (
          uploadedBy &&
          typeof uploadedBy === "string" &&
          uploadedBy.trim().length > 0
        )
          return uploadedBy;
        return "Unknown";
      };
      if (video && index !== undefined) {
        console.log(`📱 Video tapped to navigate to reels: ${video.title}`);
        navigateToReels({
          video: video as any,
          index,
          allVideos: categorizedContent.videos as any,
          contentStats,
          globalFavoriteCounts: {}, // Empty since we're using backend state
          getContentKey,
          getTimeAgo,
          getDisplayName: buildDisplayName,
          source: "AllContentTikTok",
          category: contentType, // Pass the current content type as category
        });
      }
    },
    [
      navigateToReels,
      categorizedContent.videos,
      contentStats,
      getContentKey,
      getTimeAgo,
    ]
  );

  /**
   * Handle like with optimistic update
   * The toggleLike from store already handles optimistic updates and rollback automatically
   * Socket errors are non-blocking and won't affect the optimistic update flow
   */
  const handleLike = useCallback(
    async (contentId: string, contentType: string) => {
      // Send real-time update via socket if available (non-blocking, fire-and-forget)
      // This is sent before the HTTP API call and won't block or affect optimistic updates
      if (socketManager?.isConnected()) {
        // Socket sendLike is now wrapped with try-catch internally and won't throw
        // Even if it fails, HTTP API will handle the like properly
        socketManager.sendLike(contentId, "media");
      }
      
      try {
        // Store handles optimistic update immediately, then API call, then rollback on error
        await toggleLike(contentId, contentType);
      } catch (error) {
        console.error("❌ Like error:", error);
        // Store automatically handles rollback on error - optimistic update is reverted
      }
    },
    [socketManager, toggleLike]
  );

  const handleComment = useCallback(
    (key: string, item: MediaItem) => {
      console.log("🔄 Comment button clicked for content:", item.title);
      const contentId = item._id || key;
      // Create mock comments like in Reels component
      const mockComments = [
        {
          id: "1",
          userName: "John Doe",
          avatar: "",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          comment: "Great content! Really enjoyed this.",
          likes: 5,
          isLiked: false,
        },
        {
          id: "2",
          userName: "Jane Smith",
          avatar: "",
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          comment: "Amazing! Thanks for sharing.",
          likes: 3,
          isLiked: true,
        },
        {
          id: "3",
          userName: "Mike Johnson",
          avatar: "",
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          comment: "This is exactly what I needed!",
          likes: 1,
          isLiked: false,
        },
      ];
      showCommentModal(mockComments, contentId);
    },
    [showCommentModal]
  );

  const handleSave = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        const contentId = item._id || key;
        const contentType = item.contentType || "media";
        await toggleSave(contentId, contentType);

        const isSaved = getUserSaveState(contentId);
        if (!isSaved) {
          const libraryItem = {
            id: contentId,
            contentType: item.contentType || "content",
            fileUrl: item.fileUrl,
            title: item.title,
            speaker: item.speaker,
            uploadedBy: item.uploadedBy,
            description: item.description,
            createdAt: item.createdAt || new Date().toISOString(),
            speakerAvatar: item.speakerAvatar,
            views: getLikeCount(contentId) || item.views || 0,
            shares: 0,
            likes: getLikeCount(contentId) || item.likes || 0,
            comments: getCommentCount(contentId) || item.comment || 0,
            saved: 1,
            imageUrl: item.imageUrl,
            thumbnailUrl: (() => {
              if (
                item.contentType === "videos" &&
                typeof item.fileUrl === "string"
              ) {
                return (
                  item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg"
                );
              }
              if (typeof item.imageUrl === "string") return item.imageUrl;
              return typeof item.fileUrl === "string" ? item.fileUrl : "";
            })(),
            originalKey: key,
          };
          await libraryStore.addToLibrary(libraryItem);
          setSuccessMessage("Saved to library!");
          setShowSuccessCard(true);
        } else {
          await libraryStore.removeFromLibrary(contentId);
          setSuccessMessage("Removed from library!");
          setShowSuccessCard(true);
        }
      } catch (error) {
        console.error("❌ Save error:", error);
      }
      setModalVisible(null);
    },
    [toggleSave, getUserSaveState, getLikeCount, getCommentCount, libraryStore]
  );

  const handleShare = useCallback(async (key: string, item: MediaItem) => {
    console.log("🔄 Share button clicked for:", item.title);
    try {
      const result = await Share.share({
        title: item.title,
        message: `Check this out: ${item.title}\n${item.fileUrl}`,
        url: item.fileUrl,
      });

      if (result.action === Share.sharedAction) {
        console.log("✅ Share completed successfully");
      }
      setModalVisible(null);
    } catch (err) {
      console.warn("❌ Share error:", err);
      setModalVisible(null);
    }
  }, []);

  const handleFavorite = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        const contentId = item._id || key;
        const contentType = item.contentType || "media";
        await handleLike(contentId, contentType);
      } catch (error) {
        console.error(`❌ Failed to toggle like for ${item.title}:`, error);
      }
    },
    [handleLike]
  );

  const toggleVideoMute = (key: string) =>
    globalVideoStore.toggleVideoMute(key);

  const togglePlay = useCallback((key: string) => {
    console.log("🎮 togglePlay called in AllContentTikTok with key:", key);
    
    // Find the media item to determine if it's audio or video
    const mediaItem = filteredMediaList.find((item) => getContentKey(item) === key);
    const isAudio = mediaItem?.contentType === "audio" || mediaItem?.contentType === "sermon";
    
    // Clear any autoplay state and play the media immediately
    setCurrentlyVisibleVideo(key);

    // ✅ Use unified media store for consistent playback (handles both video and audio)
    // This ensures audio pauses video and video pauses audio
    playMedia(key, isAudio ? "audio" : "video");

    console.log(`✅ ${isAudio ? "Audio" : "Video"} play request sent for key:`, key);
  }, [filteredMediaList, getContentKey, playMedia]);

  // Handle video visibility changes during scroll for autoplay
  const handleVideoVisibilityChange = useCallback(
    (scrollY: number) => {
      if (!isAutoPlayEnabled) return;

      // Strict, non-jumping scroll-based autoplay
      const screenHeight = Dimensions.get("window").height;
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;

      // Track direction (for logging only)
      const currentScrollY = scrollY;
      if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
        setScrollDirection(
          currentScrollY > lastScrollY.current ? "down" : "up"
        );
        lastScrollY.current = currentScrollY;
      }

      const videoLayouts = Object.entries(contentLayoutsRef.current)
        .filter(([_, layout]) => layout.type === "video")
        .sort((a, b) => a[1].y - b[1].y);

      if (videoLayouts.length === 0) return;

      // Compute max visible ratio video and centerline candidate
      let bestKey: string | null = null;
      let bestRatio = 0;
      let centerKey: string | null = null;
      let centerDist = Number.POSITIVE_INFINITY;
      const viewportCenter = (viewportTop + viewportBottom) / 2;
      const CENTER_BAND_TOP = viewportTop + screenHeight * 0.35; // favor middle 30% band
      const CENTER_BAND_BOTTOM = viewportTop + screenHeight * 0.65;

      for (const [key, layout] of videoLayouts) {
        const videoTop = layout.y;
        const videoBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, videoTop);
        const intersectionBottom = Math.min(viewportBottom, videoBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const ratio = layout.height > 0 ? visibleHeight / layout.height : 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestKey = key;
        }

        // Prefer the video whose center is closest to the screen center (inside band)
        const center = (videoTop + videoBottom) / 2;
        const dist = Math.abs(center - viewportCenter);
        if (
          center >= CENTER_BAND_TOP &&
          center <= CENTER_BAND_BOTTOM &&
          dist < centerDist
        ) {
          centerDist = dist;
          centerKey = key;
        }
      }

      // Hysteresis thresholds to prevent jitter/jumps
      const SWITCH_IN_THRESHOLD = 0.7; // new video must be ≥70% visible
      const HOLD_THRESHOLD = 0.25; // keep current while ≥25% visible
      const PAUSE_THRESHOLD = 0.12; // pause only when <12% visible
      const MIN_SWITCH_INTERVAL = 900; // ms between switches

      // Keep current playing if it still has reasonable visibility
      if (currentlyVisibleVideo) {
        const cur = contentLayoutsRef.current[currentlyVisibleVideo];
        if (cur) {
          const curTop = cur.y;
          const curBottom = cur.y + cur.height;
          const iTop = Math.max(viewportTop, curTop);
          const iBottom = Math.min(viewportBottom, curBottom);
          const curVisible = Math.max(0, iBottom - iTop);
          const curRatio = cur.height > 0 ? curVisible / cur.height : 0;
          // If current is still reasonably visible, do nothing
          if (curRatio >= HOLD_THRESHOLD) {
            // Do nothing – avoid jumping while current is still reasonably visible
            return;
          }
        }
      }

      // Rate-limit switching
      const now = Date.now();
      if (now - lastSwitchTimeRef.current < MIN_SWITCH_INTERVAL) {
        return; // too soon to switch again
      }

      // Choose the target: prefer the center candidate; if none, fall back to max ratio
      let targetKey: string | null = null;
      if (centerKey) {
        targetKey = centerKey;
      } else if (bestKey && bestRatio >= SWITCH_IN_THRESHOLD) {
        targetKey = bestKey;
      }

      if (targetKey && targetKey !== currentlyVisibleVideo) {
        // Verify the target exists and has a URL
        const item = filteredMediaList.find(
          (i) => getContentKey(i) === targetKey
        );
        if (!item || !item.fileUrl) return; // do not jump

        console.log(
          `🎬 Scroll autoplay → ${targetKey} (center-preferred) (dir: ${scrollDirection})`
        );
        pauseAllMedia();
        setCurrentlyVisibleVideo(targetKey);
        playMedia(targetKey, "video");
        lastSwitchTimeRef.current = now;
        return;
      }

      // If nothing meets threshold and current is mostly out of view, pause
      if (!bestKey || bestRatio < PAUSE_THRESHOLD) {
        if (currentlyVisibleVideo) {
          console.log("⏸️ Pausing – no sufficiently visible video");
          pauseAllMedia();
          setCurrentlyVisibleVideo(null);
        }
      }
    },
    [
      isAutoPlayEnabled,
      currentlyVisibleVideo,
      pauseAllMedia,
      playMedia,
      scrollDirection,
    ]
  );

  // Enhanced scroll behavior with auto-pause functionality
  const handleScroll = useCallback(
    (event: any) => {
      const { contentOffset } = event.nativeEvent;
      const scrollY = contentOffset.y;
      lastScrollYRef.current = scrollY;

      // Set scrolling state
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set timeout to detect when scrolling stops (shorter delay for responsiveness)
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        // Manual video play is still allowed during and after scrolling
      }, 100) as any; // Reduced to 100ms for better responsiveness

      // Real-time video control during scrolling
      handleVideoVisibilityChange(scrollY);

      // Enhanced auto-pause logic for all media types
      const screenHeight = Dimensions.get("window").height;
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;

      const viewportCenter = (viewportTop + viewportBottom) / 2;

      // ✅ Enhanced auto-pause: Check ALL playing videos (including those not yet in layout)
      // This ensures most recent videos are also paused when scrolled past
      const allPlayingVideoKeys = Object.keys(playingVideos).filter(
        (key) => playingVideos[key] === true
      );
      
      // Also check the global currentlyPlayingVideo
      if (currentlyPlayingVideo && !allPlayingVideoKeys.includes(currentlyPlayingVideo)) {
        allPlayingVideoKeys.push(currentlyPlayingVideo);
      }

      // Track if we need to pause any video
      let shouldPauseAnyVideo = false;

      // Check each playing video
      allPlayingVideoKeys.forEach((key) => {
        const layout = contentLayoutsRef.current[key];
        
        // If layout exists, check visibility
        if (layout && layout.type === "video") {
          const videoTop = layout.y;
          const videoBottom = layout.y + layout.height;

          // Calculate visibility ratio
          const intersectionTop = Math.max(viewportTop, videoTop);
          const intersectionBottom = Math.min(viewportBottom, videoBottom);
          const visibleHeight = Math.max(
            0,
            intersectionBottom - intersectionTop
          );
          const visibilityRatio =
            layout.height > 0 ? visibleHeight / layout.height : 0;

          // ✅ More aggressive pause: less than 30% visible OR completely out of view
          const isCompletelyOutOfView =
            videoBottom < viewportTop || videoTop > viewportBottom;
          const shouldPause = visibilityRatio < 0.3 || isCompletelyOutOfView;

          if (shouldPause && isVideoPlaying(key)) {
            console.log(
              `🎬 Auto-pause: Pausing video ${key} - visibility: ${(
                visibilityRatio * 100
              ).toFixed(1)}%, out of view: ${isCompletelyOutOfView}`
            );
            shouldPauseAnyVideo = true;

            // Remove from hovered videos if it was hover-based
            if (hoveredVideos.has(key)) {
              setHoveredVideos((prev) => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
              });
            }
          }
        } else if (isVideoPlaying(key)) {
          // ✅ If video is playing but layout not tracked yet, check if we've scrolled significantly
          // This catches most recent videos that haven't had their layout measured yet
          const screenHeight = Dimensions.get("window").height;
          
          // If we've scrolled down more than 1.5 screen heights, we've likely scrolled past the video
          // This is especially important for most recent videos at the top of the feed
          if (scrollY > screenHeight * 1.5) {
            console.log(
              `🎬 Auto-pause: Pausing video ${key} - layout not tracked yet, scrolled past (scrollY: ${scrollY.toFixed(0)}, threshold: ${(screenHeight * 1.5).toFixed(0)})`
            );
            shouldPauseAnyVideo = true;
          }
        }
      });

      // ✅ Pause all media if any video should be paused
      if (shouldPauseAnyVideo) {
        pauseAllMedia();
      }

      // Auto-pause audio/music that are scrolled out of view
      Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
        if (layout.type === "music") {
          const musicTop = layout.y;
          const musicBottom = layout.y + layout.height;

          // Calculate visibility ratio
          const intersectionTop = Math.max(viewportTop, musicTop);
          const intersectionBottom = Math.min(viewportBottom, musicBottom);
          const visibleHeight = Math.max(
            0,
            intersectionBottom - intersectionTop
          );
          const visibilityRatio =
            layout.height > 0 ? visibleHeight / layout.height : 0;

          // Auto-pause if music is less than 30% visible
          const shouldPause = visibilityRatio < 0.3;

          // Check both local audio state and global media store
          const isLocallyPlaying = playingAudioId === key;
          const isGloballyPlaying = playingVideos[key] || false;

          if (shouldPause && (isLocallyPlaying || isGloballyPlaying)) {
            console.log(
              `🎵 Auto-pause: Pausing music ${key} - visibility: ${(
                visibilityRatio * 100
              ).toFixed(1)}%`
            );
            // Pause both local and global audio
            pauseAllAudio();
            pauseMedia(key);
          }
        }
      });
    },
    [
      handleVideoVisibilityChange,
      isAutoPlayEnabled,
      currentlyVisibleVideo,
      playMedia,
      playingVideos,
      playingAudioId,
      hoverBasedAutoplay,
      hoveredVideos,
      pauseAllMedia,
      pauseAllAudio,
    ]
  );

  const handleScrollEnd = useCallback(() => {
    console.log("📱 Scroll ended, finalizing auto-pause cleanup");
    const scrollY = lastScrollYRef.current;
    const screenHeight = Dimensions.get("window").height;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + screenHeight;

    // Final cleanup for all media types when scrolling stops
    Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
      if (layout.type === "video") {
        const videoTop = layout.y;
        const videoBottom = layout.y + layout.height;

        // Calculate final visibility ratio
        const intersectionTop = Math.max(viewportTop, videoTop);
        const intersectionBottom = Math.min(viewportBottom, videoBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const visibilityRatio =
          layout.height > 0 ? visibleHeight / layout.height : 0;

        // Final check: pause videos that are less than 20% visible
        if (visibilityRatio < 0.2 && isVideoPlaying(key)) {
          console.log(
            `🎬 Final cleanup: Pausing video ${key} - visibility: ${(
              visibilityRatio * 100
            ).toFixed(1)}%`
          );
          pauseAllMedia();

          // Remove from hovered videos
          if (hoveredVideos.has(key)) {
            setHoveredVideos((prev) => {
              const newSet = new Set(prev);
              newSet.delete(key);
              return newSet;
            });
          }
        }
      } else if (layout.type === "music") {
        const musicTop = layout.y;
        const musicBottom = layout.y + layout.height;

        // Calculate final visibility ratio
        const intersectionTop = Math.max(viewportTop, musicTop);
        const intersectionBottom = Math.min(viewportBottom, musicBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const visibilityRatio =
          layout.height > 0 ? visibleHeight / layout.height : 0;

        // Check both local audio state and global media store
        const isLocallyPlaying = playingAudioId === key;
        const isGloballyPlaying = playingVideos[key] || false;

        // Final check: pause music that is less than 30% visible
        if (visibilityRatio < 0.3 && (isLocallyPlaying || isGloballyPlaying)) {
          console.log(
            `🎵 Final cleanup: Pausing music ${key} - visibility: ${(
              visibilityRatio * 100
            ).toFixed(1)}%`
          );
          // Pause both local and global audio
          pauseAllAudio();
          pauseMedia(key);
        }
      }
    });

    // Manual video play remains available after scrolling ends
  }, [
    playingAudioId,
    pauseAllAudio,
    playingVideos,
    hoverBasedAutoplay,
    hoveredVideos,
    pauseAllMedia,
  ]);

  const handleContentLayout = useCallback(
    (event: any, key: string, type: "video" | "music", uri?: string) => {
      const { y, height } = event.nativeEvent.layout;
      contentLayoutsRef.current[key] = { y, height, type, uri };

      console.log(
        `📱 Layout tracked: ${key} (${type}) at y=${Math.round(
          y
        )}, height=${Math.round(height)}`
      );

      // No automatic video start on layout - manual play still works
      // Videos will only play when user clicks the play button
    },
    [isAutoPlayEnabled, currentlyVisibleVideo, playMedia]
  );


  // Render content by type
  const renderContentByType = useCallback(
    (item: MediaItem, index: number) => {
      const key = getContentKey(item);
      const contentId = item._id || key;
      const modalKey = key; // Use the same key for modalKey to ensure consistency

      switch (item.contentType) {
        case "video":
        case "videos":
        case "sermon":
          const backendUserFavorites = { [key]: getUserLikeState(contentId) };
          const backendGlobalFavoriteCounts = {
            [key]: getLikeCount(contentId),
          };

          return (
            <VideoCard
              key={key}
              video={item}
              index={index}
              modalKey={modalKey}
              contentStats={contentStats}
              userFavorites={backendUserFavorites}
              globalFavoriteCounts={backendGlobalFavoriteCounts}
              playingVideos={playingVideos}
              mutedVideos={mutedVideos}
              progresses={progresses}
              videoVolume={videoVolume}
              currentlyVisibleVideo={currentlyVisibleVideo}
              onVideoTap={handleVideoTap}
              onTogglePlay={togglePlay}
              onToggleMute={toggleVideoMute}
              onFavorite={handleFavorite}
              onComment={handleComment}
              onSave={handleSave}
              onDownload={handleDownloadPress}
              onShare={handleShare}
              onModalToggle={toggleModal}
              modalVisible={modalVisible}
              comments={comments}
              checkIfDownloaded={checkIfDownloaded}
              getContentKey={getContentKey}
              getTimeAgo={getTimeAgo}
              getUserDisplayNameFromContent={getUserDisplayNameFromContent}
              getUserAvatarFromContent={getUserAvatarFromContent}
              onLayout={handleContentLayout}
              isAutoPlayEnabled={isAutoPlayEnabled}
            />
          );

        case "audio":
        case "music":
          return (
            <MusicCard
              key={key}
              audio={item}
              index={index}
              onLike={() => handleFavorite(key, item)}
              onComment={() => handleComment(key, item)}
              onSave={() => handleSave(key, item)}
              onShare={() => handleShare(key, item)}
              onDownload={() => handleDownloadPress(item)}
              onPlay={playAudio}
              isPlaying={playingAudioId === `music-${item._id || index}`}
              progress={audioProgressMap[`music-${item._id || index}`] || 0}
              onLayout={handleContentLayout}
              onPause={pauseAllAudio}
            />
          );

        case "image":
        case "ebook":
        case "books":
          return (
            <EbookCard
              key={key}
              ebook={item}
              index={index}
              onLike={() => handleFavorite(key, item)}
              onComment={() => handleComment(key, item)}
              onSave={() => handleSave(key, item)}
              onShare={() => handleShare(key, item)}
              onDownload={() => handleDownloadPress(item)}
              checkIfDownloaded={checkIfDownloaded}
            />
          );

        default:
          // Treat any other content type as an Ebook for display purposes
          return (
            <EbookCard
              key={key}
              ebook={item}
              index={index}
              onLike={() => handleFavorite(key, item)}
              onComment={() => handleComment(key, item)}
              onSave={() => handleSave(key, item)}
              onShare={() => handleShare(key, item)}
              onDownload={() => handleDownloadPress(item)}
              checkIfDownloaded={checkIfDownloaded}
            />
          );
      }
    },
    [
      getContentKey,
      getUserLikeState,
      getLikeCount,
      contentStats,
      playingVideos,
      videoVolume,
      currentlyVisibleVideo,
      handleVideoTap,
      handleFavorite,
      handleComment,
      handleSave,
      handleShare,
      handleDownloadPress,
      modalVisible,
      comments,
      checkIfDownloaded,
      getTimeAgo,
      getUserDisplayNameFromContent,
      getUserAvatarFromContent,
      playAudio,
      playingAudioId,
      audioProgressMap,
    ]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      try {
        pauseAllMedia();
      } catch {}
    };
  }, []);

  // Pause all media when component loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log("📱 Pausing all media on focus loss");
        try {
          pauseAllMedia();
        } catch {}
        setCurrentlyVisibleVideo(null);
        pauseAllAudio();
      };
    }, [pauseAllAudio])
  );

  // Loading state
  if (loading && !hasContent) {
    return (
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
          <View
            style={{
              paddingHorizontal: UI_CONFIG.SPACING.MD,
              marginBottom: UI_CONFIG.SPACING.MD,
            }}
          >
            <Skeleton height={22} width={160} borderRadius={6} />
          </View>
          <View style={{ marginHorizontal: UI_CONFIG.SPACING.MD }}>
            <Skeleton variant="card" />
          </View>
        </View>

        <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
          <View
            style={{
              paddingHorizontal: UI_CONFIG.SPACING.MD,
              marginBottom: UI_CONFIG.SPACING.MD,
            }}
          >
            <Skeleton height={22} width={120} borderRadius={6} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={`h-skel-${i}`} style={{ width: 154, marginRight: 16 }}>
                <Skeleton variant="thumbnail" />
              </View>
            ))}
          </ScrollView>
        </View>

        <View
          style={{
            marginTop: UI_CONFIG.SPACING.LG,
            paddingHorizontal: UI_CONFIG.SPACING.MD,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <View
              key={`card-skel-${i}`}
              style={{ marginBottom: UI_CONFIG.SPACING.LG }}
            >
              <Skeleton variant="card" />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Error state
  if (error && !hasContent) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: UI_CONFIG.SPACING.LG,
        }}
      >
        <Text
          style={{
            color: UI_CONFIG.COLORS.ERROR,
            textAlign: "center",
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

  // Empty state
  if (filteredMediaList.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: UI_CONFIG.SPACING.LG,
        }}
      >
        <Text
          style={{
            color: UI_CONFIG.COLORS.TEXT_SECONDARY,
            textAlign: "center",
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
          }}
        >
          {contentType === "ALL"
            ? "No content available yet."
            : `No ${contentType.toLowerCase()} content available yet.`}
        </Text>
      </View>
    );
  }

  return (
    <ContentErrorBoundary>
      <View style={{ flex: 1 }}>
        {showSuccessCard && (
          <SuccessCard
            message={successMessage}
            onClose={() => setShowSuccessCard(false)}
            duration={3000}
          />
        )}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[UI_CONFIG.COLORS.PRIMARY]}
              tintColor={UI_CONFIG.COLORS.PRIMARY}
            />
          }
          showsVerticalScrollIndicator={true}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={8}
        >
          {/* Most Recent Section */}
          {mostRecentItem && (
            <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                  fontWeight: "600",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  paddingHorizontal: UI_CONFIG.SPACING.MD,
                  marginBottom: UI_CONFIG.SPACING.MD,
                }}
              >
                Most Recent
              </Text>
              {renderContentByType(mostRecentItem, 0)}
            </View>
          )}

          {/* All Content Section (split into first four, then Recommended Live, then rest) */}
          <View style={{ marginTop: UI_CONFIG.SPACING.XL }}>
            <Text
              style={{
                fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                fontWeight: "600",
                color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                paddingHorizontal: UI_CONFIG.SPACING.MD,
                marginBottom: UI_CONFIG.SPACING.LG,
              }}
            >
              {contentType === "ALL" ? "All Content" : `${contentType} Content`}{" "}
              ({filteredMediaList.length} items)
            </Text>

            {/* First four big cards (excluding Most Recent if duplicated) */}
            {(() => {
              const remaining = (filteredMediaList || []).filter(
                (item) => !mostRecentItem || item._id !== mostRecentItem._id
              );
              const firstFour = remaining.slice(0, 4);
              const nextFour = remaining.slice(4, 8);
              const rest = remaining.slice(8);
              return (
                <>
                  {firstFour.map((item, index) =>
                    renderContentByType(item, index)
                  )}


                  {/* Gap before next four cards */}
                  <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />

                  {/* Next four cards */}
                  {nextFour.map((item, index) =>
                    renderContentByType(item, index + firstFour.length)
                  )}

                  {/* Live Section - Coming Soon (after 7th content) */}
                  {(contentType === "ALL" || contentType === "live") && (
                    <>
                      <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />
                      <View
                        style={{
                          marginHorizontal: UI_CONFIG.SPACING.MD,
                          paddingHorizontal: 16,
                          paddingVertical: 32,
                          backgroundColor: "#F9FAFB",
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "#E5E7EB",
                          borderStyle: "dashed",
                          minHeight: 200,
                        }}
                      >
                        <View
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: "#DC2626",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: 16,
                            position: "relative",
                          }}
                        >
                          <Ionicons name="radio" size={40} color="#FFFFFF" />
                          {/* Live indicator dot */}
                          <View
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: "#FFFFFF",
                              borderWidth: 2,
                              borderColor: "#DC2626",
                            }}
                          />
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 8,
                            justifyContent: "center",
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: "#DC2626",
                              paddingHorizontal: 12,
                              paddingVertical: 4,
                              borderRadius: 12,
                              marginRight: 8,
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: "#FFFFFF",
                                marginRight: 6,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color: "#FFFFFF",
                                fontFamily: "Rubik-Bold",
                                letterSpacing: 0.5,
                              }}
                            >
                              LIVE
                            </Text>
                          </View>
                          <Text
                            style={{
                              fontSize: 18,
                              fontWeight: "600",
                              color: "#1D2939",
                              textAlign: "center",
                              fontFamily: "Rubik-SemiBold",
                            }}
                          >
                            Coming Soon
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#6B7280",
                            textAlign: "center",
                            lineHeight: 20,
                            paddingHorizontal: 16,
                            fontFamily: "Rubik",
                          }}
                        >
                          We're working on bringing you live streaming content. Stay tuned for updates!
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Trending Contents temporarily removed */}

                  {/* Gap before remaining content */}
                  <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />

                  {/* Render the rest of All Content */}
                  {rest.map((item, index) =>
                    renderContentByType(
                      item,
                      index + firstFour.length + nextFour.length
                    )
                  )}
                </>
              );
            })()}
          </View>

          {/* Loading indicator for refresh */}
          {loading && hasContent && (
            <View
              style={{ padding: UI_CONFIG.SPACING.LG, alignItems: "center" }}
            >
              <ActivityIndicator
                size="small"
                color={UI_CONFIG.COLORS.PRIMARY}
              />
              <Text
                style={{
                  marginTop: UI_CONFIG.SPACING.SM,
                  color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                }}
              >
                Loading content...
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </ContentErrorBoundary>
  );
};
