import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EbookCardProps } from '../../../shared/types';
import { InteractionButtons } from '../../../shared/components/InteractionButtons';
import { UI_CONFIG, MEDIA_CONFIG } from '../../../shared/constants';
import { getTimeAgo, getUserDisplayNameFromContent, getUserAvatarFromContent } from '../../../shared/utils';

export const EbookCard: React.FC<EbookCardProps> = ({
  ebook,
  index,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
}) => {
  const modalKey = `ebook-${ebook._id || index}`;
  const contentId = ebook._id || `ebook-${index}`;

  // Debug logging
  console.log(`📚 EbookCard rendering: ${ebook.title}`, {
    contentId,
    fileUrl: ebook.fileUrl,
    contentType: ebook.contentType,
  });

  // Get thumbnail source
  const thumbnailSource = ebook?.imageUrl || ebook?.thumbnailUrl;
  const thumbnailUri = typeof thumbnailSource === 'string' 
    ? thumbnailSource 
    : (thumbnailSource as any)?.uri;

  return (
    <View className="flex flex-col mb-10">
      <TouchableWithoutFeedback onPress={() => {}}>
        <View className="w-full h-[200px] overflow-hidden relative">
          {/* Background Image/Thumbnail */}
          <Image
            source={
              thumbnailUri
                ? { uri: thumbnailUri }
                : { uri: ebook.fileUrl } // Fallback to file URL
            }
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            resizeMode="cover"
          />

          {/* Content Type Icon - Top Left */}
          <View className="absolute top-4 left-4">
            <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
              <Ionicons name="book" size={16} color="#FFFFFF" />
            </View>
          </View>

          {/* Title Overlay */}
          <View className="absolute bottom-3 left-3 right-3 px-4 py-2 rounded-md bg-black/50">
            <Text
              className="text-white font-semibold text-sm"
              numberOfLines={2}
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.8)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {ebook.title}
            </Text>
          </View>

          {/* Read Button Overlay */}
          <View className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <TouchableOpacity className="bg-white/90 px-4 py-2 rounded-full">
              <Text className="text-gray-800 font-semibold text-sm">Read</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Footer with User Info and Interactions */}
      <View className="flex-row items-center justify-between mt-2 px-3">
        <View className="flex flex-row items-center flex-1">
          {/* User Avatar */}
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1">
            <Image
              source={getUserAvatarFromContent(ebook)}
              style={{ width: 30, height: 30, borderRadius: 999 }}
              resizeMode="cover"
            />
          </View>

          {/* User Info */}
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text className="text-sm font-semibold text-gray-800">
                {getUserDisplayNameFromContent(ebook)}
              </Text>
              <View className="flex flex-row mt-1 ml-2">
                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-500 ml-1">
                  {getTimeAgo(ebook.createdAt)}
                </Text>
              </View>
            </View>

            {/* Interaction Buttons */}
            <View className="mt-2">
              <InteractionButtons
                item={ebook}
                contentId={contentId}
                onLike={() => onLike(ebook)}
                onComment={() => onComment(ebook)}
                onSave={() => onSave(ebook)}
                onShare={() => onShare(ebook)}
                onDownload={() => onDownload(ebook)}
                userLikeState={false} // These should come from props or context
                userSaveState={false}
                likeCount={ebook.likes || 0}
                saveCount={ebook.saves || 0}
                commentCount={ebook.comments || 0}
                viewCount={ebook.views || 0}
                isDownloaded={false} // This should come from download store
                layout="horizontal"
              />
            </View>
          </View>
        </View>

        {/* More Options */}
        <TouchableOpacity className="ml-2">
          <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Debug Info (Development Only) */}
      {__DEV__ && (
        <View className="mx-3 mt-2 p-2 bg-purple-100 rounded">
          <Text className="text-xs text-purple-800">
            Debug: {ebook.title} | Type: {ebook.contentType} | 
            File: {ebook.fileUrl?.substring(0, 30)}...
          </Text>
        </View>
      )}
    </View>
  );
};

export default EbookCard;
