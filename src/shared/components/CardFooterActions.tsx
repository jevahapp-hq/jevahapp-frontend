import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
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
  return (
    <View className="flex-row items-center pl-2">
      <View className="flex-row items-center mr-6">
        <MaterialIcons name="visibility" size={24} color="#98A2B3" />
        <Text className="text-[10px] text-gray-500 ml-1">{viewCount}</Text>
      </View>

      {useEnhancedComponents && contentId ? (
        <View className="flex-row items-center mr-6">
          <LikeButton
            contentType={contentType}
            contentId={contentId}
            initialLiked={liked}
            initialLikeCount={likeCount}
            size={28}
            color="#98A2B3"
            likedColor={likeColor}
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
            color={likeColor}
            size={14}
            style={{ marginLeft: -6, marginTop: -8 }}
          />
        </View>
      ) : (
        <TouchableOpacity
          className="flex-row items-center mr-6"
          onPress={onLike}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons
            name={liked ? ("favorite" as any) : ("favorite-border" as any)}
            size={28}
            color={liked ? likeColor : "#98A2B3"}
          />
          <LikeBurst
            triggerKey={likeBurstKey}
            color={likeColor}
            size={14}
            style={{ marginLeft: -6, marginTop: -8 }}
          />
          <Text className="text-[10px] text-gray-500 ml-1">{likeCount}</Text>
        </TouchableOpacity>
      )}

      <CommentIcon
        comments={[]}
        size={26}
        color={commentColor}
        showCount={true}
        count={commentCount}
        layout="horizontal"
        onPress={onComment}
        style={{ marginRight: 24 }}
      />

      {useEnhancedComponents && contentId ? (
        <View className="flex-row items-center mr-6">
          <SaveButton
            contentId={contentId}
            contentType={contentType}
            initialSaved={saved}
            initialSaveCount={saveCount}
            size={26}
            color="#98A2B3"
            savedColor="#FEA74E"
            showCount={true}
            onSaveChange={(newSaved, newCount) => {
              onSave();
            }}
          />
        </View>
      ) : (
        <TouchableOpacity
          onPress={onSave}
          className="flex-row items-center mr-6"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={saved ? ("bookmark" as any) : ("bookmark-outline" as any)}
            size={26}
            color={saved ? "#FEA74E" : "#98A2B3"}
          />
          <Text className="text-[10px] text-gray-500 ml-1">{saveCount}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        onPress={onShare}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="send" size={26} color="#98A2B3" />
      </TouchableOpacity>
    </View>
  );
}
