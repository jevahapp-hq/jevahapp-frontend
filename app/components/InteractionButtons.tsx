/**
 * InteractionButtons Component
 * 
 * This file now wraps UnifiedInteractionButtons with hook-based functionality.
 * Uses UnifiedInteractionButtons internally for consistency.
 */

import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { UnifiedInteractionButtons } from "../../src/shared/components/InteractionButtons/UnifiedInteractionButtons";
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
  // Use UnifiedInteractionButtons with hook-based mode
  return (
    <UnifiedInteractionButtons
      contentId={contentId}
      contentType={contentType}
      contentTitle={contentTitle}
      contentUrl={contentUrl}
      layout={layout}
      iconSize={iconSize}
      showCounts={showCounts}
      onCommentPress={onCommentPress}
      useHooks={true}
      iconColor="#FFFFFF"
      textColor="#FFFFFF"
    />
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
  const isLiked = useUserInteraction(contentId, "liked");
  const isSaved = useUserInteraction(contentId, "saved");
  const likesCount = useContentCount(contentId, "likes");
  const savesCount = useContentCount(contentId, "saves");
  const sharesCount = useContentCount(contentId, "shares");
  const viewsCount = useContentCount(contentId, "views");
  const commentsCount = useContentCount(contentId, "comments");

  useEffect(() => {
    if (!contentStats) {
      loadContentStats(contentId);
    }
  }, [contentId, contentStats, loadContentStats]);

  // Color scheme matching audio-bible branch
  // Base gray color for inactive icons: #98A2B3
  const baseIconColor = iconColor || "#98A2B3";
  // Active state colors from audio-bible branch
  const likedColor = "#D22A2A"; // Red for liked
  const savedColor = "#FEA74E"; // Orange for saved
  const commentColor = baseIconColor; // Gray for comments

  return (
    <View className="flex flex-row mt-2">
      {/* Views */}
      <View className="flex-row items-center">
        <MaterialIcons name="visibility" size={iconSize} color={baseIconColor} />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {viewsCount}
        </Text>
      </View>

      {/* Likes */}
      <View className="flex-row items-center ml-4">
        <MaterialIcons
          name={isLiked ? "favorite" : "favorite-border"}
          size={iconSize}
          color={isLiked ? likedColor : baseIconColor}
        />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {likesCount}
        </Text>
      </View>

      {/* Comments */}
      <View className="flex-row items-center ml-4">
        <Ionicons name="chatbubble-outline" size={iconSize} color={commentColor} />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {commentsCount}
        </Text>
      </View>

      {/* Saves */}
      <View className="flex-row items-center ml-4">
        <MaterialIcons
          name={isSaved ? "bookmark" : "bookmark-border"}
          size={iconSize}
          color={isSaved ? savedColor : baseIconColor}
        />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {savesCount}
        </Text>
      </View>

      {/* Shares */}
      <View className="flex-row items-center ml-4">
        <Ionicons name="share-outline" size={iconSize} color={baseIconColor} />
        <Text className={`${textSize} ${textColor} ml-1 font-rubik`}>
          {sharesCount}
        </Text>
      </View>
    </View>
  );
}
