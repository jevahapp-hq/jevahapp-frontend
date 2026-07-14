import { MutableRefObject, useState } from "react";
import { Share } from "react-native";
import { useCommentModal } from "../../../context/CommentModalContext";
import { useGlobalMediaStore } from "../../../store/useGlobalMediaStore";
import { useGlobalVideoStore } from "../../../store/useGlobalVideoStore";
import { useInteractionStore } from "../../../store/useInteractionStore";
import { useLibraryStore } from "../../../store/useLibraryStore";
import { persistStats, toggleFavorite } from "../../../utils/persistentStorage";

interface UseSermonInteractionsParams {
  videoRefs: MutableRefObject<Record<string, any>>;
}

export function useSermonInteractions({
  videoRefs,
}: UseSermonInteractionsParams) {
  const globalVideoStore = useGlobalVideoStore();
  const globalMediaStore = useGlobalMediaStore();
  const libraryStore = useLibraryStore();
  const { showCommentModal } = useCommentModal();
  const { comments } = useInteractionStore();

  const [modalVisible, setModalVisible] = useState<string | null>(null);
  const [contentStats, setContentStats] = useState<Record<string, any>>({});
  const [userFavorites, setUserFavorites] = useState<Record<string, boolean>>(
    {}
  );
  const [globalFavoriteCounts, setGlobalFavoriteCounts] = useState<
    Record<string, number>
  >({});
  const [viewCounted, setViewCounted] = useState<Record<string, boolean>>({});
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});
  const [videoVolume, setVideoVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(true);

  const handleVideoReload = (key: string) => {
    console.log(`🔄 Reloading video: ${key}`);
    setVideoErrors((prev) => ({ ...prev, [key]: false }));
    const videoRef = videoRefs.current[key];
    if (videoRef) {
      videoRef.setPositionAsync(0);
    }
  };

  const handleVideoTap = async (key: string, video: any, _index: number) => {
    console.log(`🎮 Sermon video tap - key: ${key}, video: ${video?.title}`);
    const isCurrentlyPlaying = globalVideoStore.playingVideos[key] ?? false;
    console.log(`🎮 Currently playing: ${isCurrentlyPlaying}`);
    if (isCurrentlyPlaying) {
      console.log(`⏸️ Pausing sermon video: ${key}`);
      globalVideoStore.pauseVideo(key);
    } else {
      console.log(`▶️ Playing sermon video: ${key}`);
      // ✅ Use unified media store for consistent playback
      globalMediaStore.playMediaGlobally(key, "video");

      // ✅ Also directly call playAsync as a backup
      const videoRef = videoRefs.current[key];
      if (videoRef) {
        try {
          console.log(`🎬 Direct play attempt for sermon video: ${key}`);
          const status = await videoRef.getStatusAsync();
          if (status.isLoaded) {
            await videoRef.playAsync();
            console.log(`✅ Direct play successful for sermon video: ${key}`);
          } else {
            console.log(
              `⏳ Sermon video ${key} not loaded yet, will play when loaded`
            );
          }
        } catch (error) {
          console.error(
            `❌ Direct play failed for sermon video ${key}:`,
            error
          );
        }
      } else {
        console.warn(
          `⚠️ No video ref found for ${key}, relying on registered player`
        );
      }
    }
  };

  const handleComment = (key: string, audio: any) => {
    const contentId = audio._id || key;
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
  };

  const handleShare = async (key: string, item: any) => {
    try {
      const result = await Share.share({
        title: item.title,
        message: `Check this out: ${item.title}\n${item.fileUrl}`,
        url: item.fileUrl,
      });

      if (result.action === Share.sharedAction) {
        setContentStats((prev) => {
          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              sheared: (prev[key]?.sheared || item.sheared || 0) + 1,
            },
          };
          persistStats(updated);
          return updated;
        });
      }
      setModalVisible(null);
    } catch (err) {
      console.warn("❌ Share error:", err);
      setModalVisible(null);
    }
  };

  const handleSave = async (key: string, item: any) => {
    const isSaved = contentStats[key]?.saved === 1;

    if (!isSaved) {
      const libraryItem = {
        id: key,
        contentType: item.contentType || "sermon",
        fileUrl: item.fileUrl,
        title: item.title,
        speaker: item.speaker,
        uploadedBy: item.uploadedBy,
        description: item.description,
        createdAt: item.createdAt || new Date().toISOString(),
        speakerAvatar: item.speakerAvatar,
        views: contentStats[key]?.views || item.views || 0,
        sheared: contentStats[key]?.sheared || item.sheared || 0,
        favorite: contentStats[key]?.favorite || item.favorite || 0,
        comment: contentStats[key]?.comment || item.comment || 0,
        saved: 1,
        imageUrl: item.imageUrl,
        thumbnailUrl:
          item.contentType === "sermon"
            ? item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg"
            : item.imageUrl || item.fileUrl,
        originalKey: key,
      };

      await libraryStore.addToLibrary(libraryItem);
    } else {
      await libraryStore.removeFromLibrary(key);
    }

    setContentStats((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          saved: isSaved ? 0 : 1,
        },
      };
      persistStats(updated);
      return updated;
    });

    setModalVisible(null);
  };

  const handleFavorite = async (key: string, item: any) => {
    try {
      const { isUserFavorite, globalCount } = await toggleFavorite(key);
      setUserFavorites((prev) => ({ ...prev, [key]: isUserFavorite }));
      setGlobalFavoriteCounts((prev) => ({ ...prev, [key]: globalCount }));
    } catch (error) {
      console.error(`❌ Failed to toggle favorite for ${item.title}:`, error);
    }
  };

  const incrementView = (key: string, item: any) => {
    setContentStats((prev) => {
      const updated = {
        ...prev,
        [key]: {
          ...prev[key],
          views: (prev[key]?.views || 0) + 1,
          sheared: prev[key]?.sheared || item.sheared || 0,
          favorite: prev[key]?.favorite || item.favorite || 0,
          saved: prev[key]?.saved || item.saved || 0,
          comment: prev[key]?.comment || item.comment || 0,
        },
      };
      persistStats(updated);
      return updated;
    });
  };

  return {
    comments,
    showCommentModal,
    modalVisible,
    setModalVisible,
    contentStats,
    setContentStats,
    userFavorites,
    globalFavoriteCounts,
    viewCounted,
    setViewCounted,
    videoErrors,
    setVideoErrors,
    videoVolume,
    setVideoVolume,
    isMuted,
    setIsMuted,
    handleVideoReload,
    handleVideoTap,
    handleComment,
    handleShare,
    handleSave,
    handleFavorite,
    incrementView,
  };
}
