import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
  const audioRefs = useRef<Record<string, Audio.Sound>>({});

  useEffect(() => {
    loadSongs();
  }, []);

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

  const loadSongs = useCallback(() => {
    // Create songs using the specified audio files and images
    const customSongs = [
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
        contentType: "copyright-free-music",
        description: "A beautiful call to worship song by Engelis.",
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
        contentType: "copyright-free-music",
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
        contentType: "copyright-free-music",
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
        contentType: "copyright-free-music",
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
    setSongs(customSongs);
  }, []);

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

  const { setTrack, currentTrack, isPlaying: globalIsPlaying, togglePlayPause } = useGlobalAudioPlayerStore();

  const handlePlayIconPress = useCallback(
    async (song: any) => {
      console.log("🎵 Play button pressed for:", song.title);
      
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
    [currentTrack, globalIsPlaying, setTrack, togglePlayPause]
  );

  const handleCardPress = useCallback((song: any) => {
    setSelectedSong(song);
    setShowSongModal(true);
  }, []);

  const renderSongCard = useCallback(
    (item: any) => {
      const isPlaying = currentTrack?.id === item.id && globalIsPlaying;

      return (
        <View className="mr-4 w-[154px] flex-col items-center">
          <TouchableOpacity
            onPress={() => handleCardPress(item)}
            className="w-full h-[232px] rounded-2xl overflow-hidden relative"
            activeOpacity={0.9}
          >
            {/* Thumbnail Image */}
            <Image
              source={item.thumbnailUrl}
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
              <Ionicons name="ellipsis-vertical" size={14} color="#9CA3AF" />
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
    [playingSong, handleCardPress, handlePlayIconPress]
  );

  // Removed renderFullPlayer - now using CopyrightFreeSongModal component

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View className="flex-1">
      {/* Header */}
      <View className="px-4 py-3">
        <Text className="text-xl font-rubik-bold text-gray-900">
          Songs for you
        </Text>
      </View>

      {/* Horizontal Scrollable Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
      >
        {songs.map((song) => (
          <View key={song.id}>{renderSongCard(song)}</View>
        ))}
      </ScrollView>

      {/* YouTube-style Song Modal */}
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
    </View>
  );
}
