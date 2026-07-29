/**
 * Shared footer chrome for all media cards (avatar, under-review, actions, menu).
 */
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useFastPerformance } from "../../../../../app/utils/fastPerformance";
import { AvatarWithInitialFallback } from "../../../../shared/components/AvatarWithInitialFallback/AvatarWithInitialFallback";
import CardFooterActions from "../../../../shared/components/CardFooterActions";
import { ModerationBadge } from "../../../../shared/components/ModerationBadge";
import ThreeDotsMenuButton from "../../../../shared/components/ThreeDotsMenuButton/ThreeDotsMenuButton";
import type { MediaItem } from "../../../../shared/types";
import {
  getTimeAgo as defaultGetTimeAgo,
  getUserAvatarFromContent as defaultGetAvatar,
  getUserDisplayNameFromContent as defaultGetName,
} from "../../../../shared/utils";

export interface MediaCardFooterProps {
  item: MediaItem;
  contentId: string;
  viewCount: number;
  userLikeState: boolean;
  likeCount: number;
  likeBurstKey: number;
  setLikeBurstKey: (fn: (k: number) => number) => void;
  onLike: () => void;
  onComment: () => void;
  commentCount: number;
  userSaveState: boolean;
  saveCount: number;
  onSave: () => void;
  onShare: () => void;
  isLoadingStats?: boolean;
  openModal: () => void;
  likeColor?: string;
  showModerationBadge?: boolean;
  getUserAvatarFromContent?: (item: MediaItem) => any;
  getUserDisplayNameFromContent?: (item: MediaItem) => string;
  getTimeAgo?: (date: string) => string;
  footerClassName?: string;
  menuStyle?: object;
}

export function MediaCardFooter({
  item,
  contentId,
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
  isLoadingStats = false,
  openModal,
  likeColor = "#D22A2A",
  showModerationBadge = false,
  getUserAvatarFromContent = defaultGetAvatar,
  getUserDisplayNameFromContent = defaultGetName,
  getTimeAgo = defaultGetTimeAgo,
  footerClassName = "flex-row items-center justify-between mt-2 px-2",
  menuStyle,
}: MediaCardFooterProps) {
  const { fastPress } = useFastPerformance();
  const displayName = getUserDisplayNameFromContent(item);

  return (
    <View
      className={footerClassName}
      style={{ zIndex: 100 }}
      pointerEvents="box-none"
    >
      <View className="flex flex-row items-center" pointerEvents="box-none">
        <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 overflow-hidden">
          <AvatarWithInitialFallback
            imageSource={getUserAvatarFromContent(item) as any}
            name={displayName}
            size={30}
            fontSize={14}
            backgroundColor="transparent"
            textColor="#344054"
          />
        </View>
        <View className="ml-3">
          <View className="flex-row items-center">
            <Text className="text-sm font-semibold text-gray-800">
              {displayName}
            </Text>
            <View className="flex flex-row mt-1 ml-2">
              <Ionicons name="time-outline" size={12} color="#9CA3AF" />
              <Text className="text-xs text-gray-500 ml-1">
                {getTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>

          {item.moderationStatus === "under_review" && (
            <View className="mt-1 bg-orange-50 p-2 rounded-md border border-orange-100 mb-1">
              {showModerationBadge ? (
                <View className="flex-row items-center mb-1">
                  <ModerationBadge status="under_review" />
                </View>
              ) : null}
              <Text className="text-[10px] text-orange-700 leading-3">
                This content is currently under review and is only visible to
                you. It will be made public once approved.
              </Text>
            </View>
          )}

          <CardFooterActions
            viewCount={viewCount}
            liked={!!userLikeState}
            likeCount={likeCount}
            likeBurstKey={likeBurstKey}
            likeColor={likeColor}
            onLike={fastPress(
              () => {
                if (!userLikeState) setLikeBurstKey((k) => k + 1);
                onLike();
              },
              { key: `like_${contentId}`, priority: "high" }
            )}
            commentCount={commentCount || item.comment || 0}
            onComment={fastPress(() => onComment(), {
              key: `comment_${contentId}`,
              priority: "high",
            })}
            saved={!!userSaveState}
            saveCount={saveCount || 0}
            onSave={fastPress(() => onSave(), {
              key: `save_${contentId}`,
              priority: "high",
            })}
            isLoading={isLoadingStats}
            contentType="media"
            contentId={contentId}
            onShare={fastPress(() => onShare(), {
              key: `share_${contentId}`,
              priority: "high",
            })}
            useEnhancedComponents={false}
          />
        </View>
      </View>
      <View style={{ zIndex: 1001 }}>
        <ThreeDotsMenuButton onPress={openModal} style={menuStyle} />
      </View>
    </View>
  );
}
