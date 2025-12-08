import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../constants";
import { darkenColor, lightenColor } from "../utils";
import { AnimatedButton } from "./AnimatedButton";
import { CommentIcon } from "./CommentIcon";
import LikeBurst from "./LikeBurst";
import LikeButton from "./LikeButton";
import SaveButton from "./SaveButton";

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
}: Props) {
  // Generate shades of the theme color
  const themeColor = UI_CONFIG.COLORS.PRIMARY; // #256E63
  const lightShade = lightenColor(themeColor, 65); // Very light for inactive icons
  const mediumShade = lightenColor(themeColor, 40); // Medium for default state
  const activeShade = themeColor; // Base theme color for active states
  const darkShade = darkenColor(themeColor, 15); // Darker for emphasis

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
            likedColor={activeShade}
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
            color={activeShade}
            size={14}
            style={{ marginLeft: -6, marginTop: -8 }}
          />
        </View>
      ) : (
        <AnimatedLikeButton
          liked={liked}
          likeColor={activeShade}
          likeCount={likeCount}
          likeBurstKey={likeBurstKey}
          onLike={onLike}
          defaultColor={mediumShade}
          themeColor={themeColor}
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
            savedColor={darkShade}
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
            color={saved ? darkShade : mediumShade}
          />
          <Text className="text-[10px] ml-1" style={{ color: saved ? darkShade : mediumShade }}>{saveCount}</Text>
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
  const themeColor = passedThemeColor || UI_CONFIG.COLORS.PRIMARY;
  const mediumShade = defaultColor || lightenColor(themeColor, 40);
  const activeColor = likeColor === "#D22A2A" ? themeColor : (likeColor || themeColor);
  
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
      <Text className="text-[10px] ml-1" style={{ color: liked ? activeColor : mediumShade }}>{likeCount}</Text>
    </AnimatedButton>
  );
}

// Optimized Share Button with instant scale feedback
function AnimatedShareButton({ onShare }: { onShare: () => void }) {
  const themeColor = UI_CONFIG.COLORS.PRIMARY;
  const mediumShade = lightenColor(themeColor, 40);
  
  return (
    <AnimatedButton
      onPress={onShare}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Feather name="send" size={26} color={mediumShade} />
    </AnimatedButton>
  );
}
