import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { resolveAlbumArtSource } from "@/shared/brand/albumArt";
import { durationSeconds, songKey, upNextSongs } from "../utils/upNextSongs";

function formatClock(seconds: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlayerQueueList({
  songs,
  currentSong,
  onSelectSong,
}: {
  songs: any[];
  currentSong: any;
  onSelectSong: (song: any) => void;
}) {
  const upcoming = useMemo(
    () => upNextSongs(songs, currentSong),
    [songs, currentSong]
  );
  const playlistTitle = useMemo(() => {
    const named = (songs || []).find(
      (item) => item?.release?.type === "playlist" && item.releaseTitle
    );
    return typeof named?.releaseTitle === "string" ? named.releaseTitle : "";
  }, [songs]);

  if (upcoming.length === 0) return null;

  return (
    <View
      style={{
        paddingTop: 8,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Text
        style={{
          paddingBottom: 12,
          fontSize: 16,
          fontFamily: "PlusJakartaSans-Bold",
          color: "#FFFFFF",
        }}
      >
        {playlistTitle || "Up next"}
      </Text>
      {upcoming.map((item, index) => {
        const key = songKey(item) || `up-next-${index}`;
        const seconds = durationSeconds(item.duration);
        return (
          <TouchableOpacity
            key={key}
            onPress={() => onSelectSong(item)}
            activeOpacity={0.75}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 0,
              paddingVertical: 10,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                overflow: "hidden",
                backgroundColor: "#12332E",
                marginRight: 12,
              }}
            >
              <Image
                source={resolveAlbumArtSource(
                  item.thumbnailUrl || item.imageUrl || item.release?.coverUrl
                )}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 15,
                  fontFamily: "PlusJakartaSans-SemiBold",
                  color: "#FFFFFF",
                  marginBottom: 3,
                }}
              >
                {item.title || "Untitled"}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 13,
                  fontFamily: "PlusJakartaSans-Medium",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {item.artist || "Unknown Artist"}
              </Text>
            </View>
            {seconds > 0 ? (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "PlusJakartaSans-Medium",
                  color: "rgba(255,255,255,0.35)",
                  marginRight: 8,
                }}
              >
                {formatClock(seconds)}
              </Text>
            ) : null}
            <Ionicons name="play" size={16} color="rgba(255,255,255,0.45)" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
