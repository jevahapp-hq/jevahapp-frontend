import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import {
    getResponsiveBorderRadius,
    getResponsiveSpacing,
    getResponsiveTextStyle,
} from '../../utils/responsive';
import { useOptimizedButton } from '../utils/performance';
import CommentModal from './CommentModal';

interface CommentButtonProps {
  contentId: string;
  contentTitle?: string;
  commentCount?: number;
  onCommentPosted?: (comment: any) => void;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

export default function CommentButton({
  contentId,
  contentTitle = 'Content',
  commentCount = 0,
  onCommentPosted,
  size = 'medium',
  showCount = true,
}: CommentButtonProps) {
  const [showCommentModal, setShowCommentModal] = useState(false);

  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return getResponsiveTextStyle('caption');
      case 'large': return getResponsiveTextStyle('body');
      default: return getResponsiveTextStyle('caption');
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return getResponsiveSpacing(4, 6, 8, 10);
      case 'large': return getResponsiveSpacing(8, 12, 16, 20);
      default: return getResponsiveSpacing(6, 8, 10, 12);
    }
  };

  const optimizedCommentHandler = useOptimizedButton(() => {
    setShowCommentModal(true);
  }, {
    debounceMs: 200,
    key: `comment-${contentId}`,
  });

  const handleCommentPosted = (comment: any) => {
    onCommentPosted?.(comment);
    setShowCommentModal(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={optimizedCommentHandler}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: getPadding(),
          borderRadius: getResponsiveBorderRadius('medium'),
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name="chatbubble-outline"
          size={getIconSize()}
          color="#6B7280"
          style={{ marginRight: showCount ? getResponsiveSpacing(4, 6, 8, 10) : 0 }}
        />
        {showCount && (
          <Text style={[
            getTextSize(),
            {
              color: '#6B7280',
              fontWeight: '500',
            }
          ]}>
            {commentCount}
          </Text>
        )}
      </TouchableOpacity>

      <CommentModal
        visible={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        contentId={contentId}
        contentTitle={contentTitle}
        onCommentPosted={handleCommentPosted}
      />
    </>
  );
}
