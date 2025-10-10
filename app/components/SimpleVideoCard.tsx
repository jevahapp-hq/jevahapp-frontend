import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAudioManager } from "../hooks/useAudioManager";
import MediaCard from "./media/MediaCard";
import PlayOverlay from "./media/PlayOverlay";
import ProgressBar from "./media/ProgressBar";
import TypeBadge from "./media/TypeBadge";

interface SimpleVideoCardProps {
  video: {
    _id?: string;
    fileUrl: string;
    title: string;
    contentType?: string;
  };
  index: number;
  onVideoTap?: (video: any, index: number) => void;
}

export default function SimpleVideoCard({
  video,
  index,
  onVideoTap,
}: SimpleVideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showMuteAnimation, setShowMuteAnimation] = useState(false);
  const videoRef = useRef<Video>(null);
  const muteAnimationRef = useRef(new Animated.Value(0)).current;

  // Use advanced audio manager
  const { audioState, toggleMute, setMute, isMuted } = useAudioManager();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, []);

  // Sync video mute state with audio manager
  useEffect(() => {
    const syncMuteState = async () => {
      if (videoRef.current) {
        try {
          const muted = isMuted();
          await videoRef.current.setIsMutedAsync(muted);
        } catch (error) {
          console.error("Error syncing mute state:", error);
        }
      }
    };

    syncMuteState();
  }, [audioState.isMuted, audioState.globalMuteEnabled]);

  const togglePlay = async () => {
    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.playAsync();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error("Error toggling video playback:", error);
    }
  };

  const handleToggleMute = async () => {
    try {
      // Show mute animation
      setShowMuteAnimation(true);
      Animated.sequence([
        Animated.timing(muteAnimationRef, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(muteAnimationRef, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowMuteAnimation(false);
      });

      // Toggle mute using audio manager
      await toggleMute();

      // Update video mute state
      const muted = isMuted();
      await videoRef.current?.setIsMutedAsync(muted);

      console.log(`🔇 Video mute ${muted ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  };

  const seekTo = async (seekPosition: number) => {
    try {
      await videoRef.current?.setPositionAsync(seekPosition);
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVideoStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setProgress(status.positionMillis / status.durationMillis);
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setProgress(0);
        setPosition(0);
      }
    }
  };

  // Validate video URL
  const isValidUri = (u: any) =>
    typeof u === "string" &&
    u.trim().length > 0 &&
    /^https?:\/\//.test(u.trim());

  const safeVideoUri = isValidUri(video.fileUrl)
    ? String(video.fileUrl).trim()
    : "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  return (
    <View className="mb-10">
      <TouchableWithoutFeedback
        onPress={() => {
          if (onVideoTap) {
            onVideoTap(video, index);
          }
        }}
      >
        <MediaCard className="w-full h-[400px] rounded-2xl">
          <Video
            ref={videoRef}
            source={{ uri: safeVideoUri }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode={ResizeMode.COVER}
            useNativeControls={false}
            isMuted={isMuted()}
            volume={audioState.volume}
            shouldPlay={isPlaying}
            onPlaybackStatusUpdate={handleVideoStatusUpdate}
            onLoad={() => {
              console.log(
                `✅ Video loaded successfully: ${video.title}`,
                safeVideoUri
              );
            }}
            onError={(e) => {
              console.warn(
                "Video failed to load:",
                video.title,
                safeVideoUri,
                e
              );
              setIsPlaying(false);
            }}
          />

          <PlayOverlay isPlaying={isPlaying} onPress={togglePlay} />

          {/* Content Type Icon - Top Left */}
          <TypeBadge
            type={video.contentType === "sermon" ? "sermon" : "video"}
          />

          {/* Video Title - show when paused */}
          {!isPlaying && (
            <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
              <Text
                className="text-white font-semibold text-[14px]"
                numberOfLines={2}
              >
                {video.title}
              </Text>
            </View>
          )}

          {/* Bottom Controls (Progress bar and Mute button) */}
          <View className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2 px-3">
            <View className="flex-1">
              <TouchableOpacity
                onPress={(event) => {
                  const { locationX } = event.nativeEvent;
                  const progressBarWidth = 200;
                  const seekRatio = locationX / progressBarWidth;
                  const seekPosition = seekRatio * duration;
                  seekTo(seekPosition);
                }}
              >
                <ProgressBar progress={progress * 100} />
              </TouchableOpacity>
            </View>

            {duration > 0 && (
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-white font-rubik">
                  {formatTime(position)}
                </Text>
                <Text className="text-xs text-white font-rubik">
                  {formatTime(duration)}
                </Text>
              </View>
            )}

            <TouchableOpacity onPress={handleToggleMute}>
              <View className="relative">
                <Ionicons
                  name={isMuted() ? "volume-mute" : "volume-high"}
                  size={20}
                  color={isMuted() ? "#FF6B6B" : "#FFFFFF"}
                />

                {/* Mute Animation Overlay */}
                {showMuteAnimation && (
                  <Animated.View
                    style={{
                      position: "absolute",
                      top: -10,
                      left: -10,
                      right: -10,
                      bottom: -10,
                      backgroundColor: "rgba(255, 107, 107, 0.3)",
                      borderRadius: 20,
                      transform: [
                        {
                          scale: muteAnimationRef.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.5],
                          }),
                        },
                      ],
                      opacity: muteAnimationRef.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    }}
                  />
                )}

                {/* Global Mute Indicator */}
                {audioState.globalMuteEnabled && (
                  <View className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </MediaCard>
      </TouchableWithoutFeedback>
    </View>
  );
}
