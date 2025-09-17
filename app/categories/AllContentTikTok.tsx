import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
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
  BackHandler,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CommentIcon from "../components/CommentIcon";
import { useCommentModal } from "../context/CommentModalContext";
import useVideoViewport from "../hooks/useVideoViewport";
import { useDownloadStore } from "../store/useDownloadStore";
import { useGlobalMediaStore } from "../store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import allMediaAPI from "../utils/allMediaAPI";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../utils/downloadUtils";
import {
  getFavoriteState,
  getPersistedStats,
  getViewed,
  persistStats,
  persistViewed,
  toggleFavorite,
} from "../utils/persistentStorage";
import {
  getDisplayName,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
} from "../utils/userValidation";

// Define interface for media items
interface MediaItem {
  _id?: string; // Use _id as it appears in the code
  contentType: string;
  fileUrl: string;
  title: string;
  speaker?: string;
  uploadedBy?: string;
  description?: string;
  createdAt: string;
  speakerAvatar?: string | number | { uri: string };
  views?: number;
  sheared?: number;
  saved?: number;
  comment?: number;
  favorite?: number;
  imageUrl?: string | { uri: string };
}

function AllContentTikTok() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  // 📱 Viewport detection for auto-play
  const { calculateVideoVisibility } = useVideoViewport();

  // Use the TikTok-style all content endpoints
  const {
    allContent,
    allContentLoading,
    allContentError,
    allContentTotal,
    fetchAllContent,
    refreshAllContent,
    // Keep default content as fallback
    defaultContent,
    defaultContentLoading,
    defaultContentError,
    defaultContentPagination,
    fetchDefaultContent,
    loadMoreDefaultContent,
    refreshDefaultContent,
  } = useMediaStore();

  // Function to convert signed URLs to public URLs
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
        `🔗 Converted URL: ${signedUrl.substring(
          0,
          100
        )}... → ${publicUrl.substring(0, 100)}...`
      );

      return publicUrl;
    } catch (error) {
      console.warn("⚠️ Error converting URL:", error);
      return signedUrl; // Return original if conversion fails
    }
  };

  // Transform API response to match our MediaItem interface
  const mediaList: MediaItem[] = useMemo(() => {
    // Prioritize allContent over defaultContent
    const sourceData = allContent.length > 0 ? allContent : defaultContent;

    if (!sourceData || !Array.isArray(sourceData)) return [];

    const transformed = sourceData.map((item: any) => {
      // Convert signed URL to public URL for videos
      const publicUrl =
        item.contentType === "video"
          ? convertToPublicUrl(item.mediaUrl || item.fileUrl)
          : item.mediaUrl || item.fileUrl;

      const transformedItem = {
        _id: item._id,
        title: item.title,
        description: item.description,
        contentType: item.contentType,
        fileUrl: publicUrl, // Use converted public URL
        thumbnailUrl: item.thumbnailUrl,
        speaker:
          item.authorInfo?.firstName || item.author?.firstName
            ? `${item.authorInfo?.firstName || item.author?.firstName} ${
                item.authorInfo?.lastName || item.author?.lastName
              }`
            : "Unknown",
        uploadedBy: item.authorInfo?._id || item.author?._id,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        views: item.viewCount || item.totalViews || 0,
        sheared: item.shareCount || item.totalShares || 0,
        saved: 0, // Default value
        comment: item.commentCount || 0,
        favorite: item.likeCount || item.totalLikes || 0,
        imageUrl: item.thumbnailUrl,
        speakerAvatar: item.authorInfo?.avatar || item.author?.avatar,
      };

      // Debug logging for URL mapping
      if (item.contentType === "video") {
        console.log(`🔄 Mapping video "${item.title}":`, {
          originalMediaUrl: item.mediaUrl || item.fileUrl,
          convertedPublicUrl: publicUrl,
          mappedFileUrl: transformedItem.fileUrl,
          contentType: item.contentType,
          _id: item._id,
        });
      }

      return transformedItem;
    });

    return transformed;
  }, [allContent, defaultContent]);

  // ✅ Use global video store for cross-component video management
  const globalVideoStore = useGlobalVideoStore();
  const globalMediaStore = useGlobalMediaStore();

  // ✅ Use library store for saving content
  const libraryStore = useLibraryStore();

  // ✅ Use global comment modal and interaction store
  const { showCommentModal } = useCommentModal();
  const { comments } = useInteractionStore();

  // 🔧 Fix infinite loop: Use useMemo to memoize filtered arrays
  const allVideos = useMemo(
    () => mediaList.filter((item) => item.contentType === "video"),
    [mediaList]
  );

  const otherContent = useMemo(
    () => mediaList.filter((item) => item.contentType !== "video"),
    [mediaList]
  );

  // 🎵 Music items (audio with thumbnails)
  const allMusic = useMemo(
    () => mediaList.filter((item) => item.contentType === "audio"),
    [mediaList]
  );

  // 📖 Sermon items (can be either audio or video)
  const allSermons = useMemo(
    () => mediaList.filter((item) => item.contentType === "sermon"),
    [mediaList]
  );

  // 📚 Ebook items (PDF and EPUB files) - API returns "image" for PDFs
  const allEbooks = useMemo(() => {
    const ebooks = mediaList.filter(
      (item) =>
        item.contentType === "image" ||
        item.contentType === "ebook" ||
        item.contentType === "books"
    );
    console.log(
      "📚 All ebooks found:",
      ebooks.length,
      ebooks.map((e) => ({ title: e.title, contentType: e.contentType }))
    );
    return ebooks;
  }, [mediaList]);

  // Debug: Log all media items to help identify URL issues
  useEffect(() => {
    console.log("🔍 Debug: Raw API data:", defaultContent);
    console.log("🔍 Debug: Transformed media items:", mediaList.length);
    console.log("🔍 Debug: Videos:", allVideos.length);
    console.log("🔍 Debug: Music:", allMusic.length);
    console.log("🔍 Debug: Ebooks:", allEbooks.length);

    mediaList.forEach((item, index) => {
      console.log(`📱 Item ${index + 1}:`, {
        title: item.title,
        contentType: item.contentType,
        fileUrl: item.fileUrl,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        _id: item._id,
      });
    });
  }, [
    mediaList,
    defaultContent,
    allVideos.length,
    allMusic.length,
    allEbooks.length,
  ]);

  // 🕘 Most Recent item (videos, music, sermons, or ebooks) to appear on top
  const mostRecentItem = useMemo(() => {
    const candidates = [...allVideos, ...allMusic, ...allSermons, ...allEbooks];
    if (candidates.length === 0) return null as MediaItem | null;
    const sorted = [...candidates].sort((a, b) => {
      const ad = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
    return sorted[0] || null;
  }, [allVideos, allMusic, allSermons, allEbooks]);

  const recentId = mostRecentItem?._id;
  const videosExcludingRecent = useMemo(
    () => (recentId ? allVideos.filter((v) => v._id !== recentId) : allVideos),
    [allVideos, recentId]
  );
  const musicExcludingRecent = useMemo(
    () => (recentId ? allMusic.filter((m) => m._id !== recentId) : allMusic),
    [allMusic, recentId]
  );
  const sermonsExcludingRecent = useMemo(
    () =>
      recentId ? allSermons.filter((s) => s._id !== recentId) : allSermons,
    [allSermons, recentId]
  );
  const ebooksExcludingRecent = useMemo(
    () => (recentId ? allEbooks.filter((e) => e._id !== recentId) : allEbooks),
    [allEbooks, recentId]
  );

  // 🎵 Audio playback state for Music items
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [soundMap, setSoundMap] = useState<Record<string, Audio.Sound>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [pausedAudioMap, setPausedAudioMap] = useState<Record<string, number>>(
    {}
  );
  const [audioProgressMap, setAudioProgressMap] = useState<
    Record<string, number>
  >({}); // 0..1
  const [audioDurationMap, setAudioDurationMap] = useState<
    Record<string, number>
  >({});
  const [audioMuteMap, setAudioMuteMap] = useState<Record<string, boolean>>({});

  // Use refs to access current state values without causing re-renders
  const playingAudioIdRef = useRef<string | null>(null);
  const soundMapRef = useRef<Record<string, Audio.Sound>>({});

  // Track failed video loads for fallback to thumbnails
  const [failedVideoLoads, setFailedVideoLoads] = useState<Set<string>>(
    new Set()
  );

  // Function to retry loading failed videos
  const retryVideoLoad = (itemId: string) => {
    setFailedVideoLoads((prev) => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  // Update refs when state changes
  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  useEffect(() => {
    soundMapRef.current = soundMap;
  }, [soundMap]);

  // Load content on mount - prioritize TikTok-style endpoints
  useEffect(() => {
    console.log("🚀 AllContentTikTok: Loading content from backend...");
    console.log(
      "🌐 API Base URL:",
      process.env.EXPO_PUBLIC_API_URL || "https://jevahapp-backend.onrender.com"
    );

    // Test available endpoints first
    allMediaAPI.testAvailableEndpoints();

    // Try TikTok-style all content endpoints first
    refreshAllContent();
  }, [refreshAllContent]);

  // Try to refresh a stale/expired media URL from backend by title and type
  const tryRefreshMediaUrl = useCallback(
    async (item: MediaItem): Promise<string | null> => {
      try {
        const response = await allMediaAPI.getAllMedia({
          search: item.title,
          contentType: item.contentType as any,
          limit: 1,
        });
        const fresh = (response as any)?.media?.[0];
        if (fresh?.fileUrl) {
          // Note: We don't directly update the store here as it's managed by useMediaStore
          // The refresh will be handled by the store's refresh mechanism
          return fresh.fileUrl as string;
        }
      } catch (e) {
        console.log("🔁 Refresh media URL failed:", e);
      }
      return null;
    },
    []
  );

  // 🛑 Stop audio when component loses focus (switching tabs/categories)
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Stop all audio when leaving this component
        const stopAllAudio = async () => {
          try {
            const currentPlayingId = playingAudioIdRef.current;
            const currentSoundMap = soundMapRef.current;

            // Pause currently playing audio
            if (currentPlayingId && currentSoundMap[currentPlayingId]) {
              await currentSoundMap[currentPlayingId].pauseAsync();
              const status = await currentSoundMap[
                currentPlayingId
              ].getStatusAsync();
              if (status.isLoaded) {
                setPausedAudioMap((prev) => ({
                  ...prev,
                  [currentPlayingId]: status.positionMillis ?? 0,
                }));
              }
            }
            setPlayingAudioId(null);
          } catch (error) {
            console.log("Error stopping audio on focus loss:", error);
          }
        };
        stopAllAudio();
      };
    }, []) // No dependencies to prevent unnecessary re-runs
  );

  const playAudio = async (uri: string, id: string) => {
    if (!uri) return;
    if (isLoadingAudio) return;

    // Debug logging for audio URLs
    console.log(`🎵 Playing audio "${id}":`, {
      audioUri: uri,
      id: id,
    });

    setIsLoadingAudio(true);

    try {
      // Use global media store to pause all other media and play this audio
      globalMediaStore.playMediaGlobally(id, "audio");

      // Pause currently playing if different
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
          // Clean up invalid sound reference
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[playingAudioId];
            return updated;
          });
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

              let duration = audioDurationMap[id];
              if (!duration) {
                const updated = await existing.getStatusAsync();
                if (updated.isLoaded && updated.durationMillis) {
                  duration = updated.durationMillis;
                  setAudioDurationMap((prev) => ({ ...prev, [id]: duration! }));
                }
              }
              setAudioProgressMap((prev) => ({
                ...prev,
                [id]: (resumePos || 0) / Math.max(duration || 1, 1),
              }));
            }
            setIsLoadingAudio(false);
            return;
          } else {
            // Sound exists but not loaded, clean it up
            try {
              await existing.unloadAsync();
            } catch {}
            setSoundMap((prev) => {
              const updated = { ...prev };
              delete updated[id];
              return updated;
            });
          }
        } catch (error) {
          console.warn("⚠️ Error with existing sound:", error);
          // Clean up invalid sound reference
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
        }
      }

      // Create new sound instance
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
      // Clean up any partial state
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

  // Log items with missing _id for debugging
  useEffect(() => {
    const itemsWithoutId = mediaList.filter((item) => !item._id);
    if (itemsWithoutId.length > 0) {
      console.warn("Items with missing _id:", itemsWithoutId);
    }
  }, [mediaList]);

  const getContentKey = (item: MediaItem) =>
    `${item.contentType}-${
      item._id || Math.random().toString(36).substring(2)
    }`;
  const getAudioKey = (fileUrl: string): string => `Audio-${fileUrl}`;
  const [contentStats, setContentStats] = useState<Record<string, any>>({});
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);

  // 🎯 New favorite system state
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>(
    {}
  );
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<
    Record<string, number>
  >({});

  // Video control state
  const videoRefs = useRef<Record<string, any>>({});
  const [videoVolume, setVideoVolume] = useState<number>(1.0); // 🔊 Add volume control
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [viewCounted, setViewCounted] = useState<Record<string, boolean>>({});

  // 📱 Scroll-based auto-play state
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

  // ✅ Get video state from global store
  const playingVideos = globalVideoStore.playingVideos;
  const mutedVideos = globalVideoStore.mutedVideos;
  const progresses = globalVideoStore.progresses;
  const showOverlay = globalVideoStore.showOverlay;
  const hasCompleted = globalVideoStore.hasCompleted;
  const isAutoPlayEnabled = globalVideoStore.isAutoPlayEnabled;
  const handleVideoVisibilityChange =
    globalVideoStore.handleVideoVisibilityChange;
  // Note: Using contentStats for all statistics instead of separate videoStats

  const toggleMute = (key: string) => globalVideoStore.toggleVideoMute(key);

  // 🔁 Helper: try to refresh stale media URL then play audio
  const playMusicWithRefresh = useCallback(
    async (item: MediaItem, id: string) => {
      const uri = item.fileUrl;
      if (!uri || String(uri).trim() === "") {
        const fresh = await tryRefreshMediaUrl(item);
        if (fresh) {
          playAudio(fresh, id);
        }
      } else {
        playAudio(uri, id);
      }
    },
    [playAudio]
  );

  // 🔁 Helper: try to refresh stale media URL for video/sermon cards
  const getRefreshedVideoUrl = useCallback(
    async (item: MediaItem): Promise<string> => {
      const uri = item.fileUrl;
      if (!uri || String(uri).trim() === "") {
        const fresh = await tryRefreshMediaUrl(item);
        return fresh || uri;
      }
      return uri;
    },
    [tryRefreshMediaUrl]
  );

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

  const handleVideoTap = (key: string, video?: MediaItem, index?: number) => {
    // Navigate to reels view with the video list for swipeable navigation
    if (video && index !== undefined) {
      console.log(`📱 Video tapped to navigate to reels: ${video.title}`);

      // Pause all videos before navigation
      globalVideoStore.pauseAllVideos();
      setCurrentlyVisibleVideo(null);

      // Prepare the full video list for TikTok-style navigation
      const videoListForNavigation = allVideos.map((v, idx) => ({
        title: v.title,
        speaker: getDisplayName(v.speaker, v.uploadedBy),
        timeAgo: getTimeAgo(v.createdAt),
        views: contentStats[getContentKey(v)]?.views || v.views || 0,
        sheared: contentStats[getContentKey(v)]?.sheared || v.sheared || 0,
        saved: contentStats[getContentKey(v)]?.saved || v.saved || 0,
        favorite: globalFavoriteCounts[getContentKey(v)] || v.favorite || 0,
        fileUrl: v.fileUrl || "", // Will be refreshed in reels if empty
        imageUrl: v.fileUrl,
        speakerAvatar:
          typeof v.speakerAvatar === "string"
            ? v.speakerAvatar
            : v.speakerAvatar || require("../../assets/images/Avatar-1.png"),
        _id: v._id,
        contentType: v.contentType,
        description: v.description,
        createdAt: v.createdAt,
        uploadedBy: v.uploadedBy,
      }));

      router.push({
        pathname: "/reels/Reelsviewscroll",
        params: {
          title: video.title,
          speaker: getDisplayName(video.speaker, video.uploadedBy),
          timeAgo: getTimeAgo(video.createdAt),
          views: String(
            contentStats[getContentKey(video)]?.views || video.views || 0
          ),
          sheared: String(
            contentStats[getContentKey(video)]?.sheared || video.sheared || 0
          ),
          saved: String(
            contentStats[getContentKey(video)]?.saved || video.saved || 0
          ),
          favorite: String(
            globalFavoriteCounts[getContentKey(video)] || video.favorite || 0
          ),
          imageUrl: video.fileUrl || "",
          speakerAvatar:
            typeof video.speakerAvatar === "string"
              ? video.speakerAvatar
              : video.speakerAvatar ||
                require("../../assets/images/Avatar-1.png").toString(),
          category: "videos",
          videoList: JSON.stringify(videoListForNavigation),
          currentIndex: String(index),
        },
      });
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      const x = Math.max(0, Math.min(gestureState.moveX - 50, 260));
      const pct = (x / 260) * 100;

      const activeKey = Object.keys(playingVideos).find(
        (k) => playingVideos[k]
      );
      if (activeKey) {
        const ref = videoRefs.current[activeKey];
        if (ref?.getStatusAsync && ref?.setPositionAsync) {
          ref
            .getStatusAsync()
            .then((status: { isLoaded: any; durationMillis: number }) => {
              if (status.isLoaded && status.durationMillis) {
                ref.setPositionAsync((pct / 100) * status.durationMillis);
              }
            });
        }

        globalVideoStore.setVideoProgress(activeKey, pct);
      }
    },
  });

  // 🔊 Initialize audio settings
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log("🔊 AllContent: Initializing audio settings...");

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
        allVideos.forEach((video, index) => {
          const key = `video-${video._id || video.fileUrl || index}`;
          // Check if video is muted and unmute it
          if (globalVideoStore.mutedVideos[key]) {
            globalVideoStore.toggleVideoMute(key);
          }
        });

        console.log(
          "✅ AllContent: Audio session configured, all videos unmuted with volume 1.0"
        );
      } catch (error) {
        console.error(
          "❌ AllContent: Failed to initialize audio session:",
          error
        );
        // Fallback: still set volume and unmute videos
        setVideoVolume(1.0);
        allVideos.forEach((video, index) => {
          const key = `video-${video._id || video.fileUrl || index}`;
          // Check if video is muted and unmute it
          if (globalVideoStore.mutedVideos[key]) {
            globalVideoStore.toggleVideoMute(key);
          }
        });
      }
    };

    initializeAudio();
  }, [allVideos]);

  useEffect(() => {
    allVideos.forEach((v, index) => {
      const key = `video-${v._id || v.fileUrl || index}`;
      // Initialize overlay visibility in global store if not set
      if (globalVideoStore.showOverlay[key] === undefined) {
        globalVideoStore.setOverlayVisible(key, true);
      }
    });
  }, [allVideos]);

  // 📱 Handle scroll events to detect video visibility
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isAutoPlayEnabled) return;

      const { contentOffset, layoutMeasurement } = event.nativeEvent;
      const scrollY = contentOffset.y;
      const screenHeight = layoutMeasurement.height;
      lastScrollYRef.current = scrollY;
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;

      let mostVisibleKey: string | null = null;
      let maxRatio = 0;

      Object.entries(contentLayoutsRef.current).forEach(([key, layout]) => {
        const itemTop = layout.y;
        const itemBottom = layout.y + layout.height;
        const intersectionTop = Math.max(viewportTop, itemTop);
        const intersectionBottom = Math.min(viewportBottom, itemBottom);
        const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
        const ratio = visibleHeight / Math.max(1, layout.height);
        if (ratio > maxRatio) {
          maxRatio = ratio;
          mostVisibleKey = key;
        }
      });

      // Require minimal visibility to avoid flicker at edges
      const selectedKey: string | null =
        maxRatio >= 0.15 ? mostVisibleKey : null;
      // Control playback across videos and music using recorded content types
      const entry = selectedKey ? contentLayoutsRef.current[selectedKey] : null;
      if (entry?.type === "video") {
        // Pause any audio and play the visible video
        pauseAllAudio();
        // Auto-play disabled: do not trigger visibility-based video play
        // handleVideoVisibilityChange(selectedKey);
        setCurrentlyVisibleVideo(selectedKey);
      } else if (entry?.type === "music") {
        // Pause all videos and play this audio
        globalVideoStore.pauseAllVideos();
        if (entry.uri && selectedKey) {
          playAudio(entry.uri, selectedKey);
        }
        // Auto-play disabled: do not affect global video visibility
        // handleVideoVisibilityChange(null);
        setCurrentlyVisibleVideo(null);
      } else {
        // Nothing clearly visible; pause all
        globalVideoStore.pauseAllVideos();
        pauseAllAudio();
        // Auto-play disabled: do not affect global video visibility
        // handleVideoVisibilityChange(null);
        setCurrentlyVisibleVideo(null);
      }
    },
    [isAutoPlayEnabled, allVideos, handleVideoVisibilityChange]
  );

  const recomputeVisibilityFromLayouts = useCallback(() => {
    // Auto-play is disabled - no automatic media playback based on visibility
    // Users must click to play media
    return;
  }, []);

  // 📱 Auto-play initialization disabled - users must click to play media
  useEffect(() => {
    // No automatic media playback - all media requires user interaction
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => sub.remove();
    }, [])
  );

  // 📱 Cleanup: Pause all videos and audio when component loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Pause all videos when leaving the screen
        globalVideoStore.pauseAllVideos();
        globalVideoStore.handleVideoVisibilityChange(null);
        setCurrentlyVisibleVideo(null);

        // Pause all audio when leaving the screen
        pauseAllAudio();
      };
    }, [pauseAllAudio])
  );

  useEffect(() => {
    const loadAllData = async () => {
      console.log("📱 AllContent: Loading persisted data...");
      setIsLoadingContent(true);

      // Set loading state immediately for better UX
      setContentStats({});
      setPreviouslyViewed([]);
      setUserFavorites({});
      setGlobalFavoriteCounts({});

      try {
        // Load data in parallel for better performance
        const [stats, viewed, libraryLoaded] = await Promise.all([
          getPersistedStats(),
          getViewed(),
          libraryStore.isLoaded
            ? Promise.resolve()
            : libraryStore.loadSavedItems(),
        ]);

        setContentStats(stats || {});
        setPreviouslyViewed(viewed || []);

        // Load favorite states in batches to prevent blocking
        if (mediaList.length > 0) {
          const batchSize = 10; // Process 10 items at a time
          const favoriteStates: Record<string, boolean> = {};
          const favoriteCounts: Record<string, number> = {};

          for (let i = 0; i < mediaList.length; i += batchSize) {
            const batch = mediaList.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (item) => {
                const key = getContentKey(item);
                const { isUserFavorite, globalCount } = await getFavoriteState(
                  key
                );
                favoriteStates[key] = isUserFavorite;
                favoriteCounts[key] = globalCount;
              })
            );

            // Update state incrementally for better perceived performance
            setUserFavorites((prev) => ({ ...prev, ...favoriteStates }));
            setGlobalFavoriteCounts((prev) => ({ ...prev, ...favoriteCounts }));
          }
        }

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

    // Only load if we have media items
    if (mediaList.length > 0) {
      loadAllData();
    } else {
      setIsLoadingContent(false);
    }
  }, [mediaList.length]);

  // Handle refresh - prioritize TikTok-style endpoints
  const handleRefresh = useCallback(() => {
    refreshAllContent();
  }, [refreshAllContent]);

  // Handle load more - TikTok-style endpoints don't support pagination, so this is a no-op
  const handleLoadMore = useCallback(() => {
    // TikTok-style endpoints return all content at once, no pagination needed
    console.log(
      "📱 TikTok-style endpoints don't support pagination - all content loaded at once"
    );
  }, []);

  // Handle like - same pattern as AllContentNew
  const handleLike = useCallback(async (contentId: string, liked: boolean) => {
    try {
      console.log("🔄 Like action:", contentId, liked);

      // Call the like API using the same pattern as AllContentNew
      const response = await allMediaAPI.toggleLike("media", contentId);

      if (response.success) {
        console.log("✅ Like successful:", response.data);
        // The UI will be updated through the store's state management
      } else {
        console.error("❌ Like failed:", response.error);
        // You can add notification here if needed
      }
    } catch (error) {
      console.error("❌ Like error:", error);
      // You can add notification here if needed
    }
  }, []);

  const handleShare = async (key: string, item: any) => {
    console.log("🔄 Share button clicked for:", item.title);
    try {
      const result = await Share.share({
        title: item.title,
        message: `Check this out: ${item.title}\n${item.fileUrl}`,
        url: item.fileUrl,
      });

      if (result.action === Share.sharedAction) {
        console.log("✅ Share completed successfully");
        setContentStats((prev) => {
          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              sheared: (prev[key]?.sheared || item.sheared || 0) + 1,
            },
          };
          persistStats(updated);
          return updated;
        });
      }

      // ✅ Close modal after share action
      setModalVisible(null);
    } catch (err) {
      console.warn("❌ Share error:", err);
      // ✅ Close modal even if share failed
      setModalVisible(null);
    }
  };

  const handleSave = async (key: string, item: any) => {
    console.log("🔄 Save button clicked for:", item.title);

    const isSaved = contentStats[key]?.saved === 1;

    if (!isSaved) {
      // Save to library
      const libraryItem = {
        id: key,
        contentType: item.contentType || "content",
        fileUrl: item.fileUrl,
        title: item.title,
        speaker: item.speaker,
        uploadedBy: item.uploadedBy,
        description: item.description,
        createdAt: item.createdAt || new Date().toISOString(),
        speakerAvatar: item.speakerAvatar,
        views: contentStats[key]?.views || item.views || 0,
        sheared: contentStats[key]?.sheared || item.sheared || 0,
        favorite: contentStats[key]?.favorite || item.favorite || 0,
        comment: contentStats[key]?.comment || item.comment || 0,
        saved: 1,
        imageUrl: item.imageUrl,
        thumbnailUrl:
          item.contentType === "videos"
            ? item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg"
            : item.imageUrl || item.fileUrl,
        originalKey: key,
      };

      await libraryStore.addToLibrary(libraryItem);
    } else {
      // Remove from library
      await libraryStore.removeFromLibrary(key);
    }

    setContentStats((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          saved: isSaved ? 0 : 1,
        },
      };
      persistStats(updated);
      console.log(
        `✅ Save ${isSaved ? "removed from" : "added to"} library:`,
        item.title
      );
      return updated;
    });

    // ✅ Close modal after save action
    setModalVisible(null);
  };

  const handleFavorite = async (key: string, item: any) => {
    console.log(`🎯 Handling favorite for: ${item.title}`);

    try {
      // Toggle favorite using new system
      const { isUserFavorite, globalCount } = await toggleFavorite(key);

      // Update local state immediately for UI responsiveness
      setUserFavorites((prev) => ({ ...prev, [key]: isUserFavorite }));
      setGlobalFavoriteCounts((prev) => ({ ...prev, [key]: globalCount }));

      console.log(
        `✅ Favorite ${isUserFavorite ? "added" : "removed"} for ${
          item.title
        }. Global count: ${globalCount}`
      );
    } catch (error) {
      console.error(`❌ Failed to toggle favorite for ${item.title}:`, error);
    }
  };

  const handleComment = (key: string, item: any) => {
    // Get the content ID for this item
    const contentId = item._id || key;

    // Get existing comments for this item
    const currentComments = comments[contentId] || [];
    const formattedComments = currentComments.map((comment: any) => ({
      id: comment.id,
      userName: comment.username || "Anonymous",
      avatar: comment.userAvatar || "",
      timestamp: comment.timestamp,
      comment: comment.comment,
      likes: comment.likes || 0,
      isLiked: comment.isLiked || false,
    }));

    // Show the global comment modal
    showCommentModal(formattedComments, contentId);
  };

  const incrementView = (key: string, item: any) => {
    const alreadyExists = previouslyViewed.some(
      (v) => v.fileUrl === item.fileUrl
    );

    if (!alreadyExists) {
      const thumbnailUrl =
        item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg";
      const newItem = {
        fileUrl: item.fileUrl,
        imageUrl: { uri: thumbnailUrl },
        title: item.title,
        subTitle: item.speaker || item.description || "Unknown",
        views: contentStats[key]?.views || item.views || 0,
      };

      setPreviouslyViewed((prev) => {
        const updated = [newItem, ...prev];
        persistViewed(updated);
        return updated;
      });
    }

    // ✅ Increment view count in stats
    setContentStats((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          views: (prev[key]?.views || 0) + 1,
          sheared: prev[key]?.sheared || item.sheared || 0,
          favorite: prev[key]?.favorite || item.favorite || 0,
          saved: prev[key]?.saved || item.saved || 0,
          comment: prev[key]?.comment || item.comment || 0,
        },
      };
      persistStats(updated);
      return updated;
    });
  };

  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();

  const handleDownloadPress = async (item: MediaItem) => {
    const downloadableItem = convertToDownloadableItem(
      item,
      item.contentType as "video" | "audio" | "ebook"
    );
    const result = await handleDownload(downloadableItem);
    if (result.success) {
      await loadDownloadedItems();
    }
  };

  // Close all open menus/popovers across the component
  const closeAllMenus = () => {
    setModalVisible(null);
  };

  // 📚 Render ebook card
  const renderEbookCard = (ebook: MediaItem, index: number) => {
    const modalKey = `ebook-${ebook._id || index}`;
    const key = getContentKey(ebook);
    const stats = contentStats[key] || {};
    const thumbnailSource = ebook?.imageUrl
      ? typeof ebook.imageUrl === "string"
        ? { uri: ebook.imageUrl }
        : (ebook.imageUrl as any)
      : { uri: ebook.fileUrl };

    return (
      <View key={modalKey} className="flex flex-col mb-10">
        <TouchableWithoutFeedback onPress={() => {}}>
          <View className="w-full h-[200px] overflow-hidden relative">
            <Image
              source={thumbnailSource as any}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode="cover"
            />

            {/* Content Type Icon - Top Left */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                <Ionicons name="book" size={16} color="#FFFFFF" />
              </View>
            </View>

            {/* Title overlay */}
            <View className="absolute bottom-3 left-3 right-3 px-4 py-2 rounded-md">
              <Text
                className="text-white font-semibold text-[14px]"
                numberOfLines={2}
              >
                {ebook.title}
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* Footer under the card: avatar, time and interactions */}
        <View className="flex-row items-center justify-between mt-1 px-3">
          <View className="flex flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
              <Image
                source={getUserAvatarFromContent(ebook)}
                style={{ width: 30, height: 30, borderRadius: 999 }}
                resizeMode="cover"
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                  {getUserDisplayNameFromContent(ebook)}
                </Text>
                <View className="flex flex-row mt-2 ml-2">
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {getTimeAgo(ebook.createdAt)}
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-2 items-center justify-between pl-2 pr-8">
                <View className="flex-row items-center mr-6">
                  <MaterialIcons name="visibility" size={28} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.views ?? ebook.views ?? 0}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleFavorite(key, ebook)}
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
                  onPress={() => handleComment(key, ebook)}
                >
                  <CommentIcon
                    comments={[]}
                    size={28}
                    color="#98A2B3"
                    showCount={true}
                    count={
                      stats.comment === 1
                        ? (ebook.comment ?? 0) + 1
                        : ebook.comment ?? 0
                    }
                    layout="horizontal"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSave(key, ebook)}
                  className="flex-row items-center mr-6"
                >
                  <MaterialIcons
                    name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                    size={28}
                    color={stats.saved === 1 ? "#FEA74E" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.saved === 1
                      ? (ebook.saved ?? 0) + 1
                      : ebook.saved ?? 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => handleDownloadPress(ebook)}
                >
                  <Ionicons
                    name={
                      checkIfDownloaded(ebook._id || ebook.fileUrl)
                        ? "checkmark-circle"
                        : "download-outline"
                    }
                    size={28}
                    color={
                      checkIfDownloaded(ebook._id || ebook.fileUrl)
                        ? "#256E63"
                        : "#98A2B3"
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              closeAllMenus();
              setModalVisible(modalVisible === modalKey ? null : modalKey);
            }}
            className="mr-2"
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 🎵 Render music (audio) card with thumbnail and interactions
  const renderMusicCard = (audio: MediaItem, index: number) => {
    const modalKey = `music-${audio._id || index}`;
    const key = getContentKey(audio);
    const stats = contentStats[key] || {};
    const thumbnailSource = audio?.imageUrl
      ? typeof audio.imageUrl === "string"
        ? { uri: audio.imageUrl }
        : (audio.imageUrl as any)
      : { uri: audio.fileUrl };
    const isPlaying = playingAudioId === modalKey;
    const currentProgress = audioProgressMap[modalKey] || 0;
    const isSermon = audio.contentType === "sermon";

    return (
      <View
        key={modalKey}
        className="flex flex-col mb-10"
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          contentLayoutsRef.current[modalKey] = {
            y,
            height,
            type: "music",
            uri: audio.fileUrl,
          };
        }}
      >
        <TouchableWithoutFeedback onPress={() => {}}>
          <View className="w-full h-[400px] overflow-hidden relative">
            <Image
              source={thumbnailSource as any}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode="cover"
            />

            {/* Center Play/Pause button */}
            <View className="absolute inset-0 justify-center items-center">
              <TouchableOpacity
                onPress={() => playAudio(audio.fileUrl, modalKey)}
                className="bg-white/70 p-3 rounded-full"
                activeOpacity={0.9}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={32}
                  color="#FEA74E"
                />
              </TouchableOpacity>
            </View>

            {/* Content Type Icon - Top Left */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                <Ionicons
                  name={isSermon ? "person" : "musical-notes"}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
            </View>

            {/* Bottom Controls: progress and mute, styled similar to video */}
            <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
              <TouchableOpacity
                onPress={() => playAudio(audio.fileUrl, modalKey)}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="#FEA74E"
                />
              </TouchableOpacity>
              <View className="flex-1 h-1 bg-white/30 rounded-full relative">
                <View
                  className="h-full bg-[#FEA74E] rounded-full"
                  style={{ width: `${currentProgress * 100}%` }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: `${currentProgress * 100}%`,
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
              <TouchableOpacity
                onPress={async () => {
                  const currentMuted = audioMuteMap[modalKey] ?? false;
                  const newMuted = !currentMuted;
                  setAudioMuteMap((prev) => ({
                    ...prev,
                    [modalKey]: newMuted,
                  }));
                  const snd = soundMap[modalKey];
                  if (snd) {
                    try {
                      await snd.setIsMutedAsync(newMuted);
                    } catch {}
                  }
                }}
              >
                <Ionicons
                  name={
                    audioMuteMap[modalKey] ?? false
                      ? "volume-mute"
                      : "volume-high"
                  }
                  size={20}
                  color="#FEA74E"
                />
              </TouchableOpacity>
            </View>

            {/* Title overlay above controls */}
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text
                className="text-white font-semibold text-[14px]"
                numberOfLines={2}
              >
                {audio.title}
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>

        {/* Footer under the card: avatar, time and interactions */}
        <View className="flex-row items-center justify-between mt-1 px-3">
          <View className="flex flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
              <Image
                source={getUserAvatarFromContent(audio)}
                style={{ width: 30, height: 30, borderRadius: 999 }}
                resizeMode="cover"
              />
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                  {getUserDisplayNameFromContent(audio)}
                </Text>
                <View className="flex flex-row mt-2 ml-2">
                  <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {getTimeAgo(audio.createdAt)}
                  </Text>
                </View>
              </View>
              <View className="flex-row mt-2 items-center justify-between pl-2 pr-8">
                <View className="flex-row items-center mr-6">
                  <MaterialIcons name="visibility" size={28} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.views ?? audio.views ?? 0}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleFavorite(key, audio)}
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
                  onPress={() => handleComment(key, audio)}
                >
                  <CommentIcon
                    comments={[]}
                    size={28}
                    color="#98A2B3"
                    showCount={true}
                    count={
                      stats.comment === 1
                        ? (audio.comment ?? 0) + 1
                        : audio.comment ?? 0
                    }
                    layout="horizontal"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSave(key, audio)}
                  className="flex-row items-center mr-6"
                >
                  <MaterialIcons
                    name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                    size={28}
                    color={stats.saved === 1 ? "#FEA74E" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.saved === 1
                      ? (audio.saved ?? 0) + 1
                      : audio.saved ?? 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => handleDownloadPress(audio)}
                >
                  <Ionicons
                    name={
                      checkIfDownloaded(audio._id || audio.fileUrl)
                        ? "checkmark-circle"
                        : "download-outline"
                    }
                    size={28}
                    color={
                      checkIfDownloaded(audio._id || audio.fileUrl)
                        ? "#256E63"
                        : "#98A2B3"
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => {
              closeAllMenus();
              setModalVisible(modalVisible === modalKey ? null : modalKey);
            }}
            className="mr-2"
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 📹 Render video card with TikTok-style interface
  const renderVideoCard = (video: MediaItem, index: number) => {
    const modalKey = `video-${video._id || video.fileUrl || index}`;
    const progress = progresses[modalKey] ?? 0;
    const key = getContentKey(video);
    const stats = contentStats[key] || {};
    const isSermon = video.contentType === "sermon";

    return (
      <View
        key={modalKey}
        className="flex flex-col mb-10"
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          contentLayoutsRef.current[modalKey] = { y, height, type: "video" };
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            // Navigate to reels (Instagram/TikTok-style) full screen mode when tapping video area
            handleVideoTap(modalKey, video, index);
          }}
        >
          <View className="w-full h-[400px] overflow-hidden relative">
            <Video
              ref={(ref) => {
                if (ref) videoRefs.current[modalKey] = ref;
              }}
              source={{
                uri: (() => {
                  const videoUrl =
                    video.fileUrl &&
                    video.fileUrl.trim() &&
                    video.fileUrl.trim() !==
                      "https://example.com/placeholder.mp4"
                      ? video.fileUrl.trim()
                      : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

                  // Debug logging for video URLs
                  console.log(`🎥 Video URL for "${video.title}":`, {
                    originalFileUrl: video.fileUrl,
                    finalVideoUrl: videoUrl,
                    contentType: video.contentType,
                    _id: video._id,
                    isUsingFallback: videoUrl.includes("BigBuckBunny"),
                    urlLength: video.fileUrl?.length || 0,
                  });

                  return videoUrl;
                })(),
              }}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode={ResizeMode.COVER}
              isMuted={mutedVideos[modalKey] ?? false}
              volume={mutedVideos[modalKey] ? 0.0 : videoVolume}
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
                  const contentKey = getContentKey(video);
                  if (!viewCounted[modalKey]) {
                    incrementView(contentKey, video);
                    setViewCounted((prev) => ({ ...prev, [modalKey]: true }));
                    console.log(
                      `✅ Video completed, view counted for: ${video.title}`
                    );
                  }
                  ref?.setPositionAsync(0);
                  globalVideoStore.pauseVideo(modalKey);
                  globalVideoStore.setVideoCompleted(modalKey, true);
                }
              }}
            />

            {/* ✅ Centered Play/Pause Button - always visible */}
            <View className="absolute inset-0 justify-center items-center">
              <TouchableOpacity
                onPress={(e) => {
                  // Stop event propagation to prevent going to full screen
                  e.stopPropagation();
                  // Use global media store to ensure only one media plays at a time
                  globalMediaStore.playMediaGlobally(modalKey, "video");
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

            {/* Content Type Icon - Top Left */}
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

            {/* Bottom Controls (Progress bar and Mute button) - always visible */}
            <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
              <View className="flex-1 h-1 bg-white/30 rounded-full relative">
                <View
                  className="h-full bg-[#FEA74E] rounded-full"
                  style={{ width: `${progress}%` }}
                />
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
                  onPress={() => handleFavorite(key, video)}
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
                  onPress={() => handleComment(key, video)}
                >
                  <CommentIcon
                    comments={[]}
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
                  onPress={() => handleSave(key, video)}
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
                  onPress={() => handleDownloadPress(video)}
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
            onPress={() => {
              closeAllMenus();
              setModalVisible(modalVisible === modalKey ? null : modalKey);
            }}
            className="mr-2"
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // For now, let's create a simple placeholder that shows we're implementing the new interface
  return (
    <ScrollView
      ref={scrollViewRef}
      className="flex-1"
      onScrollBeginDrag={closeAllMenus}
      onTouchStart={closeAllMenus}
      onScroll={handleScroll}
      onScrollEndDrag={() => {
        // Recompute at drag end to ensure correct active video when user stops scrolling
        recomputeVisibilityFromLayouts();
      }}
      onMomentumScrollEnd={() => {
        // Recompute at momentum end for fast flicks
        recomputeVisibilityFromLayouts();
        // Trigger load more when reaching the end
        handleLoadMore();
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={true}
      refreshControl={
        <RefreshControl
          refreshing={
            (allContentLoading || defaultContentLoading) && mediaList.length > 0
          }
          onRefresh={handleRefresh}
          colors={["#666"]}
          tintColor="#666"
        />
      }
    >
      {/* 🆕 Most Recent Section */}
      {mostRecentItem && (
        <View>
          <Text className="text-[16px] font-rubik-semibold px-4 mt-5 mb-3">
            Most Recent
          </Text>
          {renderVideoCard(mostRecentItem, 0)}
        </View>
      )}

      {/* 📹 Videos Section */}
      {videosExcludingRecent.length > 0 && (
        <View className="mt-5">
          <Text className="text-[16px] font-rubik-semibold px-4 mb-3">
            Videos
          </Text>
          {videosExcludingRecent.map((video, index) =>
            renderVideoCard(video, index + 1)
          )}
        </View>
      )}

      {/* 🎵 Music Section */}
      {musicExcludingRecent.length > 0 && (
        <View className="mt-5">
          <Text className="text-[16px] font-rubik-semibold px-4 mb-3">
            Music
          </Text>
          {musicExcludingRecent.map((audio, index) =>
            renderMusicCard(audio, index)
          )}
        </View>
      )}

      {/* 📖 Sermons Section */}
      {sermonsExcludingRecent.length > 0 && (
        <View className="mt-5">
          <Text className="text-[16px] font-rubik-semibold px-4 mb-3">
            Sermons
          </Text>
          {sermonsExcludingRecent.map((sermon, index) => {
            // Render as video if it's a video sermon, otherwise as audio
            if (
              sermon.contentType === "sermon" &&
              sermon.fileUrl?.includes("video")
            ) {
              return renderVideoCard(sermon, index);
            } else {
              return renderMusicCard(sermon, index);
            }
          })}
        </View>
      )}

      {/* 📚 Ebooks Section */}
      {ebooksExcludingRecent.length > 0 && (
        <View className="mt-5">
          <Text className="text-[16px] font-rubik-semibold px-4 mb-3">
            E-Books
          </Text>
          {ebooksExcludingRecent.map((ebook, index) =>
            renderEbookCard(ebook, index)
          )}
        </View>
      )}

      {/* Loading indicator */}
      {(allContentLoading || defaultContentLoading) && (
        <View style={{ padding: 20, alignItems: "center" }}>
          <ActivityIndicator size="small" color="#256E63" />
          <Text style={{ marginTop: 8, color: "#666", fontSize: 14 }}>
            Loading content...
          </Text>
        </View>
      )}

      {/* Error state */}
      {(allContentError || defaultContentError) && (
        <View style={{ padding: 20, alignItems: "center" }}>
          <Text style={{ color: "#FF6B6B", fontSize: 14, textAlign: "center" }}>
            {allContentError || defaultContentError}
          </Text>
        </View>
      )}

      {/* Debug info */}
      <View className="mt-5 p-4 bg-blue-100 mx-4 rounded-lg">
        <Text className="text-blue-800 font-bold mb-2">Debug Info:</Text>
        <Text className="text-blue-700">
          TikTok All Content: {allContent?.length || 0} items
        </Text>
        <Text className="text-blue-700">
          Default Content: {defaultContent?.length || 0} items
        </Text>
        <Text className="text-blue-700">
          Transformed Data: {mediaList.length} items
        </Text>
        <Text className="text-blue-700">Videos: {allVideos.length}</Text>
        <Text className="text-blue-700">Music: {allMusic.length}</Text>
        <Text className="text-blue-700">Ebooks: {allEbooks.length}</Text>
        <Text className="text-blue-700">
          All Content Loading: {allContentLoading ? "Yes" : "No"}
        </Text>
        <Text className="text-blue-700">
          Default Loading: {defaultContentLoading ? "Yes" : "No"}
        </Text>
        <Text className="text-blue-700">
          All Content Error: {allContentError || "None"}
        </Text>
        <Text className="text-blue-700">
          Default Error: {defaultContentError || "None"}
        </Text>
      </View>

      {/* Empty state */}
      {mediaList.length === 0 &&
        !allContentLoading &&
        !defaultContentLoading &&
        !allContentError &&
        !defaultContentError && (
          <Text className="text-center text-gray-500 mt-10">
            No content available yet.
          </Text>
        )}
    </ScrollView>
  );
}

export default React.memo(AllContentTikTok);
