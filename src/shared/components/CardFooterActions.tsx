import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { AnimatedButton } from "./AnimatedButton";
import { CommentIcon } from "./CommentIcon";
import LikeBurst from "./LikeBurst";
import LikeButton from "./LikeButton";
import SaveButton from "./SaveButton";
import { CardFooterSkeleton } from "./Skeleton/CardFooterSkeleton";

type Props = {
  viewCount: number;
  liked: boolean;
  likeCount: number;
  onLike: () => void;
  likeBurstKey?: number;
  likeColor?: string;
  commentCount: number;
  onComment: () => void;
  saved: boolean;
  saveCount: number;
  onSave: () => void;
  onShare: () => void;
  commentColor?: string;
  // New props for enhanced interaction components
  contentType?: string;
  contentId?: string;
  useEnhancedComponents?: boolean;
  // Loading state for skeleton
  isLoading?: boolean;
};

export default function CardFooterActions({
  viewCount,
  liked,
  likeCount,
  onLike,
  likeBurstKey = 0,
  likeColor = "#D22A2A",
  commentCount,
  onComment,
  saved,
  saveCount,
  onSave,
  onShare,
  commentColor = "#98A2B3",
  contentType = "media",
  contentId,
  useEnhancedComponents = false,
  isLoading = false,
}: Props) {
  // ✅ Show skeleton only if loading AND no fallback data available
  // This ensures we show actual counts immediately if available, even while loading
  const hasAnyData = viewCount > 0 || likeCount > 0 || commentCount > 0 || saveCount > 0;
  if (isLoading && !hasAnyData) {
    return <CardFooterSkeleton dark={false} />;
  }

  // Use gray color scheme from audio-bible branch instead of green theme color
  // Base gray color for inactive icons: #98A2B3 (matching audio-bible branch)
  const baseGrayColor = "#98A2B3";
  const mediumShade = baseGrayColor; // Gray for default/inactive state
  // Active state colors from audio-bible branch
  const likedActiveColor = "#D22A2A"; // Red for liked
  const savedActiveColor = "#FEA74E"; // Orange for saved
  const activeShade = likedActiveColor; // For like button active state
  const darkShade = savedActiveColor; // For save button active state

  return (
    <View className="flex-row items-center pl-1">
      <View className="flex-row items-center mr-4">
        <MaterialIcons name="visibility" size={24} color={mediumShade} />
        <Text className="text-[10px] ml-1" style={{ color: mediumShade }}>{viewCount}</Text>
      </View>

      {useEnhancedComponents && contentId ? (
        <View className="flex-row items-center mr-4">
          <LikeButton
            contentType={contentType}
            contentId={contentId}
            initialLiked={liked}
            initialLikeCount={likeCount}
            size={28}
            color={mediumShade}
            likedColor={likedActiveColor}
            showCount={true}
            onLikeChange={(newLiked, newCount) => {
              // Trigger like burst animation
              if (newLiked && !liked) {
                // You can trigger the burst animation here if needed
              }
              onLike();
            }}
          />
          <LikeBurst
            triggerKey={likeBurstKey}
            color={likedActiveColor}
            size={14}
            style={{ marginLeft: -6, marginTop: -8 }}
          />
        </View>
      ) : (
        <AnimatedLikeButton
          liked={liked}
          likeColor={likedActiveColor}
          likeCount={likeCount}
          likeBurstKey={likeBurstKey}
          onLike={onLike}
          defaultColor={mediumShade}
          themeColor={baseGrayColor}
        />
      )}

      <CommentIcon
        comments={[]}
        size={26}
        color={mediumShade}
        showCount={true}
        count={commentCount}
        layout="horizontal"
        onPress={onComment}
        style={{ marginRight: 16 }}
      />

      {useEnhancedComponents && contentId ? (
        <View className="flex-row items-center mr-4">
          <SaveButton
            contentId={contentId}
            contentType={contentType}
            initialSaved={saved}
            initialSaveCount={saveCount}
            size={26}
            color={mediumShade}
            savedColor={savedActiveColor}
            showCount={true}
            onSaveChange={(newSaved, newCount) => {
              onSave();
            }}
          />
        </View>
      ) : (
        <TouchableOpacity
          onPress={onSave}
          className="flex-row items-center mr-4"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={saved ? ("bookmark" as any) : ("bookmark-outline" as any)}
            size={26}
            color={saved ? savedActiveColor : mediumShade}
          />
          <Text className="text-[10px] ml-1" style={{ color: mediumShade }}>{saveCount}</Text>
        </TouchableOpacity>
      )}

      <AnimatedShareButton onShare={onShare} />
      <View style={{ width: 2 }} />
    </View>
  );
}

// Optimized Like Button with instant scale feedback
function AnimatedLikeButton({
  liked,
  likeColor,
  likeCount,
  likeBurstKey,
  onLike,
  defaultColor,
  themeColor: passedThemeColor,
}: {
  liked: boolean;
  likeColor: string;
  likeCount: number;
  likeBurstKey: number;
  onLike: () => void;
  defaultColor?: string;
  themeColor?: string;
}) {
  // Use gray as base instead of green theme color (matching audio-bible branch)
  const baseGrayColor = "#98A2B3";
  const mediumShade = defaultColor || baseGrayColor;
  // Use the passed likeColor (should be #D22A2A) or fallback to red
  const activeColor = likeColor || "#D22A2A";
  
  return (
    <AnimatedButton
      className="flex-row items-center mr-4"
      onPress={onLike}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <MaterialIcons
        name={liked ? ("favorite" as any) : ("favorite-border" as any)}
        size={28}
        color={liked ? activeColor : mediumShade}
      />
      <LikeBurst
        triggerKey={likeBurstKey}
        color={activeColor}
        size={14}
        style={{ marginLeft: -6, marginTop: -8 }}
      />
      <Text className="text-[10px] ml-1" style={{ color: mediumShade }}>{likeCount}</Text>
    </AnimatedButton>
  );
}

// Optimized Share Button with instant scale feedback
function AnimatedShareButton({ onShare }: { onShare: () => void }) {
  // Use gray color instead of green theme color (matching audio-bible branch)
  const mediumShade = "#98A2B3";
  
  return (
    <AnimatedButton
      onPress={onShare}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="send" size={26} color={mediumShade} />
    </AnimatedButton>
  );
}
