import { ResizeMode, Video } from "expo-av";
import { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import Skeleton from "../../src/shared/components/Skeleton/Skeleton";
import { useOptimizedVideo } from "../hooks/useOptimizedVideo";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import MediaCard from "./media/MediaCard";
import PlayOverlay from "./media/PlayOverlay";
import ProgressBar from "./media/ProgressBar";
import TypeBadge from "./media/TypeBadge";

interface MiniVideoCardProps {
  video: {
    _id?: string;
    fileUrl: string;
    title: string;
    contentType?: string;
    views?: number;
    createdAt?: string;
  };
  index: number;
  onVideoTap?: (video: any, index: number) => void;
  onPlayPress?: (video: any, index: number) => void;
}

export default function MiniVideoCard({
  video,
  index,
  onVideoTap,
  onPlayPress,
}: MiniVideoCardProps) {
  const [progress, setProgress] = useState(0);
  const globalVideoStore = useGlobalVideoStore();

  console.log(`🎬 MiniVideoCard:`, {
    title: video.title,
    contentType: video.contentType,
    createdAt: video.createdAt || video.uploadedAt,
    date: new Date(video.createdAt || video.uploadedAt || 0).toISOString(),
    index,
  });

  const videoKey = `mini-video-${video._id || video.fileUrl || index}`;
  const isGloballyPlaying = globalVideoStore.playingVideos[videoKey] ?? false;

  // Use optimized video hook for better performance
  const { videoRef, isLoading, isBuffering, hasError, videoProps, retry } =
    useOptimizedVideo({
      videoUrl: video.fileUrl,
      shouldPlay: isGloballyPlaying,
      isMuted: true, // Mini cards are always muted
      onLoad: () => {
        console.log(`✅ Mini video loaded: ${video.title}`);
      },
      onError: (error) => {
        console.warn("Mini video failed to load:", video.title, error);
      },
      onBuffering: (buffering) => {
        if (buffering) {
          console.log(`⏳ Mini video buffering: ${video.title}`);
        }
      },
    });

  const handlePlayPress = () => {
    if (onPlayPress) {
      onPlayPress(video, index);
    } else {
      // Default behavior - toggle play/pause
      globalVideoStore.playVideoGlobally(videoKey);
    }
  };

  const handleVideoTap = () => {
    if (onVideoTap) {
      onVideoTap(video, index);
    }
  };

  const handleVideoStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setProgress(
        status.durationMillis
          ? (status.positionMillis / status.durationMillis) * 100
          : 0
      );

      if (status.didJustFinish) {
        setProgress(0);
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
    <View className="mr-4 w-[154px] flex-col items-center">
      <TouchableOpacity
        onPress={handleVideoTap}
        className="w-full h-[232px]"
        activeOpacity={0.9}
      >
        <MediaCard className="w-full h-full rounded-2xl">
          {/* Optimized Video with buffering support */}
          <Video
            ref={videoRef}
            source={{ uri: safeVideoUri }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            resizeMode={ResizeMode.COVER}
            useNativeControls={false}
            {...videoProps}
            onPlaybackStatusUpdate={(status) => {
              handleVideoStatusUpdate(status);
              videoProps?.onPlaybackStatusUpdate?.(status);
            }}
          />

          {/* Loading/Buffering Overlay */}
          {(isLoading || isBuffering) && (
            <View
              className="absolute inset-0 bg-black/30 justify-center items-center"
              pointerEvents="none"
            >
              <ActivityIndicator color="#FEA74E" size="small" />
              {isBuffering && (
                <Text className="text-white text-xs mt-2 font-rubik">
                  Buffering...
                </Text>
              )}
            </View>
          )}

          {/* Error State */}
          {hasError && (
            <View
              className="absolute inset-0 bg-black/50 justify-center items-center"
              pointerEvents="box-none"
            >
              <Text className="text-white text-xs mb-2 font-rubik">
                Failed to load
              </Text>
              <TouchableOpacity
                onPress={retry}
                className="bg-[#FEA74E] px-3 py-1 rounded-full"
              >
                <Text className="text-white text-xs font-rubik-semibold">
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Skeleton while initially loading */}
          {!hasError && isLoading && (
            <View
              className="absolute inset-0"
              style={{ justifyContent: "flex-end", padding: 8 }}
              pointerEvents="none"
            >
              <Skeleton dark height={12} width={"80%"} borderRadius={6} />
            </View>
          )}

          <TypeBadge
            type={video.contentType === "sermon" ? "sermon" : "video"}
            position="top-right"
          />

          <PlayOverlay
            isPlaying={isGloballyPlaying && !isBuffering}
            onPress={handlePlayPress}
            size={20}
          />

          {isGloballyPlaying && !isBuffering && (
            <View className="absolute bottom-2 left-2 right-2">
              <ProgressBar progress={progress} />
            </View>
          )}

          {/* Video Title Overlay */}
          <View className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />
          <View className="absolute bottom-2 left-2 right-2">
            <Text
              className="text-white text-[12px] font-rubik-semibold"
              numberOfLines={2}
            >
              {video.title}
            </Text>
          </View>
        </MediaCard>
      </TouchableOpacity>

      {/* Video Stats */}
      <View className="mt-2 w-full px-1">
        <Text
          className="text-[10px] text-gray-500 font-rubik"
          numberOfLines={1}
        >
          {video.views || 0} views
        </Text>
      </View>
    </View>
  );
}
