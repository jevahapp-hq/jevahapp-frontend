// Playlists Library Screen - Dedicated UI for viewing and managing playlists
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { UI_CONFIG } from "../../../src/shared/constants";
import { usePlaylistStore, type Playlist, type PlaylistSong } from "../../store/usePlaylistStore";
import { playlistAPI } from "../../utils/playlistAPI";

export default function PlaylistsLibrary() {
  const router = useRouter();
  const { playlists, loadPlaylistsFromBackend } = usePlaylistStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showPlaylistDetail, setShowPlaylistDetail] = useState(false);

  // Load playlists on mount
  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setIsLoading(true);
      await loadPlaylistsFromBackend();
    } catch (error) {
      console.error("Error loading playlists:", error);
      Alert.alert("Error", "Failed to load playlists");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      Alert.alert("Error", "Please enter a playlist name");
      return;
    }

    try {
      setIsLoading(true);
      const result = await playlistAPI.createPlaylist({
        name: newPlaylistName.trim(),
        description: newPlaylistDescription.trim() || undefined,
        isPublic: false,
      });

      if (result.success) {
        setNewPlaylistName("");
        setNewPlaylistDescription("");
        setShowCreateModal(false);
        await loadPlaylists();
        Alert.alert("Success", "Playlist created!");
      } else {
        Alert.alert("Error", result.error || "Failed to create playlist");
      }
    } catch (error) {
      console.error("Error creating playlist:", error);
      Alert.alert("Error", "Failed to create playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    Alert.alert(
      "Delete Playlist",
      "Are you sure you want to delete this playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await playlistAPI.deletePlaylist(playlistId);
              if (result.success) {
                await loadPlaylists();
                if (selectedPlaylist?.id === playlistId) {
                  setSelectedPlaylist(null);
                  setShowPlaylistDetail(false);
                }
                Alert.alert("Success", "Playlist deleted");
              } else {
                Alert.alert("Error", result.error || "Failed to delete playlist");
              }
            } catch (error) {
              console.error("Error deleting playlist:", error);
              Alert.alert("Error", "Failed to delete playlist");
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewPlaylist = async (playlist: Playlist) => {
    try {
      // Fetch full playlist details from backend
      const result = await playlistAPI.getPlaylistById(playlist.id);
      if (result.success && result.data) {
        // Transform backend format to frontend format
        const transformedPlaylist: Playlist = {
          id: result.data._id,
          name: result.data.name,
          description: result.data.description,
          songs: result.data.tracks.map((track) => ({
            id: track.content._id,
            title: track.content.title,
            artist: track.content.artistName,
            audioUrl: track.content.fileUrl,
            thumbnailUrl: track.content.thumbnailUrl,
            duration: track.content.duration,
            category: track.content.contentType,
            description: track.content.title,
            addedAt: track.addedAt,
          })),
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
          thumbnailUrl: result.data.tracks[0]?.content.thumbnailUrl,
        };
        setSelectedPlaylist(transformedPlaylist);
        setShowPlaylistDetail(true);
      }
    } catch (error) {
      console.error("Error loading playlist details:", error);
      Alert.alert("Error", "Failed to load playlist details");
    }
  };

  const handleRemoveTrack = async (playlistId: string, trackId: string, trackType?: "media" | "copyrightFree") => {
    Alert.alert(
      "Remove Track",
      "Remove this track from the playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // Use trackType if available, otherwise try to detect
              const detectedType = trackType || "copyrightFree"; // Default fallback
              const result = await playlistAPI.removeTrackFromPlaylist(
                playlistId,
                trackId,
                detectedType
              );

              if (result.success) {
                await loadPlaylists();
                if (selectedPlaylist?.id === playlistId) {
                  await handleViewPlaylist(selectedPlaylist);
                }
                Alert.alert("Success", "Track removed");
              } else {
                Alert.alert("Error", result.error || "Failed to remove track");
              }
            } catch (error) {
              console.error("Error removing track:", error);
              Alert.alert("Error", "Failed to remove track");
            }
          },
        },
      ]
    );
  };

  const renderPlaylistCard = ({ item: playlist }: { item: Playlist }) => {
    const thumbnailSource =
      typeof playlist.thumbnailUrl === "string"
        ? { uri: playlist.thumbnailUrl }
        : playlist.thumbnailUrl;

    return (
      <TouchableOpacity
        onPress={() => handleViewPlaylist(playlist)}
        activeOpacity={0.95}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          marginBottom: 12,
          padding: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Thumbnail - Larger and more prominent */}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 16,
              backgroundColor: "#F3F4F6",
              marginRight: 16,
              overflow: "hidden",
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {playlist.thumbnailUrl ? (
              <Image
                source={thumbnailSource}
                style={{ width: 96, height: 96 }}
                resizeMode="cover"
              />
            ) : (
              <View
                style={{
                  width: 96,
                  height: 96,
                  backgroundColor: "#E5E7EB",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="musical-notes" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Playlist Info */}
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Rubik-SemiBold",
                color: "#111827",
                marginBottom: 6,
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {playlist.name}
            </Text>
            {playlist.description && (
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Rubik",
                  color: "#6B7280",
                  marginBottom: 10,
                  lineHeight: 20,
                }}
                numberOfLines={2}
              >
                {playlist.description}
              </Text>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: playlist.description ? 0 : 10 }}>
              <View
                style={{
                  backgroundColor: "#F3F4F6",
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="musical-note" size={14} color="#6B7280" />
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "Rubik-Medium",
                    color: "#6B7280",
                    marginLeft: 4,
                  }}
                >
                  {playlist.songs.length} {playlist.songs.length === 1 ? "song" : "songs"}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions - More subtle and modern */}
          <View style={{ flexDirection: "row", gap: 6, marginLeft: 8 }}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleViewPlaylist(playlist);
              }}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                justifyContent: "center",
                alignItems: "center",
                shadowColor: UI_CONFIG.COLORS.SECONDARY,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="play" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleDeletePlaylist(playlist.id);
              }}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#FEF2F2",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#FEE2E2",
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTrackItem = ({ item: track, index }: { item: PlaylistSong; index: number }) => {
    const thumbnailSource =
      typeof track.thumbnailUrl === "string"
        ? { uri: track.thumbnailUrl }
        : track.thumbnailUrl;

    // Show track type badge (Media or Copyright-Free)
    const trackType = track.trackType || (track.copyrightFreeSongId ? "copyrightFree" : "media");
    const isCopyrightFree = trackType === "copyrightFree";

    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        {/* Track Number */}
        <Text
          style={{
            fontSize: 16,
            fontFamily: "Rubik-Medium",
            color: "#9CA3AF",
            width: 30,
          }}
        >
          {index + 1}
        </Text>

        {/* Thumbnail */}
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 8,
            backgroundColor: "#F3F4F6",
            marginRight: 12,
            overflow: "hidden",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {track.thumbnailUrl ? (
            <Image
              source={thumbnailSource}
              style={{ width: 50, height: 50 }}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="musical-note" size={24} color="#9CA3AF" />
          )}
        </View>

        {/* Track Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Rubik-SemiBold",
                color: "#111827",
                flex: 1,
              }}
              numberOfLines={1}
            >
              {track.title}
            </Text>
            {/* Track Type Badge */}
            {isCopyrightFree && (
              <View
                style={{
                  backgroundColor: "#FEF3C7",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Rubik-SemiBold",
                    color: "#92400E",
                  }}
                >
                  FREE
                </Text>
              </View>
            )}
          </View>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Rubik",
              color: "#6B7280",
            }}
            numberOfLines={1}
          >
            {track.artist}
          </Text>
        </View>

        {/* Duration */}
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Rubik",
            color: "#9CA3AF",
            marginRight: 12,
          }}
        >
          {formatDuration(track.duration)}
        </Text>

        {/* Remove Button */}
        <TouchableOpacity
          onPress={() => {
            if (selectedPlaylist) {
              handleRemoveTrack(selectedPlaylist.id, track.id, track.trackType);
            }
          }}
          style={{
            padding: 8,
            borderRadius: 8,
          }}
        >
          <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isLoading && playlists.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16, fontFamily: "Rubik", color: "#6B7280" }}>
          Loading playlists...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 20,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#F3F4F6",
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 28,
              fontFamily: "Rubik-Bold",
              color: "#111827",
              letterSpacing: -0.5,
            }}
          >
            My Playlists
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontFamily: "Rubik",
              color: "#6B7280",
              marginTop: 4,
            }}
          >
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: UI_CONFIG.COLORS.SECONDARY,
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 14,
            shadowColor: UI_CONFIG.COLORS.SECONDARY,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Rubik-SemiBold",
              color: "#FFFFFF",
              marginLeft: 6,
            }}
          >
            New
          </Text>
        </TouchableOpacity>
      </View>

      {/* Playlists List */}
      {playlists.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 40,
          }}
        >
          <Ionicons name="musical-notes-outline" size={64} color="#D1D5DB" />
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Rubik-SemiBold",
              color: "#6B7280",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            No playlists yet
          </Text>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Rubik",
              color: "#9CA3AF",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Create your first playlist to organize your favorite songs
          </Text>
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            style={{
              marginTop: 24,
              backgroundColor: UI_CONFIG.COLORS.SECONDARY,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Rubik-SemiBold",
                color: "#FFFFFF",
              }}
            >
              Create Playlist
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={playlists}
          renderItem={renderPlaylistCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ 
            padding: 20,
            paddingBottom: 40,
          }}
          refreshing={isLoading}
          onRefresh={loadPlaylists}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Playlist Modal - Sleek Spotify-like Design */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowCreateModal(false);
          setNewPlaylistName("");
          setNewPlaylistDescription("");
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setShowCreateModal(false);
            setNewPlaylistName("");
            setNewPlaylistDescription("");
          }}
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              width: "100%",
              maxWidth: 420,
              paddingTop: 28,
              paddingBottom: 24,
              paddingHorizontal: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 16,
            }}
          >
            {/* Header with Close Button */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  fontFamily: "Rubik-Bold",
                  color: "#111827",
                  letterSpacing: -0.5,
                }}
              >
                Create playlist
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                  setNewPlaylistDescription("");
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F3F4F6",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Playlist Name Input */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: 0.2,
                }}
              >
                Playlist name
              </Text>
              <TextInput
                value={newPlaylistName}
                onChangeText={setNewPlaylistName}
                placeholder="My playlist"
                placeholderTextColor="#9CA3AF"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontFamily: "Rubik",
                  color: "#111827",
                }}
                autoFocus
              />
            </View>

            {/* Description Input */}
            <View style={{ marginBottom: 28 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#374151",
                  marginBottom: 8,
                  letterSpacing: 0.2,
                }}
              >
                Description <Text style={{ color: "#9CA3AF", fontWeight: "400" }}>(optional)</Text>
              </Text>
              <TextInput
                value={newPlaylistDescription}
                onChangeText={setNewPlaylistDescription}
                placeholder="Add a description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  fontFamily: "Rubik",
                  color: "#111827",
                  minHeight: 80,
                }}
              />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName("");
                  setNewPlaylistDescription("");
                }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  backgroundColor: "#F3F4F6",
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isLoading ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Rubik-SemiBold",
                    color: "#374151",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreatePlaylist}
                disabled={isLoading || !newPlaylistName.trim()}
                style={{
                  flex: 1,
                  backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: isLoading || !newPlaylistName.trim() ? 0.6 : 1,
                  shadowColor: UI_CONFIG.COLORS.SECONDARY,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                {isLoading ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text
                      style={{
                        fontSize: 16,
                        fontFamily: "Rubik-SemiBold",
                        color: "#FFFFFF",
                      }}
                    >
                      Creating...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontFamily: "Rubik-SemiBold",
                      color: "#FFFFFF",
                    }}
                  >
                    Create
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Playlist Detail Modal */}
      <Modal
        visible={showPlaylistDetail}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowPlaylistDetail(false);
          setSelectedPlaylist(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "#FFFFFF",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 60,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setShowPlaylistDetail(false);
                setSelectedPlaylist(null);
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontFamily: "Rubik-SemiBold",
                  color: "#111827",
                }}
                numberOfLines={1}
              >
                {selectedPlaylist?.name}
              </Text>
              {selectedPlaylist?.description && (
                <Text
                  style={{
                    fontSize: 14,
                    fontFamily: "Rubik",
                    color: "#6B7280",
                    marginTop: 4,
                  }}
                  numberOfLines={1}
                >
                  {selectedPlaylist.description}
                </Text>
              )}
            </View>
            {selectedPlaylist && (
              <TouchableOpacity
                onPress={() => handleDeletePlaylist(selectedPlaylist.id)}
                style={{ marginLeft: 12 }}
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>

          {/* Playlist Info */}
          {selectedPlaylist && (
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                <Ionicons name="musical-notes" size={20} color="#6B7280" />
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Rubik",
                    color: "#6B7280",
                    marginLeft: 8,
                  }}
                >
                  {selectedPlaylist.songs.length} song
                  {selectedPlaylist.songs.length !== 1 ? "s" : ""}
                </Text>
                {/* Show track type breakdown */}
                {selectedPlaylist.songs.length > 0 && (
                  <>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Rubik",
                        color: "#9CA3AF",
                        marginLeft: 12,
                      }}
                    >
                      •
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        fontFamily: "Rubik",
                        color: "#9CA3AF",
                        marginLeft: 8,
                      }}
                    >
                      {selectedPlaylist.songs.filter((s) => s.trackType === "copyrightFree").length} copyright-free
                      {selectedPlaylist.songs.filter((s) => s.trackType === "media").length > 0 && (
                        <>, {selectedPlaylist.songs.filter((s) => s.trackType === "media").length} regular</>
                      )}
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Tracks List */}
          {selectedPlaylist && selectedPlaylist.songs.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 40,
              }}
            >
              <Ionicons name="musical-notes-outline" size={64} color="#D1D5DB" />
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Rubik-SemiBold",
                  color: "#6B7280",
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                This playlist is empty
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Rubik",
                  color: "#9CA3AF",
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Add songs from the music player or library
              </Text>
            </View>
          ) : (
            selectedPlaylist && (
              <FlatList
                data={selectedPlaylist.songs}
                renderItem={renderTrackItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )
          )}
        </View>
      </Modal>
    </View>
  );
}

