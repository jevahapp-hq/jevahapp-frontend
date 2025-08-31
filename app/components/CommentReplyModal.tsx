import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    InteractionManager,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    GestureHandlerRootView,
    HandlerStateChangeEvent,
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useCommentModal } from '../context/CommentModalContext';
import { PerformanceOptimizer } from '../utils/performanceOptimization';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const INPUT_BAR_HEIGHT = 64; // height of the floating composer above keyboard

export default function CommentReplyModal() {
  const { isVisible, comments, hideCommentModal, likeComment, replyToComment, addComment } = useCommentModal();
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [mainInputText, setMainInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showInputModal, setShowInputModal] = useState(false);
  const mainInputRef = useRef<TextInput>(null);
  const replyInputRef = useRef<TextInput>(null);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      if (Platform.OS === 'android') {
        translateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 100 });
      }
      // Show input modal immediately when comment modal opens
      setShowInputModal(true);
      // Focus the main input so keyboard opens without extra tap
      setTimeout(() => {
        mainInputRef.current?.focus();
      }, 50);
    } else {
      if (Platform.OS === 'android') {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 400,
          easing: Easing.in(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT);
      }
      // Clear inputs when modal closes
      setMainInputText('');
      setReplyText('');
      setReplyingTo(null);
      setShowInputModal(false);
    }
  }, [isVisible]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        // Add platform-specific adjustments for better keyboard handling
        const adjustedHeight = Platform.OS === 'ios' 
          ? e.endCoordinates.height 
          : e.endCoordinates.height + (Platform.OS === 'android' ? 20 : 0);
        setKeyboardHeight(adjustedHeight);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    // Only allow downward swipe to close, and require a significant drag
    if (translationY > 0 && translationY > 50) {
      translateY.value = translationY;
      lastTranslateY.value = translationY;
    }
  };

  const onGestureEnd = (
    _event: HandlerStateChangeEvent<Record<string, unknown>>
  ) => {
    // Require a much larger drag distance to close the modal
    if (lastTranslateY.value > 200) {
      if (Platform.OS === 'android') {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 400,
          easing: Easing.in(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT);
      }
      runOnJS(hideCommentModal)();
    } else {
      // Always snap back to original position if not dragged enough
      if (Platform.OS === 'android') {
        translateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 100 });
      }
    }
  };

  const handleReply = useCallback((commentId: string) => {
    if (replyText.trim()) {
      InteractionManager.runAfterInteractions(() => {
        replyToComment(commentId, replyText);
        setReplyText('');
        setReplyingTo(null);
      });
    }
  }, [replyText, replyToComment]);

  const handleMainCommentSubmit = useCallback(() => {
    if (mainInputText.trim()) {
      InteractionManager.runAfterInteractions(() => {
        if (replyingTo) {
          // This is a reply to a specific comment
          replyToComment(replyingTo, mainInputText.trim());
        } else {
          // This is a new top-level comment
          const newComment = {
            id: Date.now().toString(),
            userName: 'Current User',
            avatar: '',
            timestamp: new Date().toISOString(),
            comment: mainInputText.trim(),
            likes: 0,
            isLiked: false,
            replies: [],
          };
          
          // Add the comment to the comments list
          addComment(newComment);
        }
        
        // Clear the input and reset reply state
        setMainInputText('');
        setReplyingTo(null);
      });
    }
  }, [mainInputText, replyingTo, replyToComment, addComment]);

  const formatTimestamp = (timestamp: string) => {
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
  };

  // Recursive component to render comments with their replies
  const CommentItem = ({ comment, level = 0 }: { comment: any; level?: number }) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isReply = level > 0;
    
    return (
      <View
        key={comment.id}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: level === 0 ? 1 : 0,
          borderBottomColor: '#F9FAFB',
          marginLeft: level * 20, // Indent replies
          backgroundColor: isReply ? '#F9FAFB' : 'transparent',
          borderRadius: isReply ? 8 : 0,
          marginBottom: isReply ? 8 : 0,
        }}
      >
        <View style={{ flexDirection: 'row' }}>
          {/* Avatar */}
          <View style={{ marginRight: 12 }}>
            {renderAvatar(comment.avatar, comment.userName)}
          </View>

          {/* Comment content */}
          <View style={{ flex: 1 }}>
            {/* User name and timestamp */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>
                {comment.userName}
              </Text>
              {isReply && (
                <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 4 }}>
                  replying to @{comment.parentUserName || 'user'}
                </Text>
              )}
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#F59E0B',
                  marginHorizontal: 8,
                }}
              />
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                {formatTimestamp(comment.timestamp)}
              </Text>
            </View>

            {/* Comment text */}
            <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 }}>
              {comment.comment}
            </Text>

            {/* Reply button - only show for top-level comments */}
            {level === 0 && (
              <TouchableOpacity
                onPress={PerformanceOptimizer.handleButtonPress(() => {
                  // Single click response - immediately set username and focus
                  setMainInputText(`@${comment.userName} `);
                  setReplyingTo(comment.id);
                  mainInputRef.current?.focus();
                }, { debounceMs: 100, key: `reply-${comment.id}` })}
                style={{ 
                  alignSelf: 'flex-start',
                  minHeight: 44, // Ensure minimum touch target
                  minWidth: 44,
                  justifyContent: 'center',
                  paddingVertical: 8,
                  paddingHorizontal: 12
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#10B981' }}>
                  REPLY
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Like button */}
          <View style={{ alignItems: 'center', marginLeft: 12 }}>
            <TouchableOpacity
              onPress={PerformanceOptimizer.handleButtonPress(() => likeComment(comment.id), { 
                debounceMs: 150, 
                key: `like-${comment.id}` 
              })}
              style={{ 
                alignItems: 'center',
                minHeight: 44, // Ensure minimum touch target
                minWidth: 44,
                justifyContent: 'center',
                paddingVertical: 8,
                paddingHorizontal: 8
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={comment.isLiked ? 'heart' : 'heart-outline'}
                size={20}
                color={comment.isLiked ? '#EF4444' : '#6B7280'}
              />
              <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                {comment.likes}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Render replies */}
        {hasReplies && (
          <View style={{ marginTop: 12 }}>
            {comment.replies.map((reply: any) => (
              <CommentItem 
                key={reply.id} 
                comment={reply} 
                level={level + 1} 
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAvatar = (avatar: string, userName: string) => {
    if (avatar && avatar.trim() && avatar.startsWith('http')) {
      return (
        <Image
          source={{ uri: avatar.trim() }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
          }}
        />
      );
    }
    
    // Fallback to initials
    return (
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: '#E5E7EB',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151' }}>
          {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
        </Text>
      </View>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ position: 'absolute', inset: 0, zIndex: 9999, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Background overlay - disabled touch to close */}
      <View
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      />

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onGestureEnd}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              position: 'absolute',
              bottom: 0,
              width: SCREEN_WIDTH,
              height: SCREEN_HEIGHT * 0.7,
              backgroundColor: 'white',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 20,
            },
          ]}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            enabled={true}
          >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151' }}>
              Comments
            </Text>
            <TouchableOpacity
              onPress={PerformanceOptimizer.handleButtonPress(hideCommentModal, { 
                debounceMs: 100, 
                key: 'close-modal' 
              })}
              style={{
                width: 44, // Increased for better touch target
                height: 44, // Increased for better touch target
                borderRadius: 22,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingBottom: (keyboardHeight > 0 ? keyboardHeight + (replyingTo ? INPUT_BAR_HEIGHT + 30 : INPUT_BAR_HEIGHT) + 24 : (replyingTo ? INPUT_BAR_HEIGHT + 30 : INPUT_BAR_HEIGHT) + 24) 
            }}
          >
            {comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                level={0} 
              />
            ))}
          </ScrollView>

          {/* Input Modal - Always visible when comment modal is open */}
          {showInputModal && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: keyboardHeight > 0 ? keyboardHeight : 0,
                backgroundColor: 'white',
                borderTopWidth: 1,
                borderTopColor: '#E5E7EB',
                paddingHorizontal: 12,
                paddingVertical: 10,
                height: replyingTo ? INPUT_BAR_HEIGHT + 30 : INPUT_BAR_HEIGHT,
                zIndex: 1000,
                // Add shadow for better visual separation
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: -2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              {/* Reply indicator */}
              {replyingTo && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 8,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <Text style={{
                    fontSize: 12,
                    color: '#6B7280',
                    fontWeight: '500',
                  }}>
                    Replying to {mainInputText.split('@')[1]?.split(' ')[0] || 'user'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setReplyingTo(null);
                      setMainInputText('');
                    }}
                    style={{
                      padding: 4,
                    }}
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              )}
              
              <View
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {/* Left Reply Icon */}
                <TouchableOpacity 
                  onPress={PerformanceOptimizer.handleButtonPress(() => {
                    // Handle back action
                    if (replyingTo) {
                      setReplyingTo(null);
                      setMainInputText('');
                    }
                  }, { debounceMs: 100, key: 'back-button' })}
                  style={{ 
                    width: 44, // Increased for better touch target
                    height: 44, // Increased for better touch target
                    borderRadius: 8, 
                    backgroundColor: 'white', 
                    borderWidth: 1, 
                    borderColor: '#D1D5DB',
                    justifyContent: 'center', 
                    alignItems: 'center',
                    marginRight: 8
                  }}
                  activeOpacity={0.7}
                >
                  <AntDesign name="back" size={15} color="black" />
                </TouchableOpacity>

                {/* Text input bubble */}
                <View style={{ 
                  flex: 1, 
                  backgroundColor: '#F9FAFB', 
                  borderRadius: 8, 
                  paddingHorizontal: 12, 
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: '#E5E7EB'
                }}>
                  <TextInput
                    ref={mainInputRef}
                    value={mainInputText}
                    onChangeText={setMainInputText}
                    placeholder={replyingTo ? `Replying to ${mainInputText.split('@')[1]?.split(' ')[0] || 'user'}` : "Add a comment..."}
                    placeholderTextColor="#6B7280"
                    style={{ 
                      fontSize: 14, 
                      color: '#374151', 
                      paddingVertical: 0,
                      minHeight: 20
                    }}
                    multiline
                    returnKeyType="send"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      if (mainInputText.trim()) {
                        handleMainCommentSubmit();
                      }
                    }}
                  />
                </View>

                {/* Right Send/Filter Icon */}
                <TouchableOpacity
                  onPress={PerformanceOptimizer.handleButtonPress(() => {
                    if (mainInputText.trim()) {
                      handleMainCommentSubmit();
                    }
                  }, { debounceMs: 100, key: 'send-button' })}
                  style={{
                    width: 44, // Increased for better touch target
                    height: 44, // Increased for better touch target
                    borderRadius: 8,
                    backgroundColor: mainInputText.trim() ? '#10B981' : '#D1D5DB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 8
                  }}
                  disabled={!mainInputText.trim()}
                  activeOpacity={0.7}
                >
                  <FontAwesome 
                    name="send-o" 
                    size={15} 
                    color="white" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
          </KeyboardAvoidingView>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}
