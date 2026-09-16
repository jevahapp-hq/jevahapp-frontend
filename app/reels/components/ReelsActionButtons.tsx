import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { useContentSaveState } from "../../../src/shared/hooks/useContentSaveState";
import { InstantPressable } from "../../../src/shared/components/InstantPressable";
import {
  commentCountFromMetadata,
  resolveCommentDisplayCount,
} from "../../../src/shared/media/engagementDisplay";
import { LikeHeartButton } from "../../../src/shared/components/like";
import { formatCount } from "../../../src/shared/utils/formatCount";
import {
  useContentCount,
  useContentStats,
} from "@/store/useInteractionStore";

interface ReelsActionButtonsProps {
  videoKey: string;
  modalKey: string;
  contentId: string;
  screenHeight: number;
  activeIsLiked: boolean;
  activeLikesCount: number;
  canUseBackendLikes: boolean;
  videoStats: Record<string, any>;
  video: any;
  enrichedVideoData: any;
  onLike: () => void;
  onComment: (key: string) => void;
  onSave: (key: string) => void;
  onShare: (key: string) => void;
  getResponsiveSpacing: (small: number, medium: number, large: number) => number;
  getResponsiveSize: (small: number, medium: number, large: number) => number;
  getResponsiveFontSize: (small: number, medium: number, large: number) => number;
  getTouchTargetSize: () => number;
  triggerHapticFeedback: () => void;
}

export const ReelsActionButtons: React.FC<ReelsActionButtonsProps> = ({
  videoKey,
  modalKey,
  contentId,
  screenHeight,
  activeIsLiked,
  activeLikesCount,
  canUseBackendLikes,
  videoStats,
  video,
  enrichedVideoData,
  onLike,
  onComment,
  onSave,
  onShare,
  getResponsiveSpacing,
  getResponsiveSize,
  getResponsiveFontSize,
  getTouchTargetSize,
  triggerHapticFeedback,
}) => {
  const likeDisplayCount = useMemo(() => {
    const raw = canUseBackendLikes
      ? activeLikesCount
      : enrichedVideoData?.likeCount ??
        enrichedVideoData?.likes ??
        enrichedVideoData?.favorite ??
        video.favorite ??
        0;
    return Number(raw) || 0;
  }, [
    canUseBackendLikes,
    activeLikesCount,
    enrichedVideoData,
    video.favorite,
  ]);

  const liveStats = useContentStats(contentId);
  const storeComments = useContentCount(contentId, "comments");
  const save = useContentSaveState(contentId, enrichedVideoData || video);
  const isSaved = save.saved;

  const commentDisplayCount = useMemo(() => {
    return resolveCommentDisplayCount({
      storeComments,
      commentsConfirmed: liveStats?.commentsConfirmed,
      fallback: commentCountFromMetadata(enrichedVideoData || video),
    });
  }, [storeComments, liveStats?.commentsConfirmed, enrichedVideoData, video]);

  const saveDisplayCount = save.saveCount;

  const shareDisplayCount = useMemo(() => {
    return videoStats[videoKey]?.sheared || video.sheared || 0;
  }, [videoStats, videoKey, video.sheared]);

  return (
    <View
      style={{
        position: "absolute",
        right: getResponsiveSpacing(8, 10, 12),
        top: screenHeight * 0.3,
        flexDirection: "column",
        alignItems: "center",
        gap: getResponsiveSpacing(8, 10, 12),
        zIndex: 20,
      }}
    >
      <LikeHeartButton
        liked={activeIsLiked}
        likeCount={likeDisplayCount}
        onPress={onLike}
        size={getResponsiveSize(28, 32, 36)}
        idleColor="#FFFFFF"
        likedColor="#FF2D55"
        countColor="#FFFFFF"
        layout="vertical"
      />

      {/* Comment Button */}
      <InstantPressable
        onPress={() => {
          triggerHapticFeedback();
          onComment(videoKey);
        }}
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: getResponsiveSpacing(8, 10, 12),
          minWidth: getTouchTargetSize(),
          minHeight: getTouchTargetSize(),
        }}
        accessibilityLabel="Add comment to this video"
        accessibilityRole="button"
      >
        <Ionicons
          name="chatbubble-outline"
          size={getResponsiveSize(28, 32, 36)}
          color="white"
        />
        <Text
          style={{
            fontSize: getResponsiveFontSize(9, 10, 11),
            color: "#FFFFFF",
            marginTop: getResponsiveSpacing(2, 4, 5),
            fontFamily: "PlusJakartaSans-SemiBold",
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {formatCount(commentDisplayCount)}
        </Text>
      </InstantPressable>

      {/* Save Button */}
      <InstantPressable
        onPress={() => {
          triggerHapticFeedback();
          onSave(videoKey);
        }}
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: getResponsiveSpacing(8, 10, 12),
          minWidth: getTouchTargetSize(),
          minHeight: getTouchTargetSize(),
        }}
        accessibilityLabel={`${isSaved ? "Remove from" : "Save to"} library`}
        accessibilityRole="button"
      >
        <MaterialIcons
          name={isSaved ? "bookmark" : "bookmark-border"}
          size={getResponsiveSize(28, 32, 36)}
          color={isSaved ? "#FEA74E" : "#FFFFFF"}
        />
        {saveDisplayCount > 0 && (
          <Text
            style={{
              fontSize: getResponsiveFontSize(9, 10, 11),
              color: "#FFFFFF",
              marginTop: getResponsiveSpacing(2, 4, 5),
              fontFamily: "PlusJakartaSans-SemiBold",
              textShadowColor: "rgba(0, 0, 0, 0.5)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {formatCount(saveDisplayCount)}
          </Text>
        )}
      </InstantPressable>

      {/* Share Button */}
      <InstantPressable
        onPress={() => {
          triggerHapticFeedback();
          onShare(videoKey);
        }}
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: getResponsiveSpacing(8, 10, 12),
          minWidth: getTouchTargetSize(),
          minHeight: getTouchTargetSize(),
        }}
        accessibilityLabel="Share this video"
        accessibilityRole="button"
      >
        <Feather name="send" size={getResponsiveSize(28, 32, 36)} color="white" />
        {shareDisplayCount > 0 && (
          <Text
            style={{
              fontSize: getResponsiveFontSize(9, 10, 11),
              color: "#FFFFFF",
              marginTop: getResponsiveSpacing(2, 4, 5),
              fontFamily: "PlusJakartaSans-SemiBold",
              textShadowColor: "rgba(0, 0, 0, 0.5)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {formatCount(shareDisplayCount)}
          </Text>
        )}
      </InstantPressable>
    </View>
  );
};

