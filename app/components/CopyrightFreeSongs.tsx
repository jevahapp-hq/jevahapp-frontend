import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import copyrightFreeMusicAPI, {
    CopyrightFreeSongResponse,
} from "../services/copyrightFreeMusicAPI";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import CopyrightFreeSongModal from "./CopyrightFreeSongModal";

interface CopyrightFreeSongsProps {
  onSongSelect?: (song: any) => void;
  showAsLibrary?: boolean;
}

export default function CopyrightFreeSongs({
  onSongSelect,
  showAsLibrary = false,
}: CopyrightFreeSongsProps) {
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingSong, setPlayingSong] = useState<string | null>(null);
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
  const [showSongModal, setShowSongModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsSong, setOptionsSong] = useState<any | null>(null);
  const audioRefs = useRef<Record<string, Audio.Sound>>({});

  /**
   * Load songs on mount.
   * First try cached songs for instant display, then refresh from network.
   */
  useEffect(() => {
    loadSongs(true);
  }, [loadSongs]);

  // Cleanup audio when component unmounts
  useEffect(() => {
    return () => {
      Object.keys(audioRefs.current).forEach(async (songId) => {
        try {
          const sound = audioRefs.current[songId];
          if (sound) {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
              await sound.unloadAsync();
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error cleaning up audio ${songId}:`, error);
        }
      });
      audioRefs.current = {};
    };
  }, []);

  /**
   * Transform backend song format to frontend format
   */
  const transformBackendSong = useCallback(
    (backendSong: CopyrightFreeSongResponse): any => {
      // Support id/_id, fileUrl/audioUrl, views/viewCount, likes/likeCount, artist/singer
      const id = backendSong.id ?? backendSong._id ?? "";
      const audioUrl = backendSong.audioUrl ?? backendSong.fileUrl ?? "";
      const views = backendSong.views ?? backendSong.viewCount ?? 0;
      const likes = backendSong.likes ?? backendSong.likeCount ?? 0;
      const artist = backendSong.artist ?? backendSong.singer ?? "";

      return {
        id,
        title: backendSong.title,
        artist,
        year: backendSong.year,
        audioUrl, // String URL from backend
        thumbnailUrl: backendSong.thumbnailUrl, // String URL from backend
        category: backendSong.category,
        duration: backendSong.duration,
        contentType: backendSong.contentType,
        description: backendSong.description,
        speaker: backendSong.speaker ?? artist,
        uploadedBy: backendSong.uploadedBy,
        createdAt: backendSong.createdAt,
        views,
        likes,
        isLiked: backendSong.isLiked ?? false,
        isInLibrary: backendSong.isInLibrary ?? false,
        isPublicDomain: backendSong.isPublicDomain ?? true,
      };
    },
    []
  );

  /**
   * Fallback hardcoded songs (used temporarily when backend endpoint is not ready)
   * Uses the SAME card UI; just a local dataset until the API is implemented.
   */
  const getFallbackSongs = useCallback(() => {
    return [
      {
        id: "song-in-the-name-of-jesus",
        title: "In The Name of Jesus",
        artist: "Tadashikeiji",
        year: 2024,
        audioUrl: require("../../assets/audio/in-the-name-of-jesus-Tadashikeiji.mp3"),
        thumbnailUrl: require("../../assets/images/Jesus.webp"),
        category: "Gospel Music",
        duration: 180,
        contentType: "copyright-free-music",
        description:
          "A powerful gospel song praising the name of Jesus Christ.",
        speaker: "Tadashikeiji",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 1250,
        likes: 89,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-call-to-worship",
        title: "Call to Worship",
        artist: "Engelis",
        year: 2024,
        audioUrl: require("../../assets/audio/call-to-worship-xx-engelis.mp3"),
        thumbnailUrl: require("../../assets/images/engelis.jpg"),
        category: "Gospel Music",
        duration: 220,
        description: "A beautiful call to worship song by Engelis.",
        contentType: "copyright-free-music",
        speaker: "Engelis",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 980,
        likes: 67,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-the-wind-gospel",
        title: "The Wind Gospel",
        artist: "Gospel Pop Vocals",
        year: 2024,
        audioUrl: require("../../assets/audio/the-wind-gospel-pop-vocals-341410.mp3"),
        thumbnailUrl: require("../../assets/images/jesus-christ-14617710.webp"),
        category: "Gospel Pop",
        duration: 195,
        description: "An uplifting gospel pop song with beautiful vocals.",
        speaker: "Gospel Pop Vocals",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 1450,
        likes: 112,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-gospel-train",
        title: "Gospel Train",
        artist: "Traditional Gospel",
        year: 2024,
        audioUrl: require("../../assets/audio/gospel-train-367419.mp3"),
        thumbnailUrl: require("../../assets/images/Background #22.jpeg"),
        category: "Traditional Gospel",
        duration: 210,
        description: "A classic gospel train song with traditional styling.",
        speaker: "Traditional Gospel",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 2100,
        likes: 145,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
      {
        id: "song-you-restore-my-soul",
        title: "You Restore My Soul",
        artist: "Tune Melody Media",
        year: 2024,
        audioUrl: require("../../assets/audio/you-restore-my-soul-413723.mp3"),
        thumbnailUrl: require("../../assets/images/tunemelodymedia   .jpg"),
        category: "Contemporary Gospel",
        duration: 185,
        description: "A soulful contemporary gospel song about restoration.",
        speaker: "Tune Melody Media",
        uploadedBy: "Jevah App",
        createdAt: new Date().toISOString(),
        views: 1750,
        likes: 98,
        isLiked: false,
        isInLibrary: false,
        isPublicDomain: true,
      },
    ];
  }, []);

  /**
   * Load songs from backend API with optional cache in AsyncStorage
   * to make subsequent loads feel instant.
   */
  const loadSongs = useCallback(
    async (useCacheFirst: boolean = true) => {
      setError(null);

      const CACHE_KEY = "copyrightFreeSongsCache_v1";
      const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

      let usedCache = false;

      // 1. Try to show cached songs immediately (for fast perceived load)
      if (useCacheFirst) {
        try {
          const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            const { timestamp, songs: cachedSongs } = parsed || {};
            if (
              Array.isArray(cachedSongs) &&
              typeof timestamp === "number" &&
              Date.now() - timestamp < CACHE_TTL_MS
            ) {
              setSongs(cachedSongs);
              setLoading(false);
              usedCache = true;
            }
          }
        } catch (cacheError) {
          console.warn("⚠️ Failed to read copyright-free songs cache:", cacheError);
        }
      }

      // 2. Fetch fresh data from backend (in background if cache was used)
      if (!usedCache) {
        setLoading(true);
      }

      try {
        const response = await copyrightFreeMusicAPI.getAllSongs({
          page: 1,
          limit: 20, // smaller page for faster response
          sort: "popular",
        });

        if (response.success && response.data?.songs?.length) {
          // Transform backend songs to frontend format
          const transformedSongs = response.data.songs.map(transformBackendSong);
          setSongs(transformedSongs);

          // Store in cache for next time
          try {
            await AsyncStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                timestamp: Date.now(),
                songs: transformedSongs,
              })
            );
          } catch (cacheWriteError) {
            console.warn(
              "⚠️ Failed to cache copyright-free songs:",
              cacheWriteError
            );
          }
        } else {
          console.warn(
            "⚠️ No songs from backend, using local copyright-free set"
          );
          const fallback = getFallbackSongs();
          setSongs(fallback);
        }
      } catch (err) {
        console.error("❌ Error loading songs from backend:", err);
        setError("Failed to load songs from server. Showing offline collection.");
        const fallback = getFallbackSongs();
        setSongs(fallback);
      } finally {
        setLoading(false);
      }
    },
    [transformBackendSong, getFallbackSongs]
  );

  const toggleAudioPlay = useCallback(
    async (songId: string, audioUrl: any) => {
      try {
        console.log("🎵 toggleAudioPlay called for:", songId);
        console.log("🎵 Audio URL type:", typeof audioUrl);
        console.log("🎵 Audio URL value:", audioUrl);

        if (playingSong === songId) {
          // Stop current audio
          if (audioRefs.current[songId]) {
            try {
              const status = await audioRefs.current[songId].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[songId].pauseAsync();
              }
            } catch (error) {
              console.warn("⚠️ Error pausing audio:", error);
            }
          }
          setPlayingSong(null);
        } else {
          // Stop any other playing audio first
          if (playingSong && audioRefs.current[playingSong]) {
            try {
              const status = await audioRefs.current[
                playingSong
              ].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[playingSong].pauseAsync();
              }
            } catch (error) {
              console.warn("⚠️ Error stopping previous audio:", error);
              delete audioRefs.current[playingSong];
            }
          }

          // Start new audio
          if (!audioRefs.current[songId]) {
            console.log("🎵 Creating new audio instance for:", songId);
            const { sound } = await Audio.Sound.createAsync(
              audioUrl,
              {
                shouldPlay: true,
                isMuted: audioMuted[songId] || false,
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
                    [songId]: position / duration,
                  }));
                  setAudioPosition((prev) => ({ ...prev, [songId]: position }));
                  setAudioDuration((prev) => ({ ...prev, [songId]: duration }));

                  if (status.didJustFinish) {
                    setPlayingSong(null);
                    setAudioProgress((prev) => ({ ...prev, [songId]: 0 }));
                    setAudioPosition((prev) => ({ ...prev, [songId]: 0 }));
                    delete audioRefs.current[songId];
                  }
                }
              }
            );
            audioRefs.current[songId] = sound;
            console.log("🎵 Audio instance created successfully for:", songId);
          } else {
            try {
              const status = await audioRefs.current[songId].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[songId].playAsync();
              } else {
                delete audioRefs.current[songId];
                const { sound } = await Audio.Sound.createAsync(audioUrl, {
                  shouldPlay: true,
                });
                audioRefs.current[songId] = sound;
              }
            } catch (error) {
              console.warn("⚠️ Error playing existing audio:", error);
              delete audioRefs.current[songId];
              const { sound } = await Audio.Sound.createAsync(audioUrl, {
                shouldPlay: true,
              });
              audioRefs.current[songId] = sound;
            }
          }
          setPlayingSong(songId);
        }
      } catch (error) {
        console.error("❌ Error toggling audio playback:", error);
        setPlayingSong(null);
        delete audioRefs.current[songId];
      }
    },
    [playingSong, audioMuted]
  );

  const toggleAudioMute = useCallback(
    async (songId: string) => {
      try {
        const currentMuted = audioMuted[songId] || false;
        const newMuted = !currentMuted;

        setAudioMuted((prev) => ({ ...prev, [songId]: newMuted }));

        if (audioRefs.current[songId]) {
          await audioRefs.current[songId].setIsMutedAsync(newMuted);
        }
      } catch (error) {
        console.error("Error toggling audio mute:", error);
      }
    },
    [audioMuted]
  );

  const seekAudio = useCallback(
    async (songId: string, progress: number) => {
      try {
        if (audioRefs.current[songId] && audioDuration[songId]) {
          const position = progress * audioDuration[songId];
          await audioRefs.current[songId].setPositionAsync(position);
          setAudioPosition((prev) => ({ ...prev, [songId]: position }));
          setAudioProgress((prev) => ({ ...prev, [songId]: progress }));
        }
      } catch (error) {
        console.error("Error seeking audio:", error);
      }
    },
    [audioDuration]
  );

  const formatTime = useCallback((milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  const {
    setTrack,
    currentTrack,
    isPlaying: globalIsPlaying,
    togglePlayPause,
    isLoading: globalIsLoading,
  } = useGlobalAudioPlayerStore();

  // Update selectedSong when currentTrack changes (for auto-advance to next song)
  // Update selectedSong when currentTrack changes (for auto-advance to next song)
  useEffect(() => {
    if (showSongModal && currentTrack && songs.length > 0) {
      // Find the full song data from the songs array
      const fullSongData = songs.find((s) => s.id === currentTrack.id);
      if (fullSongData) {
        // Only update if the song actually changed to avoid unnecessary re-renders
        const currentSongId = selectedSong?.id;
        if (currentSongId !== currentTrack.id) {
          console.log("🔄 Auto-advance: Updating modal to show next song:", fullSongData.title);
          setSelectedSong(fullSongData);
        }
      }
    }
  }, [currentTrack?.id, showSongModal, songs, selectedSong?.id]);

  const handlePlayIconPress = useCallback(
    async (song: any) => {
      console.log("🎵 Play button pressed for:", song.title);
      // Avoid double-press while the global player is still loading a track
      if (globalIsLoading) {
        console.log("⏳ Global audio player is loading, ignoring tap");
        return;
      }

      // Stop any legacy/advanced audio that might be playing elsewhere
      try {
        const audioManagerModule = require("../utils/globalAudioInstanceManager");
        const audioManager = audioManagerModule.default.getInstance();
        audioManager.stopAllAudio().catch(() => {
          // ignore errors – we just don't want duplicate audio sources
        });
      } catch {
        // manager not available, safe to continue
      }

      // Build / update global queue so Next/Previous behave like a real music player.
      // We use the currently loaded `songs` array as the playlist.
      try {
        const state = useGlobalAudioPlayerStore.getState();
        const currentQueue = state.queue || [];
        const songIndex = songs.findIndex((s) => s.id === song.id);

        if (songIndex !== -1) {
          const queueNeedsUpdate =
            currentQueue.length !== songs.length ||
            currentQueue.some((track, idx) => track.id !== songs[idx]?.id);

          if (queueNeedsUpdate) {
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
          } else {
            // Queue already matches current songs; just move the index.
            useGlobalAudioPlayerStore.setState({
              currentIndex: songIndex,
            });
          }
        }
      } catch (e) {
        console.warn("⚠️ Failed to set global audio queue from copyright songs:", e);
      }

      // Use global audio player
      if (currentTrack?.id === song.id && globalIsPlaying) {
        // If same song is playing, just pause
        await togglePlayPause();
      } else {
        // Set new track in global player
        await setTrack({
          id: song.id,
          title: song.title,
          artist: song.artist,
          audioUrl: song.audioUrl,
          thumbnailUrl: song.thumbnailUrl,
          duration: song.duration,
          category: song.category,
          description: song.description,
        });
        // Play the track after it's loaded
        const { play } = useGlobalAudioPlayerStore.getState();
        await play();
      }
    },
    [currentTrack, globalIsPlaying, setTrack, togglePlayPause, globalIsLoading, songs]
  );

  const handleCardPress = useCallback((song: any) => {
    setSelectedSong(song);
    setShowSongModal(true);
  }, []);

  const renderSongCard = useCallback(
    (item: any) => {
      const isPlaying = currentTrack?.id === item.id && globalIsPlaying;
      // Support both backend string URLs and local require() objects
      const thumbnailSource =
        typeof item.thumbnailUrl === "string"
          ? { uri: item.thumbnailUrl }
          : item.thumbnailUrl;

      return (
        <View className="mr-4 w-[154px] flex-col items-center">
          <TouchableOpacity
            onPress={() => handleCardPress(item)}
            className="w-full h-[232px] rounded-2xl overflow-hidden relative"
            activeOpacity={0.9}
          >
            {/* Thumbnail Image */}
            <Image
              source={thumbnailSource}
              style={{ position: "absolute", width: "100%", height: "100%" }}
              resizeMode="cover"
            />

            {/* Dark Overlay */}
            <View className="absolute inset-0 bg-black/60" />

            {/* Play Icon */}
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handlePlayIconPress(item);
              }}
              className="absolute inset-0 justify-center items-center"
            >
              <View className="bg-white/70 p-2 rounded-full">
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="#FEA74E"
                />
              </View>
            </TouchableOpacity>

            {/* Song Title Overlay */}
            <View className="absolute bottom-2 left-2 right-2">
              <Text
                className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
                numberOfLines={2}
              >
                {item.title}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Song Info */}
          <View className="mt-2 flex flex-col w-full">
            <View className="flex flex-row justify-between items-center">
              <Text
                className="text-[12px] text-[#1D2939] font-rubik font-medium"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.artist}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setOptionsSong(item);
                  setShowOptionsModal(true);
                }}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              <Ionicons
                name="musical-notes-outline"
                size={13}
                color="#98A2B3"
              />
              <Text
                className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik"
                numberOfLines={1}
              >
                {item.views} views
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [playingSong, handleCardPress, handlePlayIconPress, currentTrack, globalIsPlaying]
  );

  // Removed renderFullPlayer - now using CopyrightFreeSongModal component

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View
      // Non-flexing container so it never overlaps with content behind it.
      // The white background + padding makes it feel like its own row/strip.
      style={{
        width: "100%",
        paddingBottom: 12,
        backgroundColor: "white",
      }}
    >
      {/* Header */}
      <View className="px-4 py-3">
        <Text className="text-xl font-rubik-bold text-gray-900">
          Songs for you
        </Text>
        {error && (
          <Text className="text-xs text-orange-500 mt-1 font-rubik">
            {error}
          </Text>
        )}
      </View>

      {/* Loading State */}
      {loading ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#256E63" />
          <Text className="text-sm text-gray-500 mt-4 font-rubik">
            Loading songs...
          </Text>
        </View>
      ) : (
        /* Horizontal Scrollable Cards */
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        >
          {songs.length > 0 ? (
            songs.map((song) => (
              <View key={song.id}>{renderSongCard(song)}</View>
            ))
          ) : (
            <View className="flex-1 justify-center items-center py-20 px-4">
              <Ionicons name="musical-notes-outline" size={48} color="#9CA3AF" />
              <Text className="text-sm text-gray-500 mt-4 font-rubik text-center">
                No songs available
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Full Song Player Modal */}
      <CopyrightFreeSongModal
        visible={showSongModal}
        song={selectedSong}
        onClose={() => {
          setShowSongModal(false);
          setSelectedSong(null);
        }}
        onPlay={(song) => handlePlayIconPress(song)}
        isPlaying={selectedSong ? currentTrack?.id === selectedSong.id && globalIsPlaying : false}
        audioProgress={selectedSong && currentTrack?.id === selectedSong.id ? useGlobalAudioPlayerStore.getState().progress : 0}
        audioDuration={selectedSong && currentTrack?.id === selectedSong.id ? useGlobalAudioPlayerStore.getState().duration : (selectedSong?.duration * 1000 || 0)}
        audioPosition={selectedSong && currentTrack?.id === selectedSong.id ? useGlobalAudioPlayerStore.getState().position : 0}
        isMuted={selectedSong && currentTrack?.id === selectedSong.id ? useGlobalAudioPlayerStore.getState().isMuted : false}
        onTogglePlay={async () => {
          if (selectedSong) {
            if (currentTrack?.id === selectedSong.id) {
              await togglePlayPause();
            } else {
              await handlePlayIconPress(selectedSong);
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
      />

      {/* Options Modal opened from three dots under each mini card */}
      <Modal
        visible={showOptionsModal && !!optionsSong}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowOptionsModal(false);
          setOptionsSong(null);
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setShowOptionsModal(false);
            setOptionsSong(null);
          }}
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
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 28,
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                alignSelf: "center",
                width: 40,
                height: 4,
                borderRadius: 999,
                backgroundColor: "#E5E7EB",
                marginBottom: 16,
              }}
            />

            {optionsSong && (
              <>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#111827",
                    marginBottom: 4,
                  }}
                  numberOfLines={1}
                >
                  {optionsSong.title}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                    marginBottom: 16,
                  }}
                  numberOfLines={1}
                >
                  {optionsSong.artist}
                </Text>
              </>
            )}

            {/* Option: Open in full player */}
            <TouchableOpacity
              onPress={() => {
                if (optionsSong) {
                  handleCardPress(optionsSong);
                }
                setShowOptionsModal(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="play-circle" size={18} color="#256E63" />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: "#111827",
                  fontWeight: "500",
                }}
              >
                Play in full player
              </Text>
            </TouchableOpacity>

            {/* Option: Add to playlist (delegates to full player UI) */}
            <TouchableOpacity
              onPress={() => {
                if (optionsSong) {
                  handleCardPress(optionsSong);
                  Alert.alert(
                    "Add to playlist",
                    "Use the Playlist button in the full player to add this song to your playlist."
                  );
                }
                setShowOptionsModal(false);
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#EEF2FF",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="list" size={18} color="#4F46E5" />
              </View>
              <Text
                style={{
                  fontSize: 15,
                  color: "#111827",
                  fontWeight: "500",
                }}
              >
                Add to playlist
              </Text>
            </TouchableOpacity>

            {/* Option: Cancel */}
            <TouchableOpacity
              onPress={() => {
                setShowOptionsModal(false);
                setOptionsSong(null);
              }}
              style={{
                marginTop: 8,
                paddingVertical: 12,
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: "#6B7280",
                  fontWeight: "500",
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
