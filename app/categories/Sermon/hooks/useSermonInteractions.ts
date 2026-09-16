import { MutableRefObject, useState } from "react";
import { Share } from "react-native";
import { useCommentModal } from "../../../context/CommentModalContext";
import { useInteractionStore } from "@/store/useInteractionStore";
import { useLibraryStore } from "@/store/useLibraryStore";
import contentInteractionAPI from "../../../utils/contentInteractionAPI";
import { viewContentTypeForItem } from "../../../utils/contentInteraction/viewQualification";
import { persistStats } from "../../../utils/persistentStorage";
import { resolveLikeSeed } from "../../../../src/shared/hooks/useContentLikeState";
import { resolveSaveSeed } from "../../../../src/shared/hooks/useContentSaveState";

interface UseSermonInteractionsParams {
  videoRefs: MutableRefObject<Record<string, any>>;
}

const EMPTY_COMMENTS: Record<string, any[]> = {};

export function useSermonInteractions({
  videoRefs,
}: UseSermonInteractionsParams) {
  const libraryStore = useLibraryStore();
  const { showCommentModal } = useCommentModal();

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

  const handleVideoTap = async (_key: string, _video: any, _index: number) => {
    // SermonVideoCard opens Reels; do not spawn a private player here.
  };

  const handleComment = (key: string, audio: any) => {
    const contentId = audio._id || key;
    showCommentModal([], contentId);
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
    try {
      const contentId = String(item?._id || item?.id || key);
      const seed = resolveSaveSeed(contentId, item);
      const result = await useInteractionStore.getState().toggleSave(
        contentId,
        item.contentType || "media",
        {
          initialSaved: seed.initialSaved,
          initialSaves: seed.initialSaves,
        }
      );
      if (result?.authRequired) {
        setModalVisible(null);
        return;
      }

      if (result.saved) {
        await libraryStore.addToLibrary({
          id: contentId,
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
          favorite: result.totalLikes || item.favorite || 0,
          comment: contentStats[key]?.comment || item.comment || 0,
          saved: 1,
          imageUrl: item.imageUrl,
          thumbnailUrl:
            item.contentType === "sermon"
              ? item.fileUrl.replace("/upload/", "/upload/so_1/") + ".jpg"
              : item.imageUrl || item.fileUrl,
          originalKey: key,
        });
      } else {
        await libraryStore.removeFromLibrary(contentId);
        await libraryStore.removeFromLibrary(key);
      }

      setContentStats((prev) => {
        const updated = {
          ...prev,
          [key]: {
            ...prev[key],
            saved: result.saved ? 1 : 0,
          },
        };
        persistStats(updated);
        return updated;
      });
    } catch (error) {
      console.error("❌ Failed to toggle save:", error);
    }
    setModalVisible(null);
  };

  const handleFavorite = async (key: string, item: any) => {
    try {
      const contentId = String(item?._id || item?.id || key);
      const seed = resolveLikeSeed(contentId, item);
      const result = await useInteractionStore
        .getState()
        .toggleLike(contentId, item.contentType || "media", seed);
      if (result?.authRequired) return;
      setUserFavorites((prev) => ({ ...prev, [key]: result.liked }));
      setGlobalFavoriteCounts((prev) => ({
        ...prev,
        [key]: result.totalLikes,
      }));
    } catch (error) {
      console.error(`❌ Failed to toggle favorite for ${item.title}:`, error);
    }
  };

  const incrementView = async (
    countKey: string,
    item: any,
    payload?: {
      durationMs?: number;
      progressPct?: number;
      isComplete?: boolean;
    }
  ) => {
    if (viewCounted[countKey]) return;

    const contentId = String(item?._id || "").trim();
    if (contentId) {
      try {
        const result = await contentInteractionAPI.recordView(
          contentId,
          viewContentTypeForItem(item?.contentType),
          {
            durationMs: payload?.durationMs ?? 3000,
            progressPct: payload?.progressPct ?? 100,
            isComplete: payload?.isComplete ?? true,
            source: "feed",
          }
        );
        if (result?.counted === false) return;
        setViewCounted((prev) => ({ ...prev, [countKey]: true }));
        setContentStats((prev) => {
          const statsKey = `${item.contentType}-${item._id || item.fileUrl}`;
          const views =
            result?.totalViews != null
              ? Number(result.totalViews)
              : (prev[statsKey]?.views || 0) + 1;
          const updated = {
            ...prev,
            [statsKey]: {
              ...prev[statsKey],
              views,
              sheared: prev[statsKey]?.sheared || item.sheared || 0,
              favorite: prev[statsKey]?.favorite || item.favorite || 0,
              saved: prev[statsKey]?.saved || item.saved || 0,
              comment: prev[statsKey]?.comment || item.comment || 0,
            },
          };
          persistStats(updated);
          return updated;
        });
        return;
      } catch {
        // fall through to local bump
      }
    }

    setViewCounted((prev) => ({ ...prev, [countKey]: true }));
    setContentStats((prev) => {
      const statsKey = `${item.contentType}-${item._id || item.fileUrl}`;
      const updated = {
        ...prev,
        [statsKey]: {
          ...prev[statsKey],
          views: (prev[statsKey]?.views || 0) + 1,
          sheared: prev[statsKey]?.sheared || item.sheared || 0,
          favorite: prev[statsKey]?.favorite || item.favorite || 0,
          saved: prev[statsKey]?.saved || item.saved || 0,
          comment: prev[statsKey]?.comment || item.comment || 0,
        },
      };
      persistStats(updated);
      return updated;
    });
  };

  return {
    comments: EMPTY_COMMENTS,
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
