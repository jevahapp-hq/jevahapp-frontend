import { Ionicons, MaterialIcons } from "@expo/vector-icons";
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
  BackHandler,
  Dimensions,
  Image,
  InteractionManager,
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
import { CompactAudioControls } from "../components/CompactAudioControls";
import VideoCard from "../components/VideoCard";
import { useCommentModal } from "../context/CommentModalContext";
import { useVideoNavigation } from "../hooks/useVideoNavigation";
import useVideoViewport from "../hooks/useVideoViewport";
import SocketManager from "../services/SocketManager";
import { useDownloadStore } from "../store/useDownloadStore";
import { useGlobalMediaStore } from "../store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useInteractionStore } from "../store/useInteractionStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import allMediaAPI from "../utils/allMediaAPI";
import { contentInteractionAPI } from "../utils/contentInteractionAPI";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../utils/downloadUtils";
import {
  getPersistedStats,
  getViewed,
  persistStats,
  persistViewed,
} from "../utils/persistentStorage";
import TokenUtils from "../utils/tokenUtils";
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

function AllContentTikTok({ contentType = "ALL" }: { contentType?: string }) {
  console.log("🚨 DEBUG: AllContentTikTok component INITIALIZED");
  console.log("🚨 DEBUG: Component mount time:", new Date().toISOString());
  console.log("🚨 DEBUG: Content type filter:", contentType);

  const router = useRouter();
  const screenWidth = Dimensions.get("window").width;

  console.log("🚨 DEBUG: Router and screenWidth initialized");

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

  console.log("🚨 DEBUG: useMediaStore data:");
  console.log("🚨 DEBUG: - allContent length:", allContent?.length || 0);
  console.log("🚨 DEBUG: - allContentLoading:", allContentLoading);
  console.log("🚨 DEBUG: - allContentError:", allContentError);
  console.log(
    "🚨 DEBUG: - defaultContent length:",
    defaultContent?.length || 0
  );
  console.log("🚨 DEBUG: - defaultContentLoading:", defaultContentLoading);
  console.log("🚨 DEBUG: - defaultContentError:", defaultContentError);

  // Function to convert signed URLs to public URLs
  // TODO: Remove this function once backend provides clean URLs
  const convertToPublicUrl = (signedUrl: string): string => {
    if (!signedUrl) return signedUrl;

    try {
      const url = new URL(signedUrl);

      // Check if it's a signed URL (has AWS signature parameters)
      const isSignedUrl =
        url.searchParams.has("X-Amz-Signature") ||
        url.searchParams.has("X-Amz-Algorithm");

      if (!isSignedUrl) {
        // Already a clean URL, return as-is
        return signedUrl;
      }

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
        `🔗 Converted signed URL: ${signedUrl.substring(
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
    console.log("🚨 DEBUG: mediaList useMemo triggered");
    console.log("🚨 DEBUG: - allContent:", allContent);
    console.log("🚨 DEBUG: - defaultContent:", defaultContent);
    console.log("🚨 DEBUG: - allContent.length:", allContent?.length || 0);
    console.log(
      "🚨 DEBUG: - defaultContent.length:",
      defaultContent?.length || 0
    );

    // Prioritize allContent over defaultContent
    const sourceData = allContent.length > 0 ? allContent : defaultContent;

    console.log("🚨 DEBUG: - sourceData:", sourceData);
    console.log("🚨 DEBUG: - sourceData is array:", Array.isArray(sourceData));
    console.log("🚨 DEBUG: - sourceData length:", sourceData?.length || 0);

    if (!sourceData || !Array.isArray(sourceData)) {
      console.log("🚨 DEBUG: Returning empty array - no valid source data");
      return [];
    }

    const transformed = sourceData.map((item: any) => {
      // Check if URLs are Cloudinary or missing, and provide fallbacks
      const hasValidFileUrl =
        item.fileUrl &&
        !item.fileUrl.includes("cloudinary") &&
        !item.fileUrl.includes("PLACEHOLDER") &&
        item.fileUrl.trim() !== "";

      const hasValidMediaUrl =
        item.mediaUrl &&
        !item.mediaUrl.includes("cloudinary") &&
        !item.mediaUrl.includes("PLACEHOLDER") &&
        item.mediaUrl.trim() !== "";

      const hasValidThumbnailUrl =
        item.thumbnailUrl &&
        !item.thumbnailUrl.includes("cloudinary") &&
        !item.thumbnailUrl.includes("PLACEHOLDER") &&
        item.thumbnailUrl.trim() !== "";

      // Convert signed URL to public URL for all content types (not just videos)
      const publicUrl = hasValidMediaUrl
        ? convertToPublicUrl(item.mediaUrl || item.fileUrl)
        : hasValidFileUrl
        ? convertToPublicUrl(item.fileUrl)
        : null;

      const transformedItem = {
        _id: item._id,
        title: item.title,
        description: item.description,
        contentType: item.contentType,
        fileUrl: publicUrl || "https://example.com/placeholder.mp4", // Fallback URL
        thumbnailUrl: hasValidThumbnailUrl ? item.thumbnailUrl : null,
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
        shares: item.shareCount || item.totalShares || 0,
        saves: 0, // Default value
        comments: item.commentCount || 0,
        likes: item.likeCount || item.totalLikes || 0,
        imageUrl: hasValidThumbnailUrl ? item.thumbnailUrl : null,
        speakerAvatar: item.authorInfo?.avatar || item.author?.avatar,
      };

      // Debug logging for URL mapping
      console.log(`🔄 Mapping ${item.contentType} "${item.title}":`, {
        originalMediaUrl: item.mediaUrl,
        originalFileUrl: item.fileUrl,
        convertedPublicUrl: publicUrl,
        mappedFileUrl: transformedItem.fileUrl,
        contentType: item.contentType,
        _id: item._id,
        hasValidFileUrl,
        hasValidMediaUrl,
        hasValidThumbnailUrl,
        isSignedUrl: (item.mediaUrl || item.fileUrl)?.includes(
          "X-Amz-Signature"
        ),
      });

      return transformedItem;
    });

    return transformed;
  }, [allContent, defaultContent]);

  // Filter content based on contentType prop
  const filteredMediaList = useMemo(() => {
    if (contentType === "ALL") return mediaList;

    const typeMap: Record<string, string[]> = {
      LIVE: ["live"],
      SERMON: ["sermon", "teachings"],
      MUSIC: ["music", "audio"],
      "E-BOOKS": ["e-books", "ebook", "image", "books"],
      VIDEO: ["videos", "video"],
    };

    const allowedTypes = typeMap[contentType] || [contentType.toLowerCase()];
    return mediaList.filter((item) =>
      allowedTypes.some((allowedType) =>
        item.contentType?.toLowerCase().includes(allowedType.toLowerCase())
      )
    );
  }, [mediaList, contentType]);

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
    () => filteredMediaList.filter((item) => item.contentType === "video"),
    [filteredMediaList]
  );

  const otherContent = useMemo(
    () => filteredMediaList.filter((item) => item.contentType !== "video"),
    [filteredMediaList]
  );

  // 🎵 Music items (audio with thumbnails)
  const allMusic = useMemo(
    () => filteredMediaList.filter((item) => item.contentType === "audio"),
    [filteredMediaList]
  );

  // 📖 Sermon items (can be either audio or video)
  const allSermons = useMemo(
    () => filteredMediaList.filter((item) => item.contentType === "sermon"),
    [filteredMediaList]
  );

  // 📚 Ebook items (PDF and EPUB files) - API returns "image" for PDFs
  const allEbooks = useMemo(() => {
    const ebooks = filteredMediaList.filter(
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
  }, [filteredMediaList]);

  // Debug: Log all media items to help identify URL issues
  useEffect(() => {
    console.log(
      "🔍 Debug: Raw API data (allContent):",
      allContent?.length || 0,
      "items"
    );
    console.log(
      "🔍 Debug: Raw API data (defaultContent):",
      defaultContent?.length || 0,
      "items"
    );
    console.log(
      "🔍 Debug: Source data being used:",
      allContent.length > 0 ? "allContent" : "defaultContent"
    );
    console.log("🔍 Debug: Transformed media items:", mediaList.length);
    console.log("🔍 Debug: Filtered media items:", filteredMediaList.length);
    console.log("🔍 Debug: Videos:", allVideos.length);
    console.log("🔍 Debug: Music:", allMusic.length);
    console.log("🔍 Debug: Sermons:", allSermons.length);
    console.log("🔍 Debug: Ebooks:", allEbooks.length);

    // Log content type distribution
    const contentTypeCounts: Record<string, number> = {};
    filteredMediaList.forEach((item) => {
      contentTypeCounts[item.contentType] =
        (contentTypeCounts[item.contentType] || 0) + 1;
    });
    console.log("🔍 Debug: Content type distribution:", contentTypeCounts);

    // Log first few items for debugging
    filteredMediaList.slice(0, 5).forEach((item, index) => {
      console.log(`📱 Item ${index + 1}:`, {
        title: item.title,
        contentType: item.contentType,
        fileUrl: item.fileUrl,
        imageUrl: item.imageUrl,
        createdAt: item.createdAt,
        _id: item._id,
        hasValidFileUrl: item.fileUrl && item.fileUrl.startsWith("http"),
        fileUrlLength: item.fileUrl?.length || 0,
      });
    });

    // Log audio-specific items
    const audioItems = filteredMediaList.filter(
      (item) => item.contentType === "audio" || item.contentType === "music"
    );
    console.log(`🎵 Audio items found: ${audioItems.length}`);
    audioItems.forEach((item, index) => {
      console.log(`🎵 Audio ${index + 1}:`, {
        title: item.title,
        fileUrl: item.fileUrl?.substring(0, 100) + "...",
        isValidUrl: item.fileUrl?.startsWith("http"),
        contentType: item.contentType,
        isSignedUrl: item.fileUrl?.includes("X-Amz-Signature"),
        urlLength: item.fileUrl?.length || 0,
      });
    });
  }, [
    mediaList,
    filteredMediaList,
    allContent,
    defaultContent,
    allVideos.length,
    allMusic.length,
    allSermons.length,
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

  // Initialize SocketManager for real-time features
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        console.log("🔌 AllContentTikTok: Initializing Socket.IO...");

        // Get auth token using centralized utility
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

        // Validate token format before proceeding
        if (!TokenUtils.isValidJWTFormat(authToken)) {
          console.warn(
            "⚠️ Invalid token format detected, skipping Socket.IO initialization",
            { tokenPreview: TokenUtils.getTokenPreview(authToken) }
          );
          return;
        }

        const manager = new SocketManager({
          serverUrl: "https://jevahapp-backend.onrender.com",
          authToken,
        });

        // Set up event listeners using the socket directly
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

        // Try to connect, but don't fail if it doesn't work
        try {
          await manager.connect();
          setSocketManager(manager);
          console.log("✅ Socket.IO initialized successfully");
        } catch (connectError) {
          console.warn(
            "⚠️ Socket connection failed, continuing without real-time features:",
            connectError
          );
          // Don't set socketManager, app will work without real-time features
        }
      } catch (error) {
        console.error("❌ Failed to initialize Socket.IO:", error);
        console.log("⚠️ Continuing without real-time features...");
        // Don't set socketManager to null, just log the error
        // The app should work without real-time features
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketManager) {
        socketManager.disconnect();
      }
    };
  }, []);

  // Load content on mount - prioritize TikTok-style endpoints
  useEffect(() => {
    console.log("🚨 DEBUG: useEffect triggered for content loading");
    console.log(
      "🚨 DEBUG: - refreshAllContent function:",
      typeof refreshAllContent
    );
    console.log("🚨 DEBUG: - allMediaAPI:", typeof allMediaAPI);

    console.log("🚀 AllContentTikTok: Loading content from backend...");
    console.log(
      "🌐 API Base URL:",
      process.env.EXPO_PUBLIC_API_URL || "https://jevahapp-backend.onrender.com"
    );

    try {
      // Test available endpoints first
      console.log("🚨 DEBUG: Testing available endpoints...");
      allMediaAPI.testAvailableEndpoints();

      // Try TikTok-style all content endpoints first
      console.log("🚨 DEBUG: Calling refreshAllContent...");
      refreshAllContent();
      console.log("🚨 DEBUG: refreshAllContent called successfully");
    } catch (error) {
      console.error("🚨 DEBUG: Error in useEffect:", error);
    }
  }, []); // Remove refreshAllContent dependency to prevent re-mounting

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
    if (!uri || uri.trim() === "") {
      console.warn("🚨 Audio URI is empty or invalid:", { uri, id });
      return;
    }
    if (isLoadingAudio) {
      console.log("🚨 Audio is already loading, skipping...");
      return;
    }

    // Validate URL format
    if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
      console.warn("🚨 Audio URI is not a valid HTTP/HTTPS URL:", { uri, id });
      return;
    }

    // Debug logging for audio URLs
    console.log(`🎵 Playing audio "${id}":`, {
      audioUri: uri,
      id: id,
      uriLength: uri.length,
      isValidUrl: uri.startsWith("http"),
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
      console.log(
        `🎵 Creating audio sound for "${id}" with URI:`,
        uri.substring(0, 100) + "..."
      );

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: true,
          isMuted: audioMuteMap[id] ?? false,
          positionMillis: resumePos,
        }
      );

      console.log(`✅ Audio sound created successfully for "${id}"`);

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
      console.error("❌ Error details:", {
        message: (err as Error).message,
        code: (err as any).code,
        uri: uri.substring(0, 100) + "...",
        id: id,
      });

      // Clean up any partial state
      setPlayingAudioId(null);
      setSoundMap((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      // Show user-friendly error message
      console.log("🚨 Audio playback failed - this might be due to:");
      console.log("   - Invalid audio URL");
      console.log("   - Network connectivity issues");
      console.log("   - Unsupported audio format");
      console.log("   - Server-side audio file issues");
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
  const [previouslyViewed, setPreviouslyViewed] = useState<any[]>([]);

  // 🎯 Use interaction store for backend-managed likes
  const { contentStats, toggleLike, loadingInteraction } =
    useInteractionStore();

  // Helper functions to get like state from backend
  const getUserLikeState = (contentId: string) => {
    const stats = contentStats[contentId];
    return stats?.userInteractions?.liked || false;
  };

  const getLikeCount = (contentId: string) => {
    const stats = contentStats[contentId];
    return stats?.likes || 0;
  };

  // Video control state
  const videoRefs = useRef<Record<string, any>>({});
  const isMountedRef = useRef(true);
  const [videoVolume, setVideoVolume] = useState<number>(1.0); // 🔊 Add volume control
  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [viewCounted, setViewCounted] = useState<Record<string, boolean>>({});

  // Real-time state
  const [socketManager, setSocketManager] = useState<SocketManager | null>(
    null
  );
  const [realTimeCounts, setRealTimeCounts] = useState<Record<string, any>>({});

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

  // ✅ Get video state from global store - using hook to ensure reactivity
  const playingVideos = useGlobalVideoStore((state) => state.playingVideos);
  const mutedVideos = useGlobalVideoStore((state) => state.mutedVideos);
  const progresses = useGlobalVideoStore((state) => state.progresses);
  const showOverlay = useGlobalVideoStore((state) => state.showOverlay);

  // Debug: Log the global store state
  const currentlyPlayingVideo = useGlobalVideoStore(
    (state) => state.currentlyPlayingVideo
  );
  console.log("🏪 Global store state:", {
    playingVideos,
    mutedVideos,
    progresses,
    showOverlay,
    currentlyPlayingVideo,
  });
  const hasCompleted = useGlobalVideoStore((state) => state.hasCompleted);
  const isAutoPlayEnabled = useGlobalVideoStore(
    (state) => state.isAutoPlayEnabled
  );
  const handleVideoVisibilityChange = useGlobalVideoStore(
    (state) => state.handleVideoVisibilityChange
  );
  // Note: Using contentStats for all statistics instead of separate videoStats

  const toggleMute = (key: string) => globalVideoStore.toggleVideoMute(key);
  const togglePlay = (key: string) => {
    console.log("🎮 togglePlay called in AllContentTikTok with key:", key);
    console.log("🎮 Current playingVideos state:", playingVideos);
    globalVideoStore.playVideoGlobally(key);
    console.log("🎮 After calling playVideoGlobally");
  };

  // 🔁 Helper: try to refresh stale media URL then play audio
  const playMusicWithRefresh = useCallback(
    async (item: MediaItem, id: string) => {
      const uri = item.fileUrl;
      console.log(`🎵 playMusicWithRefresh called for "${item.title}":`, {
        originalUri: uri,
        uriLength: uri?.length || 0,
        isValidUrl: uri?.startsWith("http"),
      });

      if (!uri || String(uri).trim() === "" || !uri.startsWith("http")) {
        console.log("🔄 Attempting to refresh media URL...");
        const fresh = await tryRefreshMediaUrl(item);
        if (fresh && fresh.startsWith("http")) {
          console.log(
            "✅ Got fresh URL, attempting to play:",
            fresh.substring(0, 100) + "..."
          );
          playAudio(fresh, id);
        } else {
          console.warn(
            "❌ No valid URL available for audio playback:",
            item.title
          );
        }
      } else {
        console.log("✅ Using original URL for playback");
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

  const { navigateToReels } = useVideoNavigation();

  const handleVideoTap = (key: string, video?: MediaItem, index?: number) => {
    // Navigate to reels view with the video list for swipeable navigation
    if (video && index !== undefined) {
      console.log(`📱 Video tapped to navigate to reels: ${video.title}`);

      navigateToReels({
        video,
        index,
        allVideos,
        contentStats,
        globalFavoriteCounts: {}, // Empty since we're using backend state
        getContentKey,
        getTimeAgo,
        getDisplayName,
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

        // Ensure video operations happen on main thread
        InteractionManager.runAfterInteractions(() => {
          if (
            ref?.getStatusAsync &&
            ref?.setPositionAsync &&
            isMountedRef.current
          ) {
            ref
              .getStatusAsync()
              .then((status: { isLoaded: any; durationMillis: number }) => {
                if (
                  status.isLoaded &&
                  status.durationMillis &&
                  isMountedRef.current
                ) {
                  ref.setPositionAsync((pct / 100) * status.durationMillis);
                }
              })
              .catch((error: any) => {
                console.warn("Video seek error:", error);
              });
          }
        });

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

  // Proper cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Safely cleanup all video refs on main thread
      InteractionManager.runAfterInteractions(() => {
        // Cleanup global video store
        globalVideoStore.cleanupAllVideos();

        // Cleanup local video refs
        Object.keys(videoRefs.current).forEach((key) => {
          try {
            if (videoRefs.current[key]) {
              videoRefs.current[key] = null;
            }
          } catch (error) {
            console.warn(`Video cleanup error for ${key}:`, error);
          }
        });
        videoRefs.current = {};
      });
    };
  }, []); // Remove globalVideoStore dependency to prevent re-mounting

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
      setPreviouslyViewed([]);

      try {
        // Load data in parallel for better performance
        const [stats, viewed, libraryLoaded] = await Promise.all([
          getPersistedStats(),
          getViewed(),
          libraryStore.isLoaded
            ? Promise.resolve()
            : libraryStore.loadSavedItems(),
        ]);

        setPreviouslyViewed(viewed || []);

        // Favorite states are now managed by the interaction store

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
  }, []); // Remove refreshAllContent dependency to prevent re-mounting

  // Handle load more - TikTok-style endpoints don't support pagination, so this is a no-op
  const handleLoadMore = useCallback(() => {
    // TikTok-style endpoints return all content at once, no pagination needed
    console.log(
      "📱 TikTok-style endpoints don't support pagination - all content loaded at once"
    );
  }, []);

  // Handle like - using contentInteractionAPI for proper endpoint
  const handleLike = useCallback(
    async (contentId: string, liked: boolean) => {
      console.log("🚨 DEBUG: handleLike called");
      console.log("🚨 DEBUG: - contentId:", contentId);
      console.log("🚨 DEBUG: - liked:", liked);
      console.log(
        "🚨 DEBUG: - contentInteractionAPI:",
        typeof contentInteractionAPI
      );

      try {
        console.log("🔄 Like action:", contentId, liked);

        // Send real-time like first for instant feedback (only if socket is connected)
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

        // Use the correct contentInteractionAPI for like functionality
        console.log("🚨 DEBUG: Calling contentInteractionAPI.toggleLike...");
        const response = await contentInteractionAPI.toggleLike(
          contentId,
          "video"
        );
        console.log("🚨 DEBUG: toggleLike response:", response);

        console.log("✅ Like successful:", response);
        // The UI will be updated through the store's state management
      } catch (error) {
        console.error("🚨 DEBUG: Like error details:", error);
        console.error("❌ Like error:", error);
        // You can add notification here if needed
      }
    },
    [socketManager]
  );

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
        // Share stats are now managed by the interaction store
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

    const isSaved = contentStats[key]?.saves === 1;

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
        shares: contentStats[key]?.shares || item.shares || 0,
        likes: contentStats[key]?.likes || item.likes || 0,
        comments: contentStats[key]?.comments || item.comments || 0,
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

    // Save stats are now managed by the interaction store

    // ✅ Close modal after save action
    setModalVisible(null);
  };

  const handleFavorite = async (key: string, item: any) => {
    console.log(`🎯 Handling like for: ${item.title}`);

    try {
      // Use backend API for user-specific likes
      await toggleLike(item._id || key, item.contentType || "video");

      console.log(`✅ Like toggled for ${item.title} via backend API`);
    } catch (error) {
      console.error(`❌ Failed to toggle like for ${item.title}:`, error);
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

    // ✅ Note: View counting is handled by the interaction store's recordView function
    // This is typically called when content is actually viewed, not during save operations
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
                    name={
                      getUserLikeState(ebook._id || key)
                        ? "favorite"
                        : "favorite-border"
                    }
                    size={28}
                    color={
                      getUserLikeState(ebook._id || key) ? "#FF1744" : "#98A2B3"
                    }
                    style={{
                      textShadowColor: getUserLikeState(ebook._id || key)
                        ? "rgba(255, 23, 68, 0.6)"
                        : "transparent",
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: getUserLikeState(ebook._id || key)
                        ? 10
                        : 0,
                    }}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {getLikeCount(ebook._id || key)}
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
                      stats.comments === 1
                        ? (ebook.comments ?? 0) + 1
                        : ebook.comments ?? 0
                    }
                    layout="horizontal"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSave(key, ebook)}
                  className="flex-row items-center mr-6"
                >
                  <MaterialIcons
                    name={stats.saves === 1 ? "bookmark" : "bookmark-border"}
                    size={28}
                    color={stats.saves === 1 ? "#FEA74E" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.saves === 1
                      ? (ebook.saves ?? 0) + 1
                      : ebook.saves ?? 0}
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
                onPress={() => playMusicWithRefresh(audio, modalKey)}
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

            {/* Compact Audio Controls - Using Advanced Audio System */}
            <View className="absolute bottom-3 left-3 right-3">
              <CompactAudioControls
                audioUrl={audio.fileUrl || ""}
                audioKey={audio._id || audio.fileUrl || "unknown"}
                className="bg-black/50 rounded-lg"
              />
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
                    name={
                      getUserLikeState(audio._id || key)
                        ? "favorite"
                        : "favorite-border"
                    }
                    size={28}
                    color={
                      getUserLikeState(audio._id || key) ? "#FF1744" : "#98A2B3"
                    }
                    style={{
                      textShadowColor: getUserLikeState(audio._id || key)
                        ? "rgba(255, 23, 68, 0.6)"
                        : "transparent",
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: getUserLikeState(audio._id || key)
                        ? 10
                        : 0,
                    }}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {getLikeCount(audio._id || key)}
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
                      stats.comments === 1
                        ? (audio.comments ?? 0) + 1
                        : audio.comments ?? 0
                    }
                    layout="horizontal"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSave(key, audio)}
                  className="flex-row items-center mr-6"
                >
                  <MaterialIcons
                    name={stats.saves === 1 ? "bookmark" : "bookmark-border"}
                    size={28}
                    color={stats.saves === 1 ? "#FEA74E" : "#98A2B3"}
                  />
                  <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                    {stats.saves === 1
                      ? (audio.saves ?? 0) + 1
                      : audio.saves ?? 0}
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

  // 📹 Render video card with proper navigation system
  const renderVideoCard = (video: MediaItem, index: number) => {
    const modalKey = `video-${video._id || video.fileUrl || index}`;
    const key = getContentKey(video);
    const stats = contentStats[key] || {};

    // Create backend-compatible favorites state
    const backendUserFavorites = { [key]: getUserLikeState(video._id || key) };
    const backendGlobalFavoriteCounts = {
      [key]: getLikeCount(video._id || key),
    };

    return (
      <VideoCard
        key={modalKey}
        video={video}
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
        onToggleMute={toggleMute}
        onFavorite={handleFavorite}
        onComment={handleComment}
        onSave={handleSave}
        onDownload={handleDownloadPress}
        onShare={handleShare}
        onModalToggle={setModalVisible}
        modalVisible={modalVisible}
        comments={comments}
        checkIfDownloaded={checkIfDownloaded}
        getContentKey={getContentKey}
        getTimeAgo={getTimeAgo}
        getUserDisplayNameFromContent={getUserDisplayNameFromContent}
        getUserAvatarFromContent={getUserAvatarFromContent}
      />
    );
  };

  // For now, let's create a simple placeholder that shows we're implementing the new interface
  console.log("🚨 DEBUG: About to render AllContentTikTok");
  console.log("🚨 DEBUG: - mediaList length:", mediaList?.length || 0);
  console.log(
    "🚨 DEBUG: - filteredMediaList length:",
    filteredMediaList?.length || 0
  );
  console.log("🚨 DEBUG: - contentType filter:", contentType);
  console.log("🚨 DEBUG: - allContentLoading:", allContentLoading);
  console.log("🚨 DEBUG: - defaultContentLoading:", defaultContentLoading);
  console.log("🚨 DEBUG: - allContentError:", allContentError);
  console.log("🚨 DEBUG: - defaultContentError:", defaultContentError);

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
            (allContentLoading || defaultContentLoading) &&
            filteredMediaList.length > 0
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

      {/* 🔍 DEBUG: Show ALL Content Section */}
      {filteredMediaList.length > 0 && (
        <View className="mt-5">
          <Text className="text-[16px] font-rubik-semibold px-4 mb-3">
            {contentType === "ALL" ? "All Content" : `${contentType} Content`} (
            {filteredMediaList.length} items)
          </Text>
          {filteredMediaList.map((item, index) => {
            console.log(`🚨 DEBUG: Rendering item ${index}:`, {
              _id: item._id,
              title: item.title,
              contentType: item.contentType,
              fileUrl: item.fileUrl?.substring(0, 50) + "...",
            });

            // Render based on content type
            if (item.contentType === "video" || item.contentType === "videos") {
              console.log(`🚨 DEBUG: Rendering video card for item ${index}`);
              return renderVideoCard(item, index);
            } else if (
              item.contentType === "audio" ||
              item.contentType === "music"
            ) {
              return renderMusicCard(item, index);
            } else if (
              item.contentType === "image" ||
              item.contentType === "ebook" ||
              item.contentType === "books"
            ) {
              return renderEbookCard(item, index);
            } else {
              // Fallback for unknown content types
              return (
                <View
                  key={`unknown-${item._id || index}`}
                  className="flex flex-col mb-10"
                >
                  <View className="w-full h-[200px] bg-gray-200 rounded-lg items-center justify-center">
                    <Text className="text-gray-600 font-semibold text-center">
                      {item.title}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-2">
                      Type: {item.contentType}
                    </Text>
                  </View>
                  <View className="px-3 mt-2">
                    <Text className="text-sm text-gray-600">
                      Unknown content type: {item.contentType}
                    </Text>
                  </View>
                </View>
              );
            }
          })}
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

      {/* Connection Status */}
      <View
        className="mx-4 mt-5 p-2 rounded-lg"
        style={{
          backgroundColor:
            socketManager && socketManager.isConnected()
              ? "#4CAF50"
              : socketManager
              ? "#f44336"
              : "#FF9800",
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
          Source Data: {allContent.length > 0 ? "allContent" : "defaultContent"}
        </Text>
        <Text className="text-blue-700">
          Transformed Data: {mediaList.length} items
        </Text>
        <Text className="text-blue-700">
          Filtered Data: {filteredMediaList.length} items ({contentType})
        </Text>
        <Text className="text-blue-700">Videos: {allVideos.length}</Text>
        <Text className="text-blue-700">Music: {allMusic.length}</Text>
        <Text className="text-blue-700">Sermons: {allSermons.length}</Text>
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

        {/* Content Type Distribution */}
        {filteredMediaList.length > 0 && (
          <View className="mt-2">
            <Text className="text-blue-800 font-bold mb-1">Content Types:</Text>
            {Object.entries(
              filteredMediaList.reduce((acc, item) => {
                acc[item.contentType] = (acc[item.contentType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <Text key={type} className="text-blue-700 text-xs">
                {type}: {count} items
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Empty state */}
      {filteredMediaList.length === 0 &&
        !allContentLoading &&
        !defaultContentLoading &&
        !allContentError &&
        !defaultContentError && (
          <Text className="text-center text-gray-500 mt-10">
            {contentType === "ALL"
              ? "No content available yet."
              : `No ${contentType.toLowerCase()} content available yet.`}
          </Text>
        )}
    </ScrollView>
  );
}

export default React.memo(AllContentTikTok);
