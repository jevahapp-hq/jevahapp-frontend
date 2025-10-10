import { MaterialIcons } from "@expo/vector-icons";
import { Video } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  PanResponder,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface VideoProgressBarProps {
  // Video reference to control playback
  videoRef: React.RefObject<Video>;

  // Current video key for identification
  videoKey: string;

  // Callbacks
  onSeekStart?: () => void;
  onSeekEnd?: () => void;
  onSeek?: (positionMs: number) => void;

  // Optional styling
  barColor?: string;
  progressColor?: string;
  thumbColor?: string;

  // Show/hide skip buttons
  showSkipButtons?: boolean;
  skipDuration?: number; // in seconds

  // Responsive sizing functions
  getResponsiveSize?: (small: number, medium: number, large: number) => number;
  getResponsiveSpacing?: (
    small: number,
    medium: number,
    large: number
  ) => number;
  getResponsiveFontSize?: (
    small: number,
    medium: number,
    large: number
  ) => number;
  getTouchTargetSize?: () => number;

  // Platform detection
  isIOS?: boolean;

  // Screen dimensions
  screenWidth?: number;

  // Haptic feedback
  triggerHapticFeedback?: () => void;
}

export default function VideoProgressBar({
  videoRef,
  videoKey,
  onSeekStart,
  onSeekEnd,
  onSeek,
  barColor = "rgba(255, 255, 255, 0.3)",
  progressColor = "#FEA74E",
  thumbColor = "#FFFFFF",
  showSkipButtons = true,
  skipDuration = 10,
  getResponsiveSize = (s, m, l) => m,
  getResponsiveSpacing = (s, m, l) => m,
  getResponsiveFontSize = (s, m, l) => m,
  getTouchTargetSize = () => 48,
  isIOS = Platform.OS === "ios",
  screenWidth = 375,
  triggerHapticFeedback = () => {},
}: VideoProgressBarProps) {
  // State
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs
  const lastUpdateTimeRef = useRef(0);
  const progressBarWidthRef = useRef(
    screenWidth - getResponsiveSpacing(24, 32, 40)
  );

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  // Format time for display (MM:SS)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Seek to a specific position
  const seekToPosition = useCallback(
    async (positionMs: number) => {
      if (!videoRef.current || duration <= 0) {
        console.warn(
          "⚠️ Cannot seek: video ref not available or duration is 0"
        );
        return;
      }

      try {
        const clampedPosition = Math.max(0, Math.min(positionMs, duration));

        // Update UI state immediately for responsiveness
        setPosition(clampedPosition);
        console.log(
          `🎯 Seeking to ${formatTime(clampedPosition)} (${(
            (clampedPosition / duration) *
            100
          ).toFixed(1)}%)`
        );

        // Seek the video
        await videoRef.current.setPositionAsync(clampedPosition);

        // Notify parent component
        onSeek?.(clampedPosition);

        console.log(`✅ Seek completed successfully`);
      } catch (error) {
        console.error("❌ Error seeking video:", error);

        // Sync state from video on error
        try {
          const status = await videoRef.current?.getStatusAsync();
          if (status?.isLoaded && status.positionMillis !== undefined) {
            setPosition(status.positionMillis);
          }
        } catch (syncError) {
          console.error("❌ Error syncing position:", syncError);
        }
      }
    },
    [videoRef, duration, onSeek]
  );

  // Skip forward/backward
  const skipBySeconds = useCallback(
    (seconds: number) => {
      const newPosition = position + seconds * 1000;
      seekToPosition(newPosition);
      triggerHapticFeedback();
    },
    [position, seekToPosition, triggerHapticFeedback]
  );

  // Pan responder for dragging
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsDragging(true);
        onSeekStart?.();

        // Calculate position from touch
        const touchX = evt.nativeEvent.locationX;
        const percentage = Math.max(
          0,
          Math.min(100, (touchX / progressBarWidthRef.current) * 100)
        );
        const positionMs = (percentage / 100) * duration;
        seekToPosition(positionMs);
      },
      onPanResponderMove: (evt) => {
        if (!isDragging) return;

        const touchX = evt.nativeEvent.locationX;
        const percentage = Math.max(
          0,
          Math.min(100, (touchX / progressBarWidthRef.current) * 100)
        );
        const positionMs = (percentage / 100) * duration;

        // Throttle updates for performance
        const now = Date.now();
        if (now - lastUpdateTimeRef.current > 50) {
          seekToPosition(positionMs);
          lastUpdateTimeRef.current = now;
        }
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        onSeekEnd?.();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        onSeekEnd?.();
      },
    })
  ).current;

  // Monitor video playback status
  useEffect(() => {
    if (!videoRef.current) return;

    const interval = setInterval(async () => {
      try {
        const status = await videoRef.current?.getStatusAsync();
        if (status?.isLoaded) {
          // Update duration
          if (status.durationMillis && duration === 0) {
            setDuration(status.durationMillis);
            console.log(
              `📏 Video duration: ${formatTime(status.durationMillis)}`
            );
          }

          // Update position only when not dragging
          if (!isDragging && status.positionMillis !== undefined) {
            setPosition(status.positionMillis);
          }

          // Update playing state
          setIsPlaying(status.isPlaying || false);
        }
      } catch (error) {
        console.warn("Error getting video status:", error);
      }
    }, 100); // Update every 100ms for smooth progress

    return () => clearInterval(interval);
  }, [videoRef, isDragging, duration]);

  // Update progress bar width on mount
  useEffect(() => {
    progressBarWidthRef.current =
      screenWidth - getResponsiveSpacing(24, 32, 40);
  }, [screenWidth, getResponsiveSpacing]);

  if (duration === 0) {
    return null; // Don't show until video is loaded
  }

  return (
    <View
      style={{
        position: "absolute",
        bottom: getResponsiveSpacing(60, 80, 100),
        left: 0,
        right: 0,
        zIndex: 15,
      }}
    >
      {/* Skip Buttons */}
      {showSkipButtons && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: screenWidth * 0.2,
            marginBottom: getResponsiveSpacing(16, 20, 24),
          }}
        >
          {/* Skip Backward */}
          <TouchableOpacity
            onPress={() => skipBySeconds(-skipDuration)}
            style={{
              padding: getResponsiveSpacing(8, 10, 12),
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              borderRadius: getResponsiveSize(20, 24, 28),
              minWidth: getTouchTargetSize(),
              minHeight: getTouchTargetSize(),
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
            accessibilityLabel={`Skip backward ${skipDuration} seconds`}
            accessibilityRole="button"
          >
            <MaterialIcons
              name={`replay-${skipDuration}` as any}
              size={getResponsiveSize(24, 28, 32)}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Time Display */}
          <View
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              paddingHorizontal: getResponsiveSpacing(12, 16, 20),
              paddingVertical: getResponsiveSpacing(6, 8, 10),
              borderRadius: getResponsiveSize(12, 16, 20),
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: getResponsiveFontSize(11, 12, 13),
                fontFamily: "Rubik-SemiBold",
              }}
            >
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>

          {/* Skip Forward */}
          <TouchableOpacity
            onPress={() => skipBySeconds(skipDuration)}
            style={{
              padding: getResponsiveSpacing(8, 10, 12),
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              borderRadius: getResponsiveSize(20, 24, 28),
              minWidth: getTouchTargetSize(),
              minHeight: getTouchTargetSize(),
              alignItems: "center",
              justifyContent: "center",
            }}
            activeOpacity={0.7}
            accessibilityLabel={`Skip forward ${skipDuration} seconds`}
            accessibilityRole="button"
          >
            <MaterialIcons
              name={`forward-${skipDuration}` as any}
              size={getResponsiveSize(24, 28, 32)}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Progress Bar */}
      <View
        style={{
          paddingHorizontal: getResponsiveSpacing(12, 16, 20),
        }}
      >
        <View
          {...panResponder.panHandlers}
          style={{
            paddingVertical: getResponsiveSpacing(12, 16, 20),
            marginTop: -getResponsiveSpacing(12, 16, 20),
            marginBottom: -getResponsiveSpacing(12, 16, 20),
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
          {/* Background Bar */}
          <View
            style={{
              height: getResponsiveSize(4, 5, 6),
              backgroundColor: barColor,
              borderRadius: getResponsiveSize(2, 2.5, 3),
              position: "relative",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            {/* Progress Fill */}
            <View
              style={{
                height: "100%",
                backgroundColor: progressColor,
                borderRadius: getResponsiveSize(2, 2.5, 3),
                width: `${progressPercentage}%`,
                shadowColor: progressColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 3,
              }}
            />

            {/* Draggable Thumb */}
            <View
              style={{
                position: "absolute",
                top: -getResponsiveSize(6, 8, 10),
                width: getResponsiveSize(16, 20, 24),
                height: getResponsiveSize(16, 20, 24),
                backgroundColor: thumbColor,
                borderRadius: getResponsiveSize(8, 10, 12),
                borderWidth: 3,
                borderColor: progressColor,
                left: `${Math.max(0, Math.min(progressPercentage, 100))}%`,
                transform: [{ translateX: -getResponsiveSize(8, 10, 12) }],
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDragging ? 0.5 : 0.3,
                shadowRadius: isDragging ? 6 : 4,
                elevation: isDragging ? 8 : 5,
              }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
