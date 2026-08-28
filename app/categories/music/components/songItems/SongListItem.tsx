import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { isTrackProcessing } from "../../../../services/music-catalog/trackTypes";
import { formatDuration } from "../../musicFormatters";
import { getThumbnailSource, type SongItemProps } from "./songItemShared";

export function SongListItem({
  item,
  onOpenPlayer,
  onPlayPress,
  onOpenOptions,
  onOpenArtistProfile,
}: SongItemProps) {
  const thumbnailSource = getThumbnailSource(item.thumbnailUrl);

  return (
    <TouchableOpacity
      onPress={() => {
        // Tap should open Now Playing view like the reference screenshot
        // and start playback with the current queue.
        onOpenPlayer(item);
        // Start playing immediately (fire and forget - don't await to avoid blocking UI)
        onPlayPress(item).catch((err) => console.warn("Play error:", err));
      }}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
      }}
    >
      {/* Circular thumbnail */}
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          overflow: "hidden",
          backgroundColor: "#E5E7EB",
          marginRight: 12,
        }}
      >
        {thumbnailSource ? (
          <Image
            source={thumbnailSource}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#9CA3AF",
            }}
          >
            <Ionicons name="musical-notes" size={24} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Song info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#1D2939",
            fontFamily: "PlusJakartaSans_600SemiBold",
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <TouchableOpacity
          disabled={!item.artistSlug}
          onPress={(e) => {
            e.stopPropagation();
            onOpenArtistProfile?.(item.artistSlug);
          }}
          activeOpacity={item.artistSlug ? 0.7 : 1}
        >
          <Text
            style={{
              fontSize: 14,
              color: item.artistSlug ? "#256E63" : "#98A2B3",
              fontFamily: "PlusJakartaSans_400Regular",
            }}
            numberOfLines={1}
          >
            {isTrackProcessing(item)
              ? "Processing…"
              : `By ${item.artist} • ${formatDuration(item.duration)}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3-dot menu */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          onOpenOptions?.(item);
        }}
        activeOpacity={0.7}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#F3F4F6",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="ellipsis-vertical" size={18} color="#256E63" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
