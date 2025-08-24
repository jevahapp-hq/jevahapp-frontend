import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    getResponsiveBorderRadius,
    getResponsiveShadow,
    getResponsiveSpacing,
    getResponsiveTextStyle,
} from '../../utils/responsive';
import CommentService, { Comment } from '../services/commentService';
import { useOptimizedButton } from '../utils/performance';

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle?: string;
  onCommentPosted?: (comment: Comment) => void;
}

export default function CommentModal({
  visible,
  onClose,
  contentId,
  contentTitle = 'Content',
  onCommentPosted,
}: CommentModalProps) {
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const commentService = CommentService.getInstance();

  // Mock user data (replace with actual user data)
  const currentUser = {
    id: 'user123',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
  };

  // Load comments when modal opens
  useEffect(() => {
    if (visible) {
      loadComments();
      // Focus input after a short delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [visible, contentId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await commentService.getComments(contentId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Failed to load comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!comment.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    setIsPosting(true);
    try {
      const newComment = await commentService.postComment(contentId, {
        text: comment.trim(),
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
      });

      if (newComment) {
        setComments(prev => [newComment, ...prev]);
        setComment('');
        
        // Notify parent component
        onCommentPosted?.(newComment);
        
        Alert.alert('Success', 'Comment posted successfully!');
      } else {
        Alert.alert('Error', 'Failed to post comment. Please try again.');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
      Alert.alert('Error', 'Failed to post comment. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    try {
      const success = await commentService.likeComment(contentId, commentId);
      if (success) {
        setComments(prev =>
          prev.map(c =>
            c.id === commentId ? { ...c, likes: c.likes + 1 } : c
          )
        );
      }
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const optimizedPostHandler = useOptimizedButton(handlePostComment, {
    debounceMs: 300,
    key: 'post-comment',
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
          paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          backgroundColor: 'white',
        }}>
          <TouchableOpacity
            onPress={onClose}
            style={{
              padding: getResponsiveSpacing(4, 6, 8, 10),
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>
          
          <Text style={[
            getResponsiveTextStyle('subtitle'),
            {
              fontWeight: '600',
              color: '#374151',
            }
          ]}>
            Comments
          </Text>
          
          <View style={{ width: 32 }} />
        </View>

        {/* Content */}
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
          {/* Content Title */}
          <View style={{
            paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
            paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          }}>
            <Text style={[
              getResponsiveTextStyle('caption'),
              {
                color: '#6B7280',
                marginBottom: getResponsiveSpacing(4, 6, 8, 10),
              }
            ]}>
              Commenting on
            </Text>
            <Text style={[
              getResponsiveTextStyle('body'),
              {
                fontWeight: '600',
                color: '#374151',
              }
            ]}>
              {contentTitle}
            </Text>
          </View>

          {/* Comments List */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
              paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
            }}
          >
            {isLoading ? (
              <View style={{
                alignItems: 'center',
                paddingVertical: getResponsiveSpacing(40, 44, 48, 52),
              }}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={[
                  getResponsiveTextStyle('caption'),
                  {
                    color: '#6B7280',
                    marginTop: getResponsiveSpacing(12, 16, 20, 24),
                  }
                ]}>
                  Loading comments...
                </Text>
              </View>
            ) : comments.length === 0 ? (
              <View style={{
                alignItems: 'center',
                paddingVertical: getResponsiveSpacing(40, 44, 48, 52),
              }}>
                <Ionicons
                  name="chatbubble-outline"
                  size={48}
                  color="#D1D5DB"
                />
                <Text style={[
                  getResponsiveTextStyle('body'),
                  {
                    color: '#6B7280',
                    marginTop: getResponsiveSpacing(12, 16, 20, 24),
                    textAlign: 'center',
                  }
                ]}>
                  No comments yet.{'\n'}Be the first to comment!
                </Text>
              </View>
            ) : (
              comments.map((comment) => (
                <View
                  key={comment.id}
                  style={{
                    backgroundColor: 'white',
                    padding: getResponsiveSpacing(12, 16, 20, 24),
                    marginBottom: getResponsiveSpacing(12, 16, 20, 24),
                    borderRadius: getResponsiveBorderRadius('medium'),
                    ...getResponsiveShadow(),
                  }}
                >
                  {/* Comment Header */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: getResponsiveSpacing(8, 12, 16, 20),
                  }}>
                    <View style={{
                      width: getResponsiveSpacing(32, 36, 40, 44),
                      height: getResponsiveSpacing(32, 36, 40, 44),
                      borderRadius: getResponsiveBorderRadius('round'),
                      backgroundColor: '#E5E7EB',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: getResponsiveSpacing(8, 12, 16, 20),
                    }}>
                      <Text style={[
                        getResponsiveTextStyle('caption'),
                        {
                          fontWeight: '600',
                          color: '#6B7280',
                        }
                      ]}>
                        {comment.userName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        getResponsiveTextStyle('caption'),
                        {
                          fontWeight: '600',
                          color: '#374151',
                        }
                      ]}>
                        {comment.userName}
                      </Text>
                      <Text style={[
                        getResponsiveTextStyle('caption'),
                        {
                          color: '#6B7280',
                          fontSize: 12,
                        }
                      ]}>
                        {formatTimestamp(comment.timestamp)}
                      </Text>
                    </View>
                  </View>

                  {/* Comment Text */}
                  <Text style={[
                    getResponsiveTextStyle('body'),
                    {
                      color: '#374151',
                      lineHeight: 20,
                      marginBottom: getResponsiveSpacing(8, 12, 16, 20),
                    }
                  ]}>
                    {comment.text}
                  </Text>

                  {/* Comment Actions */}
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                    <TouchableOpacity
                      onPress={() => handleLikeComment(comment.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: getResponsiveSpacing(4, 6, 8, 10),
                        paddingHorizontal: getResponsiveSpacing(8, 12, 16, 20),
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="heart-outline"
                        size={16}
                        color="#6B7280"
                        style={{ marginRight: getResponsiveSpacing(4, 6, 8, 10) }}
                      />
                      <Text style={[
                        getResponsiveTextStyle('caption'),
                        {
                          color: '#6B7280',
                        }
                      ]}>
                        {comment.likes}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Comment Input */}
          <View style={{
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
            paddingVertical: getResponsiveSpacing(12, 16, 20, 24),
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
            }}>
              <View style={{
                flex: 1,
                marginRight: getResponsiveSpacing(8, 12, 16, 20),
              }}>
                <TextInput
                  ref={inputRef}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Write a comment..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  maxLength={500}
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: getResponsiveBorderRadius('medium'),
                    paddingHorizontal: getResponsiveSpacing(12, 16, 20, 24),
                    paddingVertical: getResponsiveSpacing(8, 12, 16, 20),
                    minHeight: getResponsiveSpacing(40, 44, 48, 52),
                    maxHeight: getResponsiveSpacing(100, 120, 140, 160),
                    ...getResponsiveTextStyle('body'),
                    color: '#374151',
                  }}
                />
                <Text style={[
                  getResponsiveTextStyle('caption'),
                  {
                    color: '#9CA3AF',
                    textAlign: 'right',
                    marginTop: getResponsiveSpacing(4, 6, 8, 10),
                  }
                ]}>
                  {comment.length}/500
                </Text>
              </View>
              
              <TouchableOpacity
                onPress={optimizedPostHandler}
                disabled={isPosting || !comment.trim()}
                style={{
                  backgroundColor: comment.trim() ? '#6366F1' : '#D1D5DB',
                  paddingHorizontal: getResponsiveSpacing(16, 20, 24, 28),
                  paddingVertical: getResponsiveSpacing(8, 12, 16, 20),
                  borderRadius: getResponsiveBorderRadius('medium'),
                  minWidth: getResponsiveSpacing(60, 70, 80, 90),
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={[
                    getResponsiveTextStyle('button'),
                    {
                      color: 'white',
                      fontWeight: '600',
                    }
                  ]}>
                    Post
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
