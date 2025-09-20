import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AudioPlayerState,
  useAdvancedAudioPlayer,
} from "../hooks/useAdvancedAudioPlayer";

interface CompactAudioControlsProps {
  audioUrl: string;
  audioKey: string;
  className?: string;
  onPlaybackStatusUpdate?: (status: AudioPlayerState) => void;
  onError?: (error: string) => void;
  onFinished?: () => void;
}

export const CompactAudioControls: React.FC<CompactAudioControlsProps> = ({
  audioUrl,
  audioKey,
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
    onPanResponderGrant: () => {
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

  // Get play button style based on state
  const getPlayButtonStyle = () => {
    if (audioState.isLoading) {
      return {
        icon: "hourglass" as const,
        color: "#FEA74E",
        bgColor: "bg-white/20",
        size: 20,
      };
    }

    if (audioState.error) {
      return {
        icon: "alert-circle" as const,
        color: "#FF3B30",
        bgColor: "bg-red-500/20",
        size: 20,
      };
    }

    if (audioState.isPlaying) {
      return {
        icon: "pause" as const,
        color: "#FFFFFF",
        bgColor: "bg-[#FEA74E]",
        size: 20,
      };
    }

    return {
      icon: "play" as const,
      color: "#FEA74E",
      bgColor: "bg-white/70",
      size: 20,
    };
  };

  const playButtonStyle = getPlayButtonStyle();

  return (
    <View className={`p-3 ${className}`}>
      {/* Controls Row */}
      <View className="flex-row items-center gap-3">
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={audioControls.togglePlay}
          disabled={audioState.isLoading}
          className={`${playButtonStyle.bgColor} p-2 rounded-full items-center justify-center`}
          activeOpacity={0.8}
        >
          <Ionicons
            name={playButtonStyle.icon}
            size={playButtonStyle.size}
            color={playButtonStyle.color}
          />
        </TouchableOpacity>

        {/* Progress Bar */}
        <View className="flex-1">
          <View
            ref={progressBarRef}
            className="w-full h-1 bg-white/30 rounded-full relative"
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
              className="absolute top-[-4px] w-2 h-2 bg-white rounded-full border border-[#FEA74E]"
              style={{
                left: animatedProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-4, -4],
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

        {/* Volume Control */}
        <TouchableOpacity
          onPress={audioControls.toggleMute}
          className="bg-white/20 p-1.5 rounded-full"
          activeOpacity={0.8}
        >
          <Ionicons
            name={audioState.isMuted ? "volume-mute" : "volume-high"}
            size={16}
            color="#FEA74E"
          />
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {audioState.error && (
        <View className="mt-2">
          <Text className="text-red-400 text-xs" numberOfLines={1}>
            {audioState.error}
          </Text>
        </View>
      )}

      {/* Loading Overlay */}
      {audioState.isLoading && (
        <View className="absolute inset-0 items-center justify-center">
          <View className="bg-white/20 p-2 rounded-full">
            <Ionicons name="hourglass" size={16} color="#FEA74E" />
          </View>
        </View>
      )}
    </View>
  );
};

export default CompactAudioControls;
