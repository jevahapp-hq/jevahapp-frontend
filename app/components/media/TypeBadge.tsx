import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

type TypeBadgeProps = {
  type: "video" | "audio" | "ebook" | "sermon";
  position?: "top-left" | "top-right";
};

export default function TypeBadge({
  type,
  position = "top-left",
}: TypeBadgeProps) {
  const iconName =
    type === "video" ? "videocam" : type === "ebook" ? "book" : "musical-notes";
  const containerStyle =
    position === "top-left"
      ? { top: 16, left: 16 }
      : ({ top: 16, right: 16 } as any);
  return (
    <View className="absolute" style={containerStyle}>
      <View className="bg-black/50 p-1 rounded-full">
        <Ionicons name={iconName as any} size={16} color="#FFFFFF" />
      </View>
    </View>
  );
}

