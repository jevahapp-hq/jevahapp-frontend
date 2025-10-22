import { useRouter } from "expo-router";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useReelsStore } from "../store/useReelsStore";
import { MediaItem } from "../types/media";

interface VideoNavigationOptions {
  video: MediaItem;
  index: number;
  allVideos: MediaItem[];
  contentStats: Record<string, any>;
  globalFavoriteCounts: Record<string, number>;
  getContentKey: (item: MediaItem) => string;
  getTimeAgo: (createdAt: string) => string;
  getDisplayName: (speaker?: string, uploadedBy?: string) => string;
  source?: string; // Source component that navigated to reels
  category?: string; // Category context for proper back navigation
}

export const useVideoNavigation = () => {
  const router = useRouter();
  const globalVideoStore = useGlobalVideoStore();
  const reelsStore = useReelsStore();

  const navigateToReels = ({
    video,
    index,
    allVideos,
    contentStats,
    globalFavoriteCounts,
    getContentKey,
    getTimeAgo,
    getDisplayName,
    source,
    category,
  }: VideoNavigationOptions) => {
    console.log(`📱 Navigating to reels: ${video.title}`);
    console.log(`📱 Index: ${index}, Total videos: ${allVideos.length}`);
    console.log(`📱 Video ID: ${video._id}, File URL: ${video.fileUrl}`);

    // Pause all videos before navigation
    globalVideoStore.pauseAllVideos();

    // Prepare the full video list for TikTok-style navigation
    const videoListForNavigation = allVideos.map((v, idx) => ({
      title: v.title,
      speaker: getDisplayName(v.speaker, v.uploadedBy),
      timeAgo: getTimeAgo(v.createdAt),
      views: contentStats[getContentKey(v)]?.views || v.views || 0,
      sheared: contentStats[getContentKey(v)]?.sheared || v.sheared || 0,
      saved: contentStats[getContentKey(v)]?.saved || v.saved || 0,
      favorite: globalFavoriteCounts[getContentKey(v)] || v.favorite || 0,
      fileUrl: v.fileUrl || "",
      imageUrl: v.fileUrl,
      speakerAvatar:
        typeof v.speakerAvatar === "string"
          ? v.speakerAvatar
          : v.speakerAvatar || require("../../assets/images/Avatar-1.png"),
      _id: v._id,
      contentType: v.contentType,
      description: v.description,
      createdAt: v.createdAt,
      uploadedBy: v.uploadedBy,
    }));

    console.log(
      "🔍 Setting video list in store:",
      videoListForNavigation.length,
      "videos"
    );

    // Store the video list in global store
    reelsStore.setVideoList(videoListForNavigation);
    reelsStore.setCurrentIndex(index);

    // Navigate to reels with current video data
    const navigationParams = {
      title: video.title,
      speaker: getDisplayName(video.speaker, video.uploadedBy),
      timeAgo: getTimeAgo(video.createdAt),
      views: String(
        contentStats[getContentKey(video)]?.views || video.views || 0
      ),
      sheared: String(
        contentStats[getContentKey(video)]?.sheared || video.sheared || 0
      ),
      saved: String(
        contentStats[getContentKey(video)]?.saved || video.saved || 0
      ),
      favorite: String(
        globalFavoriteCounts[getContentKey(video)] || video.favorite || 0
      ),
      imageUrl: video.fileUrl || "",
      speakerAvatar:
        typeof video.speakerAvatar === "string"
          ? video.speakerAvatar
          : video.speakerAvatar ||
            require("../../assets/images/Avatar-1.png").toString(),
      category: category || video.contentType || "ALL",
      currentIndex: String(index),
      source: source || "useVideoNavigation",
    };

    console.log("🚀 About to navigate with params:", navigationParams);

    router.push({
      pathname: "/reels/Reelsviewscroll",
      params: navigationParams,
    });

    console.log("✅ Navigation call completed");
  };

  return {
    navigateToReels,
  };
};
