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
import CopyrightFreeSongs from "../../../app/components/CopyrightFreeSongs";
import SuccessCard from "../../../app/components/SuccessCard";
import HymnMiniCard, {
    HymnItem,
} from "../../../app/home/components/HymnMiniCard";
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
  const playMedia = (key: string, type: "video" | "audio") => {
    if (type === "video") {
      globalVideoStore.playVideoGlobally(key);
    } else {
      globalMediaStore.playMediaGlobally(key, "audio");
    }
  };

  const pauseMedia = (key: string) => {
    globalVideoStore.pauseVideo(key);
  };

  const pauseAllMedia = () => {
    globalVideoStore.pauseAllVideos();
  };

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
  
  // Track deleted media IDs
  const [deletedMediaIds, setDeletedMediaIds] = useState<Set<string>>(new Set());
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [hymns, setHymns] = useState<HymnItem[]>([]);
  const [loadingHymns, setLoadingHymns] = useState(false);

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

    const transformed = sourceData.map(transformApiResponseToMediaItem);
    // Filter out deleted items
    return transformed.filter(item => !deletedMediaIds.has(item._id || ""));
  }, [allContent, defaultContent, deletedMediaIds]);

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

  // Fetch local hymns JSON; fallback to Hymnary sample (MVP)
  useEffect(() => {
    const fetchHymns = async () => {
      try {
        setLoadingHymns(true);
        try {
          const mod = await import("../../../assets/hymns.json");
          const local = (mod as any).default as HymnItem[];
          if (Array.isArray(local) && local.length) {
            setHymns(local);
            return;
          }
        } catch {}

        // Fallback to external sample
        try {
          const res = await fetch(
            "https://hymnary.org/api/scripture?reference=Psalm+136"
          );
          const json = await res.json();
          const items = Object.values(json || {})
            .slice(0, 10)
            .map((h: any) => ({
              id: h.title || Math.random().toString(36).slice(2),
              title: h.title,
              author: h.author || h.paraphraser || h.translator || "Unknown",
              meter: h.meter,
              refs: String(h["scripture references"] || "").trim(),
            }));
          setHymns(items as HymnItem[]);
        } catch {}
      } catch (e) {
        console.warn("Hymnary fetch failed:", e);
      } finally {
        setLoadingHymns(false);
      }
    };
    fetchHymns();
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

  const handleLike = useCallback(
    async (contentId: string, contentType: string) => {
      try {
        if (socketManager && socketManager.isConnected()) {
          try {
            socketManager.sendLike(contentId, "media");
          } catch (socketError) {
            console.warn(
              "⚠️ Real-time like failed, continuing with API call:",
              socketError
            );
          }
        }
        await toggleLike(contentId, contentType);
      } catch (error) {
        console.error("❌ Like error:", error);
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

  const togglePlay = (key: string) => {
    console.log("🎮 togglePlay called in AllContentTikTok with key:", key);
    console.log("🎮 Current playing state:", playingVideos[key]);

    // Clear any autoplay state and play the video immediately
    setCurrentlyVisibleVideo(key);

    // ✅ Use unified media store for consistent video playback
    playMedia(key, "video");

    console.log("✅ Video play request sent for key:", key);
  };

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

      // Auto-pause videos that are scrolled out of view
      Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
        if (layout.type === "video") {
          const videoTop = layout.y;
          const videoBottom = layout.y + layout.height;
          const videoCenter = (videoTop + videoBottom) / 2;

          // Calculate visibility ratio
          const intersectionTop = Math.max(viewportTop, videoTop);
          const intersectionBottom = Math.min(viewportBottom, videoBottom);
          const visibleHeight = Math.max(
            0,
            intersectionBottom - intersectionTop
          );
          const visibilityRatio =
            layout.height > 0 ? visibleHeight / layout.height : 0;

          // Auto-pause if video is less than 20% visible or completely out of view
          const shouldPause =
            visibilityRatio < 0.2 ||
            videoBottom < viewportTop ||
            videoTop > viewportBottom;

          if (shouldPause && isVideoPlaying(key)) {
            console.log(
              `🎬 Auto-pause: Pausing video ${key} - visibility: ${(
                visibilityRatio * 100
              ).toFixed(1)}%`
            );
            pauseAllMedia();

            // Remove from hovered videos if it was hover-based
            if (hoveredVideos.has(key)) {
              setHoveredVideos((prev) => {
                const newSet = new Set(prev);
                newSet.delete(key);
                return newSet;
              });
            }
          }
        }
      });

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

  // Reusable renderer for Hymn mini-cards (matches mini-card UI in design)
  const renderHymnMiniCards = useCallback(() => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
      >
        {loadingHymns
          ? Array.from({ length: 8 }).map((_, i) => (
              <View
                key={`hym-skel-${i}`}
                className="mr-4 w-[154px] flex-col items-center"
              >
                <Skeleton variant="thumbnail" />
                <View className="mt-2 flex flex-col w-full">
                  <Skeleton variant="text" width={"70%"} />
                  <View style={{ height: 6 }} />
                  <Skeleton variant="text" width={"50%"} />
                </View>
              </View>
            ))
          : (hymns || []).map((h) => (
              <HymnMiniCard
                key={h.id}
                item={h}
                onPress={(item) =>
                  router.push({
                    pathname: "/reader/HymnDetail",
                    params: { id: item.id },
                  })
                }
              />
            ))}
      </ScrollView>
    );
  }, [hymns, loadingHymns, router]);

  // Reusable renderer for Recommended Live mini-cards with red LIVE badge
  const renderRecommendedLiveCards = useCallback(() => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
      >
        {loadingHymns ? (
          <View style={{ paddingVertical: 16, alignItems: "center" }}>
            <Text style={{ color: UI_CONFIG.COLORS.TEXT_SECONDARY }}>
              Loading content…
            </Text>
          </View>
        ) : (
          (hymns || []).map((h) => (
            <View
              key={`live-${h.id}`}
              className="mr-4 w-[154px] flex-col items-center"
            >
              <TouchableOpacity
                onPress={() => {
                  // Live content - no navigation for now
                  console.log("Live content tapped:", h.title);
                }}
                className="w-full h-[232px] rounded-2xl overflow-hidden relative"
                activeOpacity={0.9}
              >
                <Image
                  source={require("../../../assets/images/image (7).png")}
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                  }}
                  resizeMode="cover"
                />

                {/* Red LIVE badge */}
                <View className="absolute top-2 left-2 bg-red-600 rounded-md px-2 py-1 flex-row items-center">
                  <View className="w-2 h-2 bg-white rounded-full mr-1" />
                  <Text className="text-white text-[10px] font-rubik font-semibold">
                    LIVE
                  </Text>
                </View>

                <View className="absolute bottom-2 left-2 right-2">
                  <Text
                    className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
                    numberOfLines={2}
                  >
                    {h.title}
                  </Text>
                </View>
              </TouchableOpacity>
              <View className="mt-2 flex flex-col w-full">
                <View className="flex flex-row justify-between items-center">
                  <Text
                    className="text-[12px] text-[#1D2939] font-rubik font-medium"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Minister Joseph Eluwa
                  </Text>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={14}
                    color="#9CA3AF"
                  />
                </View>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="eye" size={12} color="#98A2B3" />
                  <Text
                    className="text-[10px] text-gray-500 ml-1 font-rubik"
                    numberOfLines={1}
                  >
                    500 • 3HRS AGO
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  }, [hymns, loadingHymns, router]);

  // Handle media deletion
  const handleDeleteMedia = useCallback((item: MediaItem) => {
    if (item._id) {
      setDeletedMediaIds(prev => new Set([...prev, item._id!]));
      setSuccessMessage("Media deleted successfully");
      setShowSuccessCard(true);
    }
  }, []);

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
              onDelete={handleDeleteMedia}
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
              onDelete={handleDeleteMedia}
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
              onDelete={handleDeleteMedia}
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
              onDelete={handleDeleteMedia}
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
      handleDeleteMedia,
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

          {/* Hymns section (mini cards) */}
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
              Hymns
            </Text>
            {renderHymnMiniCards()}
          </View>

          {/* Copyright-Free Songs Section - Hide for VIDEO content type */}
          {contentType !== "videos" && (
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
                Copyright-Free Songs
              </Text>
              <CopyrightFreeSongs />
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

                  {/* Insert Recommended Live for you here with red LIVE badge */}
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
                      Recommended Live for you
                    </Text>
                    {renderRecommendedLiveCards()}
                  </View>

                  {/* Gap before next four cards */}
                  <View style={{ marginTop: UI_CONFIG.SPACING.XXL }} />

                  {/* Next four cards */}
                  {nextFour.map((item, index) =>
                    renderContentByType(item, index + firstFour.length)
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
