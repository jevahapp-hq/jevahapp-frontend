import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
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
  const animatedValue = useRef(new Animated.Value(progress)).current;
  const [isSeeking, setIsSeeking] = useState(false);
  const targetProgressRef = useRef<number | null>(null);
  const [barWidth, setBarWidth] = useState(0);

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
      // Immediate visual feedback to tapped position
      setDragProgress(percent);
      animatedValue.setValue(percent);
      // Keep indicator at tapped location until external progress catches up
      setIsSeeking(true);
      targetProgressRef.current = percent;
      onSeekToPercent(percent);
    });
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to touches on the progress bar area
      return true;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Respond to moves when dragging
      return isDragging;
    },
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
      if (isDragging) {
        progressBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
          const percent = Math.max(
            0,
            Math.min(1, evt.nativeEvent.locationX / width)
          );
          setDragProgress(percent);
          animatedValue.setValue(percent);
        });
      }
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
      // Keep indicator at released location until external progress catches up
      setIsSeeking(true);
      targetProgressRef.current = dragProgress;
      onSeekToPercent(dragProgress);
    },
    onPanResponderTerminate: () => {
      setIsDragging(false);
    },
  });

  // Drive the animated value from the effective progress source-of-truth
  // (drag position when dragging, target when seeking, live progress otherwise)
  // This ensures the orange circle always follows the intended position.

  // While seeking, hold the indicator at target until external progress reaches it
  useEffect(() => {
    if (!isSeeking || targetProgressRef.current == null) return;
    const target = targetProgressRef.current;
    const diff = Math.abs(progress - target);
    // Consider synced when within 2% of target or beyond target on forward seeks
    if (diff < 0.02 || progress >= target) {
      setIsSeeking(false);
      targetProgressRef.current = null;
      animatedValue.setValue(progress);
    }
  }, [progress, isSeeking, animatedValue]);

  const currentProgress = isDragging
    ? dragProgress
    : isSeeking && targetProgressRef.current != null
    ? targetProgressRef.current
    : progress;
  const progressBarHeight = isDragging ? 8 : 4;

  // Ensure the indicator position always matches the effective progress
  useEffect(() => {
    animatedValue.setValue(currentProgress);
  }, [currentProgress, animatedValue]);

  // Precompute circle geometry for clean centering over the track
  const circleRadius = isDragging ? 12 : 10; // matches 24/20 sizing above
  const circleTop = 8 + progressBarHeight / 2 - circleRadius; // center on track (track top = 8)
  const labelTop = Math.max(0, circleTop - 24); // place label above the knob

  if (!showControls) return null;

  return (
    <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
      {/* Progress Bar */}
      <View className="flex-1 flex-row items-center">
        <Text className="text-white text-xs font-rubik mr-2 min-w-[35px]">
          {formatTime(currentProgress * durationMs)}
        </Text>

        <View
          ref={progressBarRef}
          className="flex-1 relative"
          style={{ height: progressBarHeight + 16 }} // Extra height for touch area
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w && Math.abs(w - barWidth) > 0.5) {
              setBarWidth(w);
            }
          }}
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

          {/* Progress Fill - Orange (ends at the indicator position) */}
          <Animated.View
            className="absolute bg-[#FEA74E] rounded-full"
            style={{
              height: progressBarHeight,
              width: barWidth ? Animated.multiply(animatedValue, barWidth) : 0,
              top: 8,
            }}
          />

          {/* Floating time label while dragging/seeking */}
          {(isDragging || isSeeking) && (
            <Animated.View
              className="absolute bg-black/70 px-2 py-1 rounded"
              style={{
                top: labelTop,
                left:
                  barWidth > 0
                    ? Animated.subtract(
                        Animated.multiply(animatedValue, barWidth),
                        20
                      )
                    : 0,
              }}
            >
              <Text className="text-white text-[10px] font-rubik">
                {formatTime(currentProgress * durationMs)}
              </Text>
            </Animated.View>
          )}

          {/* Draggable Orange Indicator - Main Control */}
          <Animated.View
            className="absolute bg-[#FEA74E] rounded-full"
            style={{
              width: circleRadius * 2,
              height: circleRadius * 2,
              top: circleTop,
              left:
                barWidth > 0
                  ? Animated.subtract(
                      Animated.multiply(animatedValue, barWidth),
                      circleRadius
                    )
                  : 0,
              transform: [
                {
                  scale: isDragging ? 1.1 : 1,
                },
              ],
              shadowColor: "#FEA74E",
              shadowOffset: { width: 0, height: isDragging ? 3 : 2 },
              shadowOpacity: isDragging ? 0.5 : 0.35,
              shadowRadius: isDragging ? 7 : 5,
              elevation: isDragging ? 7 : 5,
              zIndex: 10, // Ensure it's on top
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
