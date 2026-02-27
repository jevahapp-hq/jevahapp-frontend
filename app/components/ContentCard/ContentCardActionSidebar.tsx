/**
 * ContentCardActionSidebar - Vertical like, comment, save actions (shared by video/audio/image)
 */
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import CommentIcon from "../CommentIcon";

export interface ContentCardActionSidebarProps {
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isBookmarked: boolean;
  isItemInLibrary: boolean;
  likeAnimation: Animated.Value;
  commentAnimation: Animated.Value;
  formattedComments: any[];
  modalKey: string;
  contentId: string;
  onLike: () => void;
  onComment: () => void;
  onSaveToLibrary: () => void;
}

export function ContentCardActionSidebar({
  isLiked,
  likeCount,
  commentCount,
  isBookmarked,
  isItemInLibrary,
  likeAnimation,
  commentAnimation,
  formattedComments,
  modalKey,
  contentId,
  onLike,
  onComment,
  onSaveToLibrary,
}: ContentCardActionSidebarProps) {
  return (
    <View className="flex-col absolute mt-[170px] ml-[360px]">
      <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
        <TouchableOpacity
          onPress={onLike}
          className="flex-col justify-center items-center"
        >
          <MaterialIcons
            name={isLiked ? "favorite" : "favorite-border"}
            size={30}
            color={isLiked ? "#D22A2A" : "#FFFFFF"}
          />
          <Text className="text-[10px] text-white font-rubik-semibold">
            {likeCount}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={{ transform: [{ scale: commentAnimation }] }}>
        <CommentIcon
          comments={formattedComments}
          size={30}
          color="#FFFFFF"
          showCount={true}
          count={commentCount}
          layout="vertical"
          contentId={contentId || modalKey}
          onPress={onComment}
          style={{ marginTop: 24 }}
        />
      </Animated.View>
      <TouchableOpacity
        onPress={onSaveToLibrary}
        className="flex-col justify-center items-center mt-6"
      >
        <MaterialIcons
          name={isBookmarked ? "bookmark" : "bookmark-border"}
          size={30}
          color={isBookmarked ? "#FEA74E" : "#FFFFFF"}
        />
        <Text className="text-[10px] text-white font-rubik-semibold">
          {isItemInLibrary ? 1 : 0}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
