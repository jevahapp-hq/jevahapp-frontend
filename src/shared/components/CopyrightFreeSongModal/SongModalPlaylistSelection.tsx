/**
 * Add-to-playlist picker — matches Library → My Playlists cards.
 */
import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolveAlbumArtSource } from "@/shared/brand/albumArt";
import { UI_CONFIG } from "@/shared/constants";
import type { Playlist } from "@/store/usePlaylistStore";

export interface SongModalPlaylistSelectionProps {
  visible: boolean;
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  currentSongId?: string;
  embedded?: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onOpenPlaylist?: (playlist: Playlist) => void;
  onDeletePlaylist?: (playlistId: string) => void;
}

function playlistContainsSong(playlist: Playlist, songId?: string) {
  if (!songId) return false;
  const id = String(songId);
  return playlist.songs.some(
    (s) =>
      String(s.id) === id ||
      String(s.copyrightFreeSongId || "") === id ||
      String(s.mediaId || "") === id
  );
}

function coverFor(playlist: Playlist) {
  return resolveAlbumArtSource(
    playlist.thumbnailUrl || playlist.songs?.[0]?.thumbnailUrl
  );
}

export function SongModalPlaylistSelection({
  visible,
  playlists,
  isLoadingPlaylists,
  currentSongId,
  embedded = false,
  onClose,
  onCreateNew,
  onAddToPlaylist,
  onOpenPlaylist,
}: SongModalPlaylistSelectionProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const showEmptyLoading = isLoadingPlaylists && playlists.length === 0;

  const body = (
    <View style={{ flex: 1, backgroundColor: "#F8FAFB" }}>
      <View
        style={{
          backgroundColor: "#0F1C1A",
          paddingHorizontal: 20,
          paddingTop: (embedded ? insets.top : 0) + 16,
          paddingBottom: 20,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "rgba(37,110,99,0.2)",
            top: -70,
            right: -60,
          }}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 22,
                  fontFamily: "PlusJakartaSans-Bold",
                  color: "#FFFFFF",
                  letterSpacing: -0.4,
                }}
              >
                My Playlists
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans",
                  color: "rgba(255,255,255,0.55)",
                  marginTop: 2,
                }}
              >
                {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onCreateNew}
            activeOpacity={0.8}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#256E63",
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text
              style={{
                fontSize: 14,
                fontFamily: "PlusJakartaSans-SemiBold",
                color: "#FFFFFF",
                marginLeft: 4,
              }}
            >
              New
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 28,
        }}
      >
        {showEmptyLoading ? (
          <Text
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontFamily: "PlusJakartaSans",
              paddingVertical: 32,
            }}
          >
            Loading playlists...
          </Text>
        ) : playlists.length === 0 ? (
          <Text
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontFamily: "PlusJakartaSans",
              paddingVertical: 32,
            }}
          >
            No playlists yet. Create one to get started!
          </Text>
        ) : (
          playlists.map((playlist) => {
            const alreadyAdded = playlistContainsSong(playlist, currentSongId);
            const songCount = playlist.totalTracks ?? playlist.songs.length;
            return (
              <View
                key={playlist.id}
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
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <TouchableOpacity
                  onPress={() => onOpenPlaylist?.(playlist)}
                  activeOpacity={0.85}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                >
                  <View
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 16,
                      backgroundColor: "#F3F4F6",
                      marginRight: 16,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={coverFor(playlist)}
                      style={{ width: 96, height: 96 }}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontFamily: "PlusJakartaSans-SemiBold",
                        color: "#111827",
                        marginBottom: 6,
                        letterSpacing: -0.3,
                      }}
                      numberOfLines={1}
                    >
                      {playlist.name}
                    </Text>
                    {playlist.description ? (
                      <Text
                        style={{
                          fontSize: 14,
                          fontFamily: "PlusJakartaSans",
                          color: "#6B7280",
                          marginBottom: 10,
                          lineHeight: 20,
                        }}
                        numberOfLines={2}
                      >
                        {playlist.description}
                      </Text>
                    ) : null}
                    <View
                      style={{
                        backgroundColor: "#F3F4F6",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 6,
                        flexDirection: "row",
                        alignItems: "center",
                        alignSelf: "flex-start",
                      }}
                    >
                      <Ionicons name="musical-note" size={14} color="#6B7280" />
                      <Text
                        style={{
                          fontSize: 13,
                          fontFamily: "PlusJakartaSans-Medium",
                          color: "#6B7280",
                          marginLeft: 4,
                        }}
                      >
                        {songCount} {songCount === 1 ? "song" : "songs"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onAddToPlaylist(playlist.id)}
                  disabled={alreadyAdded || isLoadingPlaylists}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    alreadyAdded
                      ? `${playlist.name} already has this song`
                      : `Add song to ${playlist.name}`
                  }
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: alreadyAdded
                      ? "#9CA3AF"
                      : UI_CONFIG.COLORS.PRIMARY,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isLoadingPlaylists && !alreadyAdded ? 0.6 : 1,
                  }}
                >
                  <Ionicons
                    name={alreadyAdded ? "checkmark" : "add"}
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  if (embedded) return body;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {body}
    </Modal>
  );
}
