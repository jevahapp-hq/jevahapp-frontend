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
import { useMedia } from "../../shared/hooks/useMedia";

// Component imports
import { Ionicons } from "@expo/vector-icons";
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
    console.log("🔧 toggleModal called with:", val);
    setModalVisible(val);
  }, []);
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [hymns, setHymns] = useState<any[]>([]);
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

  // Get global media state
  const playingVideos = useGlobalMediaStore((s) => s.playingVideos);
  const mutedVideos = useGlobalMediaStore((s) => s.mutedVideos);
  const progresses = useGlobalMediaStore((s) => s.progresses);
  const showOverlay = useGlobalMediaStore((s) => s.showOverlay);
  const currentlyPlayingMedia = useGlobalMediaStore(
    (s) => s.currentlyPlayingMedia
  );
  const currentlyPlayingType = useGlobalMediaStore(
    (s) => s.currentlyPlayingType
  );
  const isAutoPlayEnabled = useGlobalMediaStore((s) => s.isAutoPlayEnabled);
  const pauseAllMedia = useGlobalMediaStore((s) => s.pauseAllMedia);
  const playMediaGlobally = useGlobalMediaStore((s) => s.playMediaGlobally);
  const toggleVideoMuteAction = useGlobalMediaStore((s) => s.toggleVideoMute);

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

  // Fetch Hymnary Psalm 136 once (for MVP showcase)
  useEffect(() => {
    const fetchHymns = async () => {
      try {
        setLoadingHymns(true);
        const res = await fetch(
          "https://hymnary.org/api/scripture?reference=Psalm+136"
        );
        const json = await res.json();
        // Transform key/value map to array of mini items
        const items = Object.values(json || {})
          .slice(0, 10)
          .map((h: any) => ({
            id: h.title || Math.random().toString(36).slice(2),
            title: h.title,
            author: h.author || h.paraphraser || h.translator || "Unknown",
            meter: h.meter,
            textLink: h["text link"],
            refs: String(h["scripture references"] || "").trim(),
          }));
        setHymns(items);
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
      playMediaGlobally(id, "audio");

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
      const contentId = item._id || key;
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
      showCommentModal(formattedComments, contentId);
    },
    [comments, showCommentModal]
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

  const toggleMute = (key: string) => toggleVideoMuteAction(key);

  const togglePlay = (key: string) => {
    console.log("🎮 togglePlay called in AllContentTikTok with key:", key);
    playMediaGlobally(key, "video");
  };

  // Render content by type
  const renderContentByType = useCallback(
    (item: MediaItem, index: number) => {
      const key = getContentKey(item);
      const contentId = item._id || key;

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
              modalKey={`video-${item._id || item.fileUrl || index}`}
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
              onToggleMute={toggleMute}
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
      mutedVideos,
      progresses,
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
        useGlobalMediaStore.getState().pauseAllMedia();
      } catch {}
    };
  }, []);

  // Pause all media when component loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        console.log("📱 Pausing all media on focus loss");
        try {
          useGlobalMediaStore.getState().pauseAllMedia();
        } catch {}
        setCurrentlyVisibleVideo(null);
        pauseAllAudio();
      };
    }, [pauseAllAudio])
  );

  // Loading state
  if (loading && !hasContent) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={UI_CONFIG.COLORS.PRIMARY} />
        <Text
          style={{
            marginTop: UI_CONFIG.SPACING.MD,
            color: UI_CONFIG.COLORS.TEXT_SECONDARY,
          }}
        >
          Loading content...
        </Text>
      </View>
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

      {/* Hymnary (Psalm 136) – Horizontal mini-cards (refactored to match mini card UI) */}
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
          Scripture Hymns (Psalm 136)
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
        >
          {loadingHymns ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <Text style={{ color: UI_CONFIG.COLORS.TEXT_SECONDARY }}>
                Loading hymns…
              </Text>
            </View>
          ) : (
            (hymns || []).map((h) => (
              <View key={h.id} className="mr-4 w-[154px] flex-col items-center">
                <TouchableOpacity
                  onPress={() => {
                    if (h.textLink) {
                      router.push({
                        pathname: "/reader/WebPage",
                        params: { url: h.textLink, title: h.title },
                      });
                    }
                  }}
                  className="w-full h-[232px] rounded-2xl overflow-hidden relative"
                  activeOpacity={0.9}
                >
                  <Image
                    source={(() => {
                      const candidate =
                        (h as any).imageUrl ||
                        (h as any).thumbnail ||
                        (h as any).cover;
                      if (
                        typeof candidate === "string" &&
                        candidate.trim().length > 0
                      ) {
                        return { uri: candidate.trim() } as any;
                      }
                      return {
                        uri: "https://res.cloudinary.com/ddgzzjp4x/image/upload/v1758677253/jevah-hq_tcqmxl.jpg",
                      } as any;
                    })()}
                    className="w-full h-full absolute"
                    resizeMode="cover"
                  />
                  {/* Dark overlay to improve text contrast */}
                  <View className="absolute inset-0 bg-black/60" />
                  <View className="absolute inset-0 justify-center items-center">
                    <View className="bg-white/70 p-2 rounded-full">
                      <Ionicons name="book" size={24} color="#FEA74E" />
                    </View>
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
                      {(h.author || "Unknown").toString()}
                    </Text>
                    <Ionicons
                      name="ellipsis-vertical"
                      size={14}
                      color="#9CA3AF"
                    />
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="book-outline" size={13} color="#98A2B3" />
                    <Text
                      className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik"
                      numberOfLines={1}
                    >
                      {(h.meter || h.refs || "Psalm 136").toString()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* All Content Section */}
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
          {contentType === "ALL" ? "All Content" : `${contentType} Content`} (
          {filteredMediaList.length} items)
        </Text>

        {(filteredMediaList || [])
          .filter((item) => !mostRecentItem || item._id !== mostRecentItem._id)
          .map((item, index) => renderContentByType(item, index))}
      </View>

      {/* Loading indicator for refresh */}
      {loading && hasContent && (
        <View style={{ padding: UI_CONFIG.SPACING.LG, alignItems: "center" }}>
          <ActivityIndicator size="small" color={UI_CONFIG.COLORS.PRIMARY} />
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

      {/* Global Media Status */}
      <View
        className="mx-4 mt-5 p-3 rounded-lg"
        style={{
          backgroundColor: currentlyPlayingMedia
            ? UI_CONFIG.COLORS.SUCCESS
            : UI_CONFIG.COLORS.TEXT_SECONDARY,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 14, fontWeight: "bold" }}>
          {currentlyPlayingMedia
            ? `🎵 Currently Playing: ${currentlyPlayingType?.toUpperCase()} - ${currentlyPlayingMedia.substring(
                0,
                20
              )}...`
            : "⏸️ No Media Playing"}
        </Text>
        <Text style={{ color: "white", fontSize: 12, marginTop: 4 }}>
          Global Media Control: Only one media plays at a time
        </Text>
      </View>

      {/* Connection Status */}
      <View
        className="mx-4 mt-2 p-2 rounded-lg"
        style={{
          backgroundColor:
            socketManager && socketManager.isConnected()
              ? UI_CONFIG.COLORS.SUCCESS
              : socketManager
              ? UI_CONFIG.COLORS.ERROR
              : UI_CONFIG.COLORS.WARNING,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 12 }}>
          {socketManager && socketManager.isConnected()
            ? "🟢 Real-time Connected"
            : socketManager
            ? "🔴 Real-time Disconnected"
            : "🟡 Real-time Unavailable"}
        </Text>
      </View>
      </ScrollView>
    </View>
  );
};
