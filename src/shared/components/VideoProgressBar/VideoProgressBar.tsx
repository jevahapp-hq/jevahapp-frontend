import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface VideoProgressBarProps {
  progress: number; // 0-1
  currentMs: number;
  durationMs: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onSeekToPercent: (percent: number) => void;
  showControls?: boolean;
}

export const VideoProgressBar: React.FC<VideoProgressBarProps> = ({
  progress,
  currentMs,
  durationMs,
  isMuted,
  onToggleMute,
  onSeekToPercent,
  showControls = true,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const progressBarRef = useRef<View>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleProgressBarPress = (event: any) => {
    if (!showControls) return;

    const { locationX } = event.nativeEvent;
    progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
      const percent = Math.max(0, Math.min(1, locationX / width));
      onSeekToPercent(percent);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      setIsDragging(true);
      progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
        const percent = Math.max(
          0,
          Math.min(1, evt.nativeEvent.locationX / width)
        );
        setDragProgress(percent);
        animatedValue.setValue(percent);
      });
    },
    onPanResponderMove: (evt) => {
      progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
        const percent = Math.max(
          0,
          Math.min(1, evt.nativeEvent.locationX / width)
        );
        setDragProgress(percent);
        animatedValue.setValue(percent);
      });
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
      onSeekToPercent(dragProgress);
    },
  });

  const currentProgress = isDragging ? dragProgress : progress;
  const progressBarHeight = isDragging ? 8 : 4;

  if (!showControls) return null;

  return (
    <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
      {/* Progress Bar */}
      <View className="flex-1 flex-row items-center">
        <Text className="text-white text-xs font-rubik mr-2 min-w-[35px]">
          {formatTime(isDragging ? dragProgress * durationMs : currentMs)}
        </Text>

        <View
          ref={progressBarRef}
          className="flex-1 relative"
          style={{ height: progressBarHeight + 16 }} // Extra height for touch area
          {...panResponder.panHandlers}
        >
          {/* Background Track */}
          <View
            className="absolute bg-white/30 rounded-full"
            style={{
              height: progressBarHeight,
              width: "100%",
              top: 8, // Center vertically in touch area
            }}
          />

          {/* Progress Fill - Orange */}
          <Animated.View
            className="absolute bg-[#FEA74E] rounded-full"
            style={{
              height: progressBarHeight,
              width: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
                extrapolate: "clamp",
              }),
              top: 8,
            }}
          />

          {/* Draggable Indicator */}
          <Animated.View
            className="absolute bg-[#FEA74E] rounded-full"
            style={{
              width: 16,
              height: 16,
              top: 4,
              left: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0, "100%"],
                extrapolate: "clamp",
              }),
              transform: [
                {
                  translateX: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0], // Center the indicator
                    extrapolate: "clamp",
                  }),
                },
              ],
              shadowColor: "#FEA74E",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}
          />
        </View>

        <Text className="text-white text-xs font-rubik ml-2 min-w-[35px]">
          {formatTime(durationMs)}
        </Text>
      </View>

      {/* Mute Button - moved to the right */}
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
    </View>
  );
};

export default VideoProgressBar;
