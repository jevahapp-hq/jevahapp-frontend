import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { useAudioManager } from "../hooks/useAudioManager";

interface GlobalMuteControlProps {
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export default function GlobalMuteControl({
  size = 24,
  showLabel = false,
  className = "",
}: GlobalMuteControlProps) {
  const { audioState, toggleMute, setGlobalMute, isMuted } = useAudioManager();

  const handlePress = async () => {
    try {
      await toggleMute();
    } catch (error) {
      console.error("Error toggling global mute:", error);
    }
  };

  const getIconName = () => {
    if (audioState.globalMuteEnabled) {
      return "volume-mute";
    }
    return audioState.isMuted ? "volume-mute" : "volume-high";
  };

  const getIconColor = () => {
    if (audioState.globalMuteEnabled || audioState.isMuted) {
      return "#FF6B6B";
    }
    return "#3B3B3B";
  };

  const getLabelText = () => {
    if (audioState.globalMuteEnabled) {
      return "Global Mute";
    }
    return audioState.isMuted ? "Muted" : "Unmuted";
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={`flex-row items-center ${className}`}
      activeOpacity={0.7}
    >
      <View className="relative">
        <Ionicons
          name={getIconName() as any}
          size={size}
          color={getIconColor()}
        />

        {/* Global Mute Indicator */}
        {audioState.globalMuteEnabled && (
          <View className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </View>

      {showLabel && (
        <Text
          className="ml-2 text-sm font-medium"
          style={{ color: getIconColor() }}
        >
          {getLabelText()}
        </Text>
      )}
    </TouchableOpacity>
  );
}
