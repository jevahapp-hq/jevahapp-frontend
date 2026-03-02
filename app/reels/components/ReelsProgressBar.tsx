import React from "react";
import { PanResponder, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBottomNavHeight } from "../../utils/responsiveOptimized";

interface ReelsProgressBarProps {
  videoKey: string;
  videoDuration: number;
  videoPosition: number;
  isDragging: boolean;
  mutedVideos: Record<string, boolean>;
  progressBarWidth: number;
  onLayout: (width: number) => void;
  onSeek: (videoKey: string, position: number) => void;
  onToggleMute: (key: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  getResponsiveSpacing: (small: number, medium: number, large: number) => number;
  formatTime: (ms: number) => string;
}

export const ReelsProgressBar: React.FC<ReelsProgressBarProps> = ({
  videoKey,
  videoDuration,
  videoPosition,
  isDragging,
  mutedVideos,
  progressBarWidth,
  onLayout,
  onSeek,
  onToggleMute,
  onDragStart,
  onDragEnd,
  getResponsiveSpacing,
  formatTime,
}) => {
  const progressPercentage =
    videoDuration > 0 ? (videoPosition / videoDuration) * 100 : 0;

  // Create pan responder for seeking
  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          onDragStart?.();
          const touchX = evt.nativeEvent.locationX;
          const width = Math.max(1, progressBarWidth);
          const newProgress = Math.max(0, Math.min(100, (touchX / width) * 100));
          onSeek(videoKey, newProgress);
        },
        onPanResponderMove: (evt) => {
          const touchX = evt.nativeEvent.locationX;
          const width = Math.max(1, progressBarWidth);
          const newProgress = Math.max(0, Math.min(100, (touchX / width) * 100));
          onSeek(videoKey, newProgress);
        },
        onPanResponderRelease: () => {
          onDragEnd?.();
        },
        onPanResponderTerminate: () => {
          onDragEnd?.();
        },
      }),
    [videoKey, progressBarWidth, onSeek, onDragStart, onDragEnd]
  );

  return (
    <View
      style={{
        position: "absolute",
        bottom: getBottomNavHeight() + getResponsiveSpacing(-18, -16, -14),
        left: 0,
        right: 0,
        zIndex: 30,
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 12,
          paddingTop: 6,
          bottom: 0,
          width: "100%",
        }}
      >
        {/* Full-width Reels progress bar */}
        <View
          {...panResponder.panHandlers}
          style={{
            width: "100%",
            position: "relative",
            height: isDragging ? 48 : 40,
          }}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w && Math.abs(w - progressBarWidth) > 0.5) {
              onLayout(w);
            }
          }}
          accessibilityLabel="Video progress bar - slide to seek"
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(progressPercentage),
          }}
          accessibilityHint="Double tap and hold to drag, or tap to seek to position"
        >
          {/* Background Track */}
          <View
            style={{
              height: isDragging ? 6 : 2,
              backgroundColor: isDragging
                ? "rgba(255, 255, 255, 0.45)"
                : "rgba(255, 255, 255, 0.15)",
              borderRadius: 999,
              position: "absolute",
              left: 0,
              right: 0,
              top: 8,
            }}
          />

          {/* Progress Fill - Orange */}
          <View
            style={{
              height: isDragging ? 6 : 2,
              backgroundColor: isDragging
                ? "rgba(254, 167, 78, 0.95)"
                : "rgba(254, 167, 78, 0.25)",
              borderRadius: 999,
              width: `${progressPercentage}%`,
              position: "absolute",
              left: 0,
              top: 8,
            }}
          />

          {/* Draggable knob */}
          <View
            style={{
              position: "absolute",
              top: 8 - 8 + (isDragging ? 3 : 1),
              width: 16,
              height: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              borderWidth: 3,
              borderColor: "#FEA74E",
              left: `${Math.max(0, Math.min(progressPercentage, 100))}%`,
              transform: [{ translateX: -8 }],
              opacity: isDragging ? 1 : 0,
              zIndex: 10,
            }}
          />

          {/* Mute Button */}
          <TouchableOpacity
            onPress={() => onToggleMute(videoKey)}
            style={{
              position: "absolute",
              right: 12,
              top: 8 - 8,
              backgroundColor: isDragging
                ? "rgba(0, 0, 0, 0.65)"
                : "rgba(0, 0, 0, 0.35)",
              padding: 6,
              borderRadius: 16,
            }}
            activeOpacity={0.7}
            accessibilityLabel={`${mutedVideos[videoKey] ? "Unmute" : "Mute"} video`}
            accessibilityRole="button"
          >
            <Ionicons
              name={mutedVideos[videoKey] ? "volume-mute" : "volume-high"}
              size={16}
              color="rgba(255, 255, 255, 0.95)"
            />
          </TouchableOpacity>

          {/* Time labels */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              top: 20,
              flexDirection: "row",
              justifyContent: "space-between",
              paddingRight: 44,
              zIndex: 35,
              opacity: isDragging ? 1 : 0.9,
            }}
          >
            <View
              style={{
                backgroundColor: isDragging
                  ? "rgba(0, 0, 0, 0.35)"
                  : "rgba(0, 0, 0, 0.22)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.98)",
                  fontSize: 10,
                  fontFamily: "Rubik-Medium",
                  textShadowColor: "rgba(0, 0, 0, 0.65)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {videoDuration > 0 ? formatTime(videoPosition) : "0:00"}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: isDragging
                  ? "rgba(0, 0, 0, 0.35)"
                  : "rgba(0, 0, 0, 0.22)",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.98)",
                  fontSize: 10,
                  fontFamily: "Rubik-Medium",
                  textShadowColor: "rgba(0, 0, 0, 0.65)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {videoDuration > 0 ? formatTime(videoDuration) : "0:00"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

