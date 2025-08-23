import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialIcons
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, ResizeMode, Video } from "expo-av";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useDownloadStore } from "../store/useDownloadStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import contentInteractionAPI from "../utils/contentInteractionAPI";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";
import {
  getFavoriteState,
  getPersistedStats,
  getViewed,
  persistStats,
  persistViewed,
  toggleFavorite,
} from "../utils/persistentStorage";
// import { testFavoriteSystem } from "../utils/testFavoriteSystem";
// import { testPersistenceBehavior } from "../utils/testPersistence";
import useVideoViewport from "../hooks/useVideoViewport";
import { getDisplayName } from "../utils/userValidation";

interface VideoCard {
  fileUrl: string;
  title: string;
  speaker: string;
  uploadedBy?: string;
  timeAgo: string;
  speakerAvatar: any;
  favorite: number;
  views: number;
  saved: number;
  sheared: number;
  comment: number;
  imageUrl?: any;
  onPress?: () => void;
  createdAt?: string;
}

interface RecommendedItem {
  fileUrl: string;
  imageUrl: ImageSourcePropType;
  title: string;
  subTitle: string;
  views: number;
  onPress?: () => void;
  isHot?: boolean;
  isRising?: boolean;
  trendingScore?: number;
}

const videosA: VideoCard[] = [];
const videosB: VideoCard[] = [];
const recommendedItems: RecommendedItem[] = [];

export default function VideoComponent() {
  const router = useRouter();
  const [videoVolume, setVideoVolume] = useState<number>(1.0); // 🔊 Add volume control
  const getVideoKey = (fileUrl: string): string => `video-${fileUrl}`;
  
  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();
  
  // 📱 Viewport detection for auto-play
  const { calculateVideoVisibility } = useVideoViewport();
  const scrollViewRef = useRef<ScrollView>(null);

  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [pvModalIndex, setPvModalIndex] = useState<number | null>(null);
  // Removed legacy rsModalIndex; using specific indices per section instead
  // Separate modal indices for different mini-card sections to avoid conflicts
  const [trendingModalIndex, setTrendingModalIndex] = useState<number | null>(null);
  const [recommendedModalIndex, setRecommendedModalIndex] = useState<number | null>(null);
  const [showOverlayMini, setShowOverlayMini] = useState<Record<string, boolean>>({});

  const [miniCardViews, setMiniCardViews] = useState<Record<string, number>>({});
  const [miniCardPlaying, setMiniCardPlaying] = useState<Record<string, boolean>>({});
  const [miniCardHasPlayed, setMiniCardHasPlayed] = useState<Record<string, boolean>>({});
  const [miniCardHasCompleted, setMiniCardHasCompleted] = useState<Record<string, boolean>>({});

  const miniCardRefs = useRef<Record<string, any>>({});
  const [videoStats, setVideoStats] = useState<Record<string, Partial<VideoCard>>>({});
  const [previouslyViewedState, setPreviouslyViewedState] = useState<RecommendedItem[]>([]);
  
  // 🎯 New favorite system state
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>({});
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<Record<string, number>>({});

  const videoRefs = useRef<Record<string, any>>({});
  const videoLayoutsRef = useRef<Record<string, { y: number; height: number }>>({});
  const lastScrollYRef = useRef<number>(0);
  const mediaStore = useMediaStore();
  // ✅ Global interaction stats (views, likes, shares, comments)
  const contentStats = useInteractionStore((s) => s.contentStats);
  const loadBatchContentStats = useInteractionStore((s) => s.loadBatchContentStats);
  
  // ✅ Use global video store for cross-component video management
  const globalVideoStore = useGlobalVideoStore();
  
  // ✅ Use library store for saving content
  const libraryStore = useLibraryStore();
  
  // ✅ Get video state from global store
  const playingVideos = globalVideoStore.playingVideos;
  const mutedVideos = globalVideoStore.mutedVideos;
  const progresses = globalVideoStore.progresses;
  const showOverlay = globalVideoStore.showOverlay;
  const hasCompleted = globalVideoStore.hasCompleted;
  const isAutoPlayEnabled = globalVideoStore.isAutoPlayEnabled;
  const handleVideoVisibilityChange = globalVideoStore.handleVideoVisibilityChange;
  
  // 🔧 Fix infinite loop: Memoize uploadedVideos to prevent recreation on every render
  // Accept both `type` and `contentType` from media items
  const uploadedVideos = useMemo(() => 
    mediaStore.mediaList.filter((item: any) => {
      const t = (item?.type || item?.contentType || '').toString().toLowerCase();
      return t === 'videos';
    }), 
    [mediaStore.mediaList]
  );

  // Load global aggregated stats for all uploaded videos (across all users)
  useEffect(() => {
    const ids = uploadedVideos.map((v: any) => v._id).filter(Boolean);
    if (ids.length > 0) {
      loadBatchContentStats(ids as string[]);
    }
  }, [uploadedVideos.length, loadBatchContentStats]);

  const toggleMute = (key: string) => {
    globalVideoStore.toggleVideoMute(key);
  };

  // Close all open menus/popovers across the component
  const closeAllMenus = () => {
    setModalVisible(null);
    setPvModalIndex(null);
    setTrendingModalIndex(null);
    setRecommendedModalIndex(null);
  };

  useEffect(() => {
    const loadPersistedData = async () => {
      console.log("🎬 VideoComponent: Loading persisted data...");
      
      // 📚 Load library data first
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      
      // 📥 Load downloaded items
      await loadDownloadedItems();
      
      // 📊 Load video stats and viewed videos (media list is already loaded globally)
      const stats = await getPersistedStats();
      const viewed = await getViewed();

      setVideoStats(stats);
      setPreviouslyViewedState(viewed);

      const miniViews: Record<string, number> = {};
      Object.keys(stats).forEach((key) => {
        if (typeof stats[key]?.views === "number") {
          miniViews[key] = stats[key].views;
        }
      });
      setMiniCardViews(miniViews);
      
      // 🎯 Load favorite states for all videos
      const favoriteStates: Record<string, boolean> = {};
      const favoriteCounts: Record<string, number> = {};
      
      await Promise.all(uploadedVideos.map(async (video) => {
        const key = getVideoKey(video.fileUrl);
        const { isUserFavorite, globalCount } = await getFavoriteState(key);
        favoriteStates[key] = isUserFavorite;
        favoriteCounts[key] = globalCount;
      }));
      
      setUserFavorites(favoriteStates);
      setGlobalFavoriteCounts(favoriteCounts);
      
      console.log(`✅ VideoComponent: Loaded ${uploadedVideos.length} videos and stats for ${Object.keys(stats).length} items`);
    };

    loadPersistedData();
  }, [uploadedVideos.length]); // 🎯 Depend on actual video count instead of isLoaded

  // 🔊 Initialize audio settings for video playback
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log("🔊 VideoComponent: Initializing audio settings...");
        
        // 🎵 Configure audio session for video playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true, // 🔑 This is crucial for video audio!
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        // Ensure default volume is set
        setVideoVolume(1.0);
        
        // Initialize all videos as unmuted by default
        uploadedVideos.forEach((video) => {
          const key = getVideoKey(video.fileUrl);
          // Check if video is muted and unmute it
          if (globalVideoStore.mutedVideos[key]) {
            globalVideoStore.toggleVideoMute(key);
          }
        });
        
        console.log("✅ VideoComponent: Audio session configured, all videos unmuted with volume 1.0");
      } catch (error) {
        console.error("❌ VideoComponent: Failed to initialize audio session:", error);
        // Fallback: still set volume and unmute videos
        setVideoVolume(1.0);
        uploadedVideos.forEach((video) => {
          const key = getVideoKey(video.fileUrl);
          // Check if video is muted and unmute it
          if (globalVideoStore.mutedVideos[key]) {
            globalVideoStore.toggleVideoMute(key);
          }
        });
      }
    };
    
    initializeAudio();
  }, [uploadedVideos]);

  const handleMiniCardPlay = (
    key: string,
    item: RecommendedItem,
    setViewsState: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    setPlayingState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    setHasPlayed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    setHasCompleted: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => {
    // ✅ Global video pause - pause all main videos using global store
    globalVideoStore.pauseAllVideos();

    // ✅ Global video pause - pause all other mini card videos
    Object.keys(miniCardPlaying).forEach((k) => {
      if (k !== key) {
        setMiniCardPlaying((prev) => ({ ...prev, [k]: false }));
        setShowOverlayMini((prev) => ({ ...prev, [k]: true }));
      }
    });

    const isPlaying = miniCardPlaying[key] ?? false;
    const wasCompleted = miniCardHasCompleted[key] ?? false;

    if (!isPlaying) {
      if (wasCompleted && miniCardRefs.current[key]) {
        miniCardRefs.current[key].setPositionAsync(0);
        // ✅ Only increment view when replaying a completed video
        setViewsState((prev: Record<string, number>) => ({
          ...prev,
          [key]: (prev[key] ?? item.views) + 1,
        }));
        console.log(`🎬 Mini card view incremented for replay of completed video: ${item.title}`);
      } else {
        console.log(`▶️ Starting mini card video ${item.title} (no view count yet)`);
      }

      setHasPlayed((prev: Record<string, boolean>) => ({ ...prev, [key]: true }));
      setHasCompleted((prev: Record<string, boolean>) => ({ ...prev, [key]: false }));

      setPlayingState({ [key]: true });
      setMiniCardPlaying({ [key]: true });

      setShowOverlayMini((prev) => ({ ...prev, [key]: false }));
    } else {
      setPlayingState({ [key]: false });
      setMiniCardPlaying({ [key]: false });

      setShowOverlayMini((prev) => ({ ...prev, [key]: true }));
    }
  };

  const togglePlay = (key: string, video?: VideoCard) => {
    const isCurrentlyPlaying = playingVideos[key];

    Object.keys(miniCardPlaying).forEach((k) => {
      setMiniCardPlaying((prev) => ({ ...prev, [k]: false }));
      setShowOverlayMini((prev) => ({ ...prev, [k]: true }));
    });

    const shouldStartPlaying = !isCurrentlyPlaying;

    if (shouldStartPlaying) {
      const alreadyPlayed = hasPlayed[key];
      const completedBefore = hasCompleted[key];

      // ✅ Only increment view when replaying a completed video
      if (video && completedBefore) {
        console.log(`🎬 Incrementing view for replay of completed video ${video.title}:`, {
          key,
          alreadyPlayed,
          completedBefore,
          action: "Replay after completion"
        });
        incrementView(key, video);
        globalVideoStore.setVideoCompleted(key, false); // Reset completion status for next view
      } else if (video) {
        console.log(`▶️ Starting video ${video.title} (no view count yet):`, {
          key,
          alreadyPlayed,
          completedBefore,
          action: "Initial play or pause/resume"
        });
      } else {
        console.log(`⏭️ No video object available for key:`, key);
      }

      setHasPlayed((prev) => ({ ...prev, [key]: true }));

      if (mutedVideos[key]) {
        globalVideoStore.toggleVideoMute(key);
      }
    }

    // ✅ Use global video management
    globalVideoStore.playVideoGlobally(key);
  };

  const [hasPlayed, setHasPlayed] = useState<Record<string, boolean>>({});

  const incrementView = (key: string, video: VideoCard) => {
    console.log("🔄 incrementView called for:", video.title, "key:", key);
    console.log("📊 Current videoStats for key:", videoStats[key]);
    
    const alreadyExists = previouslyViewedState.some(
      (item) => item.fileUrl === video.fileUrl
    );

    if (!alreadyExists) {
      const thumbnailUrl =
        video.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg";

      const newItem: RecommendedItem = {
        fileUrl: video.fileUrl,
        imageUrl: { uri: thumbnailUrl },
        title: video.title,
        subTitle: video.speaker || "Unknown",
        views: videoStats[key]?.views || video.views || 0,
      };

      setPreviouslyViewedState((prev) => {
        const updatedViewed = [newItem, ...prev];
        persistViewed(updatedViewed);
        return updatedViewed;
      });
    }

    setVideoStats((prev) => {
      const currentViews = prev[key]?.views || 0;
      const newViews = currentViews + 1;
      console.log(`📈 Incrementing views: ${currentViews} → ${newViews} for ${video.title}`);
      
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          views: newViews,
          sheared: prev[key]?.sheared || video.sheared || 0,
          favorite: prev[key]?.favorite || video.favorite || 0,
          saved: prev[key]?.saved || video.saved || 0,
          comment: prev[key]?.comment || video.comment || 0,
        },
      };
      persistStats(updated);
      console.log("✅ Updated videoStats:", updated[key]);
      return updated;
    });
  };

  const handleShare = async (key: string, video: VideoCard) => {
    console.log("🔄 Share button clicked for:", video.title);
    try {
      const result = await Share.share({
        title: video.title,
        message: `Check out this video: ${video.title}\n${video.fileUrl}`,
        url: video.fileUrl,
      });

      if (result.action === Share.sharedAction) {
        console.log("✅ Share completed successfully");
        setVideoStats((prev) => {
          const updatedStats = {
            ...prev,
            [key]: {
              ...prev[key],
              sheared: (prev[key]?.sheared || video.sheared || 0) + 1,
              views: prev[key]?.views || video.views || 0,
              favorite: prev[key]?.favorite || video.favorite || 0,
              saved: prev[key]?.saved || video.saved || 0,
              comment: prev[key]?.comment || video.comment || 0,
            },
          };
          persistStats(updatedStats);
          return updatedStats;
        });
      }
      
      // ✅ Close modal after share action
      setModalVisible(null);
    } catch (error) {
      console.warn("❌ Share error:", error);
      // ✅ Close modal even if share failed
      setModalVisible(null);
    }
  };

  const handleSave = async (key: string, video: VideoCard) => {
    console.log("🔄 Save button clicked for:", video.title);
    
    try {
      // Check current user-specific save state from library store
      const isCurrentlyUserSaved = libraryStore.isItemSaved(key);
      console.log(`📚 Current user save state for ${video.title}: ${isCurrentlyUserSaved}`);
      
      // Toggle save state - user can only save/unsave once
      if (!isCurrentlyUserSaved) {
        // User wants to save - add to local library and increment global count
        const libraryItem = {
          id: key,
          contentType: "videos",
          fileUrl: video.fileUrl,
          title: video.title,
          speaker: video.speaker,
          uploadedBy: video.uploadedBy,
          createdAt: video.createdAt || new Date().toISOString(),
          speakerAvatar: video.speakerAvatar,
          views: videoStats[key]?.views || (video as any).viewCount || 0,
          sheared: videoStats[key]?.sheared || video.sheared || 0,
          favorite: videoStats[key]?.favorite || video.favorite || 0,
          comment: videoStats[key]?.comment || video.comment || 0,
          saved: 1,
          thumbnailUrl: video.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg",
          originalKey: key
        };
        
        await libraryStore.addToLibrary(libraryItem);
        console.log(`✅ Added to user's library: ${video.title}`);
        
        // Update local stats with incremented save count
        setVideoStats((prev) => {
          const updatedStats = {
            ...prev,
            [key]: {
              ...prev[key],
              totalSaves: ((prev[key] as any)?.totalSaves || video.saved || 0) + 1,
              userSaved: true,
              saved: 1, // For compatibility with existing UI
              views: prev[key]?.views || (video as any).viewCount || 0,
              sheared: prev[key]?.sheared || video.sheared || 0,
              favorite: prev[key]?.favorite || video.favorite || 0,
              comment: prev[key]?.comment || video.comment || 0,
            },
          };
          persistStats(updatedStats);
          return updatedStats;
        });
        
      } else {
        // User wants to unsave - remove from local library and decrement global count
        await libraryStore.removeFromLibrary(key);
        console.log(`🗑️ Removed from user's library: ${video.title}`);
        
        // Update local stats with decremented save count
        setVideoStats((prev) => {
          const updatedStats = {
            ...prev,
            [key]: {
              ...prev[key],
              totalSaves: Math.max(((prev[key] as any)?.totalSaves || video.saved || 0) - 1, 0),
              userSaved: false,
              saved: 0, // For compatibility with existing UI
              views: prev[key]?.views || (video as any).viewCount || 0,
              sheared: prev[key]?.sheared || video.sheared || 0,
              favorite: prev[key]?.favorite || video.favorite || 0,
              comment: prev[key]?.comment || video.comment || 0,
            },
          };
          persistStats(updatedStats);
          return updatedStats;
        });
      }
      
      // Try to sync with backend, but don't block the UI if it fails
      try {
        const result = await contentInteractionAPI.toggleSave(key, "videos");
        console.log(`🔄 Backend sync result:`, result);
        
        // Update with backend response if available (but keep local state as source of truth)
        setVideoStats((prev) => {
          const updatedStats = {
            ...prev,
            [key]: {
              ...prev[key],
              totalSaves: result.totalSaves
            }
          };
          persistStats(updatedStats);
          return updatedStats;
        });
      } catch (apiError) {
        console.warn(`⚠️ Backend sync failed, but local action succeeded:`, apiError);
        // Local state already updated above, no need for additional action
      }
      
    } catch (error) {
      console.error(`❌ Save operation failed for ${video.title}:`, error);
    }
    
    // ✅ Close modal after save action
    setModalVisible(null);
  };

  const handleFavorite = async (key: string, video: VideoCard) => {
    console.log(`🎯 Handling favorite for: ${video.title}`);
    
    try {
      // Toggle favorite using new system
      const { isUserFavorite, globalCount } = await toggleFavorite(key);
      
      // Update local state immediately for UI responsiveness
      setUserFavorites(prev => ({ ...prev, [key]: isUserFavorite }));
      setGlobalFavoriteCounts(prev => ({ ...prev, [key]: globalCount }));
      
      console.log(`✅ Favorite ${isUserFavorite ? 'added' : 'removed'} for ${video.title}. Global count: ${globalCount}`);
    } catch (error) {
      console.error(`❌ Failed to toggle favorite for ${video.title}:`, error);
    }
  };

  const handleComment = (key: string, video: VideoCard) => {
    setVideoStats((prev) => {
      const isCommented = prev[key]?.comment === 1;
      const updatedStats = {
        ...prev,
        [key]: {
          ...prev[key],
          comment: isCommented ? 0 : 1,
          views: prev[key]?.views || video.views || 0,
          sheared: prev[key]?.sheared || video.sheared || 0,
          favorite: prev[key]?.favorite || video.favorite || 0,
          saved: prev[key]?.saved || video.saved || 0,
        },
      };
      persistStats(updatedStats);
      return updatedStats;
    });
  };

  // 📱 During scroll: only record position; autoplay triggers on scroll end for smoother UX
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset } = event.nativeEvent;
    lastScrollYRef.current = contentOffset.y;
  }, []);

  const recomputeVisibilityFromLayouts = useCallback(() => {
    if (!isAutoPlayEnabled) return;
    const scrollY = lastScrollYRef.current;
    const screenHeight = Dimensions.get('window').height;
    const viewportTop = scrollY;
    const viewportBottom = scrollY + screenHeight;

    let mostVisibleKey: string | null = null;
    let maxRatio = 0;
    const MIN_VISIBILITY_THRESHOLD = 0.5;

    uploadedVideos.forEach((v) => {
      const key = getVideoKey(v.fileUrl);
      const layout = videoLayoutsRef.current[key];
      if (!layout) return;
      const itemTop = layout.y;
      const itemBottom = layout.y + layout.height;
      const intersectionTop = Math.max(viewportTop, itemTop);
      const intersectionBottom = Math.min(viewportBottom, itemBottom);
      const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
      const ratio = visibleHeight / Math.max(1, layout.height);
      if (ratio >= MIN_VISIBILITY_THRESHOLD && ratio > maxRatio) {
        maxRatio = ratio;
        mostVisibleKey = key;
      }
    });

    // Auto-play globally disabled; do not trigger visibility-based play
    // handleVideoVisibilityChange(mostVisibleKey);
  }, [isAutoPlayEnabled, uploadedVideos, handleVideoVisibilityChange]);

  const handleVideoTap = (key: string, video?: VideoCard) => {
    const isCurrentlyPlaying = playingVideos[key] ?? false;
    const wasCompleted = hasCompleted[key] ?? false;
    
    // Also pause mini card videos
    Object.keys(miniCardPlaying).forEach((k) => {
      setMiniCardPlaying((prev) => ({ ...prev, [k]: false }));
      setShowOverlayMini((prev) => ({ ...prev, [k]: true }));
    });
    
    // ✅ Only increment view count when replaying a completed video
    if (!isCurrentlyPlaying && video && wasCompleted) {
      console.log(`📱 Video tapped to replay completed video: ${video.title}`);
      incrementView(key, video);
      globalVideoStore.setVideoCompleted(key, false); // Reset completion status
    } else if (!isCurrentlyPlaying && video) {
      console.log(`📱 Video tapped to play: ${video.title} (no view count yet)`);
    }
    
    // ✅ Use global video management - this will pause all other videos across all components
    globalVideoStore.playVideoGlobally(key);
  };

  // 🔧 Fix infinite loop: Memoize allIndexedVideos calculation
  const allIndexedVideos = useMemo(() => 
    uploadedVideos.map((video: any) => {
      const key = getVideoKey(video.fileUrl);

      const stats = videoStats[key] || {};
      const isItemSaved = libraryStore.isItemSaved(key);
      const contentId: string | undefined = video._id;
      const global = contentId ? (contentStats as any)[contentId] : undefined;
      // Prefer global, aggregated counts; fall back to local or item fields
      const globalViews = global?.views ?? 0;
      const globalShares = global?.shares ?? 0;
      const globalLikes = global?.likes ?? 0;
      const globalComments = global?.comments ?? 0;
      const globalSaves = global?.saves ?? 0;
      const views = Math.max(globalViews, stats.views ?? 0, video.viewCount ?? 0);
      const shares = Math.max(globalShares, stats.sheared ?? 0, video.sheared ?? 0);
      const favorites = Math.max(globalLikes, stats.favorite ?? 0, video.favorite ?? 0);
      const comments = Math.max(globalComments, stats.comment ?? 0, video.comment ?? 0);
      const saves = Math.max(globalSaves, (stats as any).totalSaves ?? stats.saved ?? 0, video.saved ?? 0);
      const score = views + shares + favorites + comments + saves;

      return {
        contentId,
        key,
        fileUrl: video.fileUrl,
        title: video.title,
        subTitle: video.speaker || "Unknown",
        views,
        shares,
        favorites,
        comments,
        saves,
        globalViews,
        globalShares,
        globalLikes,
        globalComments,
        globalSaves,
        score,
        isItemSaved,
        imageUrl: {
          uri: video.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg",
        },
      };
    }), [uploadedVideos, videoStats, libraryStore.savedItems, contentStats]
  );

  // ✅ Trending score using velocity + exponential time-decay (social media pattern)
  const calculateTrendingScore = (video: any, videoData: any) => {
    const now = Date.now();
    const createdAt = new Date(videoData?.createdAt || now).getTime();
    const ageInHours = Math.max(1, (now - createdAt) / (1000 * 60 * 60));

    // Prefer global aggregated counts; fall back to local
    const views = video.globalViews ?? video.views ?? 0;
    const shares = video.globalShares ?? video.shares ?? 0;
    const favorites = video.globalLikes ?? video.favorites ?? 0;
    const comments = video.globalComments ?? video.comments ?? 0;
    const saves = video.globalSaves ?? video.saves ?? 0;

    // Convert to velocity (per hour) and dampen with log/sqrt to avoid domination by large accounts
    const viewsPerHour = views / ageInHours;
    const likesPerHour = favorites / ageInHours;
    const sharesPerHour = shares / ageInHours;
    const commentsPerHour = comments / ageInHours;
    const savesPerHour = saves / ageInHours;

    // Weights reflecting impact hierarchy: shares > comments > likes > saves > views
    const weightedVelocity =
      1 * Math.sqrt(Math.max(0, viewsPerHour)) +
      2 * Math.log1p(Math.max(0, savesPerHour)) +
      3 * Math.log1p(Math.max(0, likesPerHour)) +
      5 * Math.log1p(Math.max(0, commentsPerHour)) +
      6 * Math.log1p(Math.max(0, sharesPerHour));

    // Exponential time decay with ~24h half-life
    const halfLifeHours = 24;
    const decay = Math.exp(-ageInHours / halfLifeHours);

    // Early traction boost for very new content with meaningful interactions
    const earlyBoost = ageInHours < 6 && (shares + comments) >= 10 ? 1.25 : 1.0;

    // Scale to a user-friendly range
    const score = weightedVelocity * decay * earlyBoost * 300;

    // Recency metric (0..1) to use as tie-breaker
    const recency = 1 / ageInHours;

    return { score, recency };
  };

  // 🔧 Fix infinite loop: Memoize trendingItems calculation
  const trendingItems: RecommendedItem[] = useMemo(() => {
    const scored = allIndexedVideos
      .map(video => {
        const originalVideo = uploadedVideos.find(v => v.fileUrl === video.fileUrl);
        const { score, recency } = calculateTrendingScore(video, originalVideo || {});
        return {
          ...video,
          trendingScore: score,
          recency,
          createdAt: originalVideo?.createdAt,
        } as any;
      })
      .filter(v => (v as any).trendingScore > 0);

    const takeTop = (list: any[]) => list
      .sort((a: any, b: any) => {
        // Primary: trending score
        if ((b.trendingScore ?? 0) !== (a.trendingScore ?? 0)) return (b.trendingScore ?? 0) - (a.trendingScore ?? 0);
        // Secondary: total global views
        const av = a.globalViews ?? a.views ?? 0;
        const bv = b.globalViews ?? b.views ?? 0;
        if (bv !== av) return bv - av;
        // Tertiary: recency
        return (b.recency ?? 0) - (a.recency ?? 0);
      })
      .slice(0, 20)
      .map(({ fileUrl, title, subTitle, imageUrl, trendingScore, globalViews, views }: any) => {
        const scoreNum = Number(trendingScore || 0);
        const isHot = scoreNum > 1200;
        const isRising = scoreNum > 600 && scoreNum <= 1200;
        return {
          fileUrl,
          title,
          subTitle,
          views: globalViews ?? views ?? 0,
          imageUrl,
          isHot,
          isRising,
          trendingScore: scoreNum,
        } as RecommendedItem;
      });

    if (scored.length > 0) return takeTop(scored);

    // Fallback: show most recent/most-viewed when no interactions yet
    const fallback = allIndexedVideos
      .map(video => {
        const originalVideo = uploadedVideos.find(v => v.fileUrl === video.fileUrl);
        const createdAt = new Date(originalVideo?.createdAt || Date.now()).getTime();
        return { ...video, createdAt } as any;
      })
      .sort((a: any, b: any) => {
        const bv = b.globalViews ?? b.views ?? 0;
        const av = a.globalViews ?? a.views ?? 0;
        if (bv !== av) return bv - av;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      })
      .slice(0, 20)
      .map(({ fileUrl, title, subTitle, imageUrl, globalViews, views }: any) => ({
        fileUrl,
        title,
        subTitle,
        views: globalViews ?? views ?? 0,
        imageUrl,
        isHot: false,
        isRising: false,
        trendingScore: 0,
      } as RecommendedItem));

    return fallback;
  }, [allIndexedVideos, uploadedVideos]);

  useEffect(() => {
    uploadedVideos.forEach((video) => {
      const key = getVideoKey(video.fileUrl);

      // Initialize overlay visibility in global store if not set
      if (globalVideoStore.showOverlay[key] === undefined) {
        globalVideoStore.setOverlayVisible(key, true);
      }
    });

    const trendingKeys = trendingItems.map((item) => getVideoKey(item.fileUrl));
    const viewedKeys = previouslyViewedState.map((item) => getVideoKey(item.fileUrl));

    [...trendingKeys, ...viewedKeys].forEach((key) => {
      setShowOverlayMini((prev) => {
        if (prev[key]) return prev;
        return { ...prev, [key]: true };
      });
    });
  }, [uploadedVideos, trendingItems, previouslyViewedState]);

  // Initialize video stats from persisted data and library store
  useEffect(() => {
    const initializeVideoStats = async () => {
      if (uploadedVideos && uploadedVideos.length > 0) {
        console.log("📚 VideoComponent: Initializing video stats for", uploadedVideos.length, "videos");
        
        const persistedStats = await getPersistedStats();
        const newStats: Record<string, any> = {};
        
        for (const video of uploadedVideos) {
          const key = getVideoKey(video.fileUrl);
          const isUserSaved = libraryStore.isItemSaved(key);
          const videoStats = persistedStats[key] || {};
          
          newStats[key] = {
            ...videoStats,
            views: videoStats.views || (video as any).viewCount || 0,
            sheared: videoStats.sheared || video.sheared || 0,
            favorite: videoStats.favorite || video.favorite || 0,
            comment: videoStats.comment || video.comment || 0,
            totalSaves: videoStats.totalSaves || video.saved || 0,
            saved: isUserSaved ? 1 : 0,
            userSaved: isUserSaved
          };
        }
        
        setVideoStats(newStats);
        console.log("✅ VideoComponent: Finished initializing video stats");
      }
    };

    initializeVideoStats();
  }, [uploadedVideos.length, libraryStore.isLoaded]);

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

  const renderVideoCard = (
    video: VideoCard,
    index: number,
    sectionId: string,
    playType: "progress" | "center" = "center"
  ) => {
    const modalKey = getVideoKey(video.fileUrl);
    const stats = videoStats[modalKey] || {};
    const isItemSaved = libraryStore.isItemSaved(modalKey);
    const videoRef = videoRefs.current[modalKey];
    const progress = progresses[modalKey] ?? 0;

    const handleVideoCardPress = () => {
      // Prepare the full video list for TikTok-style navigation
      const videoListForNavigation = uploadedVideos.map((v, vIndex) => ({
        title: v.title,
        speaker: v.speaker || v.uploadedBy || getDisplayName(v.speaker, v.uploadedBy),
        timeAgo: v.timeAgo || getTimeAgo(v.createdAt || new Date().toISOString()),
        views: videoStats[getVideoKey(v.fileUrl)]?.views || v.viewCount || 0,
        sheared: videoStats[getVideoKey(v.fileUrl)]?.sheared || v.sheared || 0,
        saved: (videoStats[getVideoKey(v.fileUrl)] as any)?.totalSaves || v.saved || 0,
        favorite: globalFavoriteCounts[getVideoKey(v.fileUrl)] || 0,
        fileUrl: v.fileUrl,
        imageUrl: v.fileUrl,
        speakerAvatar: typeof v.speakerAvatar === "string" 
          ? v.speakerAvatar 
          : require("../../assets/images/Avatar-1.png").toString(),
      }));

      router.push({
        pathname: "/reels/Reelsviewscroll",
        params: {
          title: video.title,
          speaker: video.speaker || video.uploadedBy || getDisplayName(video.speaker, video.uploadedBy),
          timeAgo: video.timeAgo || getTimeAgo(video.createdAt || new Date().toISOString()),
          views: String(stats.views || video.views || 0),
          sheared: String(stats.sheared || video.sheared || 0),
          saved: String((videoStats[modalKey] as any)?.totalSaves || video.saved || 0),
          favorite: String(globalFavoriteCounts[modalKey] || 0),
          imageUrl: video.fileUrl,
          speakerAvatar: typeof video.speakerAvatar === "string" 
            ? video.speakerAvatar 
            : require("../../assets/images/Avatar-1.png").toString(),
          category: "videos",
          videoList: JSON.stringify(videoListForNavigation),
          currentIndex: String(index),
        },
      });
    };

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const barWidth = 260;
        const x = Math.max(0, Math.min(gestureState.moveX - 50, barWidth));
        const pct = (x / barWidth) * 100;

        globalVideoStore.setVideoProgress(modalKey, pct);

        if (videoRef?.setPositionAsync && videoRef.getStatusAsync) {
          videoRef.getStatusAsync().then((status: { isLoaded: any; durationMillis: number }) => {
            if (status.isLoaded && status.durationMillis) {
              videoRef.setPositionAsync((pct / 100) * status.durationMillis);
            }
          });
        }
      },
    });

    return (
      <View key={modalKey} className="flex flex-col mb-6">
        <TouchableWithoutFeedback onPress={handleVideoCardPress}>
          <View className="w-full h-[400px] overflow-hidden relative" onLayout={(e) => {
            const { y, height } = e.nativeEvent.layout;
            videoLayoutsRef.current[modalKey] = { y, height };
          }}>
            <Video
              ref={(ref) => {
                if (ref) videoRefs.current[modalKey] = ref;
              }}
              source={{ uri: video.fileUrl }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode={ResizeMode.COVER}
              isMuted={mutedVideos[modalKey] ?? false}
              volume={mutedVideos[modalKey] ? 0.0 : videoVolume} // 🔊 Add volume control
              shouldPlay={playingVideos[modalKey] ?? false}
              useNativeControls={false}
              onPlaybackStatusUpdate={(status) => {
                if (!status.isLoaded) return;
                const pct = status.durationMillis
                  ? (status.positionMillis / status.durationMillis) * 100
                  : 0;
                globalVideoStore.setVideoProgress(modalKey, pct);
                const ref = videoRefs.current[modalKey];
                if (status.didJustFinish) {
                  ref?.setPositionAsync(0);
                  globalVideoStore.pauseVideo(modalKey);
                  globalVideoStore.setVideoCompleted(modalKey, true);
                  console.log(`🎬 Video completed: ${video.title} - Ready for view count on replay`);
                }
              }}
            />
            {/* 📱 Auto-play indicator when this card is the active auto-playing video */}
            {playingVideos[modalKey] && isAutoPlayEnabled && (globalVideoStore.currentlyVisibleVideo === modalKey) && (
              <View className="absolute top-4 left-4">
                <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                  <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  <Text className="text-white text-xs font-rubik">Auto-playing</Text>
                </View>
              </View>
            )}
            
            <View className="flex-col absolute mt-[170px] right-4" style={{ zIndex: 20 }}>
              <TouchableOpacity onPress={() => handleFavorite(modalKey, video)} className="flex-col justify-center items-center">
                <MaterialIcons
                  name={userFavorites[modalKey] ? "favorite" : "favorite-border"}
                  size={30}
                  color={userFavorites[modalKey] ? "#D22A2A" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {globalFavoriteCounts[modalKey] || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleComment(modalKey, video)} className="flex-col justify-center items-center mt-6">
                <Ionicons name="chatbubble-sharp" size={30} color="white" />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {stats.comment === 1 ? (video.comment ?? 0) + 1 : video.comment ?? 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSave(modalKey, video)} className="flex-col justify-center items-center mt-6">
                <MaterialIcons
                  name={isItemSaved ? "bookmark" : "bookmark-border"}
                  size={30}
                  color={isItemSaved ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {(videoStats[modalKey] as any)?.totalSaves || video.saved || 0}
                </Text>
              </TouchableOpacity>
            </View>
            {/* Video title - show when paused */}
            {!playingVideos[modalKey] && (
              <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
                <Text className="text-white font-rubik-semibold text-[14px]" numberOfLines={2}>
                  {video.title}
                </Text>
              </View>
            )}
            
            {/* Controls - always show but change based on playing state */}
            {playType === "progress" ? (
              <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
                <TouchableOpacity onPress={() => togglePlay(modalKey, video)}>
                  <Ionicons 
                    name={playingVideos[modalKey] ? "pause" : "play"} 
                    size={24} 
                    color="#FEA74E" 
                  />
                </TouchableOpacity>
                <View className="flex-1 h-1 bg-white/30 rounded-full relative" {...panResponder.panHandlers}>
                  <View className="h-full bg-[#FEA74E] rounded-full" style={{ width: `${progress}%` }} />
                  <View
                    style={{
                      position: "absolute",
                      left: `${progress}%`,
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
                <TouchableOpacity onPress={() => toggleMute(modalKey)}>
                  <Ionicons
                    name={mutedVideos[modalKey] ? "volume-mute" : "volume-high"}
                    size={20}
                    color="#FEA74E"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              // Center play/pause button inside a non-blocking overlay so side icons stay clickable
              <View pointerEvents="box-none" className="absolute inset-0 justify-center items-center">
                <TouchableOpacity
                  onPress={() => togglePlay(modalKey, video)}
                  activeOpacity={0.9}
                >
                  <View className={`${playingVideos[modalKey] ? 'bg-black/30' : 'bg-white/70'} p-3 rounded-full`}>
                    <Ionicons 
                      name={playingVideos[modalKey] ? "pause" : "play"} 
                      size={32} 
                      color={playingVideos[modalKey] ? "#FFFFFF" : "#FEA74E"} 
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </TouchableWithoutFeedback>
        <View className="flex-row items-center justify-between mt-1 px-3">
          <View className="flex flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
              <Image
                source={
                  typeof video.speakerAvatar === "string" && video.speakerAvatar.startsWith("http")
                    ? { uri: video.speakerAvatar.trim() }
                    : typeof video.speakerAvatar === "object" && video.speakerAvatar
                    ? video.speakerAvatar
                    : require("../../assets/images/Avatar-1.png")
                }
                style={{ width: 30, height: 30, borderRadius: 999 }}
                resizeMode={ResizeMode.COVER}
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                  {getDisplayName(video.speaker, video.uploadedBy)}
                </Text>
                <View className="flex flex-row mt-2 ml-2">
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {video.timeAgo}
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-2">
                <View className="flex-row items-center">
                  <AntDesign name="eyeo" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                    {(() => {
                      const displayViews = stats.views ?? video.views ?? 0;
                      console.log(`👁️ Displaying views for ${video.title}:`, {
                        "stats.views": stats.views,
                        "video.views": video.views,
                        "displayViews": displayViews,
                        "modalKey": modalKey,
                        "videoStats[modalKey]": videoStats[modalKey]
                      });
                      return displayViews;
                    })()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleShare(modalKey, video)} className="flex-row items-center ml-4">
                  <Feather name="send" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.sheared ?? video.sheared ?? 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { closeAllMenus(); setModalVisible(modalVisible === modalKey ? null : modalKey); }}
            className="mr-2"
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        
        {/* ✅ Invisible overlay that covers ENTIRE component for touch-outside-to-close */}
        {modalVisible === modalKey && (
          <>
            <TouchableWithoutFeedback onPress={closeAllMenus}>
              <View className="absolute inset-0 z-40" />
            </TouchableWithoutFeedback>
            
            {/* ✅ Modal content positioned over the video area */}
            <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[200px] h-[180]">
              <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-[#1D2939] font-rubik ml-2">View Details</Text>
                <Ionicons name="eye-outline" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleShare(modalKey, video)}
                className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              >
                <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
                <Feather name="send" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center justify-between mt-6" onPress={() => handleSave(modalKey, video)}>
                <Text className="text-[#1D2939] font-rubik ml-2">{isItemSaved ? "Remove from Library" : "Save to Library"}</Text>
                <MaterialIcons
                  name={isItemSaved ? "bookmark" : "bookmark-border"}
                  size={22}
                  color="#1D2939"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                className="py-2 flex-row items-center justify-between border-t border-gray-200 mt-2"
                onPress={async () => {
                  const downloadableItem = convertToDownloadableItem(video, 'video');
                  const result = await handleDownload(downloadableItem);
                  if (result.success) {
                    setModalVisible(null);
                    // Force re-render to update download status
                    await loadDownloadedItems();
                  }
                }}
              >
                <Text className="text-[#1D2939] font-rubik ml-2">
                  {checkIfDownloaded(video._id || video.fileUrl) ? "Downloaded" : "Download"}
                </Text>
                <Ionicons 
                  name={checkIfDownloaded(video._id || video.fileUrl) ? "checkmark-circle" : "download-outline"} 
                  size={24} 
                  color={checkIfDownloaded(video._id || video.fileUrl) ? "#256E63" : "#090E24"} 
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderMiniCards = (
    title: string,
    items: RecommendedItem[],
    modalIndex: number | null,
    setModalIndex: (val: number | null) => void,
    viewsState: Record<string, number>,
    setViewsState: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    playingState: Record<string, boolean>,
    setPlayingState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    hasPlayed: Record<string, boolean>,
    setHasPlayed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    hasCompleted: Record<string, boolean>,
    setHasCompleted: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => (
    <View className="mb-6">
      <Text className="text-[16px] mb-3 font-rubik-semibold text-[#344054] mt-4">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {items.map((item, index) => {
          const key = getVideoKey(item.fileUrl);
          const isPlaying = playingState[key] ?? false;
          const views = viewsState[key] ?? item.views;

          const togglePlay = () => {
            handleMiniCardPlay(
              key,
              item,
              setViewsState,
              setPlayingState,
              setHasPlayed,
              setHasCompleted
            );
          };

          const handleMiniCardPress = () => {
            // Prepare the full video list for TikTok-style navigation
            const videoListForNavigation = items.map((v) => ({
              title: v.title,
              speaker: v.subTitle || "Unknown",
              timeAgo: "Recent",
              views: v.views || 0,
              sheared: 0,
              saved: 0,
              favorite: 0,
              fileUrl: v.fileUrl,
              imageUrl: v.fileUrl,
              speakerAvatar: require("../../assets/images/Avatar-1.png").toString(),
            }));

            router.push({
              pathname: "/reels/Reelsviewscroll",
              params: {
                title: item.title,
                speaker: item.subTitle || "Unknown",
                timeAgo: "Recent",
                views: String(item.views || 0),
                sheared: String(0),
                saved: String(0),
                favorite: String(0),
                imageUrl: item.fileUrl,
                speakerAvatar: require("../../assets/images/Avatar-1.png").toString(),
                category: "videos",
                videoList: JSON.stringify(videoListForNavigation),
                currentIndex: String(index),
              },
            });
          };

          const handleShare = async () => {
            try {
              await Share.share({
                title: item.title,
                message: `Check out this video: ${item.title}\n${item.fileUrl}`,
                url: item.fileUrl,
              });
            } catch (error) {
              console.warn("Share error:", error);
            }
          };

          return (
            <View key={key} className="mr-4 w-[154px] flex-col items-center">
              <TouchableOpacity
                onPress={handleMiniCardPress}
                className="w-full h-[232px] rounded-2xl overflow-hidden relative"
                activeOpacity={0.9}
              >
                <Video
                  ref={(ref) => {
                    if (ref) miniCardRefs.current[key] = ref;
                  }}
                  source={{ uri: item.fileUrl }}
                  style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                  }}
                  resizeMode={ResizeMode.COVER}
                  isMuted={mutedVideos[key] ?? false}
                  volume={mutedVideos[key] ? 0.0 : videoVolume} // 🔊 Add volume control
                  shouldPlay={isPlaying}
                  useNativeControls={false}
                  onPlaybackStatusUpdate={(status) => {
                    if (!status.isLoaded) return;
                    if (status.didJustFinish) {
                      setPlayingState((prev: any) => ({
                        ...prev,
                        [key]: false,
                      }));
                      setMiniCardHasCompleted((prev: any) => ({
                        ...prev,
                        [key]: true,
                      }));
                      setShowOverlayMini((prev) => ({ ...prev, [key]: true }));
                      console.log(`🎬 Mini card video completed: ${item.title} - Ready for view count on replay`);
                    }
                  }}
                />
                {!isPlaying && showOverlayMini[key] && (
                  <>
                    <TouchableOpacity
                      onPress={togglePlay}
                      className="absolute inset-0 justify-center items-center"
                      activeOpacity={0.9}
                    >
                      <View className="bg-white/70 p-3 rounded-full">
                        <Ionicons name="play" size={32} color="#FEA74E" />
                      </View>
                    </TouchableOpacity>
                    

                    
                    <View className="absolute bottom-2 left-2 right-2">
                      <Text
                        className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
              {modalIndex === index && (
                <>
                  <TouchableWithoutFeedback onPress={closeAllMenus}>
                    <View className="absolute inset-0 z-40" />
                  </TouchableWithoutFeedback>
                  
                  {/* ✅ Modal content positioned over the video area */}
                  <View className="absolute bottom-14 right-3 bg-white shadow-md rounded-lg p-3 z-50 w-[160px] h-[180]">
                    <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                      <Text className="text-[#1D2939] font-rubik ml-2">View Details</Text>
                      <Ionicons name="eye-outline" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleShare}
                      className="py-2 border-b border-gray-200 flex-row items-center justify-between"
                    >
                      <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
                      <Feather name="send" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center justify-between mt-6">
                      <Text className="text-[#1D2939] font-rubik ml-2">Save to Library</Text>
                      <MaterialIcons name="bookmark-border" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="py-2 flex-row items-center justify-between mt-2"
                      onPress={async () => {
                        const downloadableItem = convertToDownloadableItem(item, 'video');
                        const result = await handleDownload(downloadableItem);
                        if (result.success) {
                          closeAllMenus();
                          // Force re-render to update download status
                          await loadDownloadedItems();
                        }
                      }}
                    >
                      <Text className="text-[#1D2939] font-rubik ml-2">
                        {checkIfDownloaded(item.fileUrl) ? "Downloaded" : "Download"}
                      </Text>
                      <Ionicons 
                        name={checkIfDownloaded(item.fileUrl) ? "checkmark-circle" : "download-outline"} 
                        size={24} 
                        color={checkIfDownloaded(item.fileUrl) ? "#256E63" : "#090E24"} 
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <View className="mt-2 flex flex-col w-full">
                <View className="flex flex-row justify-between items-center">
                  <Text
                    className="text-[12px] text-[#98A2B3] font-rubik font-medium"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.subTitle?.split(" ").slice(0, 4).join(" ") + " ..."}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { closeAllMenus(); setModalIndex(modalIndex === index ? null : index); }}
                    className="mr-2"
                  >
                    <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center">
                <AntDesign name="eyeo" size={20} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik">
                    {views}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // 🔧 Fix infinite loop: Memoize explore video arrays
  const firstExploreVideos = useMemo(() => uploadedVideos.slice(1, 5), [uploadedVideos]);
  const middleExploreVideos = useMemo(() => uploadedVideos.slice(5, 9), [uploadedVideos]); // Videos 5-8 for middle explore section
  const remainingExploreVideos = useMemo(() => uploadedVideos.slice(9), [uploadedVideos]);

  // 🎯 Enhanced Recommendation Logic Functions
  
  // Get user interests from AsyncStorage or default interests
  const getUserInterests = async (): Promise<string[]> => {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.interests || [];
      }
    } catch (error) {
      console.log("Error fetching user interests:", error);
    }
    return [];
  };

  // Load user interests into state once
  const [userInterestsState, setUserInterestsState] = useState<string[]>([]);
  useEffect(() => {
    getUserInterests().then((ints) => setUserInterestsState(
      Array.isArray(ints) ? ints.filter(Boolean).map((s) => String(s).toLowerCase()) : []
    ));
  }, []);

  // 🎯 Recommended for You - Based on user interests and engagement patterns
  const getRecommendedForYou = (): RecommendedItem[] => {
    if (!uploadedVideos.length) return [];

    return allIndexedVideos
      .filter(video => {
        // Exclude already viewed and trending videos
        const alreadyViewed = previouslyViewedState.some(v => v.fileUrl === video.fileUrl);
        const isTrending = trendingItems.some(t => t.fileUrl === video.fileUrl);
        return !alreadyViewed && !isTrending;
      })
      .map(video => {
        const originalVideo = uploadedVideos.find(v => v.fileUrl === video.fileUrl);
        let personalScore = 0;

        // Base engagement score
        const views = video.views || 0;
        const engagement = (videoStats[video.key]?.favorite || 0) * 2 + 
                          (videoStats[video.key]?.comment || 0) * 3 + 
                          (videoStats[video.key]?.saved || 0) * 2;
        
        personalScore = views + engagement;

        // Boost based on content similarity to user's viewing history
        const userViewedSpeakers = previouslyViewedState.map(v => v.subTitle);
        if (userViewedSpeakers.includes(video.subTitle)) {
          personalScore *= 1.5;
        }

        // Recency boost
        const now = new Date().getTime();
        const createdAt = new Date(originalVideo?.createdAt || Date.now()).getTime();
        const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
        const recencyBoost = Math.max(0.5, 1 - (ageInDays / 30)); // Decay over 30 days
        personalScore *= recencyBoost;

        return {
          ...video,
          personalScore
        };
      })
      .sort((a, b) => b.personalScore - a.personalScore)
      .slice(0, 8)
      .map(({ fileUrl, title, subTitle, views, imageUrl }) => ({
        fileUrl,
        title,
        subTitle,
        views,
        imageUrl
      }));
  };

  // 📚 Because You Watched - Similar content to most watched category
  const getMostWatchedCategory = (): string => {
    if (!previouslyViewedState.length) return "videos";
    
    const speakers = previouslyViewedState.map(v => v.subTitle);
    const speakerCounts = speakers.reduce((acc, speaker) => {
      acc[speaker] = (acc[speaker] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostWatchedSpeaker = Object.entries(speakerCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    return mostWatchedSpeaker || "content";
  };

  const getBecauseYouWatchedRecommendations = (): RecommendedItem[] => {
    if (!previouslyViewedState.length) return [];

    const mostWatchedSpeaker = getMostWatchedCategory();
    
    return allIndexedVideos
      .filter(video => {
        const alreadyViewed = previouslyViewedState.some(v => v.fileUrl === video.fileUrl);
        const isTrending = trendingItems.some(t => t.fileUrl === video.fileUrl);
        const isSimilar = video.subTitle === mostWatchedSpeaker || 
                         video.title.toLowerCase().includes(mostWatchedSpeaker.toLowerCase());
        
        return !alreadyViewed && !isTrending && isSimilar;
      })
      .sort((a, b) => {
        const aEngagement = (a.views || 0) + (videoStats[a.key]?.favorite || 0) * 2;
        const bEngagement = (b.views || 0) + (videoStats[b.key]?.favorite || 0) * 2;
        return bEngagement - aEngagement;
      })
      .slice(0, 6)
      .map(({ fileUrl, title, subTitle, views, imageUrl }) => ({
        fileUrl,
        title,
        subTitle,
        views,
        imageUrl
      }));
  };

  // 🔧 Fix infinite loop: Memoize enhanced recommendations
  const enhancedRecommendedForYou = useMemo((): RecommendedItem[] => {
    if (!uploadedVideos.length) return [];

    const watchedSpeakers = previouslyViewedState.length > 0 
      ? [...new Set(previouslyViewedState.map(v => (v.subTitle || '').toLowerCase()))]
      : [];

    // Derive favorite speakers from user's favorites
    const likedKeys = Object.keys(userFavorites || {}).filter(k => userFavorites[k]);
    const likedSpeakers = new Set<string>();
    likedKeys.forEach((k) => {
      const video = allIndexedVideos.find(v => v.key === k);
      if (video?.subTitle) likedSpeakers.add(String(video.subTitle).toLowerCase());
    });
    const interestKeywords = new Set<string>(userInterestsState || []);

    const scoreVideo = (video: any) => {
      const originalVideo = uploadedVideos.find(v => v.fileUrl === video.fileUrl);
      let recommendationScore = 1;

      const titleLower = (video.title || '').toLowerCase();
      const speakerLower = (video.subTitle || '').toLowerCase();

      // Strong boost if from user's favorited speakers
      const fromLikedSpeaker = likedSpeakers.has(speakerLower);
      if (fromLikedSpeaker) recommendationScore *= 3.0;

      // Medium boost if from frequently watched speakers
      const fromWatchedSpeaker = watchedSpeakers.includes(speakerLower);
      if (fromWatchedSpeaker) recommendationScore *= 1.8;

      // Keyword interest matching in title or speaker name
      let keywordMatches = 0;
      interestKeywords.forEach((kw) => {
        if (!kw) return;
        if (titleLower.includes(kw) || speakerLower.includes(kw)) keywordMatches += 1;
      });
      if (keywordMatches > 0) {
        // Scale with diminishing returns
        recommendationScore *= (1 + Math.min(0.6, 0.25 * keywordMatches));
      }

      // Recent content slight preference
      const now = new Date().getTime();
      const createdAt = new Date(originalVideo?.createdAt || Date.now()).getTime();
      const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0.75, 1 - (ageInDays / 45));
      recommendationScore *= recencyBoost;

      // Tie-breaker: low-weight global engagement
      const globalTieBreaker = (video.globalViews || 0) * 0.001 + (video.globalLikes || 0) * 0.01 + (video.globalShares || 0) * 0.02;
      recommendationScore += globalTieBreaker;

      return {
        ...video,
        recommendationScore,
        isFromFavoriteSpeaker: fromLikedSpeaker || fromWatchedSpeaker
      };
    };

    const scoredFiltered = allIndexedVideos
      // Only exclude items you've already viewed; allow overlap with Trending
      .filter(video => !previouslyViewedState.some(v => v.fileUrl === video.fileUrl))
      .map(scoreVideo)
      .sort((a, b) => b.recommendationScore - a.recommendationScore);

    const source = scoredFiltered.length > 0
      ? scoredFiltered
      // Fallback: include previously viewed if everything was filtered out
      : allIndexedVideos.map(scoreVideo).sort((a, b) => b.recommendationScore - a.recommendationScore);

    const combinedRecommendations = source
      .slice(0, 12)
      .map(({ fileUrl, title, subTitle, views, imageUrl }) => ({
        fileUrl,
        title,
        subTitle,
        views,
        imageUrl
      }));

    return combinedRecommendations;
  }, [uploadedVideos, previouslyViewedState, allIndexedVideos, trendingItems, videoStats, userFavorites, userInterestsState]);

  // Ensure Recommended for You mini-cards show the play overlay by default
  useEffect(() => {
    const recommendedKeys = enhancedRecommendedForYou.map((item) => getVideoKey(item.fileUrl));
    recommendedKeys.forEach((key) => {
      setShowOverlayMini((prev) => {
        if (prev[key]) return prev;
        return { ...prev, [key]: true };
      });
    });
  }, [enhancedRecommendedForYou]);

  // 📱 Initialize auto-play when component mounts
  useEffect(() => {
    if (uploadedVideos.length > 0 && isAutoPlayEnabled) {
      const timer = setTimeout(() => {
        recomputeVisibilityFromLayouts();
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [uploadedVideos.length, isAutoPlayEnabled, recomputeVisibilityFromLayouts]);

  // 📱 Cleanup: Pause all videos when component loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Pause all videos when leaving the screen
        globalVideoStore.pauseAllVideos();
        globalVideoStore.handleVideoVisibilityChange(null);
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      mediaStore.refreshUserDataForExistingMedia();
    }, [])
  );

  return (
    <ScrollView
      ref={scrollViewRef}
      className="flex-1 px-3 w-full"
      onScrollBeginDrag={closeAllMenus}
      onTouchStart={closeAllMenus}
      onScroll={handleScroll}
      onScrollEndDrag={() => {
        recomputeVisibilityFromLayouts();
      }}
      onMomentumScrollEnd={() => {
        recomputeVisibilityFromLayouts();
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={true}
    >
      {uploadedVideos.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            Most Recent
          </Text>
          {renderVideoCard(
            {
              fileUrl: uploadedVideos[0].fileUrl,
              title: uploadedVideos[0].title,
              speaker: uploadedVideos[0].speaker || "Unknown",
              timeAgo: getTimeAgo(uploadedVideos[0].createdAt),
              speakerAvatar:
                typeof uploadedVideos[0].speakerAvatar === "string"
                  ? uploadedVideos[0].speakerAvatar.trim()
                  : require("../../assets/images/Avatar-1.png"),
              views: uploadedVideos[0].viewCount || 0,
              favorite: uploadedVideos[0].favorite || 0,
              saved: uploadedVideos[0].saved || 0,
              sheared: uploadedVideos[0].sheared || 0,
              comment: uploadedVideos[0].comment || 0,
              createdAt: uploadedVideos[0].createdAt,
            },
            0,
            "uploaded",
            "progress"
          )}
        </>
      )}
      {renderMiniCards(
        "Previously Viewed",
        previouslyViewedState,
        pvModalIndex,
        setPvModalIndex,
        miniCardViews,
        setMiniCardViews,
        miniCardPlaying,
        setMiniCardPlaying,
        miniCardHasPlayed,
        setMiniCardHasPlayed,
        miniCardHasCompleted,
        setMiniCardHasCompleted
      )}
      {firstExploreVideos.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-3">
            Explore More Videos
          </Text>
          <View className="gap-8">
            {firstExploreVideos.map((video, index) =>
              renderVideoCard(
                {
                  fileUrl: video.fileUrl,
                  title: video.title,
                  speaker: video.speaker || "Unknown",
                  timeAgo: getTimeAgo(video.createdAt),
                  speakerAvatar:
                    typeof video.speakerAvatar === "string"
                      ? video.speakerAvatar.trim()
                      : require("../../assets/images/Avatar-1.png"),
                  views: video.viewCount || 0,
                  favorite: video.favorite || 0,
                  saved: video.saved || 0,
                  sheared: video.sheared || 0,
                  comment: video.comment || 0,
                  createdAt: video.createdAt,
                },
                index + 1,
                "explore-early",
                "center"
              )
            )}
          </View>
        </>
      )}
      {/* 🔥 Trending Section with Enhanced Social Media Features */}
      {trendingItems.length > 0 ? (
        renderMiniCards(
          `Trending Now • ${trendingItems.length} videos`,
          trendingItems,
          trendingModalIndex,
          setTrendingModalIndex,
          miniCardViews,
          setMiniCardViews,
          miniCardPlaying,
          setMiniCardPlaying,
          miniCardHasPlayed,
          setMiniCardHasPlayed,
          miniCardHasCompleted,
          setMiniCardHasCompleted
        )
      ) : (
        <View className="mt-5 mb-4">
          <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">
            Trending Now
          </Text>
          <View className="bg-gray-50 rounded-lg p-6 mx-2 items-center">
            <Text className="text-[32px] mb-2">📈</Text>
            <Text className="text-[14px] font-rubik-medium text-[#98A2B3] text-center">
              No trending videos yet
            </Text>
            <Text className="text-[12px] font-rubik text-[#D0D5DD] text-center mt-1">
              Keep engaging with content to see trending videos here
            </Text>
          </View>
        </View>
      )}

      {/* 🎥 Continue Exploring - More Videos */}
      {middleExploreVideos.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
           Exploring More
          </Text>
          <View className="gap-8">
            {middleExploreVideos.map((video, index) =>
              renderVideoCard(
                {
                  fileUrl: video.fileUrl,
                  title: video.title,
                  speaker: video.speaker || "Unknown",
                  timeAgo: getTimeAgo(video.createdAt),
                  speakerAvatar:
                    typeof video.speakerAvatar === "string"
                      ? video.speakerAvatar.trim()
                      : require("../../assets/images/Avatar-1.png"),
                  views: video.viewCount || 0,
                  favorite: video.favorite || 0,
                  saved: video.saved || 0,
                  sheared: video.sheared || 0,
                  comment: video.comment || 0,
                  createdAt: video.createdAt,
                },
                index + 50, // Different index range to avoid conflicts
                "explore-middle",
                "center"
              )
            )}
          </View>
        </>
      )}

      {/* 🎯 Enhanced Recommendation Sections */}
      {enhancedRecommendedForYou.length > 0 && (
        renderMiniCards(
          `Recommended for You • ${enhancedRecommendedForYou.length} videos`,
          enhancedRecommendedForYou,
          recommendedModalIndex,
          setRecommendedModalIndex,
          miniCardViews,
          setMiniCardViews,
          miniCardPlaying,
          setMiniCardPlaying,
          miniCardHasPlayed,
          setMiniCardHasPlayed,
          miniCardHasCompleted,
          setMiniCardHasCompleted
        )
      )}

      {remainingExploreVideos.length > 0 && (
        <>
          <Text className="text-[#344054] text-[16px] font-rubik-semibold my-4">
            More Videos
          </Text>
          <View className="gap-8">
            {remainingExploreVideos.map((video, index) =>
              renderVideoCard(
                {
                  fileUrl: video.fileUrl,
                  title: video.title,
                  speaker: video.speaker || "Unknown",
                  timeAgo: getTimeAgo(video.createdAt),
                  speakerAvatar:
                    typeof video.speakerAvatar === "string"
                      ? video.speakerAvatar.trim()
                      : require("../../assets/images/Avatar-1.png"),
                  views: video.viewCount || 0,
                  favorite: video.favorite || 0,
                  saved: video.saved || 0,
                  sheared: video.sheared || 0,
                  comment: video.comment || 0,
                  createdAt: video.createdAt,
                },
                index + 100,
                "explore-remaining",
                "center"
              )
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}