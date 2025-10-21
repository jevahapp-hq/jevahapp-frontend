import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface VideoProgressBarProps {
  progress: number; // 0-1
  currentMs: number;
  durationMs: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onSeekRelative: (deltaSec: number) => void;
  onSeekToPercent: (percent: number) => void;
  showControls?: boolean;
}

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  progress,
  currentMs,
  durationMs,
  isMuted,
  onToggleMute,
  onSeekRelative,
  onSeekToPercent,
  showControls = true,
}) => {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleProgressBarPress = (event: any) => {
    if (!showControls) return;

    const { locationX } = event.nativeEvent;
    const progressBarWidth = 200; // Approximate width
    const percent = Math.max(0, Math.min(1, locationX / progressBarWidth));
    onSeekToPercent(percent);
  };

  if (!showControls) return null;

  return (
    <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
      {/* Mute Button */}
      <TouchableOpacity
        onPress={onToggleMute}
        className="bg-black/50 p-2 rounded-full"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={16}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Progress Bar */}
      <View className="flex-1 flex-row items-center">
        <Text className="text-white text-xs font-rubik mr-2 min-w-[35px]">
          {formatTime(currentMs)}
        </Text>

        <TouchableOpacity
          onPress={handleProgressBarPress}
          className="flex-1 h-1 bg-white/30 rounded-full"
          activeOpacity={0.8}
        >
          <View
            className="h-full bg-white rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </TouchableOpacity>

        <Text className="text-white text-xs font-rubik ml-2 min-w-[35px]">
          {formatTime(durationMs)}
        </Text>
      </View>

      {/* Seek Buttons */}
      <View className="flex-row gap-1">
        <TouchableOpacity
          onPress={() => onSeekRelative(-10)}
          className="bg-black/50 p-1 rounded"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons name="play-skip-back" size={14} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSeekRelative(10)}
          className="bg-black/50 p-1 rounded"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons name="play-skip-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VideoProgressBar;
