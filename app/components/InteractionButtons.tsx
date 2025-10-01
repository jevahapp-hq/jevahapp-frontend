import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Share, Text, TouchableOpacity, View } from "react-native";
import { useCommentModal } from "../context/CommentModalContext";
import {
    useContentCount,
    useContentStats,
    useInteractionStore,
    useUserInteraction,
} from "../store/useInteractionStore";

interface InteractionButtonsProps {
  contentId: string;
  contentType: "video" | "audio" | "ebook" | "sermon" | "live";
  contentTitle: string;
  contentUrl?: string;
  layout?: "vertical" | "horizontal";
  iconSize?: number;
  showCounts?: boolean;
  onCommentPress?: () => void;
}

export default function InteractionButtons({
  contentId,
  contentType,
  contentTitle,
  contentUrl,
  layout = "vertical",
  iconSize = 30,
  showCounts = true,
  onCommentPress,
}: InteractionButtonsProps) {
  const { toggleLike, toggleSave, recordShare, loadContentStats, comments } =
    useInteractionStore();

  const { showCommentModal } = useCommentModal();

  // Use selectors for better performance
  const contentStats = useContentStats(contentId);
  const isLiked = useUserInteraction(contentId, "liked");
  const isSaved = useUserInteraction(contentId, "saved");
  const likesCount = useContentCount(contentId, "likes");
  const savesCount = useContentCount(contentId, "saves");
  const sharesCount = useContentCount(contentId, "shares");
  const commentsCount = useContentCount(contentId, "comments");

  const [isLoading, setIsLoading] = useState({
    like: false,
    save: false,
    share: false,
  });

  // Load stats when component mounts
  useEffect(() => {
    if (!contentStats) {
      loadContentStats(contentId);
    }
  }, [contentId, contentStats, loadContentStats]);

  const handleLike = async () => {
    if (isLoading.like) return;

    setIsLoading((prev) => ({ ...prev, like: true }));
    try {
      await toggleLike(contentId, contentType);
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, like: false }));
    }
  };

  const handleSave = async () => {
    if (isLoading.save) return;

    setIsLoading((prev) => ({ ...prev, save: true }));
    try {
      await toggleSave(contentId, contentType);
    } catch (error) {
      console.error("Error toggling save:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, save: false }));
    }
  };

  const handleShare = async () => {
    if (isLoading.share) return;

    try {
      setIsLoading((prev) => ({ ...prev, share: true }));

      const shareOptions = {
        title: contentTitle,
        message: `Check out this ${contentType}: ${contentTitle}`,
        url: contentUrl || "",
      };

      const result = await Share.share(shareOptions);

      // Record share interaction if user actually shared
      if (result.action === Share.sharedAction) {
        await recordShare(
          contentId,
          contentType,
          result.activityType || "generic"
        );
      }
    } catch (error) {
      console.error("Error sharing content:", error);
    } finally {
      setIsLoading((prev) => ({ ...prev, share: false }));
    }
  };

  const handleCommentPress = () => {
    if (onCommentPress) {
      onCommentPress();
      return;
    }

    // Convert existing comments to the format expected by our global modal
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

    // Show the global comment modal with contentId
    showCommentModal(formattedComments, contentId);
  };

  const ButtonContainer =
    layout === "vertical"
      ? ({ children }: { children: React.ReactNode }) => (
          <View className="flex-col space-y-4">{children}</View>
        )
      : ({ children }: { children: React.ReactNode }) => (
          <View className="flex-row items-center space-x-6">{children}</View>
        );

  const ButtonSpacing = layout === "vertical" ? "mt-6" : "ml-6";

  return (
    <ButtonContainer>
      {/* Like Button */}
      <TouchableOpacity
        onPress={handleLike}
        className="flex-col justify-center items-center"
        disabled={isLoading.like}
      >
        <MaterialIcons
          name={isLiked ? "favorite" : "favorite-border"}
          size={iconSize}
          color={isLiked ? "#FF1744" : "#FFFFFF"}
          style={{
            textShadowColor: isLiked ? "rgba(255, 23, 68, 0.5)" : "transparent",
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: isLiked ? 8 : 0,
          }}
        />
        {showCounts && (
          <Text className="text-[10px] text-white font-rubik-semibold mt-1">
            {likesCount}
          </Text>
        )}
      </TouchableOpacity>

      {/* Comment Button */}
      <TouchableOpacity
        onPress={handleCommentPress}
        className={`flex-col justify-center items-center ${ButtonSpacing}`}
      >
        <Ionicons name="chatbubble-sharp" size={iconSize} color="white" />
        {showCounts && (
          <Text className="text-[10px] text-white font-rubik-semibold mt-1">
            {commentsCount}
          </Text>
        )}
      </TouchableOpacity>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSave}
        className={`flex-col justify-center items-center ${ButtonSpacing}`}
        disabled={isLoading.save}
      >
        <MaterialIcons
          name={isSaved ? "bookmark" : "bookmark-border"}
          size={iconSize}
          color={isSaved ? "#FEA74E" : "#FFFFFF"}
        />
        {showCounts && (
          <Text className="text-[10px] text-white font-rubik-semibold mt-1">
            {savesCount}
          </Text>
        )}
      </TouchableOpacity>
    </ButtonContainer>
  );
}

// Alternative horizontal layout component for feed views
export function HorizontalInteractionStats({
  contentId,
  contentType,
  iconSize = 16,
  textSize = "text-[10px]",
  iconColor = "#98A2B3",
  textColor = "text-gray-500",
}: {
  contentId: string;
  contentType: string;
  iconSize?: number;
  textSize?: string;
  iconColor?: string;
  textColor?: string;
}) {
  const { loadContentStats } = useInteractionStore();

  const contentStats = useContentStats(contentId);
  const likesCount = useContentCount(contentId, "likes");
  const savesCount = useContentCount(contentId, "saves");
  const sharesCount = useContentCount(contentId, "shares");
  const viewsCount = useContentCount(contentId, "views");

  useEffect(() => {
    if (!contentStats) {
      loadContentStats(contentId);
    }
  }, [contentId, contentStats, loadContentStats]);

  return (
    <View className="flex flex-row mt-2">
      {/* Views */}
      <View className="flex-row items-center">
        <MaterialIcons name="visibility" size={iconSize} color={iconColor} />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {viewsCount}
        </Text>
      </View>

      {/* Shares */}
      <View className="flex-row items-center ml-4">
        <Ionicons name="share-outline" size={iconSize} color={iconColor} />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {sharesCount}
        </Text>
      </View>

      {/* Saves */}
      <View className="flex-row items-center ml-4">
        <MaterialIcons
          name="bookmark-border"
          size={iconSize}
          color={iconColor}
        />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {savesCount}
        </Text>
      </View>

      {/* Likes */}
      <View className="flex-row items-center ml-4">
        <MaterialIcons
          name="favorite-border"
          size={iconSize}
          color={iconColor}
        />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {likesCount}
        </Text>
      </View>
    </View>
  );
}
