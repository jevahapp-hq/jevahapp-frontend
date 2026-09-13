/**
 * Premium playlist detail sheet — Library → My Playlists → tap a list.
 * Lives under components/ so Expo Router does not treat it as a route.
 */
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { resolveAlbumArtSource } from "../../../../src/shared/brand/albumArt";
import { setMiniPlayerSuppression } from "../../../../src/shared/audio/miniPlayerGate";
import { PlayerBackground } from "@/components/CopyrightFreeSongModal/components/PlayerBackground";
import type { Playlist, PlaylistSong } from "@/store/usePlaylistStore";
import {
  PlaylistHeroActions,
  PlaylistTransportDock,
  songIdOf,
  usePlaylistNowPlaying,
} from "./PlaylistPlaybackDock";

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
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
  embedded = false,
}: {
  visible: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onPlayAll: () => void;
  onPlayTrack: (track: PlaylistSong, index: number) => void;
  onRemoveTrack: (track: PlaylistSong) => void;
  onDeletePlaylist: () => void;
  embedded?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const songs = playlist?.songs || [];
  const nowPlaying = usePlaylistNowPlaying(playlist);
  const activeSong = nowPlaying.activeSong;
  const cover = resolveAlbumArtSource(
    activeSong?.thumbnailUrl || playlist?.thumbnailUrl || songs[0]?.thumbnailUrl
  );

  useEffect(() => {
    setMiniPlayerSuppression("playlist-sheet", visible);
    return () => setMiniPlayerSuppression("playlist-sheet", false);
  }, [visible]);

  if (!visible) return null;

  const body = (
      <View style={{ flex: 1, backgroundColor: "#07110F" }}>
        <PlayerBackground
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 20,
            paddingBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
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
                flex: 1,
                marginHorizontal: 12,
                color: "rgba(255,255,255,0.9)",
                fontFamily: "PlusJakartaSans-SemiBold",
                fontSize: 13,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {playlist?.name ? `${playlist.name} PLAYLIST` : "PLAYLIST"}
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
                marginTop: 16,
                fontSize: 14,
                fontFamily: "PlusJakartaSans-Medium",
                color: "rgba(255,255,255,0.55)",
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {activeSong?.artist || "Unknown Artist"}
            </Text>
            <Text
              style={{
                marginTop: 4,
                fontSize: 20,
                fontFamily: "PlusJakartaSans-Bold",
                color: "#FFFFFF",
                textAlign: "center",
                letterSpacing: -0.2,
              }}
              numberOfLines={2}
            >
              {activeSong?.title || playlist?.name || "Playlist"}
            </Text>
            {songs.length > 0 ? (
              <View style={{ width: "100%", marginTop: 4 }}>
                <PlaylistHeroActions nowPlaying={nowPlaying} onPlayAll={onPlayAll} />
              </View>
            ) : null}
          </View>
        </PlayerBackground>

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
              paddingBottom: 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            {songs.map((track, index) => {
              const active = songIdOf(track) === songIdOf(nowPlaying.currentTrack);
              return (
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
                  backgroundColor: active ? "rgba(37,110,99,0.22)" : "transparent",
                }}
              >
                {active && nowPlaying.isPlaying ? (
                  <Ionicons
                    name="volume-medium"
                    size={16}
                    color="#5EEAD4"
                    style={{ width: 26 }}
                  />
                ) : (
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
                )}
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
                      color: active ? "#5EEAD4" : "#FFF",
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
                  <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {playlist ? (
          <PlaylistTransportDock
            playlist={playlist}
            bottomInset={insets.bottom}
            onPlayAll={onPlayAll}
            onRemovePlayingSong={onRemoveTrack}
            nowPlaying={nowPlaying}
          />
        ) : null}
      </View>
  );

  if (embedded) return body;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      {body}
    </Modal>
  );
}
