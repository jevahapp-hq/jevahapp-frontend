import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";

interface ReelsActionButtonsProps {
  videoKey: string;
  modalKey: string;
  screenHeight: number;
  activeIsLiked: boolean;
  activeLikesCount: number;
  canUseBackendLikes: boolean;
  videoStats: Record<string, any>;
  video: any;
  enrichedVideoData: any;
  libraryStore: any;
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
  screenHeight,
  activeIsLiked,
  activeLikesCount,
  canUseBackendLikes,
  videoStats,
  video,
  enrichedVideoData,
  libraryStore,
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
      {/* Like Button */}
      <TouchableOpacity
        onPress={() => {
          triggerHapticFeedback();
          onLike();
        }}
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: getResponsiveSpacing(8, 10, 12),
          minWidth: getTouchTargetSize(),
          minHeight: getTouchTargetSize(),
        }}
        activeOpacity={0.7}
        accessibilityLabel={`${activeIsLiked ? "Unlike" : "Like"} this video`}
        accessibilityRole="button"
      >
        <MaterialIcons
          name={activeIsLiked ? "favorite" : "favorite-border"}
          size={getResponsiveSize(28, 32, 36)}
          color={activeIsLiked ? "#D22A2A" : "#FFFFFF"}
        />
        <Text
          style={{
            fontSize: getResponsiveFontSize(9, 10, 11),
            color: "#FFFFFF",
            marginTop: getResponsiveSpacing(2, 4, 5),
            fontFamily: "Rubik-SemiBold",
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {canUseBackendLikes
            ? activeLikesCount
            : enrichedVideoData?.likeCount ??
              enrichedVideoData?.likes ??
              enrichedVideoData?.favorite ??
              video.favorite ??
              0}
        </Text>
      </TouchableOpacity>

      {/* Comment Button */}
      <TouchableOpacity
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
        activeOpacity={0.7}
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
            fontFamily: "Rubik-SemiBold",
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {videoStats[videoKey]?.comment === 1
            ? (video.comment ?? 0) + 1
            : video.comment ?? 0}
        </Text>
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity
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
        activeOpacity={0.7}
        accessibilityLabel={`${
          libraryStore.isItemSaved(modalKey) ? "Remove from" : "Save to"
        } library`}
        accessibilityRole="button"
      >
        <MaterialIcons
          name={
            libraryStore.isItemSaved(videoKey) ? "bookmark" : "bookmark-border"
          }
          size={getResponsiveSize(28, 32, 36)}
          color={libraryStore.isItemSaved(videoKey) ? "#FEA74E" : "#FFFFFF"}
        />
        <Text
          style={{
            fontSize: getResponsiveFontSize(9, 10, 11),
            color: "#FFFFFF",
            marginTop: getResponsiveSpacing(2, 4, 5),
            fontFamily: "Rubik-SemiBold",
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {videoStats[videoKey]?.totalSaves || video.saved || 0}
        </Text>
      </TouchableOpacity>

      {/* Share Button */}
      <TouchableOpacity
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
        activeOpacity={0.7}
        accessibilityLabel="Share this video"
        accessibilityRole="button"
      >
        <Feather name="send" size={getResponsiveSize(28, 32, 36)} color="white" />
        <Text
          style={{
            fontSize: getResponsiveFontSize(9, 10, 11),
            color: "#FFFFFF",
            marginTop: getResponsiveSpacing(2, 4, 5),
            fontFamily: "Rubik-SemiBold",
            textShadowColor: "rgba(0, 0, 0, 0.5)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {videoStats[videoKey]?.sheared || video.sheared || 0}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

