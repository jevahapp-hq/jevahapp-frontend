import { getResponsiveSpacing } from "@/utils/responsive";
import { AntDesign, Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  Image,
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
import useVideoViewport from "../hooks/useVideoViewport";
import { useDownloadStore } from "../store/useDownloadStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import allMediaAPI from "../utils/allMediaAPI";
import { convertToDownloadableItem, useDownloadHandler } from "../utils/downloadUtils";
import { getFavoriteState, getPersistedStats, getViewed, persistStats, persistViewed, toggleFavorite } from "../utils/persistentStorage";
import { getDisplayName, getUserAvatarFromContent, getUserDisplayNameFromContent } from "../utils/userValidation";

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

export default function AllContent() {
  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;
  
  // 📱 Viewport detection for auto-play
  const { calculateVideoVisibility } = useVideoViewport();

  // Ensure mediaList is always an array and get the store
  const mediaStore = useMediaStore();
  const mediaList: MediaItem[] = mediaStore.mediaList || [];
  
  // ✅ Use global video store for cross-component video management
  const globalVideoStore = useGlobalVideoStore();
  
  // ✅ Use library store for saving content
  const libraryStore = useLibraryStore();
  
  // 🔧 Fix infinite loop: Use useMemo to memoize filtered arrays
  const allVideos = useMemo(() => 
    mediaList.filter((item) => item.contentType === "videos"), 
    [mediaList]
  );
  
  const otherContent = useMemo(() => 
    mediaList.filter((item) => item.contentType !== "videos"), 
    [mediaList]
  );

  // 🎵 Music items (audio with thumbnails)
  const allMusic = useMemo(() => 
    mediaList.filter((item) => item.contentType === "music"), 
    [mediaList]
  );

  // 📖 Sermon items (can be either audio or video)
  const allSermons = useMemo(() => 
    mediaList.filter((item) => item.contentType === "sermon"), 
    [mediaList]
  );

  // 📚 Ebook items (PDF and EPUB files)
  const allEbooks = useMemo(() => {
    const ebooks = mediaList.filter((item) => item.contentType === "ebook" || item.contentType === "books");
    console.log("📚 All ebooks found:", ebooks.length, ebooks.map(e => ({ title: e.title, contentType: e.contentType })));
    return ebooks;
  }, [mediaList]);

  // Debug: Log all media items to help identify URL issues
  useEffect(() => {
    console.log("🔍 Debug: All media items loaded:", mediaList.length);
    mediaList.forEach((item, index) => {
      console.log(`📱 Item ${index + 1}:`, {
        title: item.title,
        contentType: item.contentType,
        fileUrl: item.fileUrl,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        _id: item._id
      });
    });
  }, [mediaList]);

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
  const videosExcludingRecent = useMemo(() => 
    recentId ? allVideos.filter(v => v._id !== recentId) : allVideos,
    [allVideos, recentId]
  );
  const musicExcludingRecent = useMemo(() => 
    recentId ? allMusic.filter(m => m._id !== recentId) : allMusic,
    [allMusic, recentId]
  );
  const sermonsExcludingRecent = useMemo(() => 
    recentId ? allSermons.filter(s => s._id !== recentId) : allSermons,
    [allSermons, recentId]
  );
  const ebooksExcludingRecent = useMemo(() => 
    recentId ? allEbooks.filter(e => e._id !== recentId) : allEbooks,
    [allEbooks, recentId]
  );

  // 🎵 Audio playback state for Music items
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [soundMap, setSoundMap] = useState<Record<string, Audio.Sound>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [pausedAudioMap, setPausedAudioMap] = useState<Record<string, number>>({});
  const [audioProgressMap, setAudioProgressMap] = useState<Record<string, number>>({}); // 0..1
  const [audioDurationMap, setAudioDurationMap] = useState<Record<string, number>>({});
  const [audioMuteMap, setAudioMuteMap] = useState<Record<string, boolean>>({});

  // Use refs to access current state values without causing re-renders
  const playingAudioIdRef = useRef<string | null>(null);
  const soundMapRef = useRef<Record<string, Audio.Sound>>({});

  // Track failed video loads for fallback to thumbnails
  const [failedVideoLoads, setFailedVideoLoads] = useState<Set<string>>(new Set());

  // Function to retry loading failed videos
  const retryVideoLoad = (itemId: string) => {
    setFailedVideoLoads(prev => {
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

  // Try to refresh a stale/expired media URL from backend by title and type
  const tryRefreshMediaUrl = useCallback(async (item: MediaItem): Promise<string | null> => {
    try {
      const response = await allMediaAPI.getAllMedia({
        search: item.title,
        contentType: (item.contentType as any),
        limit: 1,
      });
      const fresh = (response as any)?.media?.[0];
      if (fresh?.fileUrl) {
        const updated = mediaStore.mediaList.map((m: any) => {
          const sameId = m._id && item._id && m._id === item._id;
          const sameTitleAndType = m.title === item.title && m.contentType === item.contentType;
        return (sameId || sameTitleAndType)
            ? { ...m, fileUrl: fresh.fileUrl, thumbnailUrl: fresh.thumbnailUrl || m.thumbnailUrl }
            : m;
        });
        mediaStore.setMediaList(updated as any);
        return fresh.fileUrl as string;
      }
    } catch (e) {
      console.log("🔁 Refresh media URL failed:", e);
    }
    return null;
  }, [mediaStore.mediaList]);

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
              const status = await currentSoundMap[currentPlayingId].getStatusAsync();
              if (status.isLoaded) {
                setPausedAudioMap((prev) => ({ ...prev, [currentPlayingId]: status.positionMillis ?? 0 }));
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
    setIsLoadingAudio(true);
    try {
      // Pause currently playing if different
      if (playingAudioId && playingAudioId !== id && soundMap[playingAudioId]) {
        try {
          await soundMap[playingAudioId].pauseAsync();
          const status = await soundMap[playingAudioId].getStatusAsync();
          if (status.isLoaded) {
            setPausedAudioMap((prev) => ({ ...prev, [playingAudioId]: status.positionMillis ?? 0 }));
          }
        } catch {}
      }

      const existing = soundMap[id];
      if (existing) {
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
            setAudioProgressMap((prev) => ({ ...prev, [id]: (resumePos || 0) / Math.max(duration || 1, 1) }));
          }
          setIsLoadingAudio(false);
          return;
        } else {
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
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
      if (initial.isLoaded && typeof initial.durationMillis === 'number') {
        const safeDur = initial.durationMillis || 1;
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));
        setAudioProgressMap((prev) => ({ ...prev, [id]: (resumePos || 0) / safeDur }));
      }

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (!status.isLoaded || typeof status.durationMillis !== 'number') return;
        const safeDur = status.durationMillis || 1;
        setAudioProgressMap((prev) => ({ ...prev, [id]: (status.positionMillis || 0) / safeDur }));
        setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));
        if (status.didJustFinish) {
          try { await sound.unloadAsync(); } catch {}
          setSoundMap((prev) => { const u = { ...prev }; delete u[id]; return u; });
          setPlayingAudioId((curr) => (curr === id ? null : curr));
          setPausedAudioMap((prev) => ({ ...prev, [id]: 0 }));
          setAudioProgressMap((prev) => ({ ...prev, [id]: 0 }));
        }
      });
    } catch (err) {
      console.error('❌ Audio playback error:', err);
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
          try { await snd.pauseAsync(); } catch {}
        }
      }
      setPlayingAudioId(null);
    } catch {}
  }, [soundMap]);

  // Log items with missing _id for debugging
  useEffect(() => {
    const itemsWithoutId = mediaList.filter((item) => !item._id);
    if (itemsWithoutId.length > 0) {
      console.warn("Items with missing _id:", itemsWithoutId);
    }
  }, [mediaList]);

  const getContentKey = (item: MediaItem) => `${item.contentType}-${item._id || Math.random().toString(36).substring(2)}`;
  const getAudioKey = (fileUrl: string): string => `Audio-${fileUrl}`;
  const [contentStats, setContentStats] = useState<Record<string, any>>({});
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);
  
  // 🎯 New favorite system state
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>({});
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<Record<string, number>>({});

  // Video control state
  const videoRefs = useRef<Record<string, any>>({});
  const [videoVolume, setVideoVolume] = useState<number>(1.0); // 🔊 Add volume control
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [viewCounted, setViewCounted] = useState<Record<string, boolean>>({});
  
  // 📱 Scroll-based auto-play state
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentlyVisibleVideo, setCurrentlyVisibleVideo] = useState<string | null>(null);
  const contentLayoutsRef = useRef<Record<string, { y: number; height: number; type: 'video' | 'music'; uri?: string }>>({});
  const lastScrollYRef = useRef<number>(0);
  
  // ✅ Get video state from global store
  const playingVideos = globalVideoStore.playingVideos;
  const mutedVideos = globalVideoStore.mutedVideos;
  const progresses = globalVideoStore.progresses;
  const showOverlay = globalVideoStore.showOverlay;
  const hasCompleted = globalVideoStore.hasCompleted;
  const isAutoPlayEnabled = globalVideoStore.isAutoPlayEnabled;
  const handleVideoVisibilityChange = globalVideoStore.handleVideoVisibilityChange;
  // Note: Using contentStats for all statistics instead of separate videoStats

  const toggleMute = (key: string) =>
    globalVideoStore.toggleVideoMute(key);

  // 🔁 Helper: try to refresh stale media URL then play audio
  const playMusicWithRefresh = useCallback(async (item: MediaItem, id: string) => {
    const uri = item.fileUrl;
    if (!uri || String(uri).trim() === "") {
      const fresh = await tryRefreshMediaUrl(item);
      if (fresh) {
        playAudio(fresh, id);
      }
    } else {
      playAudio(uri, id);
    }
  }, [playAudio]);

  // 🔁 Helper: try to refresh stale media URL for video/sermon cards
  const getRefreshedVideoUrl = useCallback(async (item: MediaItem): Promise<string> => {
    const uri = item.fileUrl;
    if (!uri || String(uri).trim() === "") {
      const fresh = await tryRefreshMediaUrl(item);
      return fresh || uri;
    }
    return uri;
  }, [tryRefreshMediaUrl]);

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
        speakerAvatar: typeof v.speakerAvatar === "string" 
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
          views: String(contentStats[getContentKey(video)]?.views || video.views || 0),
          sheared: String(contentStats[getContentKey(video)]?.sheared || video.sheared || 0),
          saved: String(contentStats[getContentKey(video)]?.saved || video.saved || 0),
          favorite: String(globalFavoriteCounts[getContentKey(video)] || video.favorite || 0),
          imageUrl: video.fileUrl || "",
          speakerAvatar: typeof video.speakerAvatar === "string" 
            ? video.speakerAvatar 
            : video.speakerAvatar || require("../../assets/images/Avatar-1.png").toString(),
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

      const activeKey = Object.keys(playingVideos).find((k) => playingVideos[k]);
      if (activeKey) {
        const ref = videoRefs.current[activeKey];
        if (ref?.getStatusAsync && ref?.setPositionAsync) {
          ref.getStatusAsync().then((status: { isLoaded: any; durationMillis: number }) => {
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
        
        console.log("✅ AllContent: Audio session configured, all videos unmuted with volume 1.0");
      } catch (error) {
        console.error("❌ AllContent: Failed to initialize audio session:", error);
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
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
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
    const selectedKey: string | null = maxRatio >= 0.15 ? mostVisibleKey : null;
    // Control playback across videos and music using recorded content types
    const entry = selectedKey ? contentLayoutsRef.current[selectedKey] : null;
    if (entry?.type === 'video') {
      // Pause any audio and play the visible video
      pauseAllAudio();
      // Auto-play disabled: do not trigger visibility-based video play
      // handleVideoVisibilityChange(selectedKey);
      setCurrentlyVisibleVideo(selectedKey);
    } else if (entry?.type === 'music') {
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
  }, [isAutoPlayEnabled, allVideos, handleVideoVisibilityChange]);

  const recomputeVisibilityFromLayouts = useCallback(() => {
    if (!isAutoPlayEnabled) return;
    const scrollY = lastScrollYRef.current;
    const screenHeight = Dimensions.get('window').height;
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

    const selectedKey: string | null = maxRatio >= 0.15 ? mostVisibleKey : null;
    const entry = selectedKey ? contentLayoutsRef.current[selectedKey] : null;
    if (entry?.type === 'video') {
      pauseAllAudio();
      // Auto-play disabled: do not trigger visibility-based video play
      // handleVideoVisibilityChange(selectedKey);
      setCurrentlyVisibleVideo(selectedKey);
    } else if (entry?.type === 'music') {
      globalVideoStore.pauseAllVideos();
      if (entry.uri && selectedKey) {
        playAudio(entry.uri, selectedKey);
      }
      // Auto-play disabled: do not affect global video visibility
      // handleVideoVisibilityChange(null);
      setCurrentlyVisibleVideo(null);
    } else {
      globalVideoStore.pauseAllVideos();
      pauseAllAudio();
      // Auto-play disabled: do not affect global video visibility
      // handleVideoVisibilityChange(null);
      setCurrentlyVisibleVideo(null);
    }
  }, [isAutoPlayEnabled, allVideos, handleVideoVisibilityChange]);

  // 📱 Initialize auto-play after component mounts
  useEffect(() => {
    // Auto-play disabled globally; skip initial visibility computation
  }, [allVideos.length, isAutoPlayEnabled, recomputeVisibilityFromLayouts]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [])
  );

  // 📱 Cleanup: Pause all videos when component loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        // Pause all videos when leaving the screen
        globalVideoStore.pauseAllVideos();
        globalVideoStore.handleVideoVisibilityChange(null);
        setCurrentlyVisibleVideo(null);
      };
    }, [])
  );

  useEffect(() => {
    const loadAllData = async () => {
      console.log("📱 AllContent: Loading persisted data...");
      
      // 📚 Load library data first
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      
      // 📊 Load stats and viewed content (media list is already loaded globally)
      const stats = await getPersistedStats();
      const viewed = await getViewed();
      setContentStats(stats || {});
      setPreviouslyViewed(viewed || []);
      
      // 🎯 Load favorite states for all content
      const favoriteStates: Record<string, boolean> = {};
      const favoriteCounts: Record<string, number> = {};
      
      await Promise.all(mediaList.map(async (item) => {
        const key = getContentKey(item);
        const { isUserFavorite, globalCount } = await getFavoriteState(key);
        favoriteStates[key] = isUserFavorite;
        favoriteCounts[key] = globalCount;
      }));
      
      setUserFavorites(favoriteStates);
      setGlobalFavoriteCounts(favoriteCounts);
      
      console.log(`✅ AllContent: Loaded ${mediaList.length} media items and stats for ${Object.keys(stats || {}).length} items`);
    };
    loadAllData();
  }, [mediaList.length]); // 🎯 Depend on actual media count

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
        thumbnailUrl: item.contentType === "videos" 
          ? item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg"
          : item.imageUrl || item.fileUrl,
        originalKey: key
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
      console.log(`✅ Save ${isSaved ? 'removed from' : 'added to'} library:`, item.title);
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
      setUserFavorites(prev => ({ ...prev, [key]: isUserFavorite }));
      setGlobalFavoriteCounts(prev => ({ ...prev, [key]: globalCount }));
      
      console.log(`✅ Favorite ${isUserFavorite ? 'added' : 'removed'} for ${item.title}. Global count: ${globalCount}`);
    } catch (error) {
      console.error(`❌ Failed to toggle favorite for ${item.title}:`, error);
    }
  };

  const incrementView = (key: string, item: any) => {
    const alreadyExists = previouslyViewed.some((v) => v.fileUrl === item.fileUrl);

    if (!alreadyExists) {
      const thumbnailUrl = item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg";
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



  const renderVideoCard = (video: MediaItem, index: number) => {
    const modalKey = `video-${video._id || video.fileUrl || index}`;
    const progress = progresses[modalKey] ?? 0;
    const key = getContentKey(video);
    const stats = contentStats[key] || {};
    const isSermon = video.contentType === "sermon";
    const [refreshedUrl, setRefreshedUrl] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
  
    // 🔁 Refresh URL on mount if needed
    useEffect(() => {
      const refreshIfNeeded = async () => {
        if (!video.fileUrl || String(video.fileUrl).trim() === "") {
          setIsRefreshing(true);
          const fresh = await getRefreshedVideoUrl(video);
          setRefreshedUrl(fresh);
          setIsRefreshing(false);
        }
      };
      refreshIfNeeded();
    }, [video.fileUrl]);
  
    const videoUrl = refreshedUrl || video.fileUrl;
  
    return (
      <View 
        key={modalKey} 
        className="flex flex-col mb-10"
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          contentLayoutsRef.current[modalKey] = { y, height, type: 'video' };
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          const isCurrentlyPlaying = playingVideos[modalKey] ?? false;
          if (isCurrentlyPlaying) {
            // If video is playing, pause it
            globalVideoStore.pauseVideo(modalKey);
            setCurrentlyVisibleVideo(null);
          } else {
            // If video is paused, navigate to reels
            handleVideoTap(modalKey, video, index);
          }
        }}>
          <View className="w-full h-[400px] overflow-hidden relative">
            <Video
              ref={(ref) => {
                if (ref) videoRefs.current[modalKey] = ref;
              }}
              source={{ 
                uri: videoUrl && videoUrl.trim() && videoUrl.trim() !== 'https://example.com/placeholder.mp4' 
                  ? videoUrl.trim() 
                  : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
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
                  // ✅ Only increment view count when video completes and hasn't been counted yet
                  const contentKey = getContentKey(video);
                  if (!viewCounted[modalKey]) {
                    incrementView(contentKey, video);
                    setViewCounted((prev) => ({ ...prev, [modalKey]: true }));
                    console.log(`✅ Video completed, view counted for: ${video.title}`);
                  }
                  
                  ref?.setPositionAsync(0);
                  globalVideoStore.pauseVideo(modalKey);
                  globalVideoStore.setVideoCompleted(modalKey, true);
                }
              }}
            />
            <View className="flex-col absolute mt-[170px] ml-[360px]">
              <TouchableOpacity onPress={() => handleFavorite(key, video)} className="flex-col justify-center items-center">
                <MaterialIcons
                  name={userFavorites[key] ? "favorite" : "favorite-border"}
                  size={30}
                  color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {globalFavoriteCounts[key] || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-col justify-center items-center mt-6">
                <Ionicons name="chatbubble-sharp" size={30} color="white" />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {stats.comment === 1 ? (video.comment ?? 0) + 1 : video.comment ?? 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSave(key, video)} className="flex-col justify-center items-center mt-6">
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                  size={30}
                  color={stats.saved === 1 ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {stats.saved === 1 ? (video.saved ?? 0) + 1 : video.saved ?? 0}
                </Text>
              </TouchableOpacity>
            </View>
            {/* ✅ Centered Play/Pause Button - always visible */}
            <View className="absolute inset-0 justify-center items-center">
              <TouchableOpacity onPress={() => handleVideoTap(modalKey, video, index)}>
                <View className={`${playingVideos[modalKey] ? 'bg-black/30' : 'bg-white/70'} p-3 rounded-full`}>
                  <Ionicons 
                    name={playingVideos[modalKey] ? "pause" : "play"} 
                    size={32} 
                    color={playingVideos[modalKey] ? "#FFFFFF" : "#FEA74E"} 
                  />
                </View>
              </TouchableOpacity>
            </View>
            
            {/* 📱 Auto-play indicator when this card is the active auto-playing video */}
            {playingVideos[modalKey] && currentlyVisibleVideo === modalKey && (
              <View className="absolute top-4 left-4">
                <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
                  <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  <Text className="text-white text-xs font-rubik">Auto-playing</Text>
                </View>
              </View>
            )}

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
                <Text className="text-white font-semibold text-[14px]" numberOfLines={2}>
                  {video.title}
                </Text>
              </View>
            )}
            
            {/* Bottom Controls (Progress bar and Mute button) - always visible */}
            <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
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
                  console.warn("❌ Failed to load video speaker avatar:", error.nativeEvent.error);
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
              <View className="flex-row mt-2">
                <View className="flex-row items-center">
                  <AntDesign name="eyeo" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                    {stats.views ?? video.views ?? 0}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleShare(key, video)} className="flex-row items-center ml-4">
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
        
        {/* ✅ Modal with touch-outside-to-close functionality */}
        {modalVisible === modalKey && (
          <>
            {/* ✅ Full-screen overlay to close modal when touching outside */}
            <TouchableWithoutFeedback onPress={closeAllMenus}>
              <View className="absolute inset-0 z-40" />
            </TouchableWithoutFeedback>
            
            {/* ✅ Modal content - removed TouchableWithoutFeedback to allow button interactions */}
            <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[170px] h-[180]">
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
                <Text className="text-[#1D2939] font-rubik ml-2">{stats.saved === 1 ? "Remove from Library" : "Save to Library"}</Text>
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
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
                    closeAllMenus();
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

  // 🎵 Render music (audio) card with thumbnail and interactions
  const renderMusicCard = (audio: MediaItem, index: number) => {
    const modalKey = `music-${audio._id || index}`;
    const key = getContentKey(audio);
    const stats = contentStats[key] || {};
    const thumbnailSource = audio?.imageUrl
      ? (typeof audio.imageUrl === "string" ? { uri: audio.imageUrl } : (audio.imageUrl as any))
      : { uri: audio.fileUrl };
    const isPlaying = playingAudioId === modalKey;
    const currentProgress = audioProgressMap[modalKey] || 0;
    
    // Add content type indicator for sermons
    const isSermon = audio.contentType === "sermon";
    const [refreshedUrl, setRefreshedUrl] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 🔁 Refresh URL on mount if needed
    useEffect(() => {
      const refreshIfNeeded = async () => {
        if (!audio.fileUrl || String(audio.fileUrl).trim() === "") {
          setIsRefreshing(true);
          const fresh = await tryRefreshMediaUrl(audio);
          setRefreshedUrl(fresh);
          setIsRefreshing(false);
        }
      };
      refreshIfNeeded();
    }, [audio.fileUrl]);

    const audioUrl = refreshedUrl || audio.fileUrl;

    return (
      <View 
        key={modalKey} 
        className="flex flex-col mb-10"
        onLayout={(e) => {
          const { y, height } = e.nativeEvent.layout;
          contentLayoutsRef.current[modalKey] = { y, height, type: 'music', uri: audio.fileUrl };
        }}
      >
        <TouchableWithoutFeedback onPress={() => { /* tap does nothing; use buttons */ }}>
          <View className="w-full h-[400px] overflow-hidden relative">
            <Image
              source={thumbnailSource as any}
              style={{ width: "100%", height: "100%", position: "absolute" }}
              resizeMode="cover"
            />

            {/* Center Play/Pause button */}
            <View className="absolute inset-0 justify-center items-center">
              <TouchableOpacity
                onPress={() => playAudio(audioUrl, modalKey)}
                className="bg-white/70 p-3 rounded-full"
                activeOpacity={0.9}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#FEA74E" />
              </TouchableOpacity>
            </View>

            {/* Right side actions */}
            <View style={{
              position: 'absolute',
              top: getResponsiveSpacing(170, 180, 190, 200),
              right: getResponsiveSpacing(16, 20, 24, 32),
            }} className="flex-col">
              <TouchableOpacity onPress={() => handleFavorite(key, audio)} className="flex-col justify-center items-center">
                <MaterialIcons
                  name={userFavorites[key] ? "favorite" : "favorite-border"}
                  size={30}
                  color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {globalFavoriteCounts[key] || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-col justify-center items-center mt-6">
                <Ionicons name="chatbubble-sharp" size={30} color="white" />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {stats.comment === 1 ? (audio.comment ?? 0) + 1 : audio.comment ?? 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSave(key, audio)} className="flex-col justify-center items-center mt-6">
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                  size={30}
                  color={stats.saved === 1 ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {stats.saved === 1 ? (audio.saved ?? 0) + 1 : audio.saved ?? 0}
                </Text>
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
              <TouchableOpacity onPress={() => playAudio(audioUrl, modalKey)}>
                <Ionicons 
                  name={isPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#FEA74E" 
                />
              </TouchableOpacity>
              <View className="flex-1 h-1 bg-white/30 rounded-full relative">
                <View className="h-full bg-[#FEA74E] rounded-full" style={{ width: `${currentProgress * 100}%` }} />
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
              <TouchableOpacity onPress={async () => {
                const currentMuted = audioMuteMap[modalKey] ?? false;
                const newMuted = !currentMuted;
                setAudioMuteMap((prev) => ({ ...prev, [modalKey]: newMuted }));
                const snd = soundMap[modalKey];
                if (snd) {
                  try { await snd.setIsMutedAsync(newMuted); } catch {}
                }
              }}>
                <Ionicons
                  name={(audioMuteMap[modalKey] ?? false) ? "volume-mute" : "volume-high"}
                  size={20}
                  color="#FEA74E"
                />
              </TouchableOpacity>
            </View>

            {/* Title overlay above controls */}
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text className="text-white font-semibold text-[14px]" numberOfLines={2}>
                {audio.title}
              </Text>
            </View>

          </View>
        </TouchableWithoutFeedback>
        {/* Footer under the card: avatar, time and share */}
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
              <View className="flex-row mt-2">
                <View className="flex-row items-center">
                  <AntDesign name="eyeo" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                    {stats.views ?? audio.views ?? 0}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleShare(key, audio)} className="flex-row items-center ml-4">
                  <Feather name="send" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.sheared ?? audio.sheared ?? 0}
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

        {/* Vertical pop modal, same behavior as video cards */}
        {modalVisible === modalKey && (
          <>
            <TouchableWithoutFeedback onPress={closeAllMenus}>
              <View className="absolute inset-0 z-40" />
            </TouchableWithoutFeedback>
            <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[200px] h-[180]">
              <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-[#1D2939] font-rubik ml-2">View Details</Text>
                <Ionicons name="eye-outline" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleShare(key, audio)}
                className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              >
                <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
                <Feather name="send" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center justify-between mt-6" onPress={() => handleSave(key, audio)}>
                <Text className="text-[#1D2939] font-rubik ml-2">{stats.saved === 1 ? "Remove from Library" : "Save to Library"}</Text>
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                  size={22}
                  color="#1D2939"
                />
              </TouchableOpacity>
              <TouchableOpacity 
                className="py-2 flex-row items-center justify-between border-t border-gray-200 mt-2"
                onPress={async () => {
                  const contentType = audio.contentType === 'music' ? 'audio' : audio.contentType;
                  const downloadableItem = convertToDownloadableItem(audio, contentType as any);
                  const result = await handleDownload(downloadableItem);
                  if (result.success) {
                    closeAllMenus();
                  }
                }}
              >
                <Text className="text-[#1D2939] font-rubik ml-2">
                  {checkIfDownloaded(audio._id || audio.fileUrl) ? "Downloaded" : "Download"}
                </Text>
                <Ionicons 
                  name={checkIfDownloaded(audio._id || audio.fileUrl) ? "checkmark-circle" : "download-outline"} 
                  size={24} 
                  color={checkIfDownloaded(audio._id || audio.fileUrl) ? "#256E63" : "#090E24"} 
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  // 📖 Render sermon card (can be either audio or video)
  const renderSermonCard = (sermon: MediaItem, index: number) => {
    const modalKey = `sermon-${sermon._id || index}`;
    const key = getContentKey(sermon);
    const stats = contentStats[key] || {};
    const isVideo = sermon.fileUrl.includes(".mp4") || sermon.fileUrl.includes(".mov");
    const thumbnailSource = sermon?.imageUrl
      ? (typeof sermon.imageUrl === "string" ? { uri: sermon.imageUrl } : (sermon.imageUrl as any))
      : { uri: sermon.fileUrl };
    const [refreshedUrl, setRefreshedUrl] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 🔁 Refresh URL on mount if needed
    useEffect(() => {
      const refreshIfNeeded = async () => {
        if (!sermon.fileUrl || String(sermon.fileUrl).trim() === "") {
          setIsRefreshing(true);
          const fresh = await tryRefreshMediaUrl(sermon);
          setRefreshedUrl(fresh);
          setIsRefreshing(false);
        }
      };
      refreshIfNeeded();
    }, [sermon.fileUrl]);

    const sermonUrl = refreshedUrl || sermon.fileUrl;
    const isVideoSermon = sermonUrl.includes(".mp4") || sermonUrl.includes(".mov");
    
    // If it's a video sermon, render as video card
    if (isVideoSermon) {
      return renderVideoCard(sermon, index);
    }
    
    // If it's an audio sermon, render as music card
    return renderMusicCard(sermon, index);
  };

  // 📚 Render ebook card (PDF/EPUB files without play icons)
  const renderEbookCard = (ebook: MediaItem, index: number) => {
    const modalKey = `ebook-${ebook._id || index}`;
    const key = getContentKey(ebook);
    const stats = contentStats[key] || {};
    const thumbnailSource = ebook?.imageUrl
      ? (typeof ebook.imageUrl === "string" ? { uri: ebook.imageUrl } : (ebook.imageUrl as any))
      : require("../../assets/images/bilble.png"); // Use bible image as PDF placeholder
    
    return (
      <View key={modalKey} className="mb-6">
        <TouchableWithoutFeedback onPress={() => console.log("Open ebook:", ebook.title)}>
          <View className="w-full h-[400px] overflow-hidden relative">
            <Image
              source={thumbnailSource}
              className="w-full h-full absolute"
              resizeMode="cover"
            />
            
            {/* PDF overlay to make it look more like a document */}
            <View className="absolute inset-0 bg-black bg-opacity-20" />
            
            {/* Large PDF icon overlay */}
            <View className="absolute inset-0 justify-center items-center">
              <View className="bg-white bg-opacity-90 rounded-lg p-4">
                <Ionicons 
                  name="document-text" 
                  size={48} 
                  color="#1D2939" 
                />
                <Text className="text-[#1D2939] font-rubik-semibold text-center mt-2">
                  PDF Document
                </Text>
              </View>
            </View>

            {/* Right side icons - matching video layout */}
            <View className="flex-col absolute mt-[170px] ml-[360px]">
              <TouchableOpacity onPress={() => handleFavorite(key, ebook)} className="flex-col justify-center items-center">
                <MaterialIcons
                  name={userFavorites[key] ? "favorite" : "favorite-border"}
                  size={30}
                  color={userFavorites[key] ? "#D22A2A" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {globalFavoriteCounts[key] || 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-col justify-center items-center mt-6">
                <Ionicons name="chatbubble-sharp" size={30} color="white" />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {stats.comment === 1 ? (ebook.comment ?? 0) + 1 : ebook.comment ?? 0}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleSave(key, ebook)} className="flex-col justify-center items-center mt-6">
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                  size={30}
                  color={stats.saved === 1 ? "#FEA74E" : "#FFFFFF"}
                />
                <Text className="text-[10px] text-white font-rubik-semibold">
                  {stats.saved === 1 ? (ebook.saved ?? 0) + 1 : ebook.saved ?? 0}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content Type Icon - Top Left */}
            <View className="absolute top-4 left-4">
              <View className="bg-black/50 p-1 rounded-full">
                <Ionicons 
                  name="document-text-outline" 
                  size={16} 
                  color="#FFFFFF" 
                />
              </View>
            </View>
            
            {/* Ebook Title - always visible */}
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text className="text-white font-semibold text-[14px]" numberOfLines={2}>
                {ebook.title}
              </Text>
            </View>
          </View>
        </TouchableWithoutFeedback>
        
        {/* Footer - matching video layout exactly */}
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
              <View className="flex-row mt-2">
                <View className="flex-row items-center">
                  <AntDesign name="eyeo" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 mt-1 font-rubik">
                    {stats.views ?? ebook.views ?? 0}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleShare(key, ebook)} className="flex-row items-center ml-4">
                  <Feather name="send" size={24} color="#98A2B3" />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.sheared ?? ebook.sheared ?? 0}
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
        
        {/* Modal - matching video layout */}
        {modalVisible === modalKey && (
          <>
            <TouchableWithoutFeedback onPress={closeAllMenus}>
              <View className="absolute inset-0 z-40" />
            </TouchableWithoutFeedback>
            <View className="absolute bottom-24 right-16 bg-white shadow-md rounded-lg p-3 z-50 w-[170px] h-[140]">
              <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                <Text className="text-[#1D2939] font-rubik ml-2">View Details</Text>
                <Ionicons name="eye-outline" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleShare(modalKey, ebook)}
                className="py-2 border-b border-gray-200 flex-row items-center justify-between"
              >
                <Text className="text-[#1D2939] font-rubik ml-2">Share</Text>
                <Feather name="send" size={22} color="#1D2939" />
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center justify-between mt-6" onPress={() => handleSave(modalKey, ebook)}>
                <Text className="text-[#1D2939] font-rubik ml-2">{stats.saved === 1 ? "Remove from Library" : "Save to Library"}</Text>
                <MaterialIcons
                  name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
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

  // 📱 Render mini cards for horizontal scrolling sections
  const renderMiniCards = (
    title: string,
    items: MediaItem[],
    modalIndex: number | null,
    setModalIndex: (val: number | null) => void
  ) => (
    <View className="mb-6">
      <Text className="text-[16px] mb-3 font-rubik-semibold text-[#344054] mt-4 px-4">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
        onScrollBeginDrag={closeAllMenus}
        onTouchStart={closeAllMenus}
      >
        {items.map((item, index) => {
          const modalKey = `mini-${item._id || index}`;
          const key = getContentKey(item);
          const stats = contentStats[key] || {};
          
          // Determine thumbnail source based on content type
          const thumbnailSource = item?.imageUrl
            ? (typeof item.imageUrl === "string" ? { uri: item.imageUrl } : (item.imageUrl as any))
            : item.contentType === "ebook" || item.contentType === "books"
            ? require("../../assets/images/bilble.png")
            : require("../../assets/images/image (12).png");

          return (
            <View key={modalKey} className="mr-4 w-[154px] flex-col items-center">
              <TouchableOpacity
                onPress={() => {
                  if (item.contentType === "videos") {
                    handleVideoTap(`mini-${item._id || index}`, item, index);
                  } else if (item.contentType === "music") {
                    const id = getAudioKey(item.fileUrl);
                    playAudio(item.fileUrl, id, {
                      title: item.title,
                      subTitle: item.speaker || item.uploadedBy,
                      imageUrl: item.imageUrl,
                      audioUrl: item.fileUrl,
                      views: item.viewCount || 0,
                    });
                  } else if (item.contentType === "sermon") {
                    // Handle sermon based on whether it's video or audio
                    const isVideo = item.fileUrl.includes(".mp4") || item.fileUrl.includes(".mov");
                    if (isVideo) {
                      handleVideoTap(`mini-${item._id || index}`, item, index);
                    } else {
                      const id = getAudioKey(item.fileUrl);
                      playAudio(item.fileUrl, id, {
                        title: item.title,
                        subTitle: item.speaker || item.uploadedBy,
                        imageUrl: item.imageUrl,
                        audioUrl: item.fileUrl,
                        views: item.viewCount || 0,
                      });
                    }
                  } else {
                    console.log("Open mini card:", item.title);
                  }
                }}
                className="w-full h-[232px] rounded-2xl overflow-hidden relative"
                activeOpacity={0.9}
              >
                {(item.contentType === "videos" || (item.contentType === "sermon" && (item.fileUrl.includes(".mp4") || item.fileUrl.includes(".mov")))) && !failedVideoLoads.has(item._id || item.fileUrl) ? (
                  <Video
                    source={{ 
                      uri: item.fileUrl && item.fileUrl.trim() && item.fileUrl.trim() !== 'https://example.com/placeholder.mp4' 
                        ? item.fileUrl.trim() 
                        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                    }}
                    style={{ width: "100%", height: "100%", position: "absolute" }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted={true}
                    useNativeControls={false}
                    onError={(error) => {
                      console.log(`❌ Video loading error for ${item.title}:`, error);
                      console.log(`🔗 Failed URL: ${item.fileUrl}`);
                      // Add to failed loads set to show thumbnail instead
                      setFailedVideoLoads(prev => new Set([...prev, item._id || item.fileUrl]));
                    }}
                    onLoadStart={() => {
                      console.log(`🔄 Loading video: ${item.title} from ${item.fileUrl}`);
                    }}
                    onLoad={() => {
                      console.log(`✅ Video loaded successfully: ${item.title}`);
                    }}
                  />
                ) : (
                  <Image
                    source={thumbnailSource}
                    className="w-full h-full absolute"
                    resizeMode="cover"
                    onError={(error) => {
                      console.log(`❌ Image loading error for ${item.title}:`, error);
                    }}
                  />
                )}
                
                {/* Content type indicator */}
                <View className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                  <Ionicons 
                    name={
                      item.contentType === "videos" ? "videocam" :
                      item.contentType === "music" ? "musical-notes" :
                      item.contentType === "sermon" ? "person" :
                      "document-text-outline"
                    }
                    size={16} 
                    color="#FFFFFF" 
                  />
                </View>

                {/* Play button overlay for videos and music - ensure same color as video (#FEA74E) */}
                {(item.contentType === "videos" || item.contentType === "music") && !failedVideoLoads.has(item._id || item.fileUrl) && (
                  <View className="absolute inset-0 justify-center items-center">
                    <TouchableOpacity onPress={() => {
                      if (item.contentType === "videos") {
                        handleVideoTap(`mini-${item._id || index}`, item, index);
                      } else if (item.contentType === "music") {
                        const id = getAudioKey(item.fileUrl);
                        playMusicWithRefresh(item, id);
                      }
                    }} activeOpacity={0.9}>
                      <View className="bg-white/70 p-2 rounded-full">
                        <Ionicons 
                          name="play" 
                          size={24} 
                          color="#FEA74E" 
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Retry button for failed video loads */}
                {failedVideoLoads.has(item._id || item.fileUrl) && (
                  <View className="absolute inset-0 justify-center items-center">
                    <TouchableOpacity 
                      onPress={() => retryVideoLoad(item._id || item.fileUrl)}
                      className="bg-red-500/80 p-2 rounded-full"
                    >
                      <Ionicons name="refresh" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                )}

                
                {/* Gradient overlay for better text readability */}
                <View className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
                
                <View className="absolute bottom-2 left-2 right-2">
                  <Text
                    className="text-white text-start text-[14px] font-rubik-semibold"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Modal for mini card actions */}
              {modalIndex === index && (
                <>
                  <TouchableWithoutFeedback onPress={closeAllMenus}>
                    <View className="absolute inset-0 z-40" />
                  </TouchableWithoutFeedback>
                  <View className="absolute bottom-14 right-3 bg-white shadow-lg rounded-lg p-3 z-50 w-[160px] h-[180px] border border-gray-100">
                    <TouchableOpacity className="py-2 border-b border-gray-200 flex-row items-center justify-between">
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">View Details</Text>
                      <Ionicons name="eye-outline" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleShare(key, item)}
                      className="py-2 border-b border-gray-200 flex-row items-center justify-between"
                    >
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">Share</Text>
                      <Feather name="send" size={22} color="#1D2939" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="flex-row items-center justify-between mt-6" 
                      onPress={() => handleSave(key, item)}
                    >
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">
                        {stats.saved === 1 ? "Remove from Library" : "Save to Library"}
                      </Text>
                      <MaterialIcons
                        name={stats.saved === 1 ? "bookmark" : "bookmark-border"}
                        size={22}
                        color="#1D2939"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="py-2 flex-row items-center justify-between border-t border-gray-200 mt-2"
                      onPress={async () => {
                        const contentType = item.contentType === 'music' ? 'audio' : 
                                          item.contentType === 'sermon' ? (item.fileUrl?.includes('.mp4') ? 'video' : 'audio') : 
                                          item.contentType;
                        const downloadableItem = convertToDownloadableItem(item, contentType as any);
                        const result = await handleDownload(downloadableItem);
                        if (result.success) {
                          closeAllMenus();
                        }
                      }}
                    >
                      <Text className="text-[#1D2939] font-rubik-medium ml-2">
                        {checkIfDownloaded(item._id || item.fileUrl) ? "Downloaded" : "Download"}
                      </Text>
                      <Ionicons 
                        name={checkIfDownloaded(item._id || item.fileUrl) ? "checkmark-circle" : "download-outline"} 
                        size={24} 
                        color={checkIfDownloaded(item._id || item.fileUrl) ? "#256E63" : "#090E24"} 
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
              
              <View className="mt-2 flex flex-col w-full">
                <View className="flex flex-row justify-between items-center">
                  <Text
                    className="text-[12px] text-[#98A2B3] font-rubik-medium flex-1"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getDisplayName(item.speaker, item.uploadedBy)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { closeAllMenus(); setModalIndex(modalIndex === index ? null : index); }}
                    className="ml-2"
                  >
                    <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center mt-1">
                  <AntDesign name="eyeo" size={16} color="#98A2B3" />
                  <Text className="text-[10px] text-[#98A2B3] ml-2 font-rubik">
                    {stats.views ?? item.views ?? 0} views
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // State for mini card modals
  const [previouslyViewedModalIndex, setPreviouslyViewedModalIndex] = useState<number | null>(null);
  const [trendingModalIndex, setTrendingModalIndex] = useState<number | null>(null);
  const [recommendedModalIndex, setRecommendedModalIndex] = useState<number | null>(null);

  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();
  const { loadDownloadedItems } = useDownloadStore();

  // Close all open menus/popovers across the component
  const closeAllMenus = () => {
    setModalVisible(null);
    setPreviouslyViewedModalIndex(null);
    setTrendingModalIndex(null);
    setRecommendedModalIndex(null);
  };

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
      }}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={true}
    >
      {/* 🆕 Most Recent Section */}
      {mostRecentItem && (
        <View>
          <Text className="text-[16px] font-rubik-semibold px-4 mt-5 mb-3">Most Recent</Text>
          {mostRecentItem.contentType === 'videos'
            ? renderVideoCard(mostRecentItem as any, 0)
            : mostRecentItem.contentType === 'ebook' || mostRecentItem.contentType === 'books'
            ? renderEbookCard(mostRecentItem as any, 0)
            : renderSermonCard(mostRecentItem as any, 0)}
        </View>
      )}

      {/* 🎯 Previously Viewed Mini Cards */}
      {(() => {
        const previouslyViewedItems = [
          ...allVideos.slice(0, 2),
          ...allMusic.slice(0, 1),
          ...allSermons.slice(0, 1)
        ].slice(0, 4);
        
        return previouslyViewedItems.length > 0 ? renderMiniCards(
          "Previously Viewed",
          previouslyViewedItems,
          previouslyViewedModalIndex,
          setPreviouslyViewedModalIndex
        ) : null;
      })()}

      {/* 🔥 First Explore More Section (4 items) */}
      <View className="mt-5">
        <Text className="text-[16px] font-rubik-semibold px-4 mb-3">Explore More</Text>
        
        {/* Videos */}
        {videosExcludingRecent.length > 0 && (
          <>
            {videosExcludingRecent.slice(0, 2).map((video, index) => renderVideoCard(video, index))}
          </>
        )}

        {/* Music */}
        {musicExcludingRecent.length > 0 && (
          <>
            {musicExcludingRecent.slice(0, 1).map((audio, index) => renderMusicCard(audio, index))}
          </>
        )}

        {/* Sermons */}
        {sermonsExcludingRecent.length > 0 && (
          <>
            {sermonsExcludingRecent.slice(0, 1).map((sermon, index) => renderSermonCard(sermon, index))}
          </>
        )}
      </View>

      {/* 📈 Trending Mini Cards */}
      {(() => {
        const trendingItems = [
          ...allVideos.slice(2, 4),
          ...allMusic.slice(1, 2),
          ...allSermons.slice(1, 2),
          ...allEbooks.slice(0, 2)
        ].slice(0, 4).map((item, index) => ({
          ...item,
          key: `trending-${item._id || index}`,
          isHot: Math.random() > 0.7,
          isRising: Math.random() > 0.8,
          trendingScore: Math.floor(Math.random() * 1000) + 100
        }));
        
        return trendingItems.length > 0 ? renderMiniCards(
          "Trending",
          trendingItems,
          trendingModalIndex,
          setTrendingModalIndex
        ) : null;
      })()}

      {/* 🔥 Second Explore More Section (4 items) */}
      <View className="mt-5">
        <Text className="text-[16px] font-rubik-semibold px-4 mb-3">Explore More</Text>
        
        {/* Videos */}
        {videosExcludingRecent.slice(2, 4).length > 0 && (
          <>
            {videosExcludingRecent.slice(2, 4).map((video, index) => renderVideoCard(video, index + 2))}
          </>
        )}

        {/* Music */}
        {musicExcludingRecent.slice(1, 2).length > 0 && (
          <>
            {musicExcludingRecent.slice(1, 2).map((audio, index) => renderMusicCard(audio, index + 1))}
          </>
        )}

        {/* Sermons */}
        {sermonsExcludingRecent.slice(1, 2).length > 0 && (
          <>
            {sermonsExcludingRecent.slice(1, 2).map((sermon, index) => renderSermonCard(sermon, index + 1))}
          </>
        )}

        {/* Ebooks */}
        {allEbooks.slice(0, 2).length > 0 && (
          <>
            {allEbooks.slice(0, 2).map((ebook, index) => renderEbookCard(ebook, index))}
          </>
        )}
      </View>

      {/* 🎯 Recommended for You Mini Cards */}
      {(() => {
        const recommendedItems = [
          ...allVideos.slice(4, 6),
          ...allMusic.slice(2, 3),
          ...allSermons.slice(2, 3),
          ...allEbooks.slice(2, 4)
        ].slice(0, 4).map((item, index) => ({
          ...item,
          key: `recommended-${item._id || index}`,
          personalScore: Math.floor(Math.random() * 500) + 50
        }));
        
        return recommendedItems.length > 0 ? renderMiniCards(
          "Recommended for You",
          recommendedItems,
          recommendedModalIndex,
          setRecommendedModalIndex
        ) : null;
      })()}

      {/* 🔥 Remaining Explore More Section */}
      <View className="mt-5">
        <Text className="text-[16px] font-rubik-semibold px-4 mb-3">Explore More</Text>
        
        {/* Remaining Videos */}
        {videosExcludingRecent.slice(4).length > 0 && (
          <>
            {videosExcludingRecent.slice(4).map((video, index) => renderVideoCard(video, index + 4))}
          </>
        )}

        {/* Remaining Music */}
        {musicExcludingRecent.slice(2).length > 0 && (
          <>
            {musicExcludingRecent.slice(2).map((audio, index) => renderMusicCard(audio, index + 2))}
          </>
        )}

        {/* Remaining Sermons */}
        {sermonsExcludingRecent.slice(2).length > 0 && (
          <>
            {sermonsExcludingRecent.slice(2).map((sermon, index) => renderSermonCard(sermon, index + 2))}
          </>
        )}

        {/* Remaining Ebooks */}
        {allEbooks.slice(4).length > 0 && (
          <>
            {allEbooks.slice(4).map((ebook, index) => renderEbookCard(ebook, index + 4))}
          </>
        )}
      </View>

      {mediaList.length === 0 && (
        <Text className="text-center text-gray-500 mt-10">No content uploaded yet.</Text>
      )}
    </ScrollView>
  );
}