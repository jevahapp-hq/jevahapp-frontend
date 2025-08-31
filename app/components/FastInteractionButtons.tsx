import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { memo, useCallback, useMemo } from 'react';
import { Alert, Text, View } from 'react-native';
import { useCommentModal } from '../context/CommentModalContext';
import { useFastButton } from '../hooks/useFastButton';
import { useContentCount, useContentStats, useInteractionStore, useUserInteraction } from '../store/useInteractionStore';
import OptimizedTouchableOpacity from './OptimizedTouchableOpacity';

interface FastInteractionButtonsProps {
  contentId: string;
  contentType: 'video' | 'audio' | 'ebook' | 'sermon' | 'live';
  contentTitle: string;
  contentUrl?: string;
  layout?: 'vertical' | 'horizontal';
  iconSize?: number;
  showCounts?: boolean;
  onCommentPress?: () => void;
  compact?: boolean;
}

const FastInteractionButtons = memo<FastInteractionButtonsProps>(({
  contentId,
  contentType,
  contentTitle,
  contentUrl,
  layout = 'vertical',
  iconSize = 30,
  showCounts = true,
  onCommentPress,
  compact = false,
}) => {
  const {
    toggleLike,
    toggleSave,
    recordShare,
    loadContentStats,
    comments,
  } = useInteractionStore();

  const { showCommentModal } = useCommentModal();

  // Use selectors for better performance
  const contentStats = useContentStats(contentId);
  const isLiked = useUserInteraction(contentId, 'liked');
  const isSaved = useUserInteraction(contentId, 'saved');
  const likesCount = useContentCount(contentId, 'likes');
  const savesCount = useContentCount(contentId, 'saves');
  const sharesCount = useContentCount(contentId, 'shares');
  const commentsCount = useContentCount(contentId, 'comments');

  // Load stats when component mounts
  React.useEffect(() => {
    if (!contentStats) {
      loadContentStats(contentId);
    }
  }, [contentId, contentStats, loadContentStats]);

  // Optimized button handlers using fast button hook
  const handleLike = useCallback(async () => {
    try {
      await toggleLike(contentId, contentType);
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like. Please try again.');
    }
  }, [toggleLike, contentId, contentType]);

  const handleSave = useCallback(async () => {
    try {
      await toggleSave(contentId, contentType);
    } catch (error) {
      console.error('Error toggling save:', error);
      Alert.alert('Error', 'Failed to save content. Please try again.');
    }
  }, [toggleSave, contentId, contentType]);

  const handleShare = useCallback(async () => {
    try {
      const { Share } = await import('react-native');
      const shareOptions = {
        title: contentTitle,
        message: `Check out this ${contentType}: ${contentTitle}`,
        url: contentUrl || '',
      };

      const result = await Share.share(shareOptions);
      
      // Record share interaction if user actually shared
      if (result.action === Share.sharedAction) {
        await recordShare(contentId, contentType, result.activityType || 'generic');
      }
    } catch (error) {
      console.error('Error sharing content:', error);
      Alert.alert('Error', 'Failed to share content. Please try again.');
    }
  }, [recordShare, contentId, contentType, contentTitle, contentUrl]);

  const handleCommentPress = useCallback(() => {
    if (onCommentPress) {
      onCommentPress();
      return;
    }

    // Convert existing comments to the format expected by our global modal
    const currentComments = comments[contentId] || [];
    const formattedComments = currentComments.map((comment: any) => ({
      id: comment.id,
      userName: comment.username || 'Anonymous',
      avatar: comment.userAvatar || '',
      timestamp: comment.timestamp,
      comment: comment.comment,
      likes: comment.likes || 0,
      isLiked: comment.isLiked || false,
    }));

    // Show the global comment modal with contentId
    showCommentModal(formattedComments, contentId);
  }, [onCommentPress, comments, contentId, showCommentModal]);

  // Use fast button hooks for immediate response
  const likeButton = useFastButton(handleLike, {
    hapticType: 'light',
    preventRapidClicks: true,
    rapidClickThreshold: 50, // Faster threshold for like button
  });

  const saveButton = useFastButton(handleSave, {
    hapticType: 'light',
    preventRapidClicks: true,
    rapidClickThreshold: 50,
  });

  const shareButton = useFastButton(handleShare, {
    hapticType: 'medium',
    preventRapidClicks: true,
    rapidClickThreshold: 100,
  });

  const commentButton = useFastButton(handleCommentPress, {
    hapticType: 'light',
    preventRapidClicks: true,
    rapidClickThreshold: 50,
  });

  // Memoized styles for better performance
  const containerStyle = useMemo(() => {
    const baseStyle = {
      alignItems: 'center',
      justifyContent: 'center',
    };

    if (layout === 'vertical') {
      return {
        ...baseStyle,
        flexDirection: 'column' as const,
        gap: compact ? 8 : 16,
      };
    }

    return {
      ...baseStyle,
      flexDirection: 'row' as const,
      gap: compact ? 12 : 24,
    };
  }, [layout, compact]);

  const buttonStyle = useMemo(() => ({
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    padding: compact ? 4 : 8,
  }), [compact]);

  const countTextStyle = useMemo(() => ({
    fontSize: compact ? 8 : 10,
    color: 'white',
    fontWeight: '600',
    marginTop: 2,
  }), [compact]);

  const renderButton = useCallback((
    icon: React.ReactNode,
    onPress: () => void,
    count?: number,
    isActive?: boolean
  ) => (
    <OptimizedTouchableOpacity
      onPress={onPress}
      style={buttonStyle}
      variant="ghost"
      size="small"
      hapticFeedback={true}
      hapticType="light"
      preventRapidClicks={true}
      rapidClickThreshold={50}
    >
      {icon}
      {showCounts && count !== undefined && (
        <Text style={countTextStyle}>
          {count}
        </Text>
      )}
    </OptimizedTouchableOpacity>
  ), [buttonStyle, showCounts, countTextStyle]);

  return (
    <View style={containerStyle}>
      {/* Like Button */}
      {renderButton(
        <MaterialIcons
          name={isLiked ? "favorite" : "favorite-border"}
          size={iconSize}
          color={isLiked ? "#D22A2A" : "#FFFFFF"}
        />,
        likeButton.handlePress,
        likesCount,
        isLiked
      )}

      {/* Comment Button */}
      {renderButton(
        <Ionicons 
          name="chatbubble-sharp" 
          size={iconSize} 
          color="white" 
        />,
        commentButton.handlePress,
        commentsCount
      )}

      {/* Save Button */}
      {renderButton(
        <MaterialIcons
          name={isSaved ? "bookmark" : "bookmark-border"}
          size={iconSize}
          color={isSaved ? "#FEA74E" : "#FFFFFF"}
        />,
        saveButton.handlePress,
        savesCount,
        isSaved
      )}

      {/* Share Button */}
      {renderButton(
        <Ionicons 
          name="share-outline" 
          size={iconSize} 
          color="white" 
        />,
        shareButton.handlePress,
        sharesCount
      )}
    </View>
  );
});

FastInteractionButtons.displayName = 'FastInteractionButtons';

export default FastInteractionButtons;
