import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CompactAudioControls } from "../../CompactAudioControls";
import { SafeImage } from "../../SafeImage";
import { ContentCardActionSidebar } from "../ContentCardActionSidebar";

interface ContentCardAudioViewProps {
  content: { _id: string; title: string };
  mediaUrl: string;
  thumbnailUri: string;
  modalKey: string;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isBookmarked: boolean;
  isItemInLibrary: boolean;
  likeAnimation: any;
  commentAnimation: any;
  formattedComments: any[];
  onLike: () => void;
  onComment: () => void;
  onSaveToLibrary: () => void;
}

export function ContentCardAudioView({
  content,
  mediaUrl,
  thumbnailUri,
  modalKey,
  isLiked,
  likeCount,
  commentCount,
  isBookmarked,
  isItemInLibrary,
  likeAnimation,
  commentAnimation,
  formattedComments,
  onLike,
  onComment,
  onSaveToLibrary,
}: ContentCardAudioViewProps) {
  return (
    <View className="w-full h-[400px] overflow-hidden relative">
      <View style={StyleSheet.absoluteFillObject}>
        <SafeImage
          uri={thumbnailUri}
          style={StyleSheet.absoluteFillObject}
          size="large"
        />
      </View>

      <ContentCardActionSidebar
        isLiked={isLiked}
        likeCount={likeCount}
        commentCount={commentCount}
        isBookmarked={isBookmarked}
        isItemInLibrary={isItemInLibrary}
        likeAnimation={likeAnimation}
        commentAnimation={commentAnimation}
        formattedComments={formattedComments}
        modalKey={modalKey}
        contentId={content._id}
        onLike={onLike}
        onComment={onComment}
        onSaveToLibrary={onSaveToLibrary}
      />

      <View className="absolute top-4 left-4">
        <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
          <Ionicons name="musical-notes" size={16} color="#FFFFFF" />
        </View>
      </View>

      <View className="absolute bottom-3 left-3 right-3">
        <CompactAudioControls
          audioUrl={mediaUrl}
          audioKey={content._id}
          className="bg-black/50 rounded-lg"
        />
      </View>

      <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
        <Text className="text-white font-semibold text-[14px]" numberOfLines={2}>
          {content.title}
        </Text>
      </View>
    </View>
  );
}
