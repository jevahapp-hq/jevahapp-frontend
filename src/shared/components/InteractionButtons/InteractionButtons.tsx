import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { InteractionButtonsProps } from '../../types';
import { UI_CONFIG } from '../../constants';

export const InteractionButtons: React.FC<InteractionButtonsProps> = ({
  item,
  contentId,
  onLike,
  onComment,
  onSave,
  onShare,
  onDownload,
  userLikeState = false,
  userSaveState = false,
  likeCount = 0,
  saveCount = 0,
  commentCount = 0,
  viewCount = 0,
  isDownloaded = false,
  layout = 'horizontal',
}) => {
  const isHorizontal = layout === 'horizontal';

  const buttonStyle = {
    flexDirection: isHorizontal ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: isHorizontal ? 'space-between' : 'center',
    paddingVertical: UI_CONFIG.SPACING.SM,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
  };

  const iconStyle = {
    size: 28,
    marginBottom: isHorizontal ? 0 : UI_CONFIG.SPACING.XS,
    marginRight: isHorizontal ? UI_CONFIG.SPACING.SM : 0,
  };

  const textStyle = {
    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginTop: isHorizontal ? 0 : UI_CONFIG.SPACING.XS,
  };

  const countStyle = {
    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginLeft: isHorizontal ? UI_CONFIG.SPACING.XS : 0,
    marginTop: isHorizontal ? 0 : UI_CONFIG.SPACING.XS,
  };

  return (
    <View style={buttonStyle}>
      {/* Views */}
      <TouchableOpacity
        style={{
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
          marginRight: isHorizontal ? UI_CONFIG.SPACING.MD : 0,
          marginBottom: isHorizontal ? 0 : UI_CONFIG.SPACING.SM,
        }}
        disabled
      >
        <MaterialIcons
          name="visibility"
          size={iconStyle.size}
          color={UI_CONFIG.COLORS.TEXT_SECONDARY}
          style={{
            marginBottom: iconStyle.marginBottom,
            marginRight: iconStyle.marginRight,
          }}
        />
        <Text style={[textStyle, countStyle]}>{viewCount}</Text>
      </TouchableOpacity>

      {/* Like/Favorite */}
      <TouchableOpacity
        style={{
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
          marginRight: isHorizontal ? UI_CONFIG.SPACING.MD : 0,
          marginBottom: isHorizontal ? 0 : UI_CONFIG.SPACING.SM,
        }}
        onPress={onLike}
      >
        <MaterialIcons
          name={userLikeState ? 'favorite' : 'favorite-border'}
          size={iconStyle.size}
          color={userLikeState ? UI_CONFIG.COLORS.ERROR : UI_CONFIG.COLORS.TEXT_SECONDARY}
          style={{
            marginBottom: iconStyle.marginBottom,
            marginRight: iconStyle.marginRight,
            textShadowColor: userLikeState
              ? 'rgba(255, 23, 68, 0.6)'
              : 'transparent',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: userLikeState ? 10 : 0,
          }}
        />
        <Text style={[textStyle, countStyle]}>{likeCount}</Text>
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity
        style={{
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
          marginRight: isHorizontal ? UI_CONFIG.SPACING.MD : 0,
          marginBottom: isHorizontal ? 0 : UI_CONFIG.SPACING.SM,
        }}
        onPress={onComment}
      >
        <Ionicons
          name="chatbubble-outline"
          size={iconStyle.size}
          color={UI_CONFIG.COLORS.TEXT_SECONDARY}
          style={{
            marginBottom: iconStyle.marginBottom,
            marginRight: iconStyle.marginRight,
          }}
        />
        <Text style={[textStyle, countStyle]}>{commentCount}</Text>
      </TouchableOpacity>

      {/* Save/Bookmark */}
      <TouchableOpacity
        style={{
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
          marginRight: isHorizontal ? UI_CONFIG.SPACING.MD : 0,
          marginBottom: isHorizontal ? 0 : UI_CONFIG.SPACING.SM,
        }}
        onPress={onSave}
      >
        <MaterialIcons
          name={userSaveState ? 'bookmark' : 'bookmark-border'}
          size={iconStyle.size}
          color={userSaveState ? UI_CONFIG.COLORS.SECONDARY : UI_CONFIG.COLORS.TEXT_SECONDARY}
          style={{
            marginBottom: iconStyle.marginBottom,
            marginRight: iconStyle.marginRight,
          }}
        />
        <Text style={[textStyle, countStyle]}>{saveCount}</Text>
      </TouchableOpacity>

      {/* Download */}
      <TouchableOpacity
        style={{
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
          marginRight: isHorizontal ? UI_CONFIG.SPACING.MD : 0,
          marginBottom: isHorizontal ? 0 : UI_CONFIG.SPACING.SM,
        }}
        onPress={onDownload}
      >
        <Ionicons
          name={isDownloaded ? 'checkmark-circle' : 'download-outline'}
          size={iconStyle.size}
          color={isDownloaded ? UI_CONFIG.COLORS.SUCCESS : UI_CONFIG.COLORS.TEXT_SECONDARY}
          style={{
            marginBottom: iconStyle.marginBottom,
            marginRight: iconStyle.marginRight,
          }}
        />
        <Text style={[textStyle, countStyle]}>
          {isDownloaded ? 'Downloaded' : 'Download'}
        </Text>
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity
        style={{
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center',
        }}
        onPress={onShare}
      >
        <Ionicons
          name="share-outline"
          size={iconStyle.size}
          color={UI_CONFIG.COLORS.TEXT_SECONDARY}
          style={{
            marginBottom: iconStyle.marginBottom,
            marginRight: iconStyle.marginRight,
          }}
        />
        <Text style={[textStyle, countStyle]}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

export default InteractionButtons;