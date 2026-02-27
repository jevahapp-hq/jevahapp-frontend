import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CopyrightFreeSongModal from "../components/CopyrightFreeSongModal";
import copyrightFreeMusicAPI, {
  CopyrightFreeSongResponse,
} from "../services/copyrightFreeMusicAPI";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";

type DisplayMode = "list" | "grid" | "small" | "large";

interface DiscoverCard {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  color: string;
}

export default function Music() {
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [showSongModal, setShowSongModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [songModalInitialAction, setSongModalInitialAction] = useState<
    "options" | "playlist" | null
  >(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const { width: SCREEN_WIDTH } = Dimensions.get("window");

  // Global audio player state
  const {
    currentTrack,
    isPlaying: globalIsPlaying,
    setTrack,
    togglePlayPause,
    progress: globalProgress,
    duration: globalDuration,
    position: globalPosition,
    isMuted: globalIsMuted,
  } = useGlobalAudioPlayerStore();

  // Discover weekly style cards (placeholder for ads/featured content) - using Jevah colors
  const discoverCards: DiscoverCard[] = [
    {
      id: "1",
      title: "Discover Weekly",
      description: "New copyright-free gospel music curated just for you.",
      thumbnailUrl: "",
      color: "#256E63", // Jevah Primary (Green)
    },
    {
      id: "2",
      title: "Featured Playlist",
      description: "Most popular copyright-free songs everyone's listening to.",
      thumbnailUrl: "",
      color: "#FEA74E", // Jevah Secondary (Orange)
    },
  ];

  /**
   * Transform backend song format to frontend format
   */
  const transformBackendSong = useCallback(
    (backendSong: CopyrightFreeSongResponse): any => {
      const id = backendSong.id ?? backendSong._id ?? "";
      const audioUrl = backendSong.audioUrl ?? backendSong.fileUrl ?? "";
      const rawViews = backendSong.views ?? backendSong.viewCount ?? 0;
      const likes = backendSong.likes ?? backendSong.likeCount ?? 0;
      const views = Math.max(Number(rawViews) || 0, Number(likes) || 0);
      const artist = backendSong.artist ?? backendSong.singer ?? "";

      return {
        id,
        _id: id,
        title: backendSong.title,
        artist,
        year: backendSong.year,
        audioUrl,
        thumbnailUrl: backendSong.thumbnailUrl,
        category: backendSong.category,
        duration: backendSong.duration,
        contentType: backendSong.contentType,
        description: backendSong.description,
        speaker: backendSong.speaker ?? artist,
        uploadedBy: backendSong.uploadedBy,
        createdAt: backendSong.createdAt,
        views,
        viewCount: views,
        likes,
        likeCount: likes,
        isLiked: backendSong.isLiked ?? false,
        isInLibrary: backendSong.isInLibrary ?? false,
        isPublicDomain: backendSong.isPublicDomain ?? true,
      };
    },
    []
  );

  /**
   * Load songs from API
   */
  const loadSongs = useCallback(
    async (search?: string, category?: string | null) => {
      setError(null);
      setLoading(true);

      try {
        const response = search
          ? await copyrightFreeMusicAPI.searchSongs(search, {
            category: category || undefined,
            limit: 50,
          })
          : await copyrightFreeMusicAPI.getAllSongs({
            category: category || undefined,
            limit: 50,
            sort: "popular",
          });

        if (response.success && response.data?.songs?.length) {
          const transformedSongs = response.data.songs
            .map(transformBackendSong)
            // Defensive: ensure this screen shows ONLY copyright-free catalog
            .filter(
              (s) =>
                !s?.contentType ||
                String(s?.contentType || "").toLowerCase() ===
                "copyright-free-music"
            );
          setSongs(transformedSongs);
        } else {
          setSongs([]);
        }
      } catch (err) {
        console.error("Error loading songs:", err);
        setError("Failed to load songs. Please try again.");
        setSongs([]);
      } finally {
        setLoading(false);
      }
    },
    [transformBackendSong]
  );

  /**
   * Load categories
   */
  const loadCategories = useCallback(async () => {
    try {
      const response = await copyrightFreeMusicAPI.getCategories();
      if (response.success && response.data?.categories) {
        setCategories(
          response.data.categories.map((cat: any) => cat.name || cat)
        );
      }
    } catch (err) {
      console.warn("Error loading categories:", err);
    }
  }, []);

  useEffect(() => {
    loadSongs(searchQuery || undefined, selectedCategory);
    loadCategories();
  }, [searchQuery, selectedCategory]);

  /**
   * Handle play/pause for a song
   */
  const handlePlayPress = useCallback(
    async (song: any) => {
      if (currentTrack?.id === song.id && globalIsPlaying) {
        await togglePlayPause();
      } else {
        // Build queue from current songs
        const state = useGlobalAudioPlayerStore.getState();
        const songIndex = songs.findIndex((s) => s.id === song.id);

        if (songIndex !== -1) {
          const mappedQueue = songs.map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            audioUrl: s.audioUrl,
            thumbnailUrl: s.thumbnailUrl,
            duration: s.duration,
            category: s.category,
            description: s.description,
          }));

          useGlobalAudioPlayerStore.setState({
            queue: mappedQueue,
            currentIndex: songIndex,
          });
        }

        await setTrack(
          {
            id: song.id,
            title: song.title,
            artist: song.artist,
            audioUrl: song.audioUrl,
            thumbnailUrl: song.thumbnailUrl,
            duration: song.duration,
            category: song.category,
            description: song.description,
          },
          true
        );
      }
    },
    [currentTrack, globalIsPlaying, setTrack, togglePlayPause, songs]
  );

  /**
   * Format duration (expects seconds, returns MM:SS format)
   */
  const formatDuration = useCallback((seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  /**
   * Format time in milliseconds (for modal)
   */
  const formatTime = useCallback((milliseconds: number) => {
    if (!milliseconds || isNaN(milliseconds)) return "0:00";
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  /**
   * Render Discover Weekly style card
   */
  const renderDiscoverCard = useCallback(
    ({ item }: { item: DiscoverCard }) => (
      <TouchableOpacity
        activeOpacity={0.9}
        style={{
          width: SCREEN_WIDTH - 48,
          height: 220, // Taller for more cinematic presence
          marginRight: 16,
          borderRadius: 32, // More rounded for modern premium feel
          overflow: "hidden",
          ...Platform.select({
            ios: {
              shadowColor: item.color,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.4,
              shadowRadius: 16,
            },
            android: {
              elevation: 12,
            },
          }),
        }}
      >
        <LinearGradient
          colors={[item.color, "#000000"]} // High-contrast cinematic gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        >
          {/* Visual Flourish: Glass Orbs/Mesh Gradient Effect */}
          <View
            style={{
              position: "absolute",
              top: -40,
              right: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              transform: [{ scale: 1.2 }],
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -20,
              left: -20,
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "rgba(255, 255, 255, 0.08)",
            }}
          />

          <View style={{ flex: 1, padding: 24, justifyContent: "space-between" }}>
            {/* HUD / Glassmorphism Content Area */}
            <View>
              <BlurView
                intensity={30}
                tint="dark"
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  backgroundColor: "rgba(0, 0, 0, 0.2)",
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.1)",
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 10,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    fontFamily: "Rubik_700Bold",
                  }}
                >
                  Featured
                </Text>
              </BlurView>

              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: "#FFFFFF",
                  fontFamily: "Rubik_700Bold",
                  marginBottom: 8,
                  letterSpacing: -0.5,
                  textShadowColor: "rgba(0, 0, 0, 0.4)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 6,
                }}
              >
                {item.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "rgba(255, 255, 255, 0.75)",
                  fontFamily: "Rubik_400Regular",
                  lineHeight: 20,
                  maxWidth: "85%",
                }}
              >
                {item.description}
              </Text>
            </View>

            {/* Premium Interaction Bar */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#FFFFFF",
                  justifyContent: "center",
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Ionicons name="play" size={28} color={item.color} style={{ marginLeft: 3 }} />
              </TouchableOpacity>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.15)",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  gap: 16,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <TouchableOpacity>
                  <Ionicons name="heart-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="share-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    ),
    [SCREEN_WIDTH]
  );

  /**
   * Render song in list view (default)
   */
  const renderListItem = useCallback(
    ({ item }: { item: any }) => {
      const thumbnailSource =
        typeof item.thumbnailUrl === "string"
          ? { uri: item.thumbnailUrl }
          : item.thumbnailUrl;

      return (
        <TouchableOpacity
          onPress={() => {
            // Tap should open Now Playing view like the reference screenshot
            // and start playback with the current queue.
            setSelectedSong(item);
            setSongModalInitialAction(null);
            setShowSongModal(true);
            // Start playing immediately (fire and forget - don't await to avoid blocking UI)
            handlePlayPress(item).catch(err => console.warn("Play error:", err));
          }}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* Circular thumbnail */}
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

          {/* Song info */}
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
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#98A2B3",
                fontFamily: "Rubik_400Regular",
              }}
              numberOfLines={1}
            >
              By {item.artist} • {formatDuration(item.duration)}
            </Text>
          </View>

          {/* 3-dot menu */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setSelectedSong(item);
              setSongModalInitialAction("options");
              setShowSongModal(true);
            }}
            activeOpacity={0.7}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#256E63" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    },
    [handlePlayPress, formatDuration]
  );

  /**
   * Render song in grid view
   */
  const renderGridItem = useCallback(
    ({ item }: { item: any }) => {
      const thumbnailSource =
        typeof item.thumbnailUrl === "string"
          ? { uri: item.thumbnailUrl }
          : item.thumbnailUrl;
      const cardWidth = (SCREEN_WIDTH - 48) / 2;

      return (
        <TouchableOpacity
          onPress={() => {
            setSelectedSong(item);
            setSongModalInitialAction(null);
            setShowSongModal(true);
            // Start playing immediately (fire and forget - don't await to avoid blocking UI)
            handlePlayPress(item).catch(err => console.warn("Play error:", err));
          }}
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
            {item.title}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#98A2B3",
              fontFamily: "Rubik_400Regular",
            }}
            numberOfLines={1}
          >
            {item.artist}
          </Text>
        </TouchableOpacity>
      );
    },
    [SCREEN_WIDTH, handlePlayPress]
  );

  /**
   * Render song in small icons view
   */
  const renderSmallItem = useCallback(
    ({ item }: { item: any }) => {
      const thumbnailSource =
        typeof item.thumbnailUrl === "string"
          ? { uri: item.thumbnailUrl }
          : item.thumbnailUrl;
      const itemWidth = (SCREEN_WIDTH - 48) / 3;

      return (
        <TouchableOpacity
          onPress={() => {
            setSelectedSong(item);
            setSongModalInitialAction(null);
            setShowSongModal(true);
            // Start playing immediately (fire and forget - don't await to avoid blocking UI)
            handlePlayPress(item).catch(err => console.warn("Play error:", err));
          }}
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
            {item.title}
          </Text>
        </TouchableOpacity>
      );
    },
    [SCREEN_WIDTH, handlePlayPress]
  );

  /**
   * Render song in large icons view
   */
  const renderLargeItem = useCallback(
    ({ item }: { item: any }) => {
      const thumbnailSource =
        typeof item.thumbnailUrl === "string"
          ? { uri: item.thumbnailUrl }
          : item.thumbnailUrl;
      const cardWidth = SCREEN_WIDTH - 32;

      return (
        <TouchableOpacity
          onPress={() => {
            setSelectedSong(item);
            setSongModalInitialAction(null);
            setShowSongModal(true);
            // Start playing immediately (fire and forget - don't await to avoid blocking UI)
            handlePlayPress(item).catch(err => console.warn("Play error:", err));
          }}
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
              {item.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#98A2B3",
                fontFamily: "Rubik_400Regular",
              }}
              numberOfLines={1}
            >
              By {item.artist} • {formatDuration(item.duration)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [SCREEN_WIDTH, formatDuration, handlePlayPress]
  );

  /**
   * Render songs based on display mode
   */
  const renderSongItem = useCallback(
    ({ item }: { item: any }) => {
      switch (displayMode) {
        case "list":
          return renderListItem({ item });
        case "grid":
          return renderGridItem({ item });
        case "small":
          return renderSmallItem({ item });
        case "large":
          return renderLargeItem({ item });
        default:
          return renderListItem({ item });
      }
    },
    [displayMode, renderListItem, renderGridItem, renderSmallItem, renderLargeItem]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header with Search and Display Mode Toggle */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        {/* Search Input or Icon */}
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
                onPress={() => {
                  setSearchQuery("");
                  setShowSearchInput(false);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#98A2B3" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
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

            {/* Display Mode Toggle (kept alongside icons; centered as a group) */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#F3F4F6",
                borderRadius: 12,
                padding: 4,
                gap: 4,
              }}
            >
              {(["list", "grid", "small", "large"] as DisplayMode[]).map(
                (mode) => (
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
                )
              )}
            </View>
          </View>
        )}
      </View>

      {/* Discover Weekly Cards (Scrollable Horizontal) */}
      <View style={{ marginBottom: 24 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          {discoverCards.map((card) => (
            <View key={card.id}>{renderDiscoverCard({ item: card })}</View>
          ))}
        </ScrollView>
      </View>

      {/* Songs List */}
      {loading ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color="#256E63" />
          <Text
            style={{
              marginTop: 12,
              fontSize: 14,
              color: "#98A2B3",
              fontFamily: "Rubik_400Regular",
            }}
          >
            Loading songs...
          </Text>
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Ionicons name="alert-circle-outline" size={48} color="#98A2B3" />
          <Text
            style={{
              marginTop: 12,
              fontSize: 16,
              color: "#98A2B3",
              fontFamily: "Rubik_400Regular",
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        </View>
      ) : songs.length === 0 ? (
        <View
          style={{
            flex: 1,
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
            No songs found
          </Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.id}
          key={displayMode} // Force re-render when display mode changes
          numColumns={displayMode === "grid" ? 2 : displayMode === "small" ? 3 : 1}
          contentContainerStyle={{
            paddingBottom: 100, // Space for bottom nav
          }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 16,
              paddingBottom: 32,
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#E5E7EB",
                alignSelf: "center",
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#1D2939",
                fontFamily: "Rubik_700Bold",
                paddingHorizontal: 20,
                marginBottom: 16,
              }}
            >
              Filter by Category
            </Text>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(null);
                  setShowFilterModal(false);
                }}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: selectedCategory === null ? "#256E63" : "#1D2939",
                    fontFamily:
                      selectedCategory === null
                        ? "Rubik_600SemiBold"
                        : "Rubik_400Regular",
                  }}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowFilterModal(false);
                  }}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#E5E7EB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color:
                        selectedCategory === category ? "#256E63" : "#1D2939",
                      fontFamily:
                        selectedCategory === category
                          ? "Rubik_600SemiBold"
                          : "Rubik_400Regular",
                    }}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Song Modal */}
      {selectedSong && (
        <CopyrightFreeSongModal
          visible={showSongModal}
          song={
            songModalInitialAction === "options"
              ? selectedSong
              : (currentTrack ?? selectedSong)
          }
          variant={songModalInitialAction === "options" ? "options" : "player"}
          onClose={() => {
            setShowSongModal(false);
            setSelectedSong(null);
            setSongModalInitialAction(null);
          }}
          onPlay={handlePlayPress}
          isPlaying={
            selectedSong
              ? currentTrack?.id === selectedSong.id && globalIsPlaying
              : false
          }
          audioProgress={
            selectedSong && currentTrack?.id === selectedSong.id
              ? globalProgress
              : 0
          }
          audioDuration={
            selectedSong && currentTrack?.id === selectedSong.id
              ? globalDuration
              : (selectedSong?.duration * 1000 || 0)
          }
          audioPosition={
            selectedSong && currentTrack?.id === selectedSong.id
              ? globalPosition
              : 0
          }
          isMuted={
            selectedSong && currentTrack?.id === selectedSong.id
              ? globalIsMuted
              : false
          }
          onTogglePlay={async () => {
            if (selectedSong) {
              if (currentTrack?.id === selectedSong.id) {
                await togglePlayPause();
              } else {
                await handlePlayPress(selectedSong);
              }
            }
          }}
          onToggleMute={async () => {
            if (selectedSong && currentTrack?.id === selectedSong.id) {
              await useGlobalAudioPlayerStore.getState().toggleMute();
            }
          }}
          onSeek={async (progress) => {
            if (selectedSong && currentTrack?.id === selectedSong.id) {
              await useGlobalAudioPlayerStore.getState().seekToProgress(progress);
            }
          }}
          formatTime={formatTime}
          initialAction={songModalInitialAction}
        />
      )}
    </View>
  );
}
