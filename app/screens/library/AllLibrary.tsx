import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGlobalVideoStore } from "../../store/useGlobalVideoStore";
import { useLibraryStore } from "../../store/useLibraryStore";
import allMediaAPI from "../../utils/allMediaAPI";
import {
  convertToDownloadableItem,
  useDownloadHandler,
} from "../../utils/downloadUtils";

const sampleMedia = [
  {
    id: "1",
    title: "2 Hours time with God with Dunsin Oy...",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "2",
    title: "Living with the Holy Spirit",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "3",
    title: "The power of confidence",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "4",
    title: "30 minutes songs of worship",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "5",
    title: "The Prophetic",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "6",
    title: "Lagos open field praise",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "7",
    title: "Jesus preaches",
    image: require("../../../assets/images/image (10).png"),
  },
  {
    id: "8",
    title: "AI Jams in Lekki Lagos Stadium",
    image: require("../../../assets/images/image (10).png"),
  },
];

const pastSearchesInitial = [
  "Miracles",
  "Spiritual growth",
  "Mega worship",
  "Soaking worship",
  "Love and Light",
];

export default function AllLibrary({ contentType }: { contentType?: string }) {
  const [query, setQuery] = useState("");
  const libraryStore = useLibraryStore();
  const globalVideoStore = useGlobalVideoStore();
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  // Video playback state for videos in all library
  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>(
    {}
  );
  const [showOverlay, setShowOverlay] = useState<Record<string, boolean>>({});
  const videoRefs = useRef<Record<string, any>>({});

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>(
    {}
  );
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>(
    {}
  );
  const [audioPosition, setAudioPosition] = useState<Record<string, number>>(
    {}
  );
  const audioRefs = useRef<Record<string, Audio.Sound>>({});

  // Book opening state
  const [openingBook, setOpeningBook] = useState<string | null>(null);
  const [bookAnimation] = useState(new Animated.Value(0));
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);

  // Like state
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadSavedItems = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch saved content from API
        const response = await allMediaAPI.getSavedContent(1, 50); // Get first 50 items

        if (response.success && response.data) {
          // Handle different API response structures
          let apiItems = [];

          if (response.data.data?.media) {
            // Structure: { data: { data: { media: [...] } } }
            apiItems = response.data.data.media;
          } else if (response.data.media) {
            // Structure: { data: { media: [...] } }
            apiItems = response.data.media;
          } else if (Array.isArray(response.data.data)) {
            // Structure: { data: { data: [...] } }
            apiItems = response.data.data;
          } else if (Array.isArray(response.data)) {
            // Structure: { data: [...] }
            apiItems = response.data;
          }

          // Filter out default/onboarding content if backend is returning it
          const userBookmarks = apiItems.filter(
            (item: any) =>
              !item.isDefaultContent &&
              !item.isOnboardingContent &&
              item.isInLibrary !== false
          );

          if (Array.isArray(userBookmarks) && userBookmarks.length > 0) {
            setSavedItems(userBookmarks);

            // Initialize overlay state for video items
            const overlayState: Record<string, boolean> = {};
            const likeState: Record<string, boolean> = {};
            const likeCountState: Record<string, number> = {};

            userBookmarks.forEach((item) => {
              const itemId = item._id || item.id;
              if (item.contentType === "videos") {
                overlayState[itemId] = true;
              }
              // Initialize like states
              likeState[itemId] = item.isLiked || false;
              likeCountState[itemId] = item.likeCount || item.likes || 0;
            });
            setShowOverlay(overlayState);
            setLikedItems(likeState);
            setLikeCounts(likeCountState);
            setError(null);
          } else {
            // No user bookmarks found, try local storage
            console.log(
              "No user bookmarks found in API response, falling back to local storage"
            );
            await loadFromLocalStorage();
          }
        } else {
          // API failed, try local storage
          console.log("API response failed, falling back to local storage");
          await loadFromLocalStorage();
        }
      } catch (error) {
        console.error("Error loading saved items:", error);
        setError(
          "Failed to load library content. Using local storage as fallback."
        );
        // Fallback to local storage
        await loadFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    const loadFromLocalStorage = async () => {
      try {
        if (!libraryStore.isLoaded) {
          await libraryStore.loadSavedItems();
        }
        const localItems = libraryStore.getAllSavedItems();
        setSavedItems(localItems);
        setError(null);
      } catch (localError) {
        console.error("Error loading from local storage:", localError);
        setSavedItems([]);
        setError("Failed to load library content from local storage.");
      }
    };

    loadSavedItems();
  }, [contentType]);

  // Filter items based on contentType
  const filterItemsByType = useCallback((items: any[], type?: string) => {
    if (!type || type === "ALL") return items;

    const typeMap: Record<string, string[]> = {
      LIVE: ["live"],
      SERMON: ["sermon", "teachings"],
      MUSIC: ["music", "audio"],
      "E-BOOKS": ["e-books", "ebook"],
      VIDEO: ["videos", "video"],
    };

    const allowedTypes = typeMap[type] || [type.toLowerCase()];
    return items.filter((item) =>
      allowedTypes.some((allowedType) =>
        item.contentType?.toLowerCase().includes(allowedType.toLowerCase())
      )
    );
  }, []);

  // Update filtered items when contentType changes
  const filteredItems = useMemo(() => {
    return filterItemsByType(savedItems, contentType);
  }, [savedItems, contentType, filterItemsByType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Fetch saved content from API
      const response = await allMediaAPI.getSavedContent(1, 50);

      if (response.success && response.data) {
        // Handle different API response structures
        let apiItems = [];

        if (response.data.data?.media) {
          apiItems = response.data.data.media;
        } else if (response.data.media) {
          apiItems = response.data.media;
        } else if (Array.isArray(response.data.data)) {
          apiItems = response.data.data;
        } else if (Array.isArray(response.data)) {
          apiItems = response.data;
        }

        // Filter out default/onboarding content if backend is returning it
        const userBookmarks = apiItems.filter(
          (item: any) =>
            !item.isDefaultContent &&
            !item.isOnboardingContent &&
            item.isInLibrary !== false
        );

        if (Array.isArray(userBookmarks) && userBookmarks.length > 0) {
          setSavedItems(userBookmarks);

          // Initialize overlay state for video items
          const overlayState: Record<string, boolean> = {};
          userBookmarks.forEach((item) => {
            const itemId = item._id || item.id;
            if (item.contentType === "videos") {
              overlayState[itemId] = true;
            }
          });
          setShowOverlay(overlayState);
        } else {
          // No user bookmarks found, try local storage
          console.log(
            "No user bookmarks found during refresh, falling back to local storage"
          );
          await loadFromLocalStorage();
        }
      } else {
        // API failed, try local storage
        console.log("API refresh failed, falling back to local storage");
        await loadFromLocalStorage();
      }
    } catch (error) {
      console.error("Error refreshing saved items:", error);
      // Fallback to local storage
      await loadFromLocalStorage();
    } finally {
      setRefreshing(false);
    }
  }, [contentType]);

  const loadFromLocalStorage = async () => {
    try {
      if (!libraryStore.isLoaded) {
        await libraryStore.loadSavedItems();
      }
      const localItems = libraryStore.getAllSavedItems();
      setSavedItems(localItems);
    } catch (localError) {
      console.error("Error loading from local storage:", localError);
      setSavedItems([]);
    }
  };

  const handleRemoveFromLibrary = useCallback(
    async (item: any) => {
      const itemId = item._id || item.id;
      const itemTitle = item.title || "Unknown item";

      try {
        // Remove from API
        const response = await allMediaAPI.unbookmarkContent(itemId);

        if (response.success) {
          // Remove from local storage
          await libraryStore.removeFromLibrary(itemId);

          // Update local state
          setSavedItems((prev) =>
            prev.filter((savedItem) => {
              const savedItemId = savedItem._id || savedItem.id;
              return savedItemId !== itemId;
            })
          );

          console.log(`🗑️ Removed ${itemTitle} from library (API + local)`);
        } else {
          console.warn(
            `🗑️ Failed to remove ${itemTitle} from API:`,
            response.error || "Unknown error"
          );
          // Still remove from local storage as fallback
          await libraryStore.removeFromLibrary(itemId);
          setSavedItems((prev) =>
            prev.filter((savedItem) => {
              const savedItemId = savedItem._id || savedItem.id;
              return savedItemId !== itemId;
            })
          );
        }
      } catch (error) {
        console.error(`🗑️ Error removing ${itemTitle} from library:`, error);
        // Fallback to local removal only
        try {
          await libraryStore.removeFromLibrary(itemId);
          setSavedItems((prev) =>
            prev.filter((savedItem) => {
              const savedItemId = savedItem._id || savedItem.id;
              return savedItemId !== itemId;
            })
          );
          console.log(`🗑️ Removed ${itemTitle} from library (local only)`);
        } catch (localError) {
          console.error(
            `🗑️ Failed to remove ${itemTitle} from local storage:`,
            localError
          );
        }
      }

      setMenuOpenId(null);
    },
    [libraryStore]
  );

  const handleShare = useCallback(async (item: any) => {
    try {
      await Share.share({
        title: item.title,
        message: `Check out this ${item.contentType}: ${item.title}\n${
          item.fileUrl || ""
        }`,
        url: item.fileUrl || "",
      });
      setMenuOpenId(null);
    } catch (error) {
      console.warn("Share error:", error);
      setMenuOpenId(null);
    }
  }, []);

  const togglePlay = useCallback(
    (itemId: string) => {
      // Pause all other videos first
      Object.keys(playingVideos).forEach((id) => {
        if (id !== itemId) {
          setPlayingVideos((prev) => ({ ...prev, [id]: false }));
          setShowOverlay((prev) => ({ ...prev, [id]: true }));
        }
      });

      // Also pause videos in global store
      globalVideoStore.pauseAllVideos();

      // Toggle current video
      const isPlaying = playingVideos[itemId] ?? false;
      setPlayingVideos((prev) => ({ ...prev, [itemId]: !isPlaying }));
      setShowOverlay((prev) => ({ ...prev, [itemId]: isPlaying }));
    },
    [playingVideos, globalVideoStore]
  );

  // Audio playback functions
  const toggleAudioPlay = useCallback(
    async (itemId: string, fileUrl: string) => {
      try {
        if (playingAudio === itemId) {
          // Stop current audio
          if (audioRefs.current[itemId]) {
            await audioRefs.current[itemId].pauseAsync();
          }
          setPlayingAudio(null);
        } else {
          // Stop any other playing audio first
          if (playingAudio && audioRefs.current[playingAudio]) {
            await audioRefs.current[playingAudio].pauseAsync();
          }

          // Start new audio
          if (!audioRefs.current[itemId]) {
            const { sound } = await Audio.Sound.createAsync(
              { uri: fileUrl },
              { shouldPlay: true },
              (status) => {
                if (
                  status.isLoaded &&
                  status.durationMillis &&
                  status.positionMillis
                ) {
                  const duration = status.durationMillis;
                  const position = status.positionMillis;
                  setAudioProgress((prev) => ({
                    ...prev,
                    [itemId]: position / duration,
                  }));
                  setAudioPosition((prev) => ({ ...prev, [itemId]: position }));
                  setAudioDuration((prev) => ({ ...prev, [itemId]: duration }));

                  if (status.didJustFinish) {
                    setPlayingAudio(null);
                    setAudioProgress((prev) => ({ ...prev, [itemId]: 0 }));
                    setAudioPosition((prev) => ({ ...prev, [itemId]: 0 }));
                  }
                }
              }
            );
            audioRefs.current[itemId] = sound;
          } else {
            await audioRefs.current[itemId].playAsync();
          }
          setPlayingAudio(itemId);
        }
      } catch (error) {
        console.error("Error toggling audio playback:", error);
      }
    },
    [playingAudio]
  );

  // Book opening functions
  const openBook = useCallback(
    (book: any) => {
      setSelectedBook(book);
      setBookModalVisible(true);

      // Fancy opening animation
      Animated.sequence([
        Animated.timing(bookAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [bookAnimation]
  );

  const closeBook = useCallback(() => {
    Animated.timing(bookAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setBookModalVisible(false);
      setSelectedBook(null);
    });
  }, [bookAnimation]);

  // Like handler
  const handleLike = useCallback(
    async (itemId: string) => {
      try {
        const currentLiked = likedItems[itemId] || false;
        const currentCount = likeCounts[itemId] || 0;

        console.log("🔄 Like action:", itemId, currentLiked);

        // Optimistically update UI
        setLikedItems((prev) => ({ ...prev, [itemId]: !currentLiked }));
        setLikeCounts((prev) => ({
          ...prev,
          [itemId]: currentLiked ? currentCount - 1 : currentCount + 1,
        }));

        // Call the like API
        const response = await allMediaAPI.toggleLike("media", itemId);

        if (response.success) {
          console.log("✅ Like successful:", response.data);
          // Update with actual data from API if available
          if (response.data) {
            setLikedItems((prev) => ({
              ...prev,
              [itemId]: response.data.liked,
            }));
            setLikeCounts((prev) => ({
              ...prev,
              [itemId]: response.data.totalLikes,
            }));
          }
        } else {
          console.error("❌ Like failed:", response.error);
          // Revert optimistic update
          setLikedItems((prev) => ({ ...prev, [itemId]: currentLiked }));
          setLikeCounts((prev) => ({ ...prev, [itemId]: currentCount }));
        }
      } catch (error) {
        console.error("❌ Like error:", error);
        // Revert optimistic update
        const currentLiked = likedItems[itemId] || false;
        const currentCount = likeCounts[itemId] || 0;
        setLikedItems((prev) => ({ ...prev, [itemId]: currentLiked }));
        setLikeCounts((prev) => ({ ...prev, [itemId]: currentCount }));
      }
    },
    [likedItems, likeCounts]
  );

  const getContentTypeIcon = useCallback((contentType: string) => {
    switch (contentType.toLowerCase()) {
      case "videos":
      case "video":
        return "videocam";
      case "music":
      case "audio":
        return "musical-notes";
      case "sermon":
        return "book";
      case "e-books":
      case "ebook":
        return "library";
      case "live":
        return "radio";
      case "teachings":
        return "school";
      case "podcast":
        return "headset";
      default:
        return "document";
    }
  }, []);

  const getContentTypeColor = useCallback((contentType: string) => {
    switch (contentType.toLowerCase()) {
      case "videos":
      case "video":
        return "#FF6B6B"; // Red for videos
      case "music":
      case "audio":
        return "#4ECDC4"; // Teal for audio
      case "sermon":
        return "#45B7D1"; // Blue for sermons
      case "e-books":
      case "ebook":
        return "#96CEB4"; // Green for ebooks
      case "live":
        return "#FFEAA7"; // Yellow for live
      case "teachings":
        return "#DDA0DD"; // Purple for teachings
      case "podcast":
        return "#98D8C8"; // Mint for podcasts
      default:
        return "#95A5A6"; // Gray for default
    }
  }, []);

  const renderMediaCard = useCallback(
    ({ item }: any) => {
      const itemId = item._id || item.id;
      const isVideo = item.contentType === "videos";
      const isAudio =
        item.contentType === "music" || item.contentType === "audio";
      const isBook =
        item.contentType === "e-books" || item.contentType === "ebook";
      const isPlaying = playingVideos[itemId] ?? false;
      const isAudioPlaying = playingAudio === itemId;
      const showVideoOverlay = showOverlay[itemId] ?? true;
      const isValidUri = (u: any) =>
        typeof u === "string" &&
        u.trim().length > 0 &&
        /^https?:\/\//.test(u.trim());
      const safeVideoUri = isValidUri(item.fileUrl)
        ? String(item.fileUrl).trim()
        : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      const safeAudioUri = isValidUri(item.fileUrl)
        ? String(item.fileUrl).trim()
        : "";

      return (
        <View className="w-[48%] mb-6 h-[232px] rounded-xl overflow-hidden bg-[#E5E5EA]">
          {isVideo ? (
            <TouchableOpacity
              onPress={() => togglePlay(itemId)}
              className="w-full h-full"
              activeOpacity={0.9}
            >
              <Video
                ref={(ref) => {
                  if (ref) {
                    videoRefs.current[itemId] = ref;
                  }
                }}
                source={{ uri: safeVideoUri }}
                style={{ width: "100%", height: "100%", position: "absolute" }}
                resizeMode={ResizeMode.COVER}
                shouldPlay={isPlaying}
                isLooping={false}
                isMuted={false}
                useNativeControls={false}
                onError={(e) => {
                  console.warn(
                    "Video failed to load in AllLibrary:",
                    item?.title,
                    e
                  );
                  setPlayingVideos((prev) => ({ ...prev, [itemId]: false }));
                  setShowOverlay((prev) => ({ ...prev, [itemId]: true }));
                }}
                onPlaybackStatusUpdate={(status) => {
                  if (!status.isLoaded) return;
                  if (status.didJustFinish) {
                    setPlayingVideos((prev) => ({ ...prev, [itemId]: false }));
                    setShowOverlay((prev) => ({ ...prev, [itemId]: true }));
                    console.log(
                      `🎬 All Library video completed: ${item.title}`
                    );
                  }
                }}
              />

              {/* Play/Pause Overlay for Videos */}
              {!isPlaying && showVideoOverlay && (
                <>
                  <View className="absolute inset-0 justify-center items-center">
                    <View className="bg-white/70 p-2 rounded-full">
                      <Ionicons name="play" size={24} color="#FEA74E" />
                    </View>
                  </View>

                  <View className="absolute bottom-2 left-2 right-2">
                    <Text
                      className="text-white font-rubik-bold text-sm"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          ) : isAudio ? (
            // Audio content with play/pause overlay
            <TouchableOpacity
              onPress={() =>
                safeAudioUri && toggleAudioPlay(itemId, safeAudioUri)
              }
              className="w-full h-full"
              activeOpacity={0.9}
            >
              <Image
                source={
                  item.thumbnailUrl
                    ? { uri: item.thumbnailUrl }
                    : item.imageUrl
                    ? typeof item.imageUrl === "string"
                      ? { uri: item.imageUrl }
                      : item.imageUrl
                    : require("../../../assets/images/image (10).png")
                }
                className="h-full w-full rounded-xl"
                resizeMode="cover"
              />

              {/* Audio Play/Pause Overlay */}
              <View className="absolute inset-0 justify-center items-center">
                <View className="bg-black/60 p-3 rounded-full">
                  <Ionicons
                    name={isAudioPlaying ? "pause" : "play"}
                    size={28}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              {/* Audio Progress Bar */}
              {isAudioPlaying && (
                <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <View
                    className="h-full bg-[#FEA74E]"
                    style={{
                      width: `${(audioProgress[itemId] || 0) * 100}%`,
                    }}
                  />
                </View>
              )}

              {/* Audio Title */}
              <View className="absolute bottom-2 left-2 right-2">
                <Text
                  className="text-white font-rubik-bold text-sm"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
          ) : isBook ? (
            // Book content with fancy opening
            <TouchableOpacity
              onPress={() => openBook(item)}
              className="w-full h-full"
              activeOpacity={0.9}
            >
              <Image
                source={
                  item.thumbnailUrl
                    ? { uri: item.thumbnailUrl }
                    : item.imageUrl
                    ? typeof item.imageUrl === "string"
                      ? { uri: item.imageUrl }
                      : item.imageUrl
                    : require("../../../assets/images/image (10).png")
                }
                className="h-full w-full rounded-xl"
                resizeMode="cover"
              />

              {/* Book Opening Overlay */}
              <View className="absolute inset-0 justify-center items-center">
                <View className="bg-gradient-to-br from-[#8B4513] to-[#D2691E] p-4 rounded-lg shadow-lg">
                  <Ionicons name="book" size={32} color="#FFFFFF" />
                  <Text className="text-white text-xs font-rubik-bold mt-1">
                    Tap to Open
                  </Text>
                </View>
              </View>

              {/* Book Title */}
              <View className="absolute bottom-2 left-2 right-2">
                <Text
                  className="text-white font-rubik-bold text-sm"
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            // Other content (images, etc.)
            <Image
              source={
                item.thumbnailUrl
                  ? { uri: item.thumbnailUrl }
                  : item.imageUrl
                  ? typeof item.imageUrl === "string"
                    ? { uri: item.imageUrl }
                    : item.imageUrl
                  : require("../../../assets/images/image (10).png")
              }
              className="h-full w-full rounded-xl"
              resizeMode="cover"
            />
          )}

          {/* Title overlay for non-video, non-audio, non-book content */}
          {!isVideo && !isAudio && !isBook && (
            <View className="absolute bottom-2 left-2 right-2">
              <Text
                className="text-white font-rubik-bold text-sm"
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>
          )}

          {/* Ellipsis Menu Trigger */}
          <TouchableOpacity
            className="absolute bottom-2 right-2 bg-white rounded-full p-1"
            onPress={(e) => {
              if (isVideo) e.stopPropagation();
              setMenuOpenId((prev) => (prev === itemId ? null : itemId));
            }}
          >
            <Ionicons name="ellipsis-vertical" size={14} color="#3A3E50" />
          </TouchableOpacity>

          {/* Ellipsis Menu */}
          {menuOpenId === itemId && (
            <>
              {/* Background overlay for this card only */}
              <TouchableOpacity
                className="absolute inset-0 bg-black/10 z-40"
                activeOpacity={1}
                onPress={() => setMenuOpenId(null)}
              />
              {/* Menu positioned relative to this card - smaller and better positioned */}
              <View className="absolute bottom-12 right-1 bg-white shadow-xl rounded-lg p-2 z-50 w-[140px] border border-gray-200">
                <TouchableOpacity
                  className="py-2 px-2 border-b border-gray-100 flex-row items-center justify-between"
                  onPress={() => setMenuOpenId(null)}
                >
                  <Text className="text-[#1D2939] font-rubik text-xs">
                    View Details
                  </Text>
                  <Ionicons name="eye-outline" size={16} color="#1D2939" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="py-2 px-2 border-b border-gray-100 flex-row items-center justify-between"
                  onPress={() => handleShare(item)}
                >
                  <Text className="text-[#1D2939] font-rubik text-xs">
                    Share
                  </Text>
                  <Feather name="send" size={16} color="#1D2939" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="py-2 px-2 flex-row items-center justify-between"
                  onPress={() => handleRemoveFromLibrary(item)}
                >
                  <Text className="text-[#1D2939] font-rubik text-xs">
                    Remove
                  </Text>
                  <MaterialIcons name="bookmark" size={16} color="#1D2939" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="py-2 px-2 flex-row items-center justify-between border-t border-gray-100"
                  onPress={async () => {
                    const contentType =
                      item.contentType === "music" ? "audio" : item.contentType;
                    const downloadableItem = convertToDownloadableItem(
                      item,
                      contentType as any
                    );
                    const result = await handleDownload(downloadableItem);
                    if (result.success) {
                      setMenuOpenId(null);
                    }
                  }}
                >
                  <Text className="text-[#1D2939] font-rubik text-xs">
                    {checkIfDownloaded(itemId) ? "Downloaded" : "Download"}
                  </Text>
                  <Ionicons
                    name={
                      checkIfDownloaded(itemId)
                        ? "checkmark-circle"
                        : "download-outline"
                    }
                    size={16}
                    color={checkIfDownloaded(itemId) ? "#256E63" : "#090E24"}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Like Button */}
          <TouchableOpacity
            className="absolute top-2 left-2 bg-black/70 rounded-full p-2"
            onPress={(e) => {
              e.stopPropagation();
              handleLike(itemId);
            }}
          >
            <Ionicons
              name={likedItems[itemId] ? "heart" : "heart-outline"}
              size={16}
              color={likedItems[itemId] ? "#FF6B6B" : "#FFFFFF"}
            />
            {likeCounts[itemId] > 0 && (
              <Text className="text-white text-xs font-rubik-bold text-center mt-1">
                {likeCounts[itemId]}
              </Text>
            )}
          </TouchableOpacity>

          {/* Content type badge */}
          <View className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
            <Ionicons
              name={getContentTypeIcon(item.contentType)}
              size={12}
              color="#FFFFFF"
            />
          </View>

          {/* Speaker Badge */}
          {item.speaker && (
            <View className="absolute top-12 left-2 bg-black/50 rounded px-2 py-1">
              <Text className="text-white text-xs font-rubik">
                {item.speaker}
              </Text>
            </View>
          )}
        </View>
      );
    },
    [
      playingVideos,
      showOverlay,
      togglePlay,
      handleRemoveFromLibrary,
      handleShare,
      getContentTypeIcon,
      checkIfDownloaded,
      handleDownload,
      playingAudio,
      audioProgress,
      toggleAudioPlay,
      openBook,
      likedItems,
      likeCounts,
      handleLike,
    ]
  );

  const keyExtractor = useCallback((item: any, index: number) => {
    return item._id || item.id || `item-${index}`;
  }, []);

  return (
    <SafeAreaView className="flex-1  bg-[#98a2b318]">
      {/* Scrollable Content with matching px-6 */}
      <ScrollView
        className="flex-1 px-3"
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Past Search Keywords */}

        {/* Error Message */}
        {error && (
          <View className="mx-4 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <View className="flex-row items-center">
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text className="text-yellow-800 text-sm font-rubik ml-2 flex-1">
                {error}
              </Text>
            </View>
          </View>
        )}

        {/* Loading State */}
        {loading ? (
          <View className="flex-1 justify-center items-center py-10">
            <Ionicons name="refresh" size={48} color="#98A2B3" />
            <Text className="text-[#98A2B3] text-lg font-rubik-medium mt-4">
              Loading your library...
            </Text>
          </View>
        ) : filteredItems.length > 0 ? (
          <FlatList
            data={filteredItems}
            renderItem={renderMediaCard}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            scrollEnabled={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        ) : (
          <View className="flex-1 justify-center items-center py-10">
            <Ionicons name="bookmark-outline" size={48} color="#98A2B3" />
            <Text className="text-[#98A2B3] text-lg font-rubik-medium mt-4">
              No saved content yet
            </Text>
            <Text className="text-[#D0D5DD] text-sm font-rubik text-center mt-2 px-6">
              Content you save will appear here for easy access
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Fancy Book Opening Modal */}
      {bookModalVisible && selectedBook && (
        <View className="absolute inset-0 bg-black/50 z-50 justify-center items-center">
          <Animated.View
            style={{
              transform: [
                {
                  scale: bookAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
                {
                  rotateY: bookAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["180deg", "0deg"],
                  }),
                },
              ],
              opacity: bookAnimation,
            }}
            className="bg-white rounded-2xl p-6 mx-4 w-[90%] max-w-md"
          >
            {/* Book Cover */}
            <View className="items-center mb-4">
              <Image
                source={
                  selectedBook.thumbnailUrl
                    ? { uri: selectedBook.thumbnailUrl }
                    : selectedBook.imageUrl
                    ? typeof selectedBook.imageUrl === "string"
                      ? { uri: selectedBook.imageUrl }
                      : selectedBook.imageUrl
                    : require("../../../assets/images/image (10).png")
                }
                className="w-32 h-40 rounded-lg shadow-lg"
                resizeMode="cover"
              />
            </View>

            {/* Book Details */}
            <View className="items-center mb-6">
              <Text className="text-xl font-rubik-bold text-center mb-2">
                {selectedBook.title}
              </Text>
              {selectedBook.speaker && (
                <Text className="text-gray-600 font-rubik text-center mb-2">
                  by {selectedBook.speaker}
                </Text>
              )}
              <Text className="text-sm text-gray-500 font-rubik text-center">
                E-Book
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row justify-between space-x-3">
              <TouchableOpacity
                onPress={closeBook}
                className="flex-1 bg-gray-200 py-3 rounded-lg items-center"
              >
                <Text className="text-gray-700 font-rubik-bold">Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  // Open book in external viewer or navigate to book reader
                  console.log("Opening book:", selectedBook.title);
                  closeBook();
                }}
                className="flex-1 bg-[#FEA74E] py-3 rounded-lg items-center"
              >
                <Text className="text-white font-rubik-bold">Read Now</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
