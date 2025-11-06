import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Text, TouchableWithoutFeedback, View } from "react-native";
import { useCommentModal } from "../../../../app/context/CommentModalContext";
import { useDeleteMedia } from "../../../../app/hooks/useDeleteMedia";
import { DeleteMediaConfirmation } from "../../../../app/components/DeleteMediaConfirmation";
import {
  useContentCount,
  useUserInteraction,
} from "../../../../app/store/useInteractionStore";
import contentInteractionAPI from "../../../../app/utils/contentInteractionAPI";
import CardFooterActions from "../../../shared/components/CardFooterActions";
import ContentActionModal from "../../../shared/components/ContentActionModal";
import ThreeDotsMenuButton from "../../../shared/components/ThreeDotsMenuButton/ThreeDotsMenuButton";
import { useContentActionModal } from "../../../shared/hooks/useContentActionModal";
import { useHydrateContentStats } from "../../../shared/hooks/useHydrateContentStats";
import { EbookCardProps } from "../../../shared/types";
import {
  getTimeAgo,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
} from "../../../shared/utils";

export const EbookCard: React.FC<EbookCardProps> = ({
  ebook,
  index,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  onDelete,
  checkIfDownloaded,
}) => {
  const { showCommentModal } = useCommentModal();
  const { isModalVisible, openModal, closeModal } = useContentActionModal();
  
  // Delete media functionality
  const { deleteMediaItem, checkOwnership } = useDeleteMedia();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // Check ownership when modal opens
  useEffect(() => {
    if (isModalVisible) {
      checkOwnership(ebook.uploadedBy || ebook.author?._id || ebook.authorInfo?._id).then(setIsOwner);
    }
  }, [isModalVisible, ebook.uploadedBy, ebook.author, ebook.authorInfo, checkOwnership]);

  // Handle delete button press
  const handleDeletePress = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (!ebook._id) return;
    
    const success = await deleteMediaItem(ebook._id);
    if (success) {
      setShowDeleteModal(false);
      closeModal();
      if (onDelete) {
        onDelete(ebook);
      }
    }
  }, [ebook, deleteMediaItem, closeModal, onDelete]);
  const AvatarWithInitialFallback = ({
    imageSource,
    name,
  }: {
    imageSource: any;
    name: string;
  }) => {
    const [errored, setErrored] = useState(false);
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    return !errored ? (
      <Image
        source={imageSource}
        style={{ width: 30, height: 30, borderRadius: 999 }}
        resizeMode="cover"
        onError={() => setErrored(true)}
      />
    ) : (
      <Text className="text-[14px] font-rubik-semibold text-[#344054]">
        {initial}
      </Text>
    );
  };
  const modalKey = `ebook-${ebook._id || index}`;
  const contentId = ebook._id || `ebook-${index}`;

  const isValidHttp = (u?: string) =>
    typeof u === "string" && /^https?:\/\//.test(u);
  const rawThumb =
    typeof (ebook as any).thumbnailUrl === "string"
      ? ((ebook as any).thumbnailUrl as string)
      : (ebook as any).thumbnailUrl?.uri;
  const initialThumb = isValidHttp(rawThumb) ? rawThumb : undefined;
  const [imageErrored, setImageErrored] = useState(false);
  const shouldShowImage = !!initialThumb && !imageErrored;

  const [liked, setLiked] = useState(false);
  const [likeBurstKey, setLikeBurstKey] = useState(0);
  const [likeCount, setLikeCount] = useState<number>(ebook.likes || 0);
  const viewCount = useContentCount(contentId, "views") || ebook.views || 0;
  const commentCount =
    useContentCount(contentId, "comments") || ebook.comments || 0;
  const saveCount =
    useContentCount(contentId, "saves") || (ebook as any)?.saves || 0;
  const savedFromStore = useUserInteraction(contentId, "saved");
  useHydrateContentStats(contentId, "media");

  // Hydrate stats on mount to keep saved highlight after tab switches
  useEffect(() => {
    try {
      const {
        useInteractionStore,
      } = require("../../../../app/store/useInteractionStore");
      const loadContentStats = useInteractionStore.getState()
        .loadContentStats as (id: string, type?: string) => Promise<void>;
      if (contentId) {
        loadContentStats(contentId, "media");
      }
    } catch {}
  }, [contentId]);

  const handleFavorite = () => {
    try {
      setLikeBurstKey((k) => k + 1);
      setLiked((prev) => !prev);
      setLikeCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
      onLike(ebook);
    } catch {}
  };

  const handleComment = () => onComment(ebook);
  const handleShare = () => onShare(ebook);

  // Track a qualified view shortly after open (5s) or first interaction
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  useEffect(() => {
    startTimeRef.current = Date.now();
    const t = setTimeout(async () => {
      if (!hasTrackedView) {
        try {
          await contentInteractionAPI.recordView(contentId, "ebook", {
            durationMs: 5000,
            progressPct: 0,
            isComplete: false,
          });
          setHasTrackedView(true);
        } catch {}
      }
    }, 5000);
    return () => clearTimeout(t);
  }, [contentId, hasTrackedView]);

  return (
    <View className="flex flex-col mb-10">
      <TouchableWithoutFeedback
        onPress={() => {
          try {
            const { router } = require("expo-router");
            const pdfUrl =
              (ebook as any)?.fileUrl || (ebook as any)?.pdfUrl || "";
            if (typeof pdfUrl === "string" && /^https?:\/\//.test(pdfUrl)) {
              router.push({
                pathname: "/reader/PdfViewer",
                params: {
                  url: pdfUrl,
                  title: ebook.title,
                  desc: (ebook as any)?.description || "",
                },
              });
            }
          } catch {}
        }}
      >
        <View className="w-full h-[400px] overflow-hidden relative">
          {shouldShowImage ? (
            <Image
              source={{ uri: initialThumb! } as any}
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
              }}
              resizeMode="cover"
              onLoadStart={() => {}}
              onLoad={() => {}}
              onError={() => setImageErrored(true)}
            />
          ) : (
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "#e5e7eb",
              }}
            />
          )}

          {/* Content Type Icon - Top Left */}
          <View className="absolute top-4 left-4">
            <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="book" size={16} color="#FFFFFF" />
            </View>
          </View>

          {/* Centered Ebook Icon Overlay (for visual parity with video) */}
          <View
            className="absolute inset-0 justify-center items-center"
            pointerEvents="none"
          >
            <View className="bg-white/70 p-4 rounded-full">
              <Ionicons name="book" size={40} color="#FEA74E" />
            </View>
          </View>

          {/* Title Overlay - positioned above lower controls area for consistency */}
          <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={2}
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.8)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {ebook.title}
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>

      <View className="flex-row items-center justify-between mt-1 px-3">
        <View className="flex flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
            {/* Avatar with initial fallback */}
            <AvatarWithInitialFallback
              imageSource={getUserAvatarFromContent(ebook) as any}
              name={getUserDisplayNameFromContent(ebook)}
            />
          </View>
          <View className="ml-3">
            <View className="flex-row items-center">
              <Text className="ml-1 text-[13px] font-rubik-semibold text-[#344054] mt-1">
                {getUserDisplayNameFromContent(ebook)}
              </Text>
              <View className="flex flex-row mt-2 ml-2">
                <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                <Text className="text-[10px] text-gray-500 ml-1 font-rubik">
                  {getTimeAgo(ebook.createdAt)}
                </Text>
              </View>
            </View>
            <CardFooterActions
              viewCount={viewCount}
              liked={liked}
              likeCount={likeCount}
              likeBurstKey={likeBurstKey}
              likeColor="#FF1744"
              onLike={handleFavorite}
              commentCount={commentCount || (ebook as any).comment || 0}
              onComment={() => {
                try {
                  console.log("🗨️ Comment icon pressed (ebook)", {
                    contentId,
                    title: ebook.title,
                  });
                  // Create mock comments like in Reels component
                  const mockComments = [
                    {
                      id: "1",
                      userName: "John Doe",
                      avatar: "",
                      timestamp: new Date(
                        Date.now() - 1000 * 60 * 30
                      ).toISOString(),
                      comment: "Great ebook! Really enjoyed this content.",
                      likes: 5,
                      isLiked: false,
                    },
                    {
                      id: "2",
                      userName: "Jane Smith",
                      avatar: "",
                      timestamp: new Date(
                        Date.now() - 1000 * 60 * 15
                      ).toISOString(),
                      comment: "Amazing! Thanks for sharing.",
                      likes: 3,
                      isLiked: true,
                    },
                    {
                      id: "3",
                      userName: "Mike Johnson",
                      avatar: "",
                      timestamp: new Date(
                        Date.now() - 1000 * 60 * 5
                      ).toISOString(),
                      comment: "This is exactly what I needed!",
                      likes: 1,
                      isLiked: false,
                    },
                  ];
                  showCommentModal(mockComments, String(contentId));
                } catch {}
                handleComment();
              }}
              saved={!!savedFromStore}
              saveCount={saveCount}
              onSave={() => {
                onSave(ebook);
              }}
              onShare={handleShare}
              contentType="media"
              contentId={contentId}
              useEnhancedComponents={false}
            />
          </View>
        </View>
        <ThreeDotsMenuButton onPress={openModal} style={{ marginRight: 8 }} />
      </View>

      {/* Slide-up Content Action Modal */}
      <ContentActionModal
        isVisible={isModalVisible}
        onClose={closeModal}
        onViewDetails={() => {}}
        onSaveToLibrary={() => onSave(ebook)}
        onShare={() => onShare(ebook)}
        onDownload={() => onDownload(ebook)}
        isSaved={!!(ebook as any)?.saved}
        isDownloaded={checkIfDownloaded(ebook._id || ebook.fileUrl)}
        contentTitle={ebook.title}
        mediaId={ebook._id}
        uploadedBy={ebook.uploadedBy || ebook.author?._id || ebook.authorInfo?._id}
        onDelete={handleDeletePress}
        showDelete={isOwner}
      />
      
      {/* Delete Confirmation Modal */}
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={ebook._id || ""}
        mediaTitle={ebook.title || "this media"}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={handleDeleteConfirm}
      />
    </View>
  );
};

export default EbookCard;
