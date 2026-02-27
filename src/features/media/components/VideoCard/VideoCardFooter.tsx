/**
 * VideoCardFooter - Avatar, stats, actions, three-dots menu
 */
import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCommentModal } from "@/app/context/CommentModalContext";
import CardFooterActions from "../../../../shared/components/CardFooterActions";
import { AvatarWithInitialFallback } from "../../../../shared/components/AvatarWithInitialFallback/AvatarWithInitialFallback";
import ThreeDotsMenuButton from "../../../../shared/components/ThreeDotsMenuButton/ThreeDotsMenuButton";
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
  onFavorite: (key: string, item: MediaItem) => void;
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
  onFavorite,
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
  const { showCommentModal } = useCommentModal();

  return (
    <View
      className="flex-row items-center justify-between mt-2 px-2"
      style={{ zIndex: 100 }}
      pointerEvents="box-none"
    >
      <View className="flex flex-row items-center" pointerEvents="box-none">
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
          <AvatarWithInitialFallback
            imageSource={getUserAvatarFromContent(video) as any}
            name={getUserDisplayNameFromContent(video)}
            size={30}
            fontSize={14}
            backgroundColor="transparent"
            textColor="#344054"
          />
        </View>
        <View className="ml-3">
          <View className="flex-row items-center">
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
          <CardFooterActions
            viewCount={viewCount}
            liked={!!userLikeState}
            likeCount={likeCount}
            likeBurstKey={likeBurstKey}
            likeColor="#D22A2A"
            onLike={() => {
              if (!userLikeState) setLikeBurstKey((k) => k + 1);
              onFavorite(contentKey, video);
            }}
            commentCount={commentCount || video.comment || 0}
            onComment={() => {
              try {
                showCommentModal([], String(contentId));
              } catch {}
              onComment(contentKey, video);
            }}
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
      <View style={{ zIndex: 1001 }}>
        <ThreeDotsMenuButton
          onPress={() => {
            openModal();
            if (onModalToggle) onModalToggle(modalKey);
          }}
        />
      </View>
    </View>
  );
}
