import { useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useMediaStore } from "../store/useUploadStore";
import MiniVideoCard from "./MiniVideoCard";

interface HorizontalVideoSectionProps {
  title: string;
  videos: any[];
  onVideoTap?: (video: any, index: number) => void;
  onPlayPress?: (video: any, index: number) => void;
}

export default function HorizontalVideoSection({
  title,
  videos,
  onVideoTap,
  onPlayPress,
}: HorizontalVideoSectionProps) {
  const router = useRouter();
  const globalVideoStore = useGlobalVideoStore();
  const mediaStore = useMediaStore();

  console.log(`📱 HorizontalVideoSection "${title}":`, {
    videoCount: videos.length,
    videos: videos.map((v) => ({
      title: v.title,
      contentType: v.contentType,
      createdAt: v.createdAt || v.uploadedAt,
      date: new Date(v.createdAt || v.uploadedAt || 0).toISOString(),
    })),
  });

  const handleVideoTap = (video: any, index: number) => {
    if (onVideoTap) {
      onVideoTap(video, index);
    } else {
      // Default behavior - navigate to reels view
      const videoListForNavigation = videos.map((v, idx) => ({
        title: v.title,
        speaker: v.subTitle || "Unknown",
        timeAgo: "Recent",
        views: v.views || 0,
        sheared: 0,
        saved: 0,
        favorite: 0,
        fileUrl: v.fileUrl,
        imageUrl: v.fileUrl,
        speakerAvatar: require("../../assets/images/Avatar-1.png").toString(),
      }));

      router.push({
        pathname: "/reels/Reelsviewscroll",
        params: {
          title: video.title,
          speaker: video.subTitle || "Unknown",
          timeAgo: "Recent",
          views: String(video.views || 0),
          sheared: String(0),
          saved: String(0),
          favorite: String(0),
          imageUrl: video.fileUrl,
          speakerAvatar: require("../../assets/images/Avatar-1.png").toString(),
          category: "videos",
          videoList: JSON.stringify(videoListForNavigation),
          currentIndex: String(index),
        },
      });
    }
  };

  const handlePlayPress = (video: any, index: number) => {
    if (onPlayPress) {
      onPlayPress(video, index);
    } else {
      // Default behavior - play video globally
      const videoKey = `mini-video-${video._id || video.fileUrl || index}`;
      globalVideoStore.playVideoGlobally(videoKey);
    }
  };

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <View className="mt-5">
      <Text className="text-[16px] font-rubik-semibold text-[#344054] mt-4 mb-2 ml-2">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {videos.map((video, index) => (
          <MiniVideoCard
            key={`${title}-${video._id || video.fileUrl || index}`}
            video={video}
            index={index}
            onVideoTap={handleVideoTap}
            onPlayPress={handlePlayPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
