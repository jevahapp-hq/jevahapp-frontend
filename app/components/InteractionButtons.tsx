/**
 * InteractionButtons Component
 * 
 * This file now wraps UnifiedInteractionButtons with hook-based functionality.
 * Uses UnifiedInteractionButtons internally for consistency.
 */

import { UnifiedInteractionButtons } from "../../src/shared/components/InteractionButtons/UnifiedInteractionButtons";

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
