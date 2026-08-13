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

function mapVideoForReels(
  v: MediaItem,
  idx: number,
  getContentKey: (item: MediaItem) => string,
  getTimeAgo: (createdAt: string) => string,
  contentStats: Record<string, any>,
  globalFavoriteCounts: Record<string, number>
) {
  const key = getContentKey(v);
  const stats = contentStats[key] || {};

  return {
    title: v.title || "Untitled",
    speaker: v.speaker || "Unknown",
    timeAgo: v.createdAt ? getTimeAgo(v.createdAt) : "Recently",
    views: stats.views || v.views || 0,
    sheared: stats.sheared || v.sheared || 0,
    saved: stats.saved || v.saved || 0,
    favorite: globalFavoriteCounts[key] || v.favorite || 0,
    fileUrl: v.fileUrl || "",
    playbackUrl: (v as any).playbackUrl || "",
    hlsUrl: (v as any).hlsUrl || "",
    imageUrl: v.imageUrl || v.thumbnailUrl || v.fileUrl || "",
    thumbnailUrl: v.thumbnailUrl || v.imageUrl || "",
    speakerAvatar: v.speakerAvatar || null,
    _id: v._id || `temp-${idx}`,
    id: v.id ?? v._id ?? `temp-${idx}`,
    contentType: v.contentType || "video",
    description: v.description || "",
    createdAt: v.createdAt || new Date().toISOString(),
    uploadedBy: v.uploadedBy,
    authorInfo: v.authorInfo,
    author: v.author,
    duration: (v as any).duration,
    lite: (v as any).lite,
  };
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
    // Pause feed players without blocking navigation
    try {
      globalVideoStore.pauseAllVideos();
    } catch (e) {
      console.warn("Failed to pause videos before navigation", e);
    }

    // Build list sync — navigate immediately (no await enrich)
    const videoListForNavigation = allVideos.map((v, idx) =>
      mapVideoForReels(
        v,
        idx,
        getContentKey,
        getTimeAgo,
        contentStats,
        globalFavoriteCounts
      )
    );

    reelsStore.setVideoList(videoListForNavigation);
    reelsStore.setCurrentIndex(index);

    const currentItem =
      videoListForNavigation[index] || videoListForNavigation[0];
    if (!currentItem) return;

    const fallbackName = getDisplayName(video.speaker, video.uploadedBy);
    const speakerName = getUserDisplayNameFromContent(
      currentItem,
      /^(Unknown|Anonymous User)$/i.test(fallbackName || "")
        ? "Creator"
        : fallbackName || "Creator"
    );

    const videoKey = getContentKey(video);
    const vStats = contentStats[videoKey] || {};

    const navigationParams = {
      title: video.title || "Untitled",
      speaker: speakerName,
      timeAgo: video.createdAt ? getTimeAgo(video.createdAt) : "Recently",
      views: String(vStats.views || video.views || 0),
      sheared: String(vStats.sheared || video.sheared || 0),
      saved: String(vStats.saved || video.saved || 0),
      favorite: String(globalFavoriteCounts[videoKey] || video.favorite || 0),
      imageUrl: video.imageUrl || video.thumbnailUrl || video.fileUrl || "",
      speakerAvatar:
        typeof video.speakerAvatar === "string" ? video.speakerAvatar : "",
      category: category || video.contentType || "ALL",
      currentIndex: String(index),
      source: source || "useVideoNavigation",
    };

    // Push first — enrichment is best-effort in the background
    try {
      router.push({
        pathname: "/reels/Reelsviewscroll",
        params: navigationParams,
      });
    } catch (e) {
      console.error("Navigation failed:", e);
      return;
    }

    void UserProfileCache.enrichContentArrayBatch(videoListForNavigation)
      .then((enrichedList) => {
        if (enrichedList && enrichedList.length > 0) {
          reelsStore.setVideoList(enrichedList);
        }
      })
      .catch((err) => {
        console.warn("Failed to enrich content array in navigation:", err);
      });
  };

  return {
    navigateToReels,
  };
};
