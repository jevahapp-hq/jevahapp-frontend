/**
 * Premium playlist detail sheet — Library → My Playlists → tap a list.
 * Lives under components/ so Expo Router does not treat it as a route.
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolveAlbumArtSource } from "../../../../src/shared/brand/albumArt";
import type { Playlist, PlaylistSong } from "@/store/usePlaylistStore";

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlaylistDetailSheet({
  visible,
  playlist,
  onClose,
  onPlayAll,
  onPlayTrack,
  onRemoveTrack,
  onDeletePlaylist,
}: {
  visible: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onPlayAll: () => void;
  onPlayTrack: (track: PlaylistSong, index: number) => void;
  onRemoveTrack: (track: PlaylistSong) => void;
  onDeletePlaylist: () => void;
}) {
  const insets = useSafeAreaInsets();
  const songs = playlist?.songs || [];
  const cover = resolveAlbumArtSource(
    playlist?.thumbnailUrl || songs[0]?.thumbnailUrl
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#07110F" }}>
        <LinearGradient
          colors={["#1A3D38", "#0F1C1A", "#07110F"]}
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="chevron-down" size={22} color="#FFF" />
            </TouchableOpacity>
            <Text
              style={{
                color: "rgba(255,255,255,0.55)",
                fontFamily: "PlusJakartaSans-Medium",
                fontSize: 12,
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              Playlist
            </Text>
            <TouchableOpacity
              onPress={onDeletePlaylist}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(239,68,68,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#FCA5A5" />
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: 168,
                height: 168,
                borderRadius: 24,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.45,
                shadowRadius: 24,
                elevation: 16,
                backgroundColor: "#12332E",
              }}
            >
              <Image source={cover} style={{ width: 168, height: 168 }} resizeMode="cover" />
            </View>
            <Text
              style={{
                marginTop: 18,
                fontSize: 26,
                fontFamily: "PlusJakartaSans-Bold",
                color: "#FFFFFF",
                textAlign: "center",
                letterSpacing: -0.4,
              }}
              numberOfLines={2}
            >
              {playlist?.name || "Playlist"}
            </Text>
            {playlist?.description ? (
              <Text
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  fontFamily: "PlusJakartaSans",
                  color: "rgba(255,255,255,0.55)",
                  textAlign: "center",
                }}
                numberOfLines={2}
              >
                {playlist.description}
              </Text>
            ) : null}
            <Text
              style={{
                marginTop: 8,
                fontSize: 13,
                fontFamily: "PlusJakartaSans-Medium",
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {songs.length} {songs.length === 1 ? "track" : "tracks"}
            </Text>
            <TouchableOpacity
              onPress={onPlayAll}
              disabled={songs.length === 0}
              activeOpacity={0.85}
              style={{
                marginTop: 18,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#256E63",
                paddingHorizontal: 28,
                paddingVertical: 14,
                borderRadius: 28,
                opacity: songs.length === 0 ? 0.45 : 1,
                shadowColor: "#256E63",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.45,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Ionicons name="play" size={18} color="#FFF" />
              <Text
                style={{
                  marginLeft: 8,
                  fontSize: 16,
                  fontFamily: "PlusJakartaSans-SemiBold",
                  color: "#FFF",
                }}
              >
                Play all
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {songs.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
            <Ionicons name="musical-notes-outline" size={56} color="rgba(255,255,255,0.2)" />
            <Text
              style={{
                marginTop: 14,
                fontSize: 17,
                fontFamily: "PlusJakartaSans-SemiBold",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              This playlist is empty
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                fontFamily: "PlusJakartaSans",
                color: "rgba(255,255,255,0.4)",
                textAlign: "center",
              }}
            >
              Add songs from the player or library
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: insets.bottom + 28,
            }}
            showsVerticalScrollIndicator={false}
          >
            {songs.map((track, index) => (
              <TouchableOpacity
                key={`${track.id}-${index}`}
                onPress={() => onPlayTrack(track, index)}
                activeOpacity={0.8}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 14,
                }}
              >
                <Text
                  style={{
                    width: 26,
                    fontSize: 14,
                    fontFamily: "PlusJakartaSans-Medium",
                    color: "rgba(255,255,255,0.28)",
                  }}
                >
                  {index + 1}
                </Text>
                <Image
                  source={resolveAlbumArtSource(track.thumbnailUrl)}
                  style={{ width: 48, height: 48, borderRadius: 10, marginRight: 12 }}
                  resizeMode="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontFamily: "PlusJakartaSans-SemiBold",
                      color: "#FFF",
                    }}
                    numberOfLines={1}
                  >
                    {track.title}
                  </Text>
                  <Text
                    style={{
                      marginTop: 3,
                      fontSize: 12,
                      fontFamily: "PlusJakartaSans",
                      color: "rgba(255,255,255,0.45)",
                    }}
                    numberOfLines={1}
                  >
                    {track.artist}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "PlusJakartaSans",
                    color: "rgba(255,255,255,0.35)",
                    marginRight: 8,
                  }}
                >
                  {formatDuration(track.duration)}
                </Text>
                <TouchableOpacity
                  onPress={() => onRemoveTrack(track)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={18} color="rgba(255,255,255,0.35)" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
