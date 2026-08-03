import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { usePlaylistStore } from "../../store/usePlaylistStore";
import { playlistAPI } from "../../utils/playlistAPI";

export function usePlaylistActions(
  song: any,
  setShowCreatePlaylist?: (v: boolean) => void,
  setShowPlaylistModal?: (v: boolean) => void
) {
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const { loadPlaylistsFromBackend } = usePlaylistStore();

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
        const songId = song._id || song.id;
        if (songId) {
          const addResult = await playlistAPI.addTrackToPlaylist(playlistId, {
            copyrightFreeSongId: songId,
            position: undefined,
          });
          if (addResult.success) {
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
    setShowCreatePlaylist,
    setShowPlaylistModal,
  ]);

  const handleAddToExistingPlaylist = useCallback(
    async (playlistId: string) => {
      if (!song) return;
      try {
        setIsLoadingPlaylists(true);
        const songId = song._id || song.id;
        if (!songId) {
          Alert.alert("Error", "Invalid song ID");
          setIsLoadingPlaylists(false);
          return;
        }
        const result = await playlistAPI.addTrackToPlaylist(playlistId, {
          copyrightFreeSongId: songId,
          position: undefined,
        });
        if (!result.success) {
          if (result.error?.includes("already in the playlist")) {
            Alert.alert("Info", "This song is already in the playlist");
          } else {
            Alert.alert("Error", result.error || "Failed to add song to playlist");
          }
          setIsLoadingPlaylists(false);
          return;
        }
        await loadPlaylistsFromBackend();
        setNewPlaylistName("");
        setNewPlaylistDescription("");
        setShowCreatePlaylist?.(false);
        setShowPlaylistModal?.(false);
        Alert.alert("Success", "Song added to playlist!");
        setIsLoadingPlaylists(false);
      } catch (error) {
        console.error("Error adding song to playlist:", error);
        Alert.alert("Error", "Failed to add song to playlist");
        setIsLoadingPlaylists(false);
      }
    },
    [song, loadPlaylistsFromBackend, setShowCreatePlaylist, setShowPlaylistModal]
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
