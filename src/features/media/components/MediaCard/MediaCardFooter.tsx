/**
 * Shared footer chrome for all media cards.
 * Meta on top; engagement + ⋮ on one evenly spaced row.
 */
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
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
  footerClassName,
  menuStyle,
}: MediaCardFooterProps) {
  if (!item) return null;
  const displayName = getUserDisplayNameFromContent(item);

  return (
    <View style={styles.root} className={footerClassName} pointerEvents="box-none">
      <View style={styles.metaRow} pointerEvents="box-none">
        <View style={styles.avatarWrap}>
          <AvatarWithInitialFallback
            imageSource={getUserAvatarFromContent(item) as any}
            name={displayName}
            size={30}
            fontSize={14}
            backgroundColor="transparent"
            textColor="#344054"
          />
        </View>
        <View style={styles.metaText}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={12} color="#9CA3AF" />
              <Text style={styles.time}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {item.moderationStatus === "under_review" ? (
            <View style={styles.reviewBox}>
              {showModerationBadge ? (
                <View style={styles.reviewBadge}>
                  <ModerationBadge status="under_review" />
                </View>
              ) : null}
              <Text style={styles.reviewText}>
                This content is currently under review and is only visible to
                you. It will be made public once approved.
              </Text>
            </View>
          ) : null}

          {/* One line: views → share → ⋮ */}
          <View style={styles.actionsLine} pointerEvents="box-none">
            <View style={styles.actionsFlex}>
              <CardFooterActions
                viewCount={viewCount}
                liked={!!userLikeState}
                likeCount={likeCount}
                likeColor={likeColor}
                onLike={onLike}
                commentCount={commentCount || item.comment || 0}
                onComment={() => onComment()}
                saved={!!userSaveState}
                saveCount={saveCount || 0}
                onSave={onSave}
                isLoading={isLoadingStats}
                contentType="media"
                contentId={contentId}
                onShare={onShare}
                useEnhancedComponents={false}
              />
            </View>
            <View style={styles.menuSlot}>
              <ThreeDotsMenuButton
                onPress={openModal}
                size={18}
                hitSlop={8}
                style={menuStyle as any}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 6,
    zIndex: 100,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatarWrap: {
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
  metaText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
    paddingRight: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 2,
  },
  name: {
    fontSize: 14,
    fontFamily: "Rubik-SemiBold",
    color: "#1F2937",
    maxWidth: "70%",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  time: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  reviewBox: {
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  reviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 10,
    color: "#C2410C",
    lineHeight: 14,
  },
  actionsLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    minHeight: 40,
  },
  actionsFlex: {
    flex: 1,
    minWidth: 0,
    marginRight: 4,
  },
  menuSlot: {
    flexShrink: 0,
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
