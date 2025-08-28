import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Modal,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useInteractionStore } from '../store/useInteractionStore';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface CommentsModalProps {
  isVisible: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle: string;
}

interface CommentItem {
  id: string;
  comment: string;
  username: string;
  userAvatar?: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies?: CommentItem[];
}

export default function CommentsModal({
  isVisible,
  onClose,
  contentId,
  contentTitle,
}: CommentsModalProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  const {
    addComment,
    loadComments,
    toggleCommentLike,
    comments,
    loadingComments,
  } = useInteractionStore();

  // Memoize the comments and loading state for this specific contentId
  const currentComments = useMemo(() => {
    return comments[contentId] || [];
  }, [comments, contentId]);

  const isLoading = useMemo(() => {
    return loadingComments[`${contentId}_comments`] || false;
  }, [loadingComments, contentId]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Load comments only once when modal becomes visible
  useEffect(() => {
    if (isVisible && contentId && !hasLoaded) {
      setHasLoaded(true);
      loadComments(contentId);
    }
  }, [isVisible, contentId, hasLoaded, loadComments]);

  // Reset loaded state when modal closes
  useEffect(() => {
    if (!isVisible) {
      setHasLoaded(false);
      setNewComment('');
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    }
  }, [isVisible]);

  // Focus input when modal opens
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isVisible]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setIsSubmitting(true);
    try {
      // Add haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      await addComment(contentId, newComment.trim());
      setNewComment('');
      
      // Scroll to bottom to show new comment
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, contentId, addComment]);

  const handleCommentLike = useCallback(async (commentId: string) => {
    try {
      // Add haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      await toggleCommentLike(commentId, contentId);
    } catch (error) {
      console.error('Error liking comment:', error);
      Alert.alert('Error', 'Failed to like comment. Please try again.');
    }
  }, [contentId, toggleCommentLike]);

  const formatTimeAgo = useCallback((timestamp: string) => {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffMs = now.getTime() - commentTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return commentTime.toLocaleDateString();
  }, []);

  const renderComment = useCallback(({ item }: { item: CommentItem }) => (
    <View className="flex-row px-4 py-3">
      {/* Avatar */}
      <View className="w-8 h-8 rounded-full bg-gray-300 mr-3 overflow-hidden">
        {item.userAvatar ? (
          <Image 
            source={{ uri: item.userAvatar }} 
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full bg-gray-400 justify-center items-center">
            <Text className="text-white text-xs font-rubik-semibold">
              {item.username?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
        )}
      </View>

      {/* Comment Content */}
      <View className="flex-1">
        <View className="flex-row items-center mb-1">
          <Text className="font-rubik-semibold text-gray-900 text-sm">
            {item.username || 'Anonymous'}
          </Text>
          <Text className="text-gray-500 text-xs ml-2 font-rubik">
            {formatTimeAgo(item.timestamp)}
          </Text>
        </View>
        
        <Text className="text-gray-800 text-sm font-rubik leading-5 mb-2">
          {item.comment}
        </Text>

        {/* Comment Actions */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => handleCommentLike(item.id)}
            className="flex-row items-center mr-4"
          >
            <Ionicons 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={item.isLiked ? "#EF4444" : "#9CA3AF"} 
            />
            <Text className="text-gray-500 text-xs ml-1 font-rubik">
              {item.likes}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center mr-4">
            <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" />
            <Text className="text-gray-500 text-xs ml-1 font-rubik">
              Reply
            </Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Text className="text-gray-500 text-xs font-rubik">
              More
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ), [handleCommentLike, formatTimeAgo]);

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-20">
      <Ionicons name="chatbubble-outline" size={48} color="#D1D5DB" />
      <Text className="text-gray-500 mt-4 font-rubik text-center text-base">
        No comments yet{'\n'}
        <Text className="text-gray-400">Be the first to comment!</Text>
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 justify-center items-center py-20">
      <ActivityIndicator size="large" color="#FEA74E" />
      <Text className="text-gray-500 mt-2 font-rubik">Loading comments...</Text>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <TouchableOpacity 
            onPress={onClose}
            className="p-1"
          >
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text className="text-lg font-rubik-semibold text-gray-900">
            Comments
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content Title */}
        <View className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <Text className="text-sm text-gray-600 font-rubik" numberOfLines={2}>
            {contentTitle}
          </Text>
        </View>

        {/* Comments List */}
        {isLoading && currentComments.length === 0 ? (
          renderLoadingState()
        ) : (
          <FlatList
            ref={flatListRef}
            data={currentComments as any}
            renderItem={renderComment as any}
            keyExtractor={(item: any) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              flexGrow: 1,
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 100
            }}
            ListEmptyComponent={renderEmptyState}
            onEndReachedThreshold={0.1}
            onEndReached={() => {
              // Load more comments if available
              if (currentComments.length > 0) {
                loadComments(contentId, Math.floor(currentComments.length / 20) + 1);
              }
            }}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Comment Input - Positioned absolutely above keyboard */}
        <View 
          className="border-t border-gray-200 bg-white px-4 py-3"
          style={{
            position: 'absolute',
            bottom: keyboardHeight > 0 ? keyboardHeight : 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <View className="flex-row items-end space-x-3">
            <View className="flex-1">
              <TextInput
                ref={inputRef}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                multiline
                maxLength={500}
                className="border border-gray-300 rounded-2xl px-4 py-3 max-h-20 font-rubik text-sm bg-gray-50"
                style={{ textAlignVertical: 'top' }}
                returnKeyType="send"
                onSubmitEditing={handleSubmitComment}
                blurOnSubmit={false}
              />
              {newComment.length > 0 && (
              <Text className="text-right text-xs text-gray-400 mt-1 font-rubik">
                {newComment.length}/500
              </Text>
              )}
            </View>
            
            <TouchableOpacity
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className={`px-4 py-3 rounded-full ${
                newComment.trim() && !isSubmitting
                  ? 'bg-[#FEA74E]'
                  : 'bg-gray-300'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={18} 
                  color={newComment.trim() ? "white" : "#9CA3AF"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}