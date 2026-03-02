import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AudioPlayerState,
  useAdvancedAudioPlayer,
} from "../hooks/useAdvancedAudioPlayer";

interface AdvancedAudioControlsProps {
  audioUrl: string;
  audioKey: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  className?: string;
  onPlaybackStatusUpdate?: (status: AudioPlayerState) => void;
  onError?: (error: string) => void;
  onFinished?: () => void;
}

const { width: screenWidth } = Dimensions.get("window");

export const AdvancedAudioControls: React.FC<AdvancedAudioControlsProps> = ({
  audioUrl,
  audioKey,
  title = "Unknown Track",
  artist = "Unknown Artist",
  thumbnail,
  className = "",
  onPlaybackStatusUpdate,
  onError,
  onFinished,
}) => {
  const [audioState, audioControls] = useAdvancedAudioPlayer(audioUrl, {
    audioKey,
    onPlaybackStatusUpdate,
    onError,
    onFinished,
  });

  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef<View>(null);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  // Update animated progress
  React.useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: audioState.progress,
      duration: isDragging ? 0 : 100,
      useNativeDriver: false,
    }).start();
  }, [audioState.progress, isDragging]);

  // Format time helper
  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Pan responder for progress bar
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsDragging(true);
    },
    onPanResponderMove: (evt) => {
      if (progressBarRef.current) {
        progressBarRef.current.measure((x, y, width) => {
          const touchX = evt.nativeEvent.locationX;
          const progress = Math.max(0, Math.min(1, touchX / width));
          animatedProgress.setValue(progress);
        });
      }
    },
    onPanResponderRelease: async (evt) => {
      setIsDragging(false);
      if (progressBarRef.current) {
        progressBarRef.current.measure(async (x, y, width) => {
          const touchX = evt.nativeEvent.locationX;
          const progress = Math.max(0, Math.min(1, touchX / width));
          await audioControls.seekTo(progress);
        });
      }
    },
  });

  // Get play button icon and color based on state
  const getPlayButtonStyle = () => {
    if (audioState.isLoading) {
      return {
        icon: "hourglass" as const,
        color: "#FEA74E",
        bgColor: "bg-white/20",
        size: 24,
      };
    }

    if (audioState.error) {
      return {
        icon: "alert-circle" as const,
        color: "#FF3B30",
        bgColor: "bg-red-500/20",
        size: 24,
      };
    }

    if (audioState.isPlaying) {
      return {
        icon: "pause" as const,
        color: "#FFFFFF",
        bgColor: "bg-[#FEA74E]",
        size: 24,
      };
    }

    return {
      icon: "play" as const,
      color: "#FEA74E",
      bgColor: "bg-white/70",
      size: 24,
    };
  };

  const playButtonStyle = getPlayButtonStyle();

  return (
    <View className={`p-4 ${className}`}>
      {/* Track Info */}
      <View className="flex-row items-center mb-3">
        {thumbnail && (
          <View className="w-12 h-12 rounded-lg overflow-hidden mr-3">
            <View className="w-full h-full bg-gray-600 items-center justify-center">
              <Ionicons name="musical-notes" size={20} color="#FFFFFF" />
            </View>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-white font-semibold text-sm" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-white/70 text-xs" numberOfLines={1}>
            {artist}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="mb-3">
        <View
          ref={progressBarRef}
          className="w-full h-1 bg-white/20 rounded-full relative"
          {...panResponder.panHandlers}
        >
          <Animated.View
            className="h-full bg-[#FEA74E] rounded-full absolute left-0 top-0"
            style={{
              width: animatedProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            }}
          />
          <Animated.View
            className="absolute top-[-5px] w-3 h-3 bg-white rounded-full border-2 border-[#FEA74E]"
            style={{
              left: animatedProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [-6, -6],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateX: animatedProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            }}
          />
        </View>

        {/* Time Display */}
        <View className="flex-row justify-between mt-1">
          <Text className="text-white/70 text-xs font-rubik">
            {formatTime(audioState.position)}
          </Text>
          <Text className="text-white/70 text-xs font-rubik">
            {formatTime(audioState.duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View className="flex-row items-center justify-between">
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={audioControls.togglePlay}
          disabled={audioState.isLoading}
          className={`${playButtonStyle.bgColor} p-3 rounded-full items-center justify-center`}
          activeOpacity={0.8}
        >
          <Ionicons
            name={playButtonStyle.icon}
            size={playButtonStyle.size}
            color={playButtonStyle.color}
          />
        </TouchableOpacity>

        {/* Volume Control */}
        <TouchableOpacity
          onPress={audioControls.toggleMute}
          className="bg-white/20 p-2 rounded-full"
          activeOpacity={0.8}
        >
          <Ionicons
            name={audioState.isMuted ? "volume-mute" : "volume-high"}
            size={20}
            color="#FEA74E"
          />
        </TouchableOpacity>

        {/* Error Display */}
        {audioState.error && (
          <View className="flex-1 ml-3">
            <Text className="text-red-400 text-xs" numberOfLines={1}>
              {audioState.error}
            </Text>
          </View>
        )}
      </View>

      {/* Loading Indicator */}
      {audioState.isLoading && (
        <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
          <View className="bg-white/20 p-3 rounded-full">
            <Ionicons name="hourglass" size={24} color="#FEA74E" />
          </View>
        </View>
      )}
    </View>
  );
};

export default AdvancedAudioControls;
