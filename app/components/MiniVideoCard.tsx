import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<Video>(null);
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

  // Sync with global video state
  useEffect(() => {
    setIsPlaying(isGloballyPlaying);
  }, [isGloballyPlaying]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.unloadAsync();
      }
    };
  }, []);

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
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
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
        className="w-full h-[232px] rounded-2xl overflow-hidden relative"
        activeOpacity={0.9}
      >
        <Video
          ref={videoRef}
          source={{ uri: safeVideoUri }}
          style={{ width: "100%", height: "100%", position: "absolute" }}
          resizeMode={ResizeMode.COVER}
          useNativeControls={false}
          isMuted={true} // Mini cards are always muted
          volume={0.0}
          shouldPlay={isPlaying}
          onPlaybackStatusUpdate={handleVideoStatusUpdate}
          onLoad={() => {
            console.log(`✅ Mini video loaded: ${video.title}`);
          }}
          onError={(e) => {
            console.warn("Mini video failed to load:", video.title, e);
            setIsPlaying(false);
          }}
        />

        {/* Content Type Icon - Top Left */}
        <View className="absolute top-2 right-2 bg-black/50 p-1 rounded-full">
          <Ionicons
            name={video.contentType === "sermon" ? "person" : "videocam"}
            size={12}
            color="#FFFFFF"
          />
        </View>

        {/* Play Button Overlay */}
        <View className="absolute inset-0 justify-center items-center">
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handlePlayPress();
            }}
            className="bg-white/70 p-2 rounded-full"
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#FEA74E"
            />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        {isPlaying && (
          <View className="absolute bottom-2 left-2 right-2">
            <View className="h-1 bg-white/30 rounded-full">
              <View
                className="h-full bg-[#FEA74E] rounded-full"
                style={{ width: `${progress}%` }}
              />
            </View>
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
