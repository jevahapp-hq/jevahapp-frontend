import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

type PlayOverlayProps = {
  isPlaying: boolean;
  onPress: () => void;
  size?: number;
};

export default function PlayOverlay({
  isPlaying,
  onPress,
  size = 32,
}: PlayOverlayProps) {
  return (
    <View className="absolute inset-0 justify-center items-center">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View
          className={`${
            isPlaying ? "bg-black/30" : "bg-white/70"
          } p-4 rounded-full`}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={size || 40}
            color={isPlaying ? "#FFFFFF" : "#FEA74E"}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

