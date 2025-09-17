import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio, ResizeMode, Video } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
import { useInteractionStore } from "../../store/useInteractionStore";
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
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Download functionality
  const { handleDownload, checkIfDownloaded } = useDownloadHandler();

  // Interaction store for notifications
  const { toggleLike, toggleSave } = useInteractionStore();

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
  const [audioMuted, setAudioMuted] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<Record<string, Audio.Sound>>({});

  // Book opening state
  const [openingBook, setOpeningBook] = useState<string | null>(null);
  const [bookAnimation] = useState(new Animated.Value(0));
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);

  // Like state
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Reset UI state when user changes (detect via token changes)
  useEffect(() => {
    const resetUIState = () => {
      console.log("🔄 Resetting UI state for new user session");
      setLikedItems({});
      setLikeCounts({});
      setSavedItemIds(new Set());
      setSavedItems([]);
      setShowOverlay({});
      setPlayingVideos({});
      setPlayingAudio(null);
      setAudioProgress({});
      setAudioDuration({});
      setAudioPosition({});
      setAudioMuted({});
      setMenuOpenId(null);
      setBookModalVisible(false);
      setSelectedBook(null);
      setOpeningBook(null);
    };

    // Reset state when component mounts (new user session)
    resetUIState();
  }, []);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all audio references when component unmounts
      Object.keys(audioRefs.current).forEach(async (itemId) => {
        try {
          const sound = audioRefs.current[itemId];
          if (sound) {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              await sound.unloadAsync();
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error cleaning up audio ${itemId}:`, error);
        }
      });
      audioRefs.current = {};
    };
  }, []);

  // Helper function to check if an item is saved
  const isItemSaved = useCallback(
    (itemId: string) => {
      const isInLocalState = savedItemIds.has(itemId);
      const isInStore = libraryStore.isItemSaved(itemId);
      return isInLocalState || isInStore;
    },
    [savedItemIds, libraryStore]
  );

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
            const savedIds = new Set<string>();

            userBookmarks.forEach((item) => {
              const itemId = item._id || item.id;
              savedIds.add(itemId); // Add to saved items set
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
            setSavedItemIds(savedIds); // Update saved items set

            // Update library store with server state
            console.log(`📚 Loaded ${userBookmarks.length} items from server`);

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

        // Update saved items set from local storage
        const savedIds = new Set<string>();
        const likeState: Record<string, boolean> = {};
        const likeCountState: Record<string, number> = {};

        localItems.forEach((item) => {
          const itemId = item.id;
          savedIds.add(itemId);
          // Initialize like states from local storage
          likeState[itemId] = (item as any).isLiked || false;
          likeCountState[itemId] =
            (item as any).likeCount || (item as any).likes || 0;
        });

        setSavedItemIds(savedIds);
        setLikedItems(likeState);
        setLikeCounts(likeCountState);
        setError(null);
      } catch (localError) {
        console.error("Error loading from local storage:", localError);
        setSavedItems([]);
        setSavedItemIds(new Set());
        setLikedItems({});
        setLikeCounts({});
        setError("Failed to load library content from local storage.");
      }
    };

    loadSavedItems();
  }, [contentType]);

  // Helper function to detect if content is an e-book based on file URL and MIME type
  const isEbookContent = useCallback((item: any): boolean => {
    const mediaUrl = item.mediaUrl || item.fileUrl || "";
    const mimeType = item.mimeType || "";

    // Check MIME type first (most reliable)
    if (
      mimeType.includes("application/pdf") ||
      mimeType.includes("application/epub") ||
      mimeType.includes("application/x-mobipocket") ||
      mimeType.includes("application/vnd.amazon.ebook") ||
      mimeType.includes("application/x-azw") ||
      mimeType.includes("application/x-azw3")
    ) {
      return true;
    }

    // Fallback to file extension detection
    const fileExtension = mediaUrl.split(".").pop()?.toLowerCase();
    const ebookExtensions = [
      "pdf",
      "epub",
      "mobi",
      "azw",
      "azw3",
      "fb2",
      "lit",
      "lrf",
    ];
    const isEbookExtension =
      fileExtension && ebookExtensions.includes(fileExtension);

    // URL path analysis
    const isBookPath =
      mediaUrl.toLowerCase().includes("media-books") ||
      mediaUrl.toLowerCase().includes("books") ||
      mediaUrl.toLowerCase().includes("ebooks") ||
      mediaUrl.toLowerCase().includes("e-books");

    const isEbook = isEbookExtension || isBookPath;

    // Debug logging for ebooks with wrong contentType
    if (
      isEbook &&
      item.contentType !== "e-books" &&
      item.contentType !== "ebook" &&
      item.contentType !== "books"
    ) {
      console.log(`📚 Library E-book detected with wrong contentType:`, {
        title: item.title,
        contentType: item.contentType,
        mimeType: mimeType,
        fileExtension: fileExtension,
        mediaUrl: mediaUrl.substring(0, 100) + "...",
      });
    }

    return isEbook;
  }, []);

  // Helper function to get effective content type (considering e-book detection)
  const getEffectiveContentType = useCallback(
    (item: any): string => {
      const originalType = item.contentType?.toLowerCase() || "";

      // If it's an e-book file, treat it as an e-book regardless of contentType
      if (isEbookContent(item)) {
        return "e-books";
      }

      return originalType;
    },
    [isEbookContent]
  );

  // Filter items based on contentType
  const filterItemsByType = useCallback(
    (items: any[], type?: string) => {
      if (!type || type === "ALL") return items;

      const typeMap: Record<string, string[]> = {
        LIVE: ["live"],
        SERMON: ["sermon", "teachings"],
        MUSIC: ["music", "audio"],
        "E-BOOKS": ["e-books", "ebook", "books", "pdf"],
        VIDEO: ["videos", "video"],
      };

      const allowedTypes = typeMap[type] || [type.toLowerCase()];
      return items.filter((item) => {
        const effectiveType = getEffectiveContentType(item);
        return allowedTypes.some((allowedType) =>
          effectiveType.includes(allowedType.toLowerCase())
        );
      });
    },
    [getEffectiveContentType]
  );

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

          // Initialize overlay state for video items and saved items set
          const overlayState: Record<string, boolean> = {};
          const savedIds = new Set<string>();
          const likeState: Record<string, boolean> = {};
          const likeCountState: Record<string, number> = {};

          userBookmarks.forEach((item) => {
            const itemId = item._id || item.id;
            savedIds.add(itemId); // Add to saved items set
            if (item.contentType === "videos") {
              overlayState[itemId] = true;
            }
            // Initialize like states
            likeState[itemId] = item.isLiked || false;
            likeCountState[itemId] = item.likeCount || item.likes || 0;
          });

          setShowOverlay(overlayState);
          setSavedItemIds(savedIds); // Update saved items set
          setLikedItems(likeState);
          setLikeCounts(likeCountState);
        } else {
          // No user bookmarks found, try local storage
          console.log(
            "No user bookmarks found during refresh, falling back to local storage"
          );
          await loadFromLocalStorage();
        }
      } else {
        // API failed, try local storage
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

          // Update saved items set
          setSavedItemIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });

          // Update saved items set
          setSavedItemIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
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

          // Update saved items set
          setSavedItemIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
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

          // Update saved items set
          setSavedItemIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
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
      const mediaUrl = item.mediaUrl || item.fileUrl || "";
      await Share.share({
        title: item.title,
        message: `Check out this ${item.contentType}: ${item.title}\n${mediaUrl}`,
        url: mediaUrl,
      });
      setMenuOpenId(null);
    } catch (error) {
      console.warn("Share error:", error);
      setMenuOpenId(null);
    }
  }, []);

  // Function to refresh saved state - useful for syncing after API calls
  const refreshSavedState = useCallback(() => {
    console.log("🔄 Refreshing saved state...");
    const currentSavedIds = new Set<string>();

    // Add items from current savedItems
    savedItems.forEach((item) => {
      const itemId = item._id || item.id;
      currentSavedIds.add(itemId);
    });

    // Add items from library store
    const storeItems = libraryStore.getAllSavedItems();
    storeItems.forEach((item) => {
      currentSavedIds.add(item.id);
    });

    setSavedItemIds(currentSavedIds);
    console.log("✅ Saved state refreshed:", Array.from(currentSavedIds));
  }, [savedItems, libraryStore]);

  // Function to check if item is saved on server side
  const checkIfItemIsSavedOnServer = useCallback(async (itemId: string) => {
    try {
      // Try to get saved content and check if this item is in the list
      const response = await allMediaAPI.getSavedContent(1, 100);

      if (response.success && response.data) {
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

        // Check if the item is in the saved list
        const isSavedOnServer = apiItems.some((item: any) => {
          const serverItemId = item._id || item.id;
          return serverItemId === itemId;
        });

        return isSavedOnServer;
      }
    } catch (error) {}
    return false;
  }, []);

  const handleSaveToLibrary = useCallback(
    async (item: any) => {
      try {
        const itemId = item._id || item.id;
        const isCurrentlySaved = isItemSaved(itemId);

        if (isCurrentlySaved) {
          // Show confirmation dialog for removal
          Alert.alert(
            "Remove from Library",
            `Are you sure you want to remove "${item.title}" from your library?`,
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                  try {
                    await handleRemoveFromLibrary(item);
                    Alert.alert("Success", "Item removed from library");
                  } catch (error) {
                    console.error("Error removing from library:", error);
                    Alert.alert(
                      "Error",
                      "Failed to remove item from library. Please try again."
                    );
                  }
                },
              },
            ]
          );
        } else {
          // Use interaction store which handles notifications automatically
          try {
            await toggleSave(itemId, "media");

            // Add to local library store for UI consistency
            const libraryItem = {
              id: itemId,
              contentType: item.contentType || "unknown",
              fileUrl: item.mediaUrl || item.fileUrl || "",
              title: item.title || "Untitled",
              speaker: item.speaker || item.uploadedBy || "",
              uploadedBy: item.uploadedBy || "",
              description: item.description || "",
              createdAt: item.createdAt || new Date().toISOString(),
              speakerAvatar: item.speakerAvatar || item.imageUrl,
              views: item.views || 0,
              sheared: item.sheared || 0,
              saved: 1,
              comment: item.comment || 0,
              favorite: item.favorite || 0,
              imageUrl: item.imageUrl || item.thumbnailUrl,
            };

            await libraryStore.addToLibrary(libraryItem);

            // Update local state
            setSavedItems((prev) => {
              const exists = prev.some((savedItem) => {
                const savedItemId = savedItem._id || savedItem.id;
                return savedItemId === itemId;
              });
              if (!exists) {
                return [item, ...prev];
              }
              return prev;
            });

            setSavedItemIds((prev) => new Set([...prev, itemId]));
            refreshSavedState();

            Alert.alert(
              "Success",
              `"${item.title}" has been added to your library`
            );
            console.log(`✅ Added ${item.title} to library with notification`);
          } catch (error) {
            console.error("Error saving to library:", error);
            Alert.alert(
              "Error",
              "Failed to save item to library. Please try again."
            );
          }
        }
      } catch (error) {
        console.error("Error in handleSaveToLibrary:", error);
        Alert.alert("Error", "Failed to process library action");
      }
    },
    [
      isItemSaved,
      handleRemoveFromLibrary,
      toggleSave,
      libraryStore,
      setSavedItems,
      setSavedItemIds,
      refreshSavedState,
    ]
  );

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

  // Video seek function for timeline scrubbing
  const seekVideo = useCallback(async (itemId: string, progress: number) => {
    try {
      if (videoRefs.current[itemId]) {
        const videoRef = videoRefs.current[itemId];
        const status = await videoRef.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          const position = progress * status.durationMillis;
          await videoRef.setPositionAsync(position);
        }
      }
    } catch (error) {
      console.error("Error seeking video:", error);
    }
  }, []);

  // Audio playback functions
  const toggleAudioPlay = useCallback(
    async (itemId: string, fileUrl: string) => {
      try {
        if (playingAudio === itemId) {
          // Stop current audio
          if (audioRefs.current[itemId]) {
            try {
              const status = await audioRefs.current[itemId].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[itemId].pauseAsync();
              }
            } catch (error) {
              console.warn("⚠️ Error pausing audio:", error);
            }
          }
          setPlayingAudio(null);
        } else {
          // Stop any other playing audio first
          if (playingAudio && audioRefs.current[playingAudio]) {
            try {
              const status = await audioRefs.current[
                playingAudio
              ].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[playingAudio].pauseAsync();
              }
            } catch (error) {
              console.warn("⚠️ Error stopping previous audio:", error);
              // Clean up invalid reference
              delete audioRefs.current[playingAudio];
            }
          }

          // Start new audio
          if (!audioRefs.current[itemId]) {
            const { sound } = await Audio.Sound.createAsync(
              { uri: fileUrl },
              {
                shouldPlay: true,
                isMuted: audioMuted[itemId] || false,
              },
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
                    // Clean up sound reference
                    delete audioRefs.current[itemId];
                  }
                }
              }
            );
            audioRefs.current[itemId] = sound;
          } else {
            try {
              const status = await audioRefs.current[itemId].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[itemId].playAsync();
              } else {
                // Sound exists but not loaded, recreate it
                delete audioRefs.current[itemId];
                const { sound } = await Audio.Sound.createAsync(
                  { uri: fileUrl },
                  { shouldPlay: true }
                );
                audioRefs.current[itemId] = sound;
              }
            } catch (error) {
              console.warn("⚠️ Error playing existing audio:", error);
              // Clean up and recreate
              delete audioRefs.current[itemId];
              const { sound } = await Audio.Sound.createAsync(
                { uri: fileUrl },
                { shouldPlay: true }
              );
              audioRefs.current[itemId] = sound;
            }
          }
          setPlayingAudio(itemId);
        }
      } catch (error) {
        console.error("❌ Error toggling audio playback:", error);
        // Clean up any partial state
        setPlayingAudio(null);
        delete audioRefs.current[itemId];
      }
    },
    [playingAudio, audioMuted]
  );

  // Audio mute toggle function
  const toggleAudioMute = useCallback(
    async (itemId: string) => {
      try {
        const currentMuted = audioMuted[itemId] || false;
        const newMuted = !currentMuted;

        setAudioMuted((prev) => ({ ...prev, [itemId]: newMuted }));

        if (audioRefs.current[itemId]) {
          await audioRefs.current[itemId].setIsMutedAsync(newMuted);
        }
      } catch (error) {
        console.error("Error toggling audio mute:", error);
      }
    },
    [audioMuted]
  );

  // Audio seek function for timeline scrubbing
  const seekAudio = useCallback(
    async (itemId: string, progress: number) => {
      try {
        if (audioRefs.current[itemId] && audioDuration[itemId]) {
          const position = progress * audioDuration[itemId];
          await audioRefs.current[itemId].setPositionAsync(position);
          setAudioPosition((prev) => ({ ...prev, [itemId]: position }));
          setAudioProgress((prev) => ({ ...prev, [itemId]: progress }));
        }
      } catch (error) {
        console.error("Error seeking audio:", error);
      }
    },
    [audioDuration]
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

  // Enhanced Like handler using interaction store with notifications
  const handleLike = useCallback(
    async (itemId: string, itemTitle?: string, thumbnailUrl?: string) => {
      try {
        console.log("🔄 Like action started:", {
          itemId,
          itemTitle,
          timestamp: new Date().toISOString(),
        });

        // Use the interaction store which handles notifications automatically
        await toggleLike(itemId, "media");

        console.log("✅ Like action completed with notification");
      } catch (error) {
        console.error("❌ Like error:", error);
        Alert.alert("Error", "Failed to like content");
      }
    },
    [toggleLike]
  );

  const getContentTypeIcon = useCallback((contentType: string) => {
    const type = contentType?.toLowerCase() || "";

    switch (type) {
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
      case "books":
      case "pdf":
        return "book"; // Use book icon for PDFs/ebooks
      // No images in this app
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

  // Thumbnail source function - comprehensive fallback logic
  const getThumbnailSource = useCallback((item: any) => {
    console.log(`🖼️ Getting thumbnail for: ${item.title}`, {
      thumbnailUrl: item.thumbnailUrl,
      mediaUrl: item.mediaUrl,
      fileUrl: item.fileUrl,
      imageUrl: item.imageUrl,
      coverImage: item.coverImage,
    });

    // Priority 1: thumbnailUrl (actual thumbnail)
    if (item.thumbnailUrl) {
      console.log(`✅ Using thumbnailUrl: ${item.thumbnailUrl}`);
      return { uri: item.thumbnailUrl };
    }

    // Priority 2: mediaUrl (main media file)
    if (item.mediaUrl) {
      console.log(`✅ Using mediaUrl: ${item.mediaUrl}`);
      return { uri: item.mediaUrl };
    }

    // Priority 3: fileUrl (file URL)
    if (item.fileUrl) {
      console.log(`✅ Using fileUrl: ${item.fileUrl}`);
      return { uri: item.fileUrl };
    }

    // Priority 4: imageUrl (object with uri)
    if (
      item.imageUrl &&
      typeof item.imageUrl === "object" &&
      item.imageUrl.uri
    ) {
      console.log(`✅ Using imageUrl.uri: ${item.imageUrl.uri}`);
      return item.imageUrl;
    }

    // Priority 5: imageUrl (string)
    if (item.imageUrl && typeof item.imageUrl === "string") {
      console.log(`✅ Using imageUrl string: ${item.imageUrl}`);
      return { uri: item.imageUrl };
    }

    // Priority 6: coverImage
    if (item.coverImage) {
      console.log(`✅ Using coverImage: ${item.coverImage}`);
      return typeof item.coverImage === "string"
        ? { uri: item.coverImage }
        : item.coverImage;
    }

    // Fallback to default image based on content type
    const contentType = item.contentType?.toLowerCase();
    console.log(`⚠️ No thumbnail found, using default for: ${contentType}`);

    switch (contentType) {
      case "videos":
      case "video":
        return require("../../../assets/images/image (10).png");
      case "music":
      case "audio":
        return require("../../../assets/images/image (12).png");
      case "e-books":
      case "ebook":
      case "books":
      case "pdf":
        return require("../../../assets/images/image (13).png");
      case "live":
        return require("../../../assets/images/image (14).png");
      default:
        // Default to book image for unknown types (likely ebooks)
        return require("../../../assets/images/image (13).png");
    }
  }, []);

  const renderMediaCard = useCallback(
    ({ item }: any) => {
      const itemId = item._id || item.id;
      const isVideo = item.contentType === "videos";
      const isAudio =
        item.contentType === "music" || item.contentType === "audio";
      const isBook =
        item.contentType === "e-books" ||
        item.contentType === "ebook" ||
        item.contentType === "books" ||
        item.contentType === "pdf" ||
        item.contentType?.toLowerCase().includes("book") ||
        item.contentType?.toLowerCase().includes("pdf") ||
        isEbookContent(item); // Check if it's an e-book file

      // No images in this app - only videos, audio, and ebooks

      // Enhanced content type detection
      const contentType = item.contentType?.toLowerCase() || "";
      const isPlaying = playingVideos[itemId] ?? false;
      const isAudioPlaying = playingAudio === itemId;
      const showVideoOverlay = showOverlay[itemId] ?? true;
      const isValidUri = (u: any) =>
        typeof u === "string" &&
        u.trim().length > 0 &&
        /^https?:\/\//.test(u.trim());

      // Use mediaUrl if available, otherwise fall back to fileUrl
      const videoUrl = item.mediaUrl || item.fileUrl;
      const audioUrl = item.mediaUrl || item.fileUrl;

      // Use the URL from backend - no hardcoded overrides
      const safeVideoUri = isValidUri(videoUrl)
        ? String(videoUrl).trim()
        : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      const safeAudioUri = isValidUri(audioUrl) ? String(audioUrl).trim() : "";

      // Debug logging for video URLs
      if (item.contentType === "video") {
        console.log(`🎯 AllLibrary - VIDEO: ${item.title}`);
        console.log(`🎯 Original URL: ${videoUrl}`);
        console.log(`🎯 Final URL: ${safeVideoUri}`);
      }

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

              {/* Video Controls Overlay */}
              {isPlaying && (
                <View className="absolute top-2 right-2 flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={() => globalVideoStore.toggleVideoMute(itemId)}
                    className="bg-black/70 rounded-full p-1"
                  >
                    <Ionicons
                      name={
                        globalVideoStore.mutedVideos[itemId]
                          ? "volume-mute"
                          : "volume-high"
                      }
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Video Progress Bar with Timeline Scrubbing */}
              {isPlaying && (
                <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <TouchableOpacity
                    className="h-full w-full"
                    onPress={async (event) => {
                      const { locationX } = event.nativeEvent;
                      const progressBarWidth = 200; // Fixed width for progress bar
                      const progress = Math.max(
                        0,
                        Math.min(1, locationX / progressBarWidth)
                      );
                      await seekVideo(itemId, progress);
                    }}
                    activeOpacity={1}
                  >
                    <View
                      className="h-full bg-[#FEA74E]"
                      style={{
                        width: `${globalVideoStore.progresses[itemId] || 0}%`,
                      }}
                    />
                  </TouchableOpacity>
                </View>
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
                source={getThumbnailSource(item)}
                className="h-full w-full rounded-xl"
                resizeMode="cover"
                onError={(error) => {
                  console.log(
                    `❌ Audio thumbnail failed to load for ${item.title}:`,
                    error
                  );
                }}
                onLoad={() => {
                  console.log(
                    `✅ Audio thumbnail loaded successfully for ${item.title}`
                  );
                }}
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

              {/* Audio Progress Bar with Timeline Scrubbing */}
              {isAudioPlaying && (
                <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <TouchableOpacity
                    className="h-full w-full"
                    onPress={(event) => {
                      const { locationX } = event.nativeEvent;
                      const progressBarWidth = 200; // Fixed width for progress bar
                      const progress = Math.max(
                        0,
                        Math.min(1, locationX / progressBarWidth)
                      );
                      seekAudio(itemId, progress);
                    }}
                    activeOpacity={1}
                  >
                    <View
                      className="h-full bg-[#FEA74E]"
                      style={{
                        width: `${(audioProgress[itemId] || 0) * 100}%`,
                      }}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Audio Controls Overlay */}
              {isAudioPlaying && (
                <View className="absolute top-2 right-2 flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={() => toggleAudioMute(itemId)}
                    className="bg-black/70 rounded-full p-1"
                  >
                    <Ionicons
                      name={audioMuted[itemId] ? "volume-mute" : "volume-high"}
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
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
            // Book content with thumbnail
            <TouchableOpacity
              onPress={() => openBook(item)}
              className="w-full h-full"
              activeOpacity={0.9}
            >
              <Image
                source={getThumbnailSource(item)}
                className="h-full w-full rounded-xl"
                resizeMode="cover"
                onError={(error) => {
                  console.log(
                    `❌ Book thumbnail failed to load for ${item.title}:`,
                    error
                  );
                  console.log(`📚 Available image sources:`, {
                    thumbnailUrl: item.thumbnailUrl,
                    imageUrl: item.imageUrl,
                    coverImage: item.coverImage,
                    mediaUrl: item.mediaUrl,
                    fileUrl: item.fileUrl,
                  });
                }}
                onLoad={() => {
                  console.log(
                    `✅ Book thumbnail loaded successfully for ${item.title}`
                  );
                }}
              />

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
            // All other content (should only be ebooks/books) with proper thumbnail display
            <TouchableOpacity className="w-full h-full" activeOpacity={0.9}>
              <Image
                source={getThumbnailSource(item)}
                className="h-full w-full rounded-xl"
                resizeMode="cover"
                onError={(error) => {
                  console.log(
                    `❌ Content thumbnail failed to load for ${item.title}:`,
                    error
                  );
                }}
                onLoad={() => {
                  console.log(
                    `✅ Content thumbnail loaded successfully for ${item.title}`
                  );
                }}
              />
            </TouchableOpacity>
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

          {/* Interaction Buttons - Shifted Left for Better Clickability */}
          <View className="absolute top-2 left-2 flex-col space-y-2">
            {/* Like Button */}
            <TouchableOpacity
              className="bg-black/70 rounded-full p-2"
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                handleLike(itemId, item.title, item.thumbnailUrl);
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

            {/* Comment Button */}
            <TouchableOpacity
              className="bg-black/70 rounded-full p-2"
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                // TODO: Implement comment functionality
                console.log("Comment pressed for:", item.title);
              }}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Save to Library Button */}
            <TouchableOpacity
              className="bg-black/70 rounded-full p-2"
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                handleSaveToLibrary(item);
              }}
            >
              <Ionicons
                name={isItemSaved(itemId) ? "bookmark" : "bookmark-outline"}
                size={16}
                color={isItemSaved(itemId) ? "#FEA74E" : "#FFFFFF"}
              />
            </TouchableOpacity>
          </View>

          {/* Content type badge with colored background */}
          <View
            className="absolute top-2 right-2 rounded-full p-2"
            style={{ backgroundColor: getContentTypeColor(item.contentType) }}
          >
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
      getThumbnailSource,
      checkIfDownloaded,
      handleDownload,
      playingAudio,
      audioProgress,
      toggleAudioPlay,
      toggleAudioMute,
      seekAudio,
      seekVideo,
      audioMuted,
      openBook,
      likedItems,
      likeCounts,
      handleLike,
      globalVideoStore,
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
              <View className="w-32 h-40 bg-gradient-to-br from-[#8B4513] to-[#D2691E] rounded-lg shadow-lg justify-center items-center">
                <View className="bg-white/20 p-4 rounded-full">
                  <Ionicons name="book" size={40} color="#FFFFFF" />
                </View>
              </View>
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
                  console.log("📚 Opening book:", selectedBook.title);
                  console.log(
                    "📚 Book media URL:",
                    selectedBook.mediaUrl || selectedBook.fileUrl
                  );
                  // TODO: Implement PDF opening with react-native-pdf
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
