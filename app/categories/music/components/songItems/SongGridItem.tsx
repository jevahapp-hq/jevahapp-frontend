import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { getThumbnailSource, type SongItemProps } from "./songItemShared";

export function SongGridItem({
  item,
  onOpenPlayer,
  onPlayPress,
  onOpenArtistProfile,
  screenWidth = 0,
}: SongItemProps) {
  const thumbnailSource = getThumbnailSource(item.thumbnailUrl);
  const cardWidth = (screenWidth - 48) / 2;

  return (
    <TouchableOpacity
      onPress={() => {
        onOpenPlayer(item);
        // Start playing immediately (fire and forget - don't await to avoid blocking UI)
        onPlayPress(item).catch((err) => console.warn("Play error:", err));
      }}
      activeOpacity={0.9}
      style={{
        width: cardWidth,
        marginBottom: 16,
        marginHorizontal: 4,
      }}
    >
      <View
        style={{
          width: "100%",
          height: cardWidth,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#E5E7EB",
          marginBottom: 8,
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
            <Ionicons name="musical-notes" size={48} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: "#1D2939",
          fontFamily: "Rubik_600SemiBold",
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
      >
        <Text
          style={{
            fontSize: 12,
            color: item.artistSlug ? "#256E63" : "#98A2B3",
            fontFamily: "Rubik_400Regular",
          }}
          numberOfLines={1}
        >
          {item.artist}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
