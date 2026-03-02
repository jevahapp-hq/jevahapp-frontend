/**
 * VideoComponent Handlers Hook
 * Share, save, favorite, comment, play, reload, tap handlers
 */

import { Share } from "react-native";
import { MediaItem } from "../../../../src/shared/types";
import contentInteractionAPI from "../../../utils/contentInteractionAPI";
import { convertToDownloadableItem } from "../../../utils/downloadUtils";
import {
  persistStats,
  persistViewed,
  toggleFavorite,
} from "../../../utils/persistentStorage";
import { RecommendedItem, VideoCardData } from "../types";
import { getVideoKey } from "../utils";

interface UseVideoComponentHandlersProps {
  videoStats: Record<string, Partial<VideoCardData>>;
  setVideoStats: React.Dispatch<React.SetStateAction<Record<string, Partial<VideoCardData>>>>;
  previouslyViewedState: RecommendedItem[];
  setPreviouslyViewedState: React.Dispatch<React.SetStateAction<RecommendedItem[]>>;
  setModalVisible: (v: string | null) => void;
  setPvModalIndex: (v: number | null) => void;
  setTrendingModalIndex: (v: number | null) => void;
  setRecommendedModalIndex: (v: number | null) => void;
  setShowSuccessCard: (v: boolean) => void;
  setSuccessMessage: (v: string) => void;
  userFavorites: Record<string, boolean>;
  setUserFavorites: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  globalFavoriteCounts: Record<string, number>;
  setGlobalFavoriteCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  libraryStore: any;
  globalVideoStore: any;
  globalMediaStore: any;
  showCommentModal: (comments: any[], contentId: string) => void;
  comments: Record<string, any[]>;
  handleDownload: (item: any) => Promise<{ success: boolean }>;
  checkIfDownloaded: (url: string) => boolean;
  loadDownloadedItems: () => Promise<void>;
  miniCardPlaying: Record<string, boolean>;
  miniCardHasCompleted: Record<string, boolean>;
  setMiniCardPlaying: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowOverlayMini: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  miniCardRefs: React.MutableRefObject<Record<string, any>>;
  hasPlayed: Record<string, boolean>;
  setHasPlayed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function useVideoComponentHandlers(props: UseVideoComponentHandlersProps) {
  const {
    videoStats,
    setVideoStats,
    previouslyViewedState,
    setPreviouslyViewedState,
    setModalVisible,
    setPvModalIndex,
    setTrendingModalIndex,
    setRecommendedModalIndex,
    setShowSuccessCard,
    setSuccessMessage,
    setUserFavorites,
    setGlobalFavoriteCounts,
    libraryStore,
    globalVideoStore,
    globalMediaStore,
    showCommentModal,
    comments,
    handleDownload,
    checkIfDownloaded,
    loadDownloadedItems,
    miniCardPlaying,
    miniCardHasCompleted,
    setMiniCardPlaying,
    setShowOverlayMini,
    miniCardRefs,
    hasPlayed,
    setHasPlayed,
  } = props;

  const toggleMuteVideo = (key: string) => {
    globalVideoStore.toggleVideoMute(key);
  };

  const closeAllMenus = () => {
    setModalVisible(null);
    setPvModalIndex(null);
    setTrendingModalIndex(null);
    setRecommendedModalIndex(null);
  };

  const incrementView = (key: string, video: VideoCardData) => {
    const alreadyExists = previouslyViewedState.some((item) => item.fileUrl === video.fileUrl);
    if (!alreadyExists) {
      const thumbnailUrl = video.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg";
      const newItem: RecommendedItem = {
        fileUrl: video.fileUrl,
        imageUrl: { uri: thumbnailUrl },
        title: video.title,
        subTitle: video.speaker || "Unknown",
        views: videoStats[key]?.views || video.views || 0,
      };
      setPreviouslyViewedState((prev) => {
        const updatedViewed = [newItem, ...prev];
        persistViewed(updatedViewed);
        return updatedViewed;
      });
    }
    setVideoStats((prev) => {
      const currentViews = prev[key]?.views || 0;
      const newViews = currentViews + 1;
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          views: newViews,
          sheared: prev[key]?.sheared || video.sheared || 0,
          favorite: prev[key]?.favorite || video.favorite || 0,
          saved: prev[key]?.saved || video.saved || 0,
          comment: prev[key]?.comment || video.comment || 0,
        },
      };
      persistStats(updated);
      return updated;
    });
  };

  const handleShare = async (key: string, video: VideoCardData) => {
    try {
      const result = await Share.share({
        title: video.title,
        message: `Check out this video: ${video.title}\n${video.fileUrl}`,
        url: video.fileUrl,
      });
      if (result.action === Share.sharedAction) {
        setVideoStats((prev) => {
          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              sheared: (prev[key]?.sheared || video.sheared || 0) + 1,
              views: prev[key]?.views || video.views || 0,
              favorite: prev[key]?.favorite || video.favorite || 0,
              saved: prev[key]?.saved || video.saved || 0,
              comment: prev[key]?.comment || video.comment || 0,
            },
          };
          persistStats(updated);
          return updated;
        });
      }
      setModalVisible(null);
    } catch (error) {
      console.warn("Share error:", error);
      setModalVisible(null);
    }
  };

  const handleSave = async (key: string, video: VideoCardData) => {
    try {
      const isCurrentlyUserSaved = libraryStore.isItemSaved(key);
      if (!isCurrentlyUserSaved) {
        const libraryItem = {
          id: key,
          contentType: "videos",
          fileUrl: video.fileUrl,
          title: video.title,
          speaker: video.speaker,
          uploadedBy: video.uploadedBy,
          createdAt: video.createdAt || new Date().toISOString(),
          speakerAvatar: video.speakerAvatar,
          views: videoStats[key]?.views || (video as any).viewCount || 0,
          sheared: videoStats[key]?.sheared || video.sheared || 0,
          favorite: videoStats[key]?.favorite || video.favorite || 0,
          comment: videoStats[key]?.comment || video.comment || 0,
          saved: 1,
          thumbnailUrl: video.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg",
          originalKey: key,
        };
        await libraryStore.addToLibrary(libraryItem);
        setSuccessMessage("Saved to library!");
        setShowSuccessCard(true);
        setVideoStats((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            totalSaves: ((prev[key] as any)?.totalSaves || video.saved || 0) + 1,
            userSaved: true,
            saved: 1,
            views: prev[key]?.views || (video as any).viewCount || 0,
            sheared: prev[key]?.sheared || video.sheared || 0,
            favorite: prev[key]?.favorite || video.favorite || 0,
            comment: prev[key]?.comment || video.comment || 0,
          },
        }));
      } else {
        await libraryStore.removeFromLibrary(key);
        setSuccessMessage("Removed from library!");
        setShowSuccessCard(true);
        setVideoStats((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            totalSaves: Math.max(((prev[key] as any)?.totalSaves || video.saved || 0) - 1, 0),
            userSaved: false,
            saved: 0,
            views: prev[key]?.views || (video as any).viewCount || 0,
            sheared: prev[key]?.sheared || video.sheared || 0,
            favorite: prev[key]?.favorite || video.favorite || 0,
            comment: prev[key]?.comment || video.comment || 0,
          },
        }));
      }
      try {
        const result = await contentInteractionAPI.toggleSave(key, "videos");
        setVideoStats((prev) => ({
          ...prev,
          [key]: { ...prev[key], totalSaves: result.totalSaves },
        }));
      } catch (apiError) {
        console.warn("Backend sync failed:", apiError);
      }
    } catch (error) {
      console.error("Save operation failed:", error);
    }
    setModalVisible(null);
  };

  const handleFavorite = async (key: string, video: VideoCardData) => {
    try {
      const { isUserFavorite, globalCount } = await toggleFavorite(key);
      setUserFavorites((prev) => ({ ...prev, [key]: isUserFavorite }));
      setGlobalFavoriteCounts((prev) => ({ ...prev, [key]: globalCount }));
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    }
  };

  const handleComment = (key: string, video: VideoCardData) => {
    const contentId = key;
    const currentComments = comments[contentId] || [];
    const formattedComments = currentComments.map((comment: any) => ({
      id: comment.id,
      userName: comment.username || "Anonymous",
      avatar: comment.userAvatar || "",
      timestamp: comment.timestamp,
      comment: comment.comment,
      likes: comment.likes || 0,
      isLiked: comment.isLiked || false,
    }));
    showCommentModal(formattedComments, contentId);
    setVideoStats((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        comment: prev[key]?.comment === 1 ? 0 : 1,
        views: prev[key]?.views || video.views || 0,
        sheared: prev[key]?.sheared || video.sheared || 0,
        favorite: prev[key]?.favorite || video.favorite || 0,
        saved: prev[key]?.saved || video.saved || 0,
      },
    }));
  };

  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const posted = new Date(createdAt);
    const diff = now.getTime() - posted.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return "NOW";
    if (minutes < 60) return `${minutes}MIN AGO`;
    if (hours < 24) return `${hours}HRS AGO`;
    return `${days}DAYS AGO`;
  };

  const convertToMediaItem = (video: VideoCardData): MediaItem => ({
    _id: (video as any)._id || getVideoKey(video.fileUrl),
    contentType: (video as any).contentType || "videos",
    fileUrl: video.fileUrl,
    title: video.title,
    speaker: video.speaker,
    uploadedBy: video.uploadedBy,
    description: video.title,
    speakerAvatar: video.speakerAvatar,
    views: video.views,
    sheared: video.sheared,
    saved: video.saved,
    comment: video.comment,
    favorite: video.favorite,
    imageUrl: (video as any).imageUrl || (video as any).thumbnailUrl || video.fileUrl,
    thumbnailUrl: (video as any).thumbnailUrl,
    duration: (video as any).duration, // seconds – used by progress bar (durationMs = duration * 1000)
    moderationStatus: (video as any).moderationStatus,
    createdAt: video.createdAt || new Date().toISOString(),
  });

  const getContentKey = (video: VideoCardData | MediaItem): string => {
    if ("fileUrl" in video && typeof video === "object" && video !== null) {
      return getVideoKey((video as VideoCardData).fileUrl);
    }
    if (video && typeof video === "object" && "_id" in video) {
      return (video as MediaItem)._id || getVideoKey((video as MediaItem).fileUrl);
    }
    return "";
  };

  const togglePlay = (key: string, video?: VideoCardData) => {
    const isCurrentlyPlaying = globalVideoStore.playingVideos[key] || false;
    Object.keys(miniCardPlaying).forEach((k) => {
      setMiniCardPlaying((prev) => ({ ...prev, [k]: false }));
      setShowOverlayMini((prev) => ({ ...prev, [k]: true }));
    });
    const shouldStartPlaying = !isCurrentlyPlaying;
    if (shouldStartPlaying) {
      const completedBefore = globalVideoStore.hasCompleted[key] ?? false;
      if (video && completedBefore) {
        incrementView(key, video);
        globalVideoStore.setVideoCompleted(key, false);
      }
      setHasPlayed((prev) => ({ ...prev, [key]: true }));
      if (globalVideoStore.mutedVideos[key]) {
        globalVideoStore.toggleVideoMute(key);
      }
    }
    globalVideoStore.playVideoGlobally(key);
  };

  const handleVideoReload = (key: string, setVideoErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) => {
    setVideoErrors((prev) => ({ ...prev, [key]: false }));
    const videoRef = miniCardRefs.current[key];
    if (videoRef) videoRef.setPositionAsync(0);
  };

  const handleVideoTap = (key: string, video?: VideoCardData) => {
    const isCurrentlyPlaying = globalVideoStore.playingVideos[key] ?? false;
    const wasCompleted = globalVideoStore.hasCompleted[key] ?? false;

    Object.keys(miniCardPlaying).forEach((k) => {
      setMiniCardPlaying((prev) => ({ ...prev, [k]: false }));
      setShowOverlayMini((prev) => ({ ...prev, [k]: true }));
    });

    if (!isCurrentlyPlaying && video && wasCompleted) {
      incrementView(key, video);
      globalVideoStore.setVideoCompleted(key, false);
    }
    globalMediaStore.playMediaGlobally(key, "video");
  };

  const handleVideoTapWrapper = (key: string, _video: MediaItem) => {
    handleVideoTap(key);
  };

  const handleMiniCardPlay = (
    key: string,
    item: RecommendedItem,
    setViewsState: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    setPlayingState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    setHasPlayed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    setHasCompleted: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => {
    globalVideoStore.pauseAllVideos();
    Object.keys(miniCardPlaying).forEach((k) => {
      if (k !== key) {
        setMiniCardPlaying((prev) => ({ ...prev, [k]: false }));
        setShowOverlayMini((prev) => ({ ...prev, [k]: true }));
      }
    });
    const isPlaying = miniCardPlaying[key] ?? false;
    const wasCompleted = miniCardHasCompleted[key] ?? false;

    if (!isPlaying) {
      if (wasCompleted && miniCardRefs.current[key]) {
        miniCardRefs.current[key].setPositionAsync(0);
        setViewsState((prev: Record<string, number>) => ({
          ...prev,
          [key]: (prev[key] ?? item.views) + 1,
        }));
      }
      setHasPlayed((prev) => ({ ...prev, [key]: true }));
      setHasCompleted((prev: any) => ({ ...prev, [key]: false }));
      setPlayingState({ [key]: true });
      setMiniCardPlaying({ [key]: true });
      setShowOverlayMini((prev) => ({ ...prev, [key]: false }));
    } else {
      setPlayingState({ [key]: false });
      setMiniCardPlaying({ [key]: false });
      setShowOverlayMini((prev) => ({ ...prev, [key]: true }));
    }
  };

  const handleMiniCardDownload = async (
    item: RecommendedItem,
    closeAllMenus: () => void
  ) => {
    const downloadableItem = convertToDownloadableItem(item, "video");
    const result = await handleDownload(downloadableItem);
    if (result.success) {
      closeAllMenus();
      setSuccessMessage("Downloaded successfully!");
      setShowSuccessCard(true);
      await loadDownloadedItems();
    }
  };

  return {
    toggleMuteVideo,
    closeAllMenus,
    incrementView,
    handleShare,
    handleSave,
    handleFavorite,
    handleComment,
    togglePlay,
    handleVideoReload,
    handleVideoTap,
    handleVideoTapWrapper,
    handleMiniCardPlay,
    handleMiniCardDownload,
    getTimeAgo,
    convertToMediaItem,
    getContentKey,
  };
}
