import { Ionicons } from "@expo/vector-icons";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { getThumbnailSource, type SongItemProps } from "./songItemShared";

export function SongSmallItem({
  item,
  onOpenPlayer,
  onPlayPress,
  screenWidth = 0,
}: SongItemProps) {
  const thumbnailSource = getThumbnailSource(item.thumbnailUrl);
  const itemWidth = (screenWidth - 48) / 3;

  return (
    <TouchableOpacity
      onPress={() => {
        onOpenPlayer(item);
        // Start playing immediately (fire and forget - don't await to avoid blocking UI)
        onPlayPress(item).catch((err) => console.warn("Play error:", err));
      }}
      activeOpacity={0.9}
      style={{ width: itemWidth, marginBottom: 12, marginHorizontal: 4 }}
    >
      <View
        style={{
          width: "100%",
          height: itemWidth,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#E5E7EB",
          marginBottom: 6,
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
            <Ionicons name="musical-notes" size={32} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: "#1D2939",
          fontFamily: "PlusJakartaSans_600SemiBold",
        }}
        numberOfLines={2}
      >
        {item.title}
      </Text>
    </TouchableOpacity>
  );
}
