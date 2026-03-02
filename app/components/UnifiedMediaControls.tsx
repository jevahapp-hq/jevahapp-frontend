import { Ionicons } from "@expo/vector-icons";
import { Audio, Video } from "expo-av";
import React, { useCallback, useRef, useState } from "react";
import {
    Animated,
    PanResponder,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useGlobalAudioPlayerStore } from "../store/useGlobalAudioPlayerStore";
import { useGlobalMediaStore } from "../store/useGlobalMediaStore";
import GlobalAudioInstanceManager from "../utils/globalAudioInstanceManager";

interface UnifiedMediaControlsProps {
  content: {
    _id: string;
    title: string;
    contentType: string;
    fileUrl: string;
    thumbnailUrl?: string;
    duration?: number;
  };
  className?: string;
  onPlaybackStatusUpdate?: (status: any) => void;
  onError?: (error: string) => void;
  onFinished?: () => void;
}

export const UnifiedMediaControls: React.FC<UnifiedMediaControlsProps> = ({
  content,
  className = "",
  onPlaybackStatusUpdate,
  onError,
  onFinished,
}) => {
  const globalMediaStore = useGlobalMediaStore();
  const audioManager = React.useRef(
    GlobalAudioInstanceManager.getInstance()
  ).current;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const videoRef = useRef<Video | null>(null);
  const statusUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const mediaKey = content._id;

  // Update animated progress
  React.useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Format time helper
  const formatTime = useCallback((milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Determine content type and get appropriate media URL
  const getMediaType = useCallback(() => {
    const contentType = content.contentType?.toLowerCase() || "";

    if (contentType.includes("video")) {
      return "video";
    } else if (contentType.includes("audio") || contentType.includes("music")) {
      return "audio";
    } else if (
      contentType.includes("ebook") ||
      contentType.includes("book") ||
      contentType.includes("pdf")
    ) {
      return "ebook";
    } else if (contentType.includes("sermon")) {
      // Sermons can be audio or video, check file extension
      const fileUrl = content.fileUrl?.toLowerCase() || "";
      if (
        fileUrl.includes(".mp4") ||
        fileUrl.includes(".mov") ||
        fileUrl.includes(".avi")
      ) {
        return "video";
      }
      return "audio";
    }

    return "audio"; // Default fallback
  }, [content.contentType, content.fileUrl]);

  // Pan responder for progress bar
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // Start seeking
    },
    onPanResponderMove: (evt) => {
      // Handle seeking during drag
    },
    onPanResponderRelease: async (evt) => {
      // Complete seeking
      if (soundRef.current && duration > 0) {
        try {
          const progressBarWidth = 200; // Approximate width
          const touchX = evt.nativeEvent.locationX;
          const newProgress = Math.max(
            0,
            Math.min(1, touchX / progressBarWidth)
          );
          const positionMillis = newProgress * duration;

          await soundRef.current.setPositionAsync(positionMillis);
          setProgress(newProgress);
          setPosition(positionMillis);
        } catch (error) {
          console.error("Seek error:", error);
        }
      }
    },
  });

  // Load and play media based on content type
  const loadAndPlayMedia = useCallback(async () => {
    if (!content.fileUrl) return;

    setIsLoading(true);
    setError(null);

    try {
      // Stop any global audio-player based track first (like CopyrightFreeSongs does)
      // so there's never more than one audio system playing at once.
      try {
        const globalAudioStore = useGlobalAudioPlayerStore.getState();
        if (globalAudioStore && globalAudioStore.clear) {
          await globalAudioStore.clear();
          console.log("🛑 Stopped global audio player before starting UnifiedMediaControls audio");
        }
      } catch (error) {
        console.warn("⚠️ Failed to stop global audio player:", error);
      }

      const mediaType = getMediaType();

      if (mediaType === "video") {
        // For videos, we'll play the video file as audio (extract audio track)
        // This allows users to listen to video content without watching
        const { sound } = await Audio.Sound.createAsync(
          { uri: content.fileUrl },
          {
            shouldPlay: false,
            isMuted: isMuted,
          }
        );

        soundRef.current = sound;
        audioManager.registerAudio(mediaKey, sound);

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setDuration(status.durationMillis);
              setProgress((status.positionMillis || 0) / status.durationMillis);
              setPosition(status.positionMillis || 0);
            }

            if (status.didJustFinish) {
              setIsPlaying(false);
              setProgress(0);
              setPosition(0);
              onFinished?.();
            }
          }
        });
      } else if (mediaType === "ebook") {
        // For ebooks, we could implement text-to-speech here
        // For now, show a message that audio is not available
        setError("Audio playback not available for ebooks");
        setIsLoading(false);
        return;
      } else {
        // Regular audio content
        const { sound } = await Audio.Sound.createAsync(
          { uri: content.fileUrl },
          {
            shouldPlay: false,
            isMuted: isMuted,
          }
        );

        soundRef.current = sound;
        audioManager.registerAudio(mediaKey, sound);

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.durationMillis) {
              setDuration(status.durationMillis);
              setProgress((status.positionMillis || 0) / status.durationMillis);
              setPosition(status.positionMillis || 0);
            }

            if (status.didJustFinish) {
              setIsPlaying(false);
              setProgress(0);
              setPosition(0);
              onFinished?.();
            }
          }
        });
      }

      await audioManager.playAudio(mediaKey, soundRef.current!, true);
      setIsPlaying(true);
      globalMediaStore.playMediaGlobally(mediaKey, "audio");
    } catch (error) {
      const errorMessage = `Failed to load media: ${error}`;
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    content.fileUrl,
    content.title,
    isMuted,
    getMediaType,
    mediaKey,
    globalMediaStore,
    onError,
    onFinished,
    audioManager,
  ]);

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    if (isLoading) return;

    if (soundRef.current) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;

        if (status.isPlaying) {
          await audioManager.pauseAudio(mediaKey);
          setIsPlaying(false);
          globalMediaStore.pauseAudio(mediaKey);
        } else {
          // Stop any global audio-player based track first (like CopyrightFreeSongs does)
          try {
            const globalAudioStore = useGlobalAudioPlayerStore.getState();
            if (globalAudioStore && globalAudioStore.clear) {
              await globalAudioStore.clear();
              console.log("🛑 Stopped global audio player before resuming UnifiedMediaControls audio");
            }
          } catch (error) {
            console.warn("⚠️ Failed to stop global audio player:", error);
          }

          await audioManager.playAudio(mediaKey, soundRef.current, true);
          setIsPlaying(true);
          globalMediaStore.playMediaGlobally(mediaKey, "audio");
        }
      } catch (error) {
        console.error("Toggle play error:", error);
      }
    } else {
      await loadAndPlayMedia();
    }
  }, [
    audioManager,
    isLoading,
    loadAndPlayMedia,
    mediaKey,
    globalMediaStore,
  ]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (soundRef.current) {
      try {
        const newMutedState = !isMuted;
        await soundRef.current.setIsMutedAsync(newMutedState);
        setIsMuted(newMutedState);
      } catch (error) {
        console.error("Toggle mute error:", error);
      }
    }
  }, [isMuted]);

  React.useEffect(() => {
    return () => {
      if (soundRef.current) {
        audioManager.unregisterAudio(mediaKey).catch(() => {});
      }
    };
  }, [audioManager, mediaKey]);

  // Get play button style based on state
  const getPlayButtonStyle = () => {
    if (isLoading) {
      return {
        icon: "hourglass" as const,
        color: "#FEA74E",
        bgColor: "bg-white/20",
        size: 20,
      };
    }

    if (error) {
      return {
        icon: "alert-circle" as const,
        color: "#FF3B30",
        bgColor: "bg-red-500/20",
        size: 20,
      };
    }

    if (isPlaying) {
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
  const mediaType = getMediaType();

  return (
    <View className={`p-3 ${className}`}>
      {/* Content Type Indicator */}
      <View className="flex-row items-center mb-3">
        <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center mr-2">
          <Ionicons
            name={
              mediaType === "video"
                ? "videocam"
                : mediaType === "ebook"
                ? "book"
                : "musical-notes"
            }
            size={12}
            color="#FFFFFF"
          />
        </View>
        <Text className="text-white/70 text-xs font-rubik">
          {mediaType === "video"
            ? "Video Audio"
            : mediaType === "ebook"
            ? "Ebook"
            : "Audio"}
        </Text>
      </View>

      {/* Controls Row */}
      <View className="flex-row items-center gap-3">
        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={togglePlay}
          disabled={isLoading || !!error}
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
        <View className="flex-1 ml-2">
          <View
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
          <View className="flex-row justify-between mt-2">
            <Text className="text-white/70 text-xs font-rubik">
              {formatTime(position)}
            </Text>
            <Text className="text-white/70 text-xs font-rubik">
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Volume Control */}
        <TouchableOpacity
          onPress={toggleMute}
          className="bg-white/20 p-1.5 rounded-full"
          activeOpacity={0.8}
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={16}
            color="#FEA74E"
          />
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <View className="mt-2">
          <Text className="text-red-400 text-xs" numberOfLines={1}>
            {error}
          </Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center">
          <View className="bg-white/20 p-2 rounded-full">
            <Ionicons name="hourglass" size={16} color="#FEA74E" />
          </View>
        </View>
      )}
    </View>
  );
};

export default UnifiedMediaControls;
