import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { CommentIcon } from "./CommentIcon";
import LikeBurst from "./LikeBurst";

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
}: Props) {
  return (
    <View className="flex-row items-center pl-2">
      <View className="flex-row items-center mr-6">
        <MaterialIcons name="visibility" size={24} color="#98A2B3" />
        <Text className="text-[10px] text-gray-500 ml-1">{viewCount}</Text>
      </View>

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

      <TouchableOpacity
        className="flex-row items-center mr-6"
        onPress={onComment}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <CommentIcon
          comments={[]}
          size={26}
          color={commentColor}
          showCount={true}
          count={commentCount}
          layout="horizontal"
        />
      </TouchableOpacity>

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

      <TouchableOpacity
        onPress={onShare}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="send" size={26} color="#98A2B3" />
      </TouchableOpacity>
    </View>
  );
}
