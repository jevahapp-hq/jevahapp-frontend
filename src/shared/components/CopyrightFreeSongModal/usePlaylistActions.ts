import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { isCopyrightFreeSong } from "@/shared/audio";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { playlistAPI } from "@/app/utils/playlistAPI";

function songIdOf(song: any): string {
  return String(song?._id || song?.id || "");
}

function addTrackBody(song: any, songId: string) {
  if (isCopyrightFreeSong(song)) {
    return { copyrightFreeSongId: songId, position: undefined as number | undefined };
  }
  return { mediaId: songId, position: undefined as number | undefined };
}

function playlistSongFromPlaying(song: any, songId: string) {
  const copyrightFree = isCopyrightFreeSong(song);
  return {
    id: songId,
    title: song.title || "Untitled",
    artist: song.artist || song.artistName || "Unknown",
    audioUrl: song.audioUrl || song.fileUrl,
    thumbnailUrl: song.thumbnailUrl || song.imageUrl,
    duration: Number(song.duration || 0),
    category: song.category || song.contentType,
    description: song.description || song.title,
    addedAt: new Date().toISOString(),
    trackType: copyrightFree ? ("copyrightFree" as const) : ("media" as const),
    ...(copyrightFree
      ? { copyrightFreeSongId: songId }
      : { mediaId: songId }),
  };
}

export function usePlaylistActions(
  song: any,
  setShowCreatePlaylist?: (v: boolean) => void,
  setShowPlaylistModal?: (v: boolean) => void
) {
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const { loadPlaylistsFromBackend, addSongToPlaylist } = usePlaylistStore();

  const handleCreatePlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }
    try {
      setIsLoadingPlaylists(true);
      const result = await playlistAPI.createPlaylist({
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim() || undefined,
        isPublic: false,
      });
      if (!result.success || !result.data) {
        Alert.alert("Error", result.error || "Failed to create playlist");
        setIsLoadingPlaylists(false);
        return;
      }
      const playlistId = result.data._id;
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      setShowCreatePlaylist?.(false);
      await loadPlaylistsFromBackend();
      if (song) {
        const songId = songIdOf(song);
        if (songId) {
          const addResult = await playlistAPI.addTrackToPlaylist(
            playlistId,
            addTrackBody(song, songId)
          );
          if (addResult.success) {
            addSongToPlaylist(playlistId, playlistSongFromPlaying(song, songId));
            await loadPlaylistsFromBackend();
            setShowPlaylistModal?.(false);
            Alert.alert("Success", "Playlist created and song added!");
          } else {
            setShowPlaylistModal?.(true);
            Alert.alert("Success", "Playlist created! But failed to add song.");
          }
        } else {
          setShowPlaylistModal?.(true);
          Alert.alert("Success", "Playlist created!");
        }
      } else {
        setShowPlaylistModal?.(true);
        Alert.alert("Success", "Playlist created!");
      }
      setIsLoadingPlaylists(false);
    } catch (error) {
      console.error("Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist");
      setIsLoadingPlaylists(false);
    }
  }, [
    newPlaylistName,
    newPlaylistDescription,
    song,
    loadPlaylistsFromBackend,
    addSongToPlaylist,
    setShowCreatePlaylist,
    setShowPlaylistModal,
  ]);

  const handleAddToExistingPlaylist = useCallback(
    async (playlistId: string) => {
      if (!song) return false;
      try {
        setIsLoadingPlaylists(true);
        const songId = songIdOf(song);
        if (!songId) {
          Alert.alert("Error", "Invalid song ID");
          setIsLoadingPlaylists(false);
          return false;
        }
        const result = await playlistAPI.addTrackToPlaylist(
          playlistId,
          addTrackBody(song, songId)
        );
        if (!result.success) {
          if (result.error?.includes("already in the playlist")) {
            Alert.alert("Info", "This song is already in the playlist");
          } else {
            Alert.alert("Error", result.error || "Failed to add song to playlist");
          }
          setIsLoadingPlaylists(false);
          return false;
        }
        addSongToPlaylist(playlistId, playlistSongFromPlaying(song, songId));
        await loadPlaylistsFromBackend();
        setNewPlaylistName("");
        setNewPlaylistDescription("");
        setShowCreatePlaylist?.(false);
        setIsLoadingPlaylists(false);
        Alert.alert("Added", "Song added to playlist.");
        return true;
      } catch (error) {
        console.error("Error adding song to playlist:", error);
        Alert.alert("Error", "Failed to add song to playlist");
        setIsLoadingPlaylists(false);
        return false;
      }
    },
    [song, loadPlaylistsFromBackend, addSongToPlaylist, setShowCreatePlaylist, setShowPlaylistModal]
  );

  const handleDeletePlaylist = useCallback(
    async (playlistId: string) => {
      Alert.alert("Delete Playlist", "Are you sure you want to delete this playlist?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoadingPlaylists(true);
              const result = await playlistAPI.deletePlaylist(playlistId);
              if (result.success) {
                await loadPlaylistsFromBackend();
                Alert.alert("Success", "Playlist deleted");
              } else {
                Alert.alert("Error", result.error || "Failed to delete playlist");
              }
              setIsLoadingPlaylists(false);
            } catch (error) {
              console.error("Error deleting playlist:", error);
              Alert.alert("Error", "Failed to delete playlist");
              setIsLoadingPlaylists(false);
            }
          },
        },
      ]);
    },
    [loadPlaylistsFromBackend]
  );

  return {
    isLoadingPlaylists,
    newPlaylistName,
    newPlaylistDescription,
    setNewPlaylistName,
    setNewPlaylistDescription,
    handleCreatePlaylist,
    handleAddToExistingPlaylist,
    handleDeletePlaylist,
  };
}
