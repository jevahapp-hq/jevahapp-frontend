/**
 * Engagement icons on one line — tight, even gaps; leaves room for trailing ⋮.
 */
import React from "react";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AnimatedButton } from "./AnimatedButton";
import { CommentIcon } from "./CommentIcon";
import { LikeHeartButton } from "./like";
import SaveButton from "./SaveButton";
import { CardFooterSkeleton } from "./Skeleton/CardFooterSkeleton";
import { formatCount } from "../utils/formatCount";

type Props = {
  viewCount: number;
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  likeColor?: string;
  commentCount: number;
  onComment: () => void;
  saved: boolean;
  saveCount: number;
  onSave: () => void;
  onShare: () => void;
  commentColor?: string;
  contentType?: string;
  contentId?: string;
  useEnhancedComponents?: boolean;
  isLoading?: boolean;
};

const IDLE = "#98A2B3";
const LIKED = "#D22A2A";
const SAVED = "#FEA74E";

function CardFooterActions({
  viewCount,
  liked,
  likeCount,
  onLike,
  likeColor = LIKED,
  commentCount,
  onComment,
  saved,
  saveCount,
  onSave,
  onShare,
  contentType = "media",
  contentId,
  useEnhancedComponents = false,
  isLoading = false,
}: Props) {
  if (isLoading) {
    return <CardFooterSkeleton dark={false} />;
  }

  return (
    <View style={styles.row}>
      <View style={styles.slot}>
        <MaterialIcons name="visibility" size={22} color={IDLE} />
        <Text style={styles.count}>{formatCount(viewCount)}</Text>
      </View>

      <View style={styles.slot}>
        <LikeHeartButton
          liked={liked}
          likeCount={likeCount}
          onPress={onLike}
          size={24}
          idleColor={IDLE}
          likedColor={likeColor || LIKED}
          countColor={IDLE}
          compact
        />
      </View>

      <View style={styles.slot}>
        <CommentIcon
          comments={[]}
          size={22}
          color={IDLE}
          showCount
          count={commentCount}
          layout="horizontal"
          onPress={onComment}
          useAnimatedButton={false}
          compact
        />
      </View>

      <View style={styles.slot}>
        {useEnhancedComponents && contentId ? (
          <SaveButton
            contentId={contentId}
            contentType={contentType}
            initialSaved={saved}
            initialSaveCount={saveCount}
            size={22}
            color={IDLE}
            savedColor={SAVED}
            showCount
            onSaveChange={() => onSave()}
          />
        ) : (
          <TouchableOpacity
            onPress={onSave}
            style={styles.slotInner}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityRole="button"
            accessibilityLabel={saved ? "Unsave" : "Save"}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? SAVED : IDLE}
            />
            {saveCount > 0 ? (
              <Text style={styles.count}>{formatCount(saveCount)}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.slot}>
        <AnimatedButton
          onPress={onShare}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          style={styles.shareBtn}
        >
          <Feather name="send" size={22} color={IDLE} />
        </AnimatedButton>
      </View>
    </View>
  );
}

export default React.memo(CardFooterActions);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: 12,
    paddingVertical: 2,
    paddingLeft: 0,
  },
  slot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 2,
  },
  slotInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  count: {
    fontSize: 10,
    color: IDLE,
    marginLeft: 3,
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  shareBtn: {
    marginRight: 0,
    padding: 2,
  },
});
