import { MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  TouchableOpacity,
  View,
} from "react-native";
import Skeleton from "../../src/shared/components/Skeleton/Skeleton";
import { useVideoPlayback } from "../hooks/useVideoPlayback";
import VideoProgressBar from "./VideoProgressBar";

interface ReelVideoPlayerProps {
  videoData: any;
  videoKey: string;
  isActive: boolean;
  isMuted?: boolean;
  onTogglePlay?: () => void;
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
  triggerHapticFeedback?: () => void;
}

export default function ReelVideoPlayer({
  videoData,
  videoKey,
  isActive,
  isMuted = false,
  onTogglePlay,
  getResponsiveSize = (s, m, l) => m,
  getResponsiveSpacing = (s, m, l) => m,
  getResponsiveFontSize = (s, m, l) => m,
  getTouchTargetSize = () => 48,
  triggerHapticFeedback = () => {},
}: ReelVideoPlayerProps) {
  const screenWidth = Dimensions.get("window").width;
  const isIOS = Platform.OS === "ios";

  // Use the video playback hook - this manages all state
  const {
    videoRef,
    isPlaying,
    isBuffering,
    isLoaded,
    togglePlayPause,
    onPlaybackStatusUpdate,
    onLoad,
    onError,
  } = useVideoPlayback({
    videoKey,
    autoPlay: isActive,
  });

  // Handle play/pause toggle
  const handleTogglePlay = async () => {
    triggerHapticFeedback();
    if (onTogglePlay) {
      onTogglePlay();
    } else {
      await togglePlayPause();
    }
  };

  return (
    <View
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#000000",
      }}
    >
      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: videoData.fileUrl || "" }}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
        }}
        resizeMode={ResizeMode.COVER}
        isMuted={isMuted}
        volume={isMuted ? 0.0 : 1.0}
        isLooping={true}
        useNativeControls={false}
        shouldCorrectPitch={isIOS}
        progressUpdateIntervalMillis={isIOS ? 100 : 250}
        onPlaybackStatusUpdate={onPlaybackStatusUpdate}
        onLoad={onLoad}
        onError={onError}
      />

      {/* Loading Skeleton */}
      {!isLoaded && (
        <View
          className="absolute inset-0"
          style={{ justifyContent: "flex-end", padding: 12 }}
          pointerEvents="none"
        >
          <View style={{ marginBottom: 8 }}>
            <Skeleton dark height={18} width={"60%"} borderRadius={8} />
          </View>
          <View style={{ marginBottom: 6 }}>
            <Skeleton dark height={14} width={"40%"} borderRadius={8} />
          </View>
          <Skeleton
            dark
            height={6}
            width={"90%"}
            borderRadius={4}
            style={{ opacity: 0.85 }}
          />
        </View>
      )}

      {/* Buffering Indicator */}
      {isActive && isBuffering && isLoaded && (
        <View
          className="absolute inset-0 justify-center items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          pointerEvents="none"
        >
          <ActivityIndicator size="large" color="#FEA74E" />
        </View>
      )}

      {/* Play/Pause Overlay */}
      {isActive && !isPlaying && isLoaded && (
        <View
          className="absolute inset-0 justify-center items-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
        >
          <TouchableOpacity
            onPress={handleTogglePlay}
            activeOpacity={0.8}
            accessibilityLabel="Play video"
            accessibilityRole="button"
          >
            <View
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderRadius: getResponsiveSize(45, 55, 65),
                padding: getResponsiveSpacing(16, 20, 24),
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.3)",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <MaterialIcons
                name="play-arrow"
                size={getResponsiveSize(50, 60, 70)}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Modular Video Progress Bar */}
      {isActive && isLoaded && (
        <VideoProgressBar
          videoRef={videoRef}
          videoKey={videoKey}
          onSeekStart={() => {
            // Pause video while user is seeking for better UX
            videoRef.current?.pauseAsync();
          }}
          onSeekEnd={() => {
            // Resume playback after seeking
            setTimeout(() => {
              videoRef.current?.playAsync();
            }, 100);
          }}
          showSkipButtons={true}
          skipDuration={10}
          barColor="rgba(255, 255, 255, 0.3)"
          progressColor="#FEA74E"
          thumbColor="#FFFFFF"
          getResponsiveSize={getResponsiveSize}
          getResponsiveSpacing={getResponsiveSpacing}
          getResponsiveFontSize={getResponsiveFontSize}
          getTouchTargetSize={getTouchTargetSize}
          isIOS={isIOS}
          screenWidth={screenWidth}
          triggerHapticFeedback={triggerHapticFeedback}
        />
      )}
    </View>
  );
}
