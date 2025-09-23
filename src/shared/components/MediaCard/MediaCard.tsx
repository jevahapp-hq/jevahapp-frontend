import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaCardProps } from '../../types';
import { InteractionButtons } from '../InteractionButtons';
import { UI_CONFIG } from '../../constants';
import { getTimeAgo, getUserDisplayNameFromContent, getUserAvatarFromContent } from '../../utils';

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  index,
  onPress,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  layout = 'card',
  size = 'medium',
}) => {
  const contentId = item._id || `media-${index}`;
  const isCardLayout = layout === 'card';
  const isLargeSize = size === 'large';

  // Get thumbnail source
  const thumbnailSource = item?.imageUrl || item?.thumbnailUrl;
  const thumbnailUri = typeof thumbnailSource === 'string' 
    ? thumbnailSource 
    : (thumbnailSource as any)?.uri;

  // Get content type icon
  const getContentTypeIcon = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'video':
      case 'videos':
        return 'play';
      case 'audio':
      case 'music':
        return 'musical-notes';
      case 'sermon':
        return 'person';
      case 'image':
      case 'ebook':
      case 'books':
        return 'book';
      default:
        return 'document';
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType.toLowerCase()) {
      case 'video':
      case 'videos':
        return UI_CONFIG.COLORS.ERROR;
      case 'audio':
      case 'music':
        return UI_CONFIG.COLORS.SECONDARY;
      case 'sermon':
        return UI_CONFIG.COLORS.PRIMARY;
      case 'image':
      case 'ebook':
      case 'books':
        return UI_CONFIG.COLORS.INFO;
      default:
        return UI_CONFIG.COLORS.TEXT_SECONDARY;
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress(item, index);
    }
  };

  const handleLike = () => {
    if (onLike) {
      onLike(item);
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(item);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(item);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(item);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(item);
    }
  };

  // Card layout
  if (isCardLayout) {
    const cardHeight = isLargeSize ? 300 : 200;
    
    return (
      <View className="flex flex-col mb-4 bg-white rounded-lg shadow-md overflow-hidden">
        {/* Media Content */}
        <TouchableWithoutFeedback onPress={handlePress}>
          <View 
            className="relative"
            style={{ height: cardHeight }}
          >
            {/* Background Image/Thumbnail */}
            <Image
              source={
                thumbnailUri
                  ? { uri: thumbnailUri }
                  : { uri: 'https://via.placeholder.com/300x200/cccccc/ffffff?text=Media' }
              }
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
              }}
              resizeMode="cover"
            />

            {/* Content Type Icon - Top Left */}
            <View className="absolute top-3 left-3">
              <View 
                className="px-2 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: getContentTypeColor(item.contentType) }}
              >
                <Ionicons 
                  name={getContentTypeIcon(item.contentType) as any} 
                  size={14} 
                  color="#FFFFFF" 
                />
              </View>
            </View>

            {/* Title Overlay */}
            <View className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-md bg-black/50">
              <Text
                className="text-white font-semibold text-sm"
                numberOfLines={isLargeSize ? 3 : 2}
                style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {item.title}
              </Text>
            </View>

            {/* Play Button Overlay for Videos */}
            {(item.contentType === 'video' || item.contentType === 'videos') && (
              <View className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <View className="bg-white/90 p-2 rounded-full">
                  <Ionicons name="play" size={20} color={UI_CONFIG.COLORS.PRIMARY} />
                </View>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {/* Footer Content */}
        <View className="p-3">
          {/* User Info */}
          <View className="flex-row items-center mb-2">
            <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
              <Image
                source={getUserAvatarFromContent(item)}
                style={{ width: 24, height: 24, borderRadius: 12 }}
                resizeMode="cover"
              />
            </View>
            <View className="ml-2 flex-1">
              <Text className="text-xs font-semibold text-gray-800">
                {getUserDisplayNameFromContent(item)}
              </Text>
              <Text className="text-xs text-gray-500">
                {getTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>

          {/* Interaction Buttons */}
          <InteractionButtons
            item={item}
            contentId={contentId}
            onLike={handleLike}
            onComment={handleComment}
            onSave={handleSave}
            onShare={handleShare}
            onDownload={handleDownload}
            userLikeState={false}
            userSaveState={false}
            likeCount={item.likes || 0}
            saveCount={item.saves || 0}
            commentCount={item.comments || 0}
            viewCount={item.views || 0}
            isDownloaded={false}
            layout="horizontal"
          />
        </View>
      </View>
    );
  }

  // List layout
  return (
    <TouchableOpacity 
      className="flex-row items-center p-3 bg-white mb-2 rounded-lg shadow-sm"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200">
        <Image
          source={
            thumbnailUri
              ? { uri: thumbnailUri }
              : { uri: 'https://via.placeholder.com/64x64/cccccc/ffffff?text=Media' }
          }
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
        
        {/* Content Type Icon */}
        <View className="absolute top-1 left-1">
          <View 
            className="w-5 h-5 rounded-full items-center justify-center"
            style={{ backgroundColor: getContentTypeColor(item.contentType) }}
          >
            <Ionicons 
              name={getContentTypeIcon(item.contentType) as any} 
              size={10} 
              color="#FFFFFF" 
            />
          </View>
        </View>
      </View>

      {/* Content Info */}
      <View className="flex-1 ml-3">
        <Text className="text-sm font-semibold text-gray-800 mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        
        <View className="flex-row items-center">
          <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center">
            <Image
              source={getUserAvatarFromContent(item)}
              style={{ width: 16, height: 16, borderRadius: 8 }}
              resizeMode="cover"
            />
          </View>
          <Text className="text-xs text-gray-600 ml-2">
            {getUserDisplayNameFromContent(item)}
          </Text>
          <Text className="text-xs text-gray-500 ml-2">
            • {getTimeAgo(item.createdAt)}
          </Text>
        </View>

        {/* Quick Stats */}
        <View className="flex-row items-center mt-1">
          <Ionicons name="eye-outline" size={12} color="#9CA3AF" />
          <Text className="text-xs text-gray-500 ml-1">{item.views || 0}</Text>
          
          <Ionicons name="heart-outline" size={12} color="#9CA3AF" className="ml-3" />
          <Text className="text-xs text-gray-500 ml-1">{item.likes || 0}</Text>
          
          <Ionicons name="chatbubble-outline" size={12} color="#9CA3AF" className="ml-3" />
          <Text className="text-xs text-gray-500 ml-1">{item.comments || 0}</Text>
        </View>
      </View>

      {/* More Options */}
      <TouchableOpacity className="ml-2">
        <Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default MediaCard;