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
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useCurrentPlayingAudioStore } from "../../../app/store/useCurrentPlayingAudioStore";
import GlobalAudioInstanceManager from "../../../app/utils/globalAudioInstanceManager";

// Shared imports
import { UI_CONFIG } from "../../shared/constants";
import { ContentType, MediaItem } from "../../shared/types";
import {
  categorizeContent,
  devLog,
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
import HymnMiniCard, {
  HymnItem,
} from "../../../app/home/components/HymnMiniCard";
import EbookCard from "./components/EbookCard";
import MusicCard from "./components/MusicCard";
import VideoCard from "./components/VideoCard";

// Import original stores and hooks (these will be bridged)
import { LinearGradient } from "expo-linear-gradient";
import { useCommentModal } from "../../../app/context/CommentModalContext";
import { useUserProfile } from "../../../app/hooks/useUserProfile";
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
  getUserFavorites,
  getUserId,
  getViewed
} from "../../../app/utils/persistentStorage";
import TokenUtils from "../../../app/utils/tokenUtils";

export interface AllContentTikTokProps {
  contentType?: ContentType | "ALL";
}

export const AllContentTikTok: React.FC<AllContentTikTokProps> = ({
  contentType = "ALL",
}) => {
  const router = useRouter();
  const isHymnsTab =
    String(contentType).toLowerCase() === "hymns" ||
    String(contentType).toLowerCase() === "hyms";

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
    refreshAllStatsAfterLogin,
  } = useInteractionStore();

  // User profile for authentication state detection
  const { user } = useUserProfile();

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
  const [hymnSearchQuery, setHymnSearchQuery] = useState("");
  
  // Music section state (only for MUSIC tab) - user uploaded songs only
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [displayMode, setDisplayMode] = useState<"list" | "grid" | "small" | "large">("list");

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
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const isContentReadyRef = useRef<boolean>(false);

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
    return transformed.filter((item) => {
      if (deletedMediaIds.has(item._id || "")) return false;
      // Remove copyright-free catalog items from AllContentTikTok entirely
      const ct = String(item.contentType || "").toLowerCase();
      if (ct === "copyright-free-music") return false;
      return true;
    });
  }, [allContent, defaultContent, deletedMediaIds]);

  // Filter content based on contentType
  const filteredMediaList = useMemo(() => {
    const filtered = filterContentByType(mediaList, contentType);
    devLog.log(`📚 AllContentTikTok: Filtering for contentType="${contentType}"`);
    devLog.log(`📚 AllContentTikTok: Total media items: ${mediaList.length}`);
    devLog.log(`📚 AllContentTikTok: Filtered items: ${filtered.length}`);
    devLog.log(`📚 AllContentTikTok: Ebook items in filtered list:`, 
      filtered.filter(item => {
        const ct = (item.contentType || "").toLowerCase();
        return ct === "ebook" || ct === "e-books" || ct === "books" || ct === "pdf" || (item.fileUrl && /\.pdf$/i.test(item.fileUrl));
      }).map(item => ({ title: item.title, contentType: item.contentType }))
    );
    return filtered;
  }, [mediaList, contentType]);

  // Categorize content
  const categorizedContent = useMemo(() => {
    const categorized = categorizeContent(filteredMediaList);
    devLog.log(`📚 AllContentTikTok: Categorized content - ebooks: ${categorized.ebooks.length}, videos: ${categorized.videos.length}, music: ${categorized.music.length}, sermons: ${categorized.sermons.length}`);
    if (categorized.ebooks.length > 0) {
      devLog.log(`📚 AllContentTikTok: Ebook items:`, categorized.ebooks.map(e => ({ title: e.title, contentType: e.contentType })));
    }
    return categorized;
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

  // Memoize filtered content lists for rendering
  // In MUSIC tab, exclude audio items (they're shown in the dedicated music section)
  const filteredContentLists = useMemo(() => {
    let remaining = (filteredMediaList || []).filter(
      (item) => !mostRecentItem || item._id !== mostRecentItem._id
    );
    
    // In MUSIC tab, exclude audio/music items from "All Content" section
    if ((String(contentType) === "MUSIC" || String(contentType) === "music") && contentType !== "ALL") {
      remaining = remaining.filter(
        (item) => item.contentType !== "audio" && item.contentType !== "music"
      );
    }
    
    return {
      firstFour: remaining.slice(0, 4),
      nextFour: remaining.slice(4, 8),
      rest: remaining.slice(8),
    };
  }, [filteredMediaList, mostRecentItem, contentType]);

  // Update refs when state changes
  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  useEffect(() => {
    soundMapRef.current = soundMap;
  }, [soundMap]);

  // Sync with global audio manager
  useEffect(() => {
    const audioManager = GlobalAudioInstanceManager.getInstance();
    
    // Subscribe to global audio state changes
    const unsubscribe = audioManager.subscribe((playingId) => {
      if (playingId !== playingAudioId) {
        setPlayingAudioId(playingId);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [playingAudioId]);

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
        // console.log("🔌 AllContentTikTok: Initializing Socket.IO...");

        const authToken = await TokenUtils.getAuthToken();
        const tokenInfo = await TokenUtils.getTokenInfo();

        // console.log("🔑 Token retrieval:", {
        //   ...tokenInfo,
        //   tokenPreview: authToken
        //     ? TokenUtils.getTokenPreview(authToken)
        //     : "null",
        // });

        if (!authToken || authToken.trim() === "") {
          // console.log(
          //   "⚠️ No valid auth token found, skipping Socket.IO initialization"
          // );
          return;
        }

        if (!TokenUtils.isValidJWTFormat(authToken)) {
          // console.warn(
          //   "⚠️ Invalid token format detected, skipping Socket.IO initialization"
          // );
          return;
        }

        const manager = new SocketManager({
          serverUrl: "https://jevahapp-backend.onrender.com",
          authToken,
        });

        const socket = (manager as any).socket;
        if (socket) {
          socket.on("content-reaction", (data: any) => {
            // console.log("📡 Real-time like update:", data);
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
            // console.log("📡 Real-time comment update:", data);
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
          // console.log("✅ Socket.IO initialized successfully");
        } catch (connectError) {
          // console.warn(
          //   "⚠️ Socket connection failed, continuing without real-time features:",
          //   connectError
          // );
        }
      } catch (error) {
        // console.error("❌ Failed to initialize Socket.IO:", error);
      }
    };

    initializeSocket();

    return () => {
      if (socketManager) {
        socketManager.disconnect();
      }
    };
  }, []);

  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  // User uploaded songs (current user only) - Only for MUSIC tab
  const userUploadedSongs = useMemo(() => {
    if (!(String(contentType) === "MUSIC" || String(contentType) === "music") || contentType === "ALL") {
      return [] as MediaItem[];
    }

    const currentUserId = user?._id || (user as any)?.id || null;
    if (!currentUserId) return [] as MediaItem[];

    const query = (searchQuery || "").toLowerCase().trim();

    const audioItems = (filteredMediaList || []).filter((item) => {
      const ct = String(item.contentType || "").toLowerCase();
      const isAudio = ct === "audio" || ct === "music";
      const isCopyrightFree = ct === "copyright-free-music";
      if (!isAudio || isCopyrightFree) return false;

      const uploadedBy: any = (item as any).uploadedBy;
      const uploaderId =
        typeof uploadedBy === "string"
          ? uploadedBy
          : uploadedBy?._id || uploadedBy?.id;
      if (!uploaderId) return false;
      if (String(uploaderId) !== String(currentUserId)) return false;

      if (!query) return true;
      const title = String(item.title || "").toLowerCase();
      const speaker = String((item as any).speaker || "").toLowerCase();
      const displayName = String(getUserDisplayNameFromContent(item) || "").toLowerCase();
      return title.includes(query) || speaker.includes(query) || displayName.includes(query);
    });

    return audioItems;
  }, [contentType, filteredMediaList, user, searchQuery, getUserDisplayNameFromContent]);


  const filteredHymns = useMemo(() => {
    const q = hymnSearchQuery.trim().toLowerCase();
    if (!q) return hymns || [];
    return (hymns || []).filter((h) => {
      const title = String(h.title || "").toLowerCase();
      const author = String(h.author || "").toLowerCase();
      const refs = String(h.refs || "").toLowerCase();
      const meter = String(h.meter || "").toLowerCase();
      return (
        title.includes(q) ||
        author.includes(q) ||
        refs.includes(q) ||
        meter.includes(q)
      );
    });
  }, [hymns, hymnSearchQuery]);

  // Load content stats for all visible items so user-liked/bookmarked states persist
  const mapContentTypeToBackend = useCallback((type?: string) => {
    const normalized = (type || "").toLowerCase();
    switch (normalized) {
      case "sermon":
      case "devotional":
        return "devotional";
      case "ebook":
      case "e-books":
      case "books":
      case "image":
        return "ebook";
      case "music":
      case "audio":
      case "live":
      case "video":
      case "videos":
      default:
        return "media";
    }
  }, []);

  // Track previous user state to detect login
  const previousUserIdRef = useRef<string | null>(null);

  // Refresh stats when user becomes authenticated (after login)
  useEffect(() => {
    const currentUserId = user?._id || user?.id || null;
    const previousUserId = previousUserIdRef.current;

    // If user just logged in (went from null/undefined to having an ID)
    if (!previousUserId && currentUserId && filteredMediaList.length > 0) {
      // console.log("🔄 User just logged in, refreshing interaction stats for visible content...");
      // Refresh stats for currently visible content
      // Refresh all stats after login (no arguments needed)
      refreshAllStatsAfterLogin().catch((error) => {
        // console.warn("⚠️ Failed to refresh stats after login:", error);
      });
    }

    // Update ref for next comparison
    previousUserIdRef.current = currentUserId;
  }, [user, filteredMediaList, refreshAllStatsAfterLogin]);

  useEffect(() => {
    const loadStatsForVisibleContent = async () => {
      const items = filteredMediaList || [];
      if (items.length === 0) return;

      const groupedIds = items.reduce((acc, item) => {
        const id = item?._id;
        if (!id) return acc;
        const backendType = mapContentTypeToBackend(item?.contentType);
        if (!acc[backendType]) {
          acc[backendType] = [];
        }
        acc[backendType].push(id);
        return acc;
      }, {} as Record<string, string[]>);

      const store = useInteractionStore.getState();

      for (const [backendType, ids] of Object.entries(groupedIds)) {
        if (!ids?.length) continue;
        try {
          await store.loadBatchContentStats(ids, backendType);
        } catch (error) {
          console.warn(
            `⚠️ Batch stats failed for type="${backendType}", falling back to per-item`,
            error
          );
          for (const id of ids) {
            try {
              await loadContentStats(id, backendType);
            } catch (fallbackError) {
              console.warn(
                `⚠️ Failed to load stats for ${backendType} ${id}:`,
                fallbackError
              );
            }
          }
        }
      }
    };

    loadStatsForVisibleContent();
  }, [filteredMediaList, loadContentStats, mapContentTypeToBackend]);

  // Load persisted data including likes (like reels does)
  useEffect(() => {
    const loadAllData = async () => {
      // console.log("📱 AllContent: Loading persisted data...");
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
        
        // Load persisted likes and merge with backend state
        if (mediaList.length > 0) {
          try {
            const userId = await getUserId();
            const persistedFavorites = await getUserFavorites(userId);
            
            // Merge persisted likes into contentStats
            const store = useInteractionStore.getState();
            for (const item of mediaList) {
              const contentId = item._id || getContentKey(item);
              if (persistedFavorites[contentId]) {
                // Update store with persisted like state
                store.mutateStats(contentId, (s) => ({
                  userInteractions: {
                    ...s.userInteractions,
                    liked: true, // Persisted state takes priority
                  },
                }));
              }
            }
            
            console.log(
              `✅ AllContent: Loaded ${
                mediaList.length
              } media items, ${Object.keys(stats || {}).length} stats, and ${Object.keys(persistedFavorites).length} persisted likes`
            );
          } catch (persistError) {
            console.warn("⚠️ Failed to load persisted likes:", persistError);
          }
        }
      } catch (error) {
        console.error("❌ Error loading AllContent data:", error);
      } finally {
        setIsLoadingContent(false);
        // Mark content as ready after loading completes
        isContentReadyRef.current = true;
      }
    };

    if (mediaList.length > 0) {
      loadAllData();
    } else {
      setIsLoadingContent(false);
      // Mark as ready even if no content (prevents blocking)
      isContentReadyRef.current = true;
    }
  }, [mediaList.length]);

  // Helper functions to get interaction state - merge persisted and backend state
  // Synchronous version for immediate UI updates (persisted state is loaded on mount)
  const getUserLikeState = useCallback((contentId: string): boolean => {
    // Check backend state (which should have persisted state merged on mount)
    const stats = contentStats[contentId];
    return stats?.userInteractions?.liked || false;
  }, [contentStats]);

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
      // console.log("🚨 Audio is already loading, skipping...");
      return;
    }

    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      // console.warn("🚨 Audio URI is not a valid HTTP/HTTPS URL:", { uri, id });
      return;
    }

    // console.log(`🎵 Playing audio "${id}":`, {
    //   audioUri: uri,
    //   id,
    //   uriLength: uri.length,
    // });

    setIsLoadingAudio(true);
    const audioManager = GlobalAudioInstanceManager.getInstance();
    const { setCurrentAudio } = useCurrentPlayingAudioStore.getState();

    try {
      playMedia(id, "audio");

      // Find the media item for this audio
      const mediaItem = filteredMediaList.find((item) => item._id === id);

      // Check if this audio is already playing
      if (audioManager.isPlaying(id)) {
        // If playing, pause it
        await audioManager.pauseAudio(id);
        setPlayingAudioId(null);
        setCurrentAudio(null, null);
        setIsLoadingAudio(false);
        return;
      }

      // Check if there's an existing sound instance
      let sound = audioManager.getAudioInstance(id);
      const resumePos = pausedAudioMap[id] ?? 0;

      // If sound exists, check if it's still valid
      if (sound) {
        try {
          const status = await sound.getStatusAsync();
          if (!status.isLoaded) {
            // Sound exists but is not loaded, unload it first
            try {
              await sound.unloadAsync();
            } catch {}
            sound = undefined;
          }
        } catch (error) {
          // Sound instance is invalid, clear it
          console.warn("⚠️ Existing sound instance is invalid, creating new one");
          sound = undefined;
        }
      }

      if (!sound) {
        // Clean up any old instance in our local map
        if (soundMap[id]) {
          try {
            const oldSound = soundMap[id];
            const status = await oldSound.getStatusAsync();
            if (status.isLoaded) {
              await oldSound.stopAsync();
              await oldSound.unloadAsync();
            }
          } catch (error) {
            // Ignore errors
          }
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }

        // Create new sound instance
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: false, // Don't auto-play, let manager handle it
            isMuted: audioMuteMap[id] ?? false,
            positionMillis: resumePos,
          }
        );
        sound = newSound;
        audioManager.registerAudio(id, sound);
        setSoundMap((prev) => ({ ...prev, [id]: sound! }));
        
        // Wait for sound to be loaded
        let loaded = false;
        let attempts = 0;
        while (!loaded && attempts < 10) {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            loaded = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
        }
        
        if (!loaded) {
          throw new Error("Sound failed to load");
        }
      } else {
        // Resume from paused position if needed
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            if (resumePos > 0) {
              await sound.setPositionAsync(resumePos);
            }
          }
        } catch (error) {
          console.warn("⚠️ Error setting position:", error);
        }
      }

      // Use global manager to play (this will stop all other audio)
      await audioManager.playAudio(id, sound, true);
      setPlayingAudioId(id);
      
      // Set current playing audio in store for mini player
      if (mediaItem) {
        // console.log("🎵 Setting current audio in store:", {
        //   id: id,
        //   title: mediaItem.title,
        //   audioId: id,
        // });
        setCurrentAudio(mediaItem, id);
      } else {
        // console.warn("⚠️ MediaItem not found for audio ID:", id);
      }

      // Get initial status for duration/progress
      const initial = await sound.getStatusAsync();
      if (initial.isLoaded && typeof initial.durationMillis === "number") {
        const safeDur = initial.durationMillis || 1;
        const currentPos = initial.positionMillis || 0;
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));
        setAudioProgressMap((prev) => ({
          ...prev,
          [id]: currentPos / safeDur,
        }));
      }

      // Set up playback status updates
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded || typeof status.durationMillis !== "number")
          return;
        const safeDur = status.durationMillis || 1;
        const currentPos = status.positionMillis || 0;
        setAudioProgressMap((prev) => ({
          ...prev,
          [id]: currentPos / safeDur,
        }));
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));

        // Save paused position
        if (status.isLoaded && !status.isPlaying && currentPos > 0) {
          setPausedAudioMap((prev) => ({ ...prev, [id]: currentPos }));
        }

        // Handle playback completion
        if (status.didJustFinish) {
          try {
            await audioManager.unregisterAudio(id);
            setSoundMap((prev) => {
              const u = { ...prev };
              delete u[id];
              return u;
            });
            setPlayingAudioId((curr) => (curr === id ? null : curr));
            setPausedAudioMap((prev) => ({ ...prev, [id]: 0 }));
            setAudioProgressMap((prev) => ({ ...prev, [id]: 0 }));
            // Clear current audio in store
            setCurrentAudio(null, null);
          } catch (error) {
            console.warn("⚠️ Error cleaning up audio:", error);
          }
        }
      });
    } catch (err) {
      console.error("❌ Audio playback error:", err);
      setPlayingAudioId(null);
      setCurrentAudio(null, null);
      try {
        await audioManager.unregisterAudio(id);
      } catch {}
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
      const audioManager = GlobalAudioInstanceManager.getInstance();
      await audioManager.stopAllAudio();
      setPlayingAudioId(null);
    } catch (error) {
      console.warn("⚠️ Error in pauseAllAudio:", error);
    }
  }, []);

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
        devLog.log(`📱 Video tapped to navigate to reels: ${video.title}`);
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
      contentType,
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
      devLog.log("🔄 Comment button clicked for content:", item.title);
      const contentId = item._id || key;
      // Open modal with empty array - backend will load comments immediately
      showCommentModal([], contentId);
    },
    [showCommentModal]
  );

  const handleSave = useCallback(
    async (key: string, item: MediaItem) => {
      try {
        const contentId = item._id || key;
        const contentType = item.contentType || "media";
        const stats = contentStats[contentId];
        const fallbackOptions = {
          initialSaves:
            stats?.saves ??
            getSaveCount(contentId) ??
            item.saves ??
            item.saved ??
            (item as any)?.bookmarkCount ??
            0,
          initialLikes:
            stats?.likes ??
            getLikeCount(contentId) ??
            item.likeCount ??
            item.totalLikes ??
            item.likes ??
            item.favorite ??
            0,
          initialComments:
            stats?.comments ??
            getCommentCount(contentId) ??
            item.commentCount ??
            item.comments ??
            item.comment ??
            0,
          initialViews:
            stats?.views ??
            item.viewCount ??
            item.totalViews ??
            item.views ??
            0,
          initialShares:
            stats?.shares ??
            item.shareCount ??
            item.totalShares ??
            item.shares ??
            0,
          initialLiked:
            stats?.userInteractions?.liked ??
            getUserLikeState(contentId) ??
            false,
          initialShared:
            stats?.userInteractions?.shared ?? false,
          initialViewed:
            stats?.userInteractions?.viewed ?? false,
          initialSaved:
            stats?.userInteractions?.saved ??
            getUserSaveState(contentId) ??
            false,
        };
        const result = await toggleSave(contentId, contentType, fallbackOptions);

        if (result?.saved) {
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
    [toggleSave, getLikeCount, getCommentCount, libraryStore]
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
    // console.log("🎮 togglePlay called in AllContentTikTok with key:", key);
    // console.log("🎮 Current playing state:", playingVideos[key]);

    // Clear any autoplay state and play the video immediately
    setCurrentlyVisibleVideo(key);

    // ✅ Use unified media store for consistent video playback
    playMedia(key, "video");

    // console.log("✅ Video play request sent for key:", key);
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

        // console.log(
        //   `🎬 Scroll autoplay → ${targetKey} (center-preferred) (dir: ${scrollDirection})`
        // );
        pauseAllMedia();
        setCurrentlyVisibleVideo(targetKey);
        playMedia(targetKey, "video");
        lastSwitchTimeRef.current = now;
        return;
      }

      // If nothing meets threshold and current is mostly out of view, pause
      if (!bestKey || bestRatio < PAUSE_THRESHOLD) {
        if (currentlyVisibleVideo) {
          // console.log("⏸️ Pausing – no sufficiently visible video");
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
      try {
        // Safety check for event structure - allow scroll even if content isn't ready
        if (!event?.nativeEvent?.contentOffset) {
          return;
        }

        const { contentOffset } = event.nativeEvent;
        const scrollY = contentOffset.y;
        
        // Validate scrollY is a number
        if (typeof scrollY !== 'number' || isNaN(scrollY) || scrollY < 0) {
          return;
        }

        lastScrollYRef.current = scrollY;

        // Set scrolling state (lightweight operation)
        setIsScrolling(true);

        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }

        // Set timeout to detect when scrolling stops
        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150) as any;

        // Early return if no content - skip heavy processing but allow scroll
        // Don't block on loading if we have cached content
        if (filteredMediaList.length === 0) {
          return;
        }

        // Early return if no content layouts yet (prevents hangs during initial render)
        const layoutsCount = Object.keys(contentLayoutsRef.current).length;
        if (layoutsCount === 0) {
          return;
        }

        // Cancel any pending animation frame to prevent accumulation
        if (scrollAnimationFrameRef.current !== null) {
          cancelAnimationFrame(scrollAnimationFrameRef.current);
          scrollAnimationFrameRef.current = null;
        }

        // Defer heavy operations to prevent blocking scroll
        // Use requestAnimationFrame with cancellation to prevent accumulation
        scrollAnimationFrameRef.current = requestAnimationFrame(() => {
          try {
            // Double-check content is still ready - if not, skip processing but allow scroll
            if (!isContentReadyRef.current || loading || layoutsCount === 0) {
              scrollAnimationFrameRef.current = null;
              return;
            }

            // Limit processing to prevent hangs - only process if there are playing items
            const hasPlayingVideos = Object.values(playingVideos).some(v => v === true);
            const hasPlayingAudio = playingAudioId !== null;

            if (!hasPlayingVideos && !hasPlayingAudio) {
              scrollAnimationFrameRef.current = null;
              return;
            }

            try {
              // Real-time video control during scrolling (lightweight check first)
              if (hasPlayingVideos || currentlyVisibleVideo) {
                handleVideoVisibilityChange(scrollY);
              }
            } catch (error) {
              // console.warn("⚠️ Error in handleVideoVisibilityChange:", error);
            }

            // Enhanced auto-pause logic for all media types
            const screenHeight = Dimensions.get("window").height;
            const viewportTop = scrollY;
            const viewportBottom = scrollY + screenHeight;

            // Auto-pause videos that are scrolled out of view
            try {
              Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
                if (!layout || typeof layout !== 'object') return;
                
                if (layout.type === "video") {
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

                  // Auto-pause if video is less than 20% visible or completely out of view
                  const shouldPause =
                    visibilityRatio < 0.2 ||
                    videoBottom < viewportTop ||
                    videoTop > viewportBottom;

                  if (shouldPause && isVideoPlaying(key)) {
                    devLog.log(
                      `🎬 Auto-pause: Pausing video ${key} - visibility: ${(
                        visibilityRatio * 100
                      ).toFixed(1)}%`
                    );
                    // Pause only this specific video, not all videos
                    try {
                      pauseMedia(key);
                    } catch (error) {
                      console.warn(`⚠️ Error pausing video ${key}:`, error);
                    }

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
            } catch (error) {
              console.warn("⚠️ Error processing video layouts during scroll:", error);
            }

            // Auto-pause audio/music that are scrolled out of view
            try {
              Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
                if (!layout || typeof layout !== 'object') return;
                
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
                    devLog.log(
                      `🎵 Auto-pause: Pausing music ${key} - visibility: ${(
                        visibilityRatio * 100
                      ).toFixed(1)}%`
                    );
                    // Pause both local and global audio
                    try {
                      pauseAllAudio();
                      pauseMedia(key);
                    } catch (error) {
                      console.warn(`⚠️ Error pausing audio ${key}:`, error);
                    }
                  }
                }
              });
            } catch (error) {
              console.warn("⚠️ Error processing music layouts during scroll:", error);
            }
          } catch (error) {
            console.warn("⚠️ Error in scroll animation frame:", error);
          } finally {
            scrollAnimationFrameRef.current = null;
          }
        });
      } catch (error) {
        console.error("❌ Error in handleScroll:", error);
        // Don't throw - allow scrolling to continue
      }
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
      loading,
      filteredMediaList.length,
    ]
  );

  // Cleanup scroll timeout and animation frame on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }
      // Reset content ready flag
      isContentReadyRef.current = false;
    };
  }, []);

  // Mark content as ready immediately if we have content (from cache or fresh)
  useEffect(() => {
    if (filteredMediaList.length > 0) {
      // Mark as ready immediately - no delay needed since cache loads synchronously
      isContentReadyRef.current = true;
    } else if (loading && filteredMediaList.length === 0) {
      // Only mark as not ready if we're loading AND have no content
      isContentReadyRef.current = false;
    }
  }, [loading, filteredMediaList.length, isLoadingContent]);

  // Reset scroll state when contentType changes (category switch)
  useEffect(() => {
    // Mark content as ready immediately if we have content (from cache or fresh)
    isContentReadyRef.current = filteredMediaList.length > 0;
    
    // Reset scroll position to top when category changes
    if (scrollViewRef.current) {
      // Small delay to ensure component is ready
      const timer = setTimeout(() => {
        try {
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        } catch (error) {
          // Ignore scroll errors during navigation
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Clear any pending scroll operations
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, [contentType, loading, filteredMediaList.length, isLoadingContent]);

  // Reset scroll state when component gains focus (navigation back from reels, etc.)
  useFocusEffect(
    useCallback(() => {
      // Mark content as ready immediately if we have content (from cache or fresh)
      // This ensures instant scrolling when navigating back
      // Cache is already loaded synchronously by useMedia hook, so content should be available
      isContentReadyRef.current = filteredMediaList.length > 0;
      
      // Reset scroll position to top when navigating back
      if (scrollViewRef.current) {
        // Small delay to ensure component is mounted
        setTimeout(() => {
          try {
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
          } catch (error) {
            // Ignore scroll errors during navigation
          }
        }, 50);
      }

      // Clear any pending scroll operations
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      if (scrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
        scrollAnimationFrameRef.current = null;
      }

      return () => {
        // Cleanup on blur
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
          scrollTimeoutRef.current = null;
        }
        if (scrollAnimationFrameRef.current !== null) {
          cancelAnimationFrame(scrollAnimationFrameRef.current);
          scrollAnimationFrameRef.current = null;
        }
      };
    }, [loading, filteredMediaList.length, isLoadingContent])
  );

  const handleScrollEnd = useCallback(() => {
    try {
      devLog.log("📱 Scroll ended, finalizing auto-pause cleanup");
      const scrollY = lastScrollYRef.current;
      const screenHeight = Dimensions.get("window").height;
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;

      // Final cleanup for all media types when scrolling stops
      try {
        Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
          if (!layout || typeof layout !== 'object') return;
          
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
              devLog.log(
                `🎬 Final cleanup: Pausing video ${key} - visibility: ${(
                  visibilityRatio * 100
                ).toFixed(1)}%`
              );
              // Pause only this specific video, not all videos
              try {
                pauseMedia(key);
              } catch (error) {
                console.warn(`⚠️ Error pausing video ${key} in handleScrollEnd:`, error);
              }

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
              devLog.log(
                `🎵 Final cleanup: Pausing music ${key} - visibility: ${(
                  visibilityRatio * 100
                ).toFixed(1)}%`
              );
              // Pause both local and global audio
              try {
                pauseAllAudio();
                pauseMedia(key);
              } catch (error) {
                console.warn(`⚠️ Error pausing music ${key} in handleScrollEnd:`, error);
              }
            }
          }
        });
      } catch (error) {
        console.warn("⚠️ Error in handleScrollEnd cleanup:", error);
      }
    } catch (error) {
      console.error("❌ Error in handleScrollEnd:", error);
    }
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

      // No automatic video start on layout - manual play still works
      // Videos will only play when user clicks the play button
    },
    [isAutoPlayEnabled, currentlyVisibleVideo, playMedia]
  );

  // Discover weekly style cards data (using Jevah colors)
  const discoverCards = [
    {
      id: "1",
      title: "Discover Weekly",
      description: "New copyright-free gospel music curated just for you.",
      color: UI_CONFIG.COLORS.PRIMARY, // "#256E63"
    },
    {
      id: "2",
      title: "Featured Playlist",
      description: "Most popular copyright-free songs everyone's listening to.",
      color: UI_CONFIG.COLORS.SECONDARY, // "#FEA74E"
    },
  ];

  // Fetch local hymns JSON; fallback to Hymnary sample (MVP) - Only for HYMS/HYMNS tab
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
    
    // Only fetch hymns if in HYMS/HYMNS tab
    if (isHymnsTab) {
      // Reset search when switching into hymns tab
      setHymnSearchQuery("");
      fetchHymns();
    }
  }, [contentType, isHymnsTab]);

  // Handle play/pause for a user-uploaded song (current user only)
  const handlePlayPress = useCallback(
    async (item: MediaItem) => {
      const id = item._id || "";
      const audioUrl = item.fileUrl || "";
      if (!id || !audioUrl) return;
      // `playAudio` already toggles pause if this id is currently playing.
      await playAudio(audioUrl, id);
    },
    [playAudio]
  );

  // Format duration
  const formatDuration = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Format time in milliseconds
  const formatTime = useCallback((milliseconds: number) => {
    if (!milliseconds || isNaN(milliseconds)) return "0:00";
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Render Discover Weekly card
  const renderDiscoverCard = useCallback(
    (item: typeof discoverCards[0]) => (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.9}
        style={{
          width: SCREEN_WIDTH - 64,
          height: 180,
          marginRight: 16,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[item.color, `${item.color}DD`]}
          style={{ flex: 1, padding: 20, justifyContent: "space-between" }}
        >
          <View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: "#FFFFFF",
                fontFamily: "Rubik_700Bold",
                marginBottom: 8,
              }}
            >
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#FFFFFFDD",
                fontFamily: "Rubik_400Regular",
              }}
            >
              {item.description}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="play" size={24} color={item.color} />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="download-outline" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    ),
    [SCREEN_WIDTH]
  );

  // Format duration
  const formatSongDuration = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Render song in list view
  const renderSongListItem = useCallback(
    (item: MediaItem) => {
      const id = item._id || (item as any).id || "";
      const key = id || getContentKey(item);
      const title = item.title || "Untitled";
      const artist =
        (item as any).speaker ||
        getUserDisplayNameFromContent(item) ||
        "Unknown Artist";
      const duration = (item as any).duration || 0;
      const thumbnailUrl: any =
        (item as any).thumbnailUrl || (item as any).imageUrl || "";
      const isPlaying = !!id && playingAudioId === id;
      const thumbnailSource =
        typeof thumbnailUrl === "string" && thumbnailUrl
          ? { uri: thumbnailUrl }
          : typeof thumbnailUrl === "object" && thumbnailUrl
          ? thumbnailUrl
          : undefined;

      return (
        <TouchableOpacity
          key={key}
          onPress={() => handlePlayPress(item)}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: UI_CONFIG.SPACING.MD,
            paddingVertical: 12,
            backgroundColor: "#FFFFFF",
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              overflow: "hidden",
              backgroundColor: "#E5E7EB",
              marginRight: 12,
            }}
          >
            {thumbnailSource ? (
              <Image
                source={thumbnailSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#9CA3AF",
                }}
              >
                <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#1D2939",
                fontFamily: "Rubik_600SemiBold",
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#98A2B3",
                fontFamily: "Rubik_400Regular",
              }}
              numberOfLines={1}
            >
              By {artist} • {formatSongDuration(duration)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handlePlayPress(item);
            }}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isPlaying ? "#256E63" : "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color={isPlaying ? "#FFFFFF" : "#256E63"}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [playingAudioId, handlePlayPress, formatSongDuration]
  );

  // Render song in grid view
  const renderSongGridItem = useCallback(
    (item: MediaItem) => {
      const id = item._id || (item as any).id || "";
      const key = id || getContentKey(item);
      const title = item.title || "Untitled";
      const artist =
        (item as any).speaker ||
        getUserDisplayNameFromContent(item) ||
        "Unknown Artist";
      const thumbnailUrl: any =
        (item as any).thumbnailUrl || (item as any).imageUrl || "";
      const isPlaying = !!id && playingAudioId === id;
      const thumbnailSource =
        typeof thumbnailUrl === "string" && thumbnailUrl
          ? { uri: thumbnailUrl }
          : typeof thumbnailUrl === "object" && thumbnailUrl
          ? thumbnailUrl
          : undefined;
      const cardWidth = (SCREEN_WIDTH - 48) / 2;

      return (
        <TouchableOpacity
          key={key}
          onPress={() => handlePlayPress(item)}
          activeOpacity={0.9}
          style={{
            width: cardWidth,
            marginBottom: 16,
            marginHorizontal: 4,
          }}
        >
          <View
            style={{
              width: "100%",
              height: cardWidth,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: "#E5E7EB",
              marginBottom: 8,
            }}
          >
            {thumbnailSource ? (
              <Image
                source={thumbnailSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#9CA3AF",
                }}
              >
                <Ionicons name="musical-notes" size={48} color="#FFFFFF" />
              </View>
            )}
            <View
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={20}
                color="#256E63"
              />
            </View>
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1D2939",
              fontFamily: "Rubik_600SemiBold",
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#98A2B3",
              fontFamily: "Rubik_400Regular",
            }}
            numberOfLines={1}
          >
            {artist}
          </Text>
        </TouchableOpacity>
      );
    },
    [playingAudioId, handlePlayPress, SCREEN_WIDTH]
  );

  // Render song in small icons view
  const renderSongSmallItem = useCallback(
    (item: MediaItem) => {
      const id = item._id || (item as any).id || "";
      const key = id || getContentKey(item);
      const title = item.title || "Untitled";
      const thumbnailUrl: any =
        (item as any).thumbnailUrl || (item as any).imageUrl || "";
      const thumbnailSource =
        typeof thumbnailUrl === "string" && thumbnailUrl
          ? { uri: thumbnailUrl }
          : typeof thumbnailUrl === "object" && thumbnailUrl
          ? thumbnailUrl
          : undefined;
      const itemWidth = (SCREEN_WIDTH - 48) / 3;

      return (
        <TouchableOpacity
          key={key}
          onPress={() => handlePlayPress(item)}
          activeOpacity={0.9}
          style={{ width: itemWidth, marginBottom: 12, marginHorizontal: 4 }}
        >
          <View
            style={{
              width: "100%",
              height: itemWidth,
              borderRadius: 8,
              overflow: "hidden",
              backgroundColor: "#E5E7EB",
              marginBottom: 6,
            }}
          >
            {thumbnailSource ? (
              <Image
                source={thumbnailSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#9CA3AF",
                }}
              >
                <Ionicons name="musical-notes" size={32} color="#FFFFFF" />
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#1D2939",
              fontFamily: "Rubik_600SemiBold",
            }}
            numberOfLines={2}
          >
            {title}
          </Text>
        </TouchableOpacity>
      );
    },
    [handlePlayPress, SCREEN_WIDTH]
  );

  // Render song in large icons view
  const renderSongLargeItem = useCallback(
    (item: MediaItem) => {
      const id = item._id || (item as any).id || "";
      const key = id || getContentKey(item);
      const title = item.title || "Untitled";
      const artist =
        (item as any).speaker ||
        getUserDisplayNameFromContent(item) ||
        "Unknown Artist";
      const duration = (item as any).duration || 0;
      const thumbnailUrl: any =
        (item as any).thumbnailUrl || (item as any).imageUrl || "";
      const isPlaying = !!id && playingAudioId === id;
      const thumbnailSource =
        typeof thumbnailUrl === "string" && thumbnailUrl
          ? { uri: thumbnailUrl }
          : typeof thumbnailUrl === "object" && thumbnailUrl
          ? thumbnailUrl
          : undefined;
      const cardWidth = SCREEN_WIDTH - 32;

      return (
        <TouchableOpacity
          key={key}
          onPress={() => handlePlayPress(item)}
          activeOpacity={0.9}
          style={{ width: cardWidth, marginBottom: 20, marginHorizontal: 16 }}
        >
          <View
            style={{
              width: "100%",
              height: cardWidth,
              borderRadius: 16,
              overflow: "hidden",
              backgroundColor: "#E5E7EB",
              marginBottom: 12,
            }}
          >
            {thumbnailSource ? (
              <Image
                source={thumbnailSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#9CA3AF",
                }}
              >
                <Ionicons name="musical-notes" size={64} color="#FFFFFF" />
              </View>
            )}
            <View
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="#256E63"
              />
            </View>
          </View>
          <View style={{ paddingHorizontal: 4 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#1D2939",
                fontFamily: "Rubik_600SemiBold",
                marginBottom: 4,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#98A2B3",
                fontFamily: "Rubik_400Regular",
              }}
              numberOfLines={1}
            >
              By {artist} • {formatSongDuration(duration)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [playingAudioId, handlePlayPress, SCREEN_WIDTH, formatSongDuration]
  );

  // Render song based on display mode
  const renderSongItem = useCallback(
    (item: any) => {
      switch (displayMode) {
        case "list":
          return renderSongListItem(item);
        case "grid":
          return renderSongGridItem(item);
        case "small":
          return renderSongSmallItem(item);
        case "large":
          return renderSongLargeItem(item);
        default:
          return renderSongListItem(item);
      }
    },
    [displayMode, renderSongListItem, renderSongGridItem, renderSongSmallItem, renderSongLargeItem]
  );

  // Upcoming feature placeholder for Recommended Live
  const renderRecommendedLiveCards = useCallback(() => {
    return (
      <View
        style={{
          paddingHorizontal: UI_CONFIG.SPACING.MD,
          paddingVertical: UI_CONFIG.SPACING.XL,
          backgroundColor: UI_CONFIG.COLORS.SURFACE || "#F9FAFB",
          borderRadius: 12,
          marginHorizontal: UI_CONFIG.SPACING.MD,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: UI_CONFIG.COLORS.BORDER || "#E5E7EB",
          borderStyle: "dashed",
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: UI_CONFIG.COLORS.PRIMARY || "#FEA74E",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: UI_CONFIG.SPACING.MD,
          }}
        >
          <Ionicons name="radio" size={32} color="#FFFFFF" />
        </View>
        <Text
          style={{
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
            fontWeight: "600",
            color: UI_CONFIG.COLORS.TEXT_PRIMARY,
            marginBottom: UI_CONFIG.SPACING.SM,
            textAlign: "center",
          }}
        >
          Live Streaming Coming Soon
        </Text>
        <Text
          style={{
            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
            color: UI_CONFIG.COLORS.TEXT_SECONDARY,
            textAlign: "center",
            lineHeight: 20,
            paddingHorizontal: UI_CONFIG.SPACING.MD,
          }}
        >
          We're working on bringing you live streaming content. Stay tuned for updates!
        </Text>
      </View>
    );
  }, []);

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
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
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

  // For LIVE content type, only show the Recommended Live component
  if (contentType === "live" || contentType === "LIVE") {
    return (
      <View style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
        {showSuccessCard && (
          <SuccessCard
            message={successMessage}
            onClose={() => setShowSuccessCard(false)}
            duration={3000}
          />
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 40,
            paddingHorizontal: 0,
          }}
          showsVerticalScrollIndicator={false}
        >
          {renderRecommendedLiveCards()}
        </ScrollView>
      </View>
    );
  }

  // HYMS/HYMNS category: show hymns only (and do not depend on media list)
  if (isHymnsTab) {
    return (
      <ContentErrorBoundary>
        <View style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
          {showSuccessCard && (
            <SuccessCard
              message={successMessage}
              onClose={() => setShowSuccessCard(false)}
              duration={3000}
            />
          )}
          <FlatList
            data={filteredHymns}
            keyExtractor={(item) => item.id}
            numColumns={2}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: UI_CONFIG.SPACING.LG,
              paddingBottom: 24,
              paddingHorizontal: UI_CONFIG.SPACING.MD,
            }}
            columnWrapperStyle={{
              gap: 12,
              marginBottom: 12,
            }}
            ListHeaderComponent={
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                    fontWeight: "600",
                    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    marginBottom: UI_CONFIG.SPACING.MD,
                  }}
                >
                  Hymns
                </Text>

                {/* Search */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F3F4F6",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    gap: 8,
                    borderWidth: 1,
                    borderColor: "#EAECF0",
                  }}
                >
                  <Ionicons name="search" size={18} color="#98A2B3" />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      fontFamily: "Rubik_400Regular",
                      color: "#1D2939",
                    }}
                    placeholder="Search hymns..."
                    placeholderTextColor="#98A2B3"
                    value={hymnSearchQuery}
                    onChangeText={setHymnSearchQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                  />
                  {!!hymnSearchQuery && (
                    <TouchableOpacity
                      onPress={() => setHymnSearchQuery("")}
                      style={{ padding: 4 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#98A2B3" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Result count */}
                {hymnSearchQuery.trim().length > 0 && (
                  <Text
                    style={{
                      marginTop: 8,
                      color: "#475467",
                      fontSize: 12,
                      fontFamily: "Rubik_400Regular",
                    }}
                  >
                    {filteredHymns.length} result
                    {filteredHymns.length === 1 ? "" : "s"}
                  </Text>
                )}
              </View>
            }
            ListEmptyComponent={
              loadingHymns ? (
                <View style={{ paddingVertical: 24 }}>
                  <ActivityIndicator color={UI_CONFIG.COLORS.PRIMARY} />
                </View>
              ) : (
                <View style={{ paddingVertical: 24 }}>
                  <Text
                    style={{
                      textAlign: "center",
                      color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                      fontFamily: "Rubik_400Regular",
                    }}
                  >
                    No hymns found.
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <View style={{ flex: 1 }}>
                <HymnMiniCard
                  variant="grid"
                  item={item}
                  onPress={(h) =>
                    router.push({
                      pathname: "/reader/HymnDetail",
                      params: { id: h.id },
                    })
                  }
                />
              </View>
            )}
          />
        </View>
      </ContentErrorBoundary>
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
      <View style={{ flex: 1 }} collapsable={false}>
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
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
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
        >
          {/* Most Recent Section - Hide in MUSIC tab */}
          {mostRecentItem && 
           !((String(contentType) === "MUSIC" || String(contentType) === "music") && contentType !== "ALL") && (
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


          {/* Music Section - Only show in MUSIC tab (new style with list view) */}
          {(String(contentType) === "MUSIC" || String(contentType) === "music") && String(contentType) !== "videos" && contentType !== "ALL" && (
            <View style={{ marginTop: UI_CONFIG.SPACING.LG }}>
              {/* Header with Search and Display Mode Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: UI_CONFIG.SPACING.MD,
                  paddingVertical: 12,
                }}
              >
                {showSearchInput ? (
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#F3F4F6",
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}
                  >
                    <Ionicons name="search" size={20} color="#98A2B3" />
                    <TextInput
                      style={{
                        flex: 1,
                        marginLeft: 8,
                        fontSize: 16,
                        fontFamily: "Rubik_400Regular",
                        color: "#1D2939",
                      }}
                      placeholder="Search songs..."
                      placeholderTextColor="#98A2B3"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setSearchQuery("")}
                        style={{ marginRight: 8 }}
                      >
                        <Ionicons name="close-circle" size={20} color="#98A2B3" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setShowSearchInput(false);
                        setSearchQuery("");
                      }}
                      style={{ marginLeft: 4 }}
                    >
                      <Ionicons name="close" size={20} color="#98A2B3" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    {/* Left container: Search and Filter icons */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => setShowSearchInput(true)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: "#F3F4F6",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="search" size={20} color="#256E63" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setShowFilterModal(true)}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: "#F3F4F6",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="filter" size={20} color="#256E63" />
                      </TouchableOpacity>
                    </View>

                    {/* Right container: Display Mode icons */}
                    <View
                      style={{
                        flexDirection: "row",
                        backgroundColor: "#F3F4F6",
                        borderRadius: 12,
                        padding: 4,
                        gap: 4,
                      }}
                    >
                      {(["list", "grid", "small", "large"] as const).map((mode) => (
                        <TouchableOpacity
                          key={mode}
                          onPress={() => setDisplayMode(mode)}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            backgroundColor:
                              displayMode === mode ? "#256E63" : "transparent",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Ionicons
                            name={
                              mode === "list"
                                ? "list"
                                : mode === "grid"
                                ? "grid"
                                : mode === "small"
                                ? "apps"
                                : "square"
                            }
                            size={18}
                            color={displayMode === mode ? "#FFFFFF" : "#98A2B3"}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>

              {/* Discover Weekly Cards */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: UI_CONFIG.SPACING.MD,
                  paddingVertical: 8,
                }}
              >
                {discoverCards.map(renderDiscoverCard)}
              </ScrollView>

              {/* Songs List (your uploads only) */}
              {userUploadedSongs.length === 0 ? (
                <View
                  style={{
                    paddingVertical: 40,
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 32,
                  }}
                >
                  <Ionicons name="musical-notes-outline" size={48} color="#98A2B3" />
                  <Text
                    style={{
                      marginTop: 12,
                      fontSize: 16,
                      color: "#98A2B3",
                      fontFamily: "Rubik_400Regular",
                      textAlign: "center",
                    }}
                  >
                    {(user?._id || (user as any)?.id)
                      ? "No uploaded songs found"
                      : "Sign in to see your uploaded songs"}
                  </Text>
                </View>
              ) : displayMode === "list" || displayMode === "large" ? (
                <View>
                  {userUploadedSongs.map((song) => renderSongItem(song))}
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    paddingHorizontal: UI_CONFIG.SPACING.MD,
                  }}
                >
                  {userUploadedSongs.map((song) => renderSongItem(song))}
                </View>
              )}
            </View>
          )}

          {/* All Content Section (split into first four, then Recommended Live, then rest) */}
          {/* In MUSIC tab, hide this section since audio content is shown in the music section above */}
          {((String(contentType) === "MUSIC" || String(contentType) === "music") && contentType !== "ALL") ? null : (
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
              const { firstFour, nextFour, rest } = filteredContentLists;
              return (
                <>
                  {firstFour.map((item, index) =>
                    renderContentByType(item, index)
                  )}

                  {/* Insert Recommended Live for you here with red LIVE badge - Show in LIVE tab, hide in E-BOOKS */}
                  {contentType !== "e-books" && contentType?.toUpperCase() !== "E-BOOKS" && (
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
                  )}

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
          )}

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

