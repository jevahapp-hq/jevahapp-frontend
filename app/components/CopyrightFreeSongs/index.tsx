/**
 * CopyrightFreeSongs - Horizontal song list with full player modal
 * Composed from: SongCard, SongOptionsModal, useCopyrightFreeSongsData, useCopyrightFreeSongsPlayback
 */
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from "react-native";
import copyrightFreeMusicAPI from "../../services/copyrightFreeMusicAPI";
import { transformBackendSong } from "../CopyrightFreeSongModal/utils/transformBackendSong";
import { useCopyrightFreeSongsData } from "./hooks/useCopyrightFreeSongsData";
import { useCopyrightFreeSongsPlayback } from "./hooks/useCopyrightFreeSongsPlayback";
import { SongCard } from "./SongCard";
import { SongOptionsModal } from "./SongOptionsModal";

export interface CopyrightFreeSongsProps {
  onSongSelect?: (song: any) => void;
  showAsLibrary?: boolean;
}

export default function CopyrightFreeSongs(_props: CopyrightFreeSongsProps) {
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsSong, setOptionsSong] = useState<any | null>(null);
  const [optionsSongData, setOptionsSongData] = useState<any | null>(null);
  const [loadingOptionsSong, setLoadingOptionsSong] = useState(false);

  const { songs, loading, error, updateSongInList } = useCopyrightFreeSongsData();
  const {
    handlePlayIconPress,
    handleCardPress,
    currentTrack,
    globalIsPlaying,
  } = useCopyrightFreeSongsPlayback({
    songs,
  });

  useEffect(() => {
    if (!showOptionsModal || !optionsSong) return;
    const songId = optionsSong.id || optionsSong._id;
    if (!songId) return;

    setLoadingOptionsSong(true);
    copyrightFreeMusicAPI
      .getSongById(songId)
      .then((response) => {
        if (response.success && response.data) {
          const transformedSong = transformBackendSong(response.data);
          setOptionsSongData(transformedSong);
          updateSongInList(songId, transformedSong);
        }
      })
      .catch(() => setOptionsSongData(optionsSong))
      .finally(() => setLoadingOptionsSong(false));
  }, [showOptionsModal, optionsSong, updateSongInList]);

  const handleOptionsPress = useCallback((song: any) => {
    setOptionsSong(song);
    setOptionsSongData(null);
    setShowOptionsModal(true);
  }, []);

  const handlePlayInFullPlayer = useCallback(
    (song: any) => {
      handleCardPress(song);
    },
    [handleCardPress]
  );

  const handleAddToPlaylist = useCallback((song: any) => {
    handleCardPress(song);
    Alert.alert(
      "Add to playlist",
      "Use the Playlist button in the full player to add this song to your playlist."
    );
  }, [handleCardPress]);

  return (
    <View
      style={{
        width: "100%",
        paddingBottom: 12,
        backgroundColor: "white",
      }}
    >
      <View className="px-4 py-3">
        <Text className="text-xl font-rubik-bold text-gray-900">
          Songs for you
        </Text>
        {error && (
          <Text className="text-xs text-orange-500 mt-1 font-rubik">{error}</Text>
        )}
      </View>

      {loading && songs.length === 0 ? (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#256E63" />
          <Text className="text-sm text-gray-500 mt-4 font-rubik">
            Loading songs...
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
        >
          {songs.length > 0 ? (
            songs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                isPlaying={currentTrack?.id === song.id && globalIsPlaying}
                onCardPress={handleCardPress}
                onPlayPress={handlePlayIconPress}
                onOptionsPress={handleOptionsPress}
              />
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

      <SongOptionsModal
        visible={showOptionsModal}
        song={optionsSong}
        loadingOptionsSong={loadingOptionsSong}
        optionsSongData={optionsSongData}
        onClose={() => {
          setShowOptionsModal(false);
          setOptionsSong(null);
          setOptionsSongData(null);
        }}
        onPlayInFullPlayer={handlePlayInFullPlayer}
        onAddToPlaylist={handleAddToPlaylist}
      />
    </View>
  );
}
