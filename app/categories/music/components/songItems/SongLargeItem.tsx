import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { formatDuration } from "../../musicFormatters";
import { getThumbnailSource, type SongItemProps } from "./songItemShared";

export function SongLargeItem({
  item,
  onOpenPlayer,
  onPlayPress,
  onOpenArtistProfile,
  screenWidth = 0,
}: SongItemProps) {
  const thumbnailSource = getThumbnailSource(item.thumbnailUrl);
  const cardWidth = screenWidth - 32;

  return (
    <TouchableOpacity
      onPress={() => {
        onOpenPlayer(item);
        // Start playing immediately (fire and forget - don't await to avoid blocking UI)
        onPlayPress(item).catch((err) => console.warn("Play error:", err));
      }}
      activeOpacity={0.9}
      style={{ width: cardWidth, marginBottom: 20, marginHorizontal: 16 }}
    >
      <View
        style={{
          width: "100%",
          height: cardWidth,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#E5E7EB",
          marginBottom: 12,
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
            <Ionicons name="musical-notes" size={64} color="#FFFFFF" />
          </View>
        )}
      </View>
      <View style={{ paddingHorizontal: 4 }}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#1D2939",
            fontFamily: "PlusJakartaSans_600SemiBold",
            marginBottom: 4,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: item.artistSlug ? "#256E63" : "#98A2B3",
            fontFamily: "PlusJakartaSans_400Regular",
          }}
          numberOfLines={1}
          onPress={() => onOpenArtistProfile?.(item.artistSlug)}
        >
          By {item.artist} • {formatDuration(item.duration)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
