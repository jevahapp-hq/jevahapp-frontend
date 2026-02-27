import { useRouter } from "expo-router";
import { useGlobalVideoStore } from "../store/useGlobalVideoStore";
import { useReelsStore } from "../store/useReelsStore";
import { MediaItem } from "../types/media";
import { UserProfileCache } from "../utils/cache/UserProfileCache";
import { getUserDisplayNameFromContent } from "../utils/userValidation";

interface VideoNavigationOptions {
  video: MediaItem;
  index: number;
  allVideos: MediaItem[];
  contentStats: Record<string, any>;
  globalFavoriteCounts: Record<string, number>;
  getContentKey: (item: MediaItem) => string;
  getTimeAgo: (createdAt: string) => string;
  getDisplayName: (speaker?: string, uploadedBy?: string | object) => string;
  source?: string; // Source component that navigated to reels
  category?: string; // Category context for proper back navigation
}

export const useVideoNavigation = () => {
  const router = useRouter();
  const globalVideoStore = useGlobalVideoStore();
  const reelsStore = useReelsStore();

  const navigateToReels = async ({
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
    // console.log(`📱 Navigating to reels: ${video.title}`);
    // console.log(`📱 Index: ${index}, Total videos: ${allVideos.length}`);
    // console.log(`📱 Video ID: ${video._id}, File URL: ${video.fileUrl}`);

    // Pause all videos before navigation
    globalVideoStore.pauseAllVideos();

    // Prepare the full video list for TikTok-style navigation
    // Preserve authorInfo and uploadedBy so Reels can derive display name (authorInfo is primary source)
    const videoListForNavigation = allVideos.map((v, idx) => ({
      title: v.title,
      speaker: v.speaker,
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
      id: v.id ?? v._id,
      contentType: v.contentType,
      description: v.description,
      createdAt: v.createdAt,
      uploadedBy: v.uploadedBy,
      authorInfo: v.authorInfo,
      author: v.author,
    }));

    // Fetch user profiles so Reels shows names/avatars (data exists in DB)
    const enrichedList = await UserProfileCache.enrichContentArrayBatch(videoListForNavigation);
    const listToUse = enrichedList.length > 0 ? enrichedList : videoListForNavigation;

    reelsStore.setVideoList(listToUse);
    reelsStore.setCurrentIndex(index);

    const currentItem = listToUse[index] || listToUse[0];
    // Use same extraction logic as Reels (authorInfo primary, then uploadedBy, cache fallback)
    const fallbackName = getDisplayName(video.speaker, video.uploadedBy);
    const speakerName = getUserDisplayNameFromContent(
      currentItem,
      /^(Unknown|Anonymous User)$/i.test(fallbackName || "") ? "Creator" : fallbackName || "Creator"
    );
    const navigationParams = {
      title: video.title,
      speaker: speakerName,
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

    // console.log("🚀 About to navigate with params:", navigationParams);

    router.push({
      pathname: "/reels/Reelsviewscroll",
      params: navigationParams,
    });

    // console.log("✅ Navigation call completed");
  };

  return {
    navigateToReels,
  };
};
