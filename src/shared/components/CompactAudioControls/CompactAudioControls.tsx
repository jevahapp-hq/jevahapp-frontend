import { Ionicons } from "@expo/vector-icons";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoaded: boolean;
  position: number;
  duration: number;
  isMuted: boolean;
  volume: number;
  isLoading: boolean;
  error?: string;
}

interface CompactAudioControlsProps {
  audioUrl: string;
  audioKey: string;
  className?: string;
  onPlaybackStatusUpdate?: (status: AudioPlayerState) => void;
  onError?: (error: string) => void;
  onFinished?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export const CompactAudioControls: React.FC<CompactAudioControlsProps> = ({
  audioUrl,
  audioKey,
  className,
  onPlaybackStatusUpdate,
  onError,
  onFinished,
  onPlay,
  onPause,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Pan responder for seeking
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      // Start seeking
    },
    onPanResponderMove: (evt, gestureState) => {
      if (duration > 0) {
        const newPosition = Math.max(0, Math.min(gestureState.moveX, 200));
        const progress = newPosition / 200;
        const newTime = progress * duration;
        setPosition(newTime);
        progressAnimation.setValue(progress);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (duration > 0 && sound) {
        const newPosition = Math.max(0, Math.min(gestureState.moveX, 200));
        const progress = newPosition / 200;
        const newTime = progress * duration;

        sound.setPositionAsync(newTime);
        setPosition(newTime);
        progressAnimation.setValue(progress);
      }
    },
  });

  // Load audio
  const loadAudio = useCallback(async () => {
    if (!audioUrl || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Unload existing sound
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        {
          shouldPlay: false,
          isMuted: isMuted,
          volume: volume,
        }
      );

      setSound(newSound);

      // Set up status update listener
      newSound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          setIsMuted(status.isMuted);
          setVolume(status.volume || 1.0);

          // Update progress animation
          if (status.durationMillis && status.durationMillis > 0) {
            const progress =
              (status.positionMillis || 0) / status.durationMillis;
            progressAnimation.setValue(progress);
          }

          // Notify parent component
          onPlaybackStatusUpdate?.({
            isPlaying: status.isPlaying,
            isLoaded: true,
            position: status.positionMillis || 0,
            duration: status.durationMillis || 0,
            isMuted: status.isMuted,
            volume: status.volume || 1.0,
            isLoading: false,
          });

          // Handle playback finished
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            progressAnimation.setValue(0);
            onFinished?.();
          }
        } else if (status.error) {
          const errorMessage = `Playback error: ${status.error}`;
          setError(errorMessage);
          onError?.(errorMessage);
        }
      });

      setIsLoading(false);
    } catch (err) {
      const errorMessage = `Failed to load audio: ${err}`;
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  }, [
    audioUrl,
    isLoading,
    sound,
    isMuted,
    volume,
    onPlaybackStatusUpdate,
    onError,
    onFinished,
    progressAnimation,
  ]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (!sound || isLoading) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        onPause?.();
      } else {
        await sound.playAsync();
        onPlay?.();
      }
    } catch (err) {
      const errorMessage = `Playback control error: ${err}`;
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [sound, isPlaying, isLoading, onPlay, onPause, onError]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!sound) return;

    try {
      await sound.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    } catch (err) {
      const errorMessage = `Mute control error: ${err}`;
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [sound, isMuted, onError]);

  // Load audio on mount
  useEffect(() => {
    loadAudio();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioUrl]);

  // Format time
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View
      className={`flex-row items-center justify-between px-3 py-2 bg-black/50 rounded-lg ${
        className || ""
      }`}
    >
      {/* Play/Pause Button */}
      <TouchableOpacity
        onPress={togglePlayPause}
        disabled={isLoading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={20}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Time Display */}
      <Text className="text-white text-xs mx-2 min-w-[80px]">
        {formatTime(position)} / {formatTime(duration)}
      </Text>

      {/* Progress Bar */}
      <View
        className="flex-1 h-2 bg-white/30 rounded-full ml-3 mr-2 relative"
        {...panResponder.panHandlers}
      >
        <Animated.View
          className="h-full bg-white rounded-full absolute left-0 top-0"
          style={{
            width: progressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
              extrapolate: "clamp",
            }),
          }}
        />

        {/* Thumb indicator at the progress end, centered vertically */}
        <Animated.View
          style={{
            position: "absolute",
            top: "50%",
            transform: [
              { translateY: -6 },
              {
                translateX: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
              },
            ],
            // We'll position using percentage by nesting the thumb within another container
          }}
        />

        {/* Container to position the thumb using width interpolation */}
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: progressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
              extrapolate: "clamp",
            }),
          }}
        >
          <View
            style={{
              position: "absolute",
              right: -6,
              top: "50%",
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#FFFFFF",
              transform: [{ translateY: -6 }],
            }}
          />
        </Animated.View>
      </View>

      {/* Mute Button */}
      <TouchableOpacity onPress={toggleMute} disabled={isLoading}>
        <Ionicons
          name={isMuted ? "volume-mute" : "volume-high"}
          size={20}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {/* Loading Indicator */}
      {isLoading && (
        <View className="ml-2">
          <Text className="text-white text-xs">Loading...</Text>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View className="ml-2">
          <Text className="text-red-400 text-xs">Error</Text>
        </View>
      )}
    </View>
  );
};

export default CompactAudioControls;
