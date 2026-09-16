/**
 * VideoCardFooter - Avatar, stats, actions, three-dots menu
 */
import { useCommentModal } from "@/app/context/CommentModalContext";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { AvatarWithInitialFallback } from "../../../../shared/components/AvatarWithInitialFallback/AvatarWithInitialFallback";
import CardFooterActions from "../../../../shared/components/CardFooterActions";
import ThreeDotsMenuButton from "../../../../shared/components/ThreeDotsMenuButton/ThreeDotsMenuButton";
import { UnderReviewBanner } from "../../../../shared/components/UnderReviewBanner";
import {
  isUnderReview,
  shouldShowMediaActionsMenu,
} from "../../../../shared/media/moderationVisibility";
import type { MediaItem } from "../../../../shared/types";

export interface VideoCardFooterProps {
  video: MediaItem;
  contentKey: string;
  modalKey: string;
  contentId: string;
  getUserAvatarFromContent: (item: MediaItem) => string | undefined;
  getUserDisplayNameFromContent: (item: MediaItem) => string;
  getTimeAgo: (date: string) => string;
  viewCount: number;
  userLikeState: boolean;
  likeCount: number;
  likeBurstKey: number;
  setLikeBurstKey: (fn: (k: number) => number) => void;
  onLike: (key: string, item: MediaItem) => void;
  onComment: (key: string, item: MediaItem) => void;
  commentCount: number;
  userSaveState: boolean;
  saveCount: number;
  onSave: (key: string, item: MediaItem) => void;
  onShare: (key: string, item: MediaItem) => void;
  isLoadingStats: boolean;
  openModal: () => void;
  onModalToggle: ((val: string | null) => void) | undefined;
}

export function VideoCardFooter({
  video,
  contentKey,
  modalKey,
  contentId,
  getUserAvatarFromContent,
  getUserDisplayNameFromContent,
  getTimeAgo,
  viewCount,
  userLikeState,
  likeCount,
  likeBurstKey,
  setLikeBurstKey,
  onLike,
  onComment,
  commentCount,
  userSaveState,
  saveCount,
  onSave,
  onShare,
  isLoadingStats,
  openModal,
  onModalToggle,
}: VideoCardFooterProps) {
  const { isVisible: commentsOpen, isClosing } = useCommentModal();
  if (!video) return null;
  const hideFooter = commentsOpen || isClosing;
  const showMenu = shouldShowMediaActionsMenu(video);
  const showReviewBanner = isUnderReview(video);

  return (
    <View
      pointerEvents={hideFooter ? "none" : "box-none"}
      style={[styles.root, hideFooter ? styles.hidden : null]}
    >
      <View style={styles.body} pointerEvents="box-none">
        <View style={styles.avatar}>
          <AvatarWithInitialFallback
            imageSource={getUserAvatarFromContent(video) as any}
            name={getUserDisplayNameFromContent(video)}
            size={30}
            fontSize={14}
            backgroundColor="transparent"
            textColor="#344054"
          />
        </View>
        <View style={styles.meta} pointerEvents="box-none">
          <View style={styles.nameRow}>
            <Text className="text-sm font-semibold text-gray-800">
              {getUserDisplayNameFromContent(video)}
            </Text>
            <View className="flex flex-row mt-1 ml-2">
              <Ionicons name="time-outline" size={12} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 ml-1">
                {getTimeAgo(video.createdAt)}
              </Text>
            </View>
          </View>
          {showReviewBanner ? (
            <UnderReviewBanner status={video.moderationStatus} />
          ) : null}
          <CardFooterActions
            viewCount={viewCount}
            liked={!!userLikeState}
            likeCount={likeCount}
            likeBurstKey={likeBurstKey}
            likeColor="#D22A2A"
            onLike={() => {
              if (!userLikeState) setLikeBurstKey((k) => k + 1);
              onLike(contentKey, video);
            }}
            commentCount={commentCount}
            onComment={() => onComment(contentKey, video)}
            saved={!!userSaveState}
            saveCount={saveCount || 0}
            onSave={() => onSave(modalKey, video)}
            isLoading={isLoadingStats}
            contentType="media"
            contentId={contentId}
            onShare={() => onShare(modalKey, video)}
            useEnhancedComponents={false}
          />
        </View>
      </View>
      {showMenu ? (
        <View style={styles.menuSlot} pointerEvents="box-none">
          <ThreeDotsMenuButton
            onPress={() => {
              openModal();
              if (onModalToggle) onModalToggle(modalKey);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    paddingHorizontal: 8,
    overflow: "visible",
    zIndex: 20,
  },
  hidden: {
    opacity: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    marginTop: 2,
    overflow: "hidden",
  },
  meta: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    paddingRight: 8,
    overflow: "visible",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  menuSlot: {
    flexShrink: 0,
    width: 44,
    marginTop: 2,
    zIndex: 50,
    elevation: 50,
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
