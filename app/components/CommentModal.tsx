import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useUserProfile } from "../hooks/useUserProfile";
import allMediaAPI from "../utils/allMediaAPI";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

// Professional modal dimensions following iOS/Android guidelines
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85; // 85% of screen height
const MODAL_TOP_OFFSET = Platform.OS === "ios" ? 60 : 40; // Safe area considerations
const INPUT_HEIGHT = 60; // Standard input height
const HEADER_HEIGHT = 60; // Standard header height

interface Comment {
  _id: string;
  content: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  parentCommentId?: string;
  replies?: Comment[];
  likes?: number;
  isLiked?: boolean;
}

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentTitle?: string;
  onCommentPosted?: (comment: Comment) => void;
  socketManager?: any;
}

const CommentModal: React.FC<CommentModalProps> = ({
  visible,
  onClose,
  contentId,
  contentTitle = "Content",
  onCommentPosted,
  socketManager,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyingToUser, setReplyingToUser] = useState<string>("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [commentLikes, setCommentLikes] = useState<Record<string, number>>({});

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const { user } = useUserProfile();

  // Professional animation values following modal design patterns
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const inputTranslateY = useRef(new Animated.Value(0)).current;
  const inputScale = useRef(new Animated.Value(1)).current;

  // Get current user data
  const currentUser = user
    ? {
        id: user.id || user._id || "unknown",
        name:
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "Anonymous User",
        avatar: user.avatar || "",
      }
    : {
        id: "unknown",
        name: "Anonymous User",
        avatar: "",
      };

  // Professional modal entrance animation following iOS/Android patterns
  useEffect(() => {
    if (visible) {
      // Reset animations
      backdropOpacity.setValue(0);
      modalTranslateY.setValue(MODAL_HEIGHT);
      modalOpacity.setValue(0);
      headerOpacity.setValue(0);
      contentOpacity.setValue(0);
      inputTranslateY.setValue(0);
      inputScale.setValue(1);

      // Professional staggered entrance sequence
      Animated.sequence([
        // Phase 1: Backdrop fade in
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        // Phase 2: Modal slide up with spring physics
        Animated.parallel([
          Animated.spring(modalTranslateY, {
            toValue: MODAL_TOP_OFFSET,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(modalOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Phase 3: Content fade in
        Animated.parallel([
          Animated.timing(headerOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(contentOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Professional exit animation
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalTranslateY, {
          toValue: MODAL_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(headerOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Professional keyboard handling - NO NAVIGATION BAR INTERFERENCE
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);

        // Professional input animation - moves up smoothly
        Animated.parallel([
          Animated.timing(inputTranslateY, {
            toValue:
              -e.endCoordinates.height + (Platform.OS === "ios" ? 0 : 20),
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(inputScale, {
            toValue: 1.02,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();

        // Auto-scroll to bottom with professional timing
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);

        // Professional input animation back
        Animated.parallel([
          Animated.timing(inputTranslateY, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.spring(inputScale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Load comments when modal opens
  useEffect(() => {
    if (visible && contentId) {
      loadComments();
    }
  }, [visible, contentId]);

  const loadComments = useCallback(
    async (pageNum: number = 1, refresh: boolean = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await allMediaAPI.getComments(
          "media",
          contentId,
          pageNum,
          20
        );

        if (response.success) {
          const newComments = response.data.comments || [];

          if (pageNum === 1) {
            setComments(newComments);
          } else {
            setComments((prev) => [...prev, ...newComments]);
          }

          setHasMore(newComments.length === 20);
          setPage(pageNum);
        } else {
          Alert.alert("Error", response.error || "Failed to load comments");
        }
      } catch (error) {
        console.error("Error loading comments:", error);
        Alert.alert("Error", "Failed to load comments");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [contentId]
  );

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }

    try {
      setSubmitting(true);

      const response = await allMediaAPI.addComment(
        "media",
        contentId,
        newComment.trim(),
        replyingTo || undefined
      );

      if (response.success) {
        const newCommentData = response.data;

        // Add the new comment to the top of the list
        setComments((prev) => [newCommentData, ...prev]);
        setNewComment("");
        setReplyingTo(null);
        setReplyingToUser("");

        // Notify parent component
        onCommentPosted?.(newCommentData);

        // Send real-time comment if socket manager is available
        if (socketManager) {
          socketManager.sendComment(contentId, "media", newComment.trim());
        }

        // Professional success feedback
        Alert.alert("Success", "Comment posted successfully!");
      } else {
        Alert.alert("Error", response.error || "Failed to post comment");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      Alert.alert("Error", "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }, [newComment, contentId, replyingTo, onCommentPosted, socketManager]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await allMediaAPI.deleteComment(commentId);

              if (response.success) {
                setComments((prev) =>
                  prev.filter((comment) => comment._id !== commentId)
                );
                Alert.alert("Success", "Comment deleted successfully");
              } else {
                Alert.alert(
                  "Error",
                  response.error || "Failed to delete comment"
                );
              }
            } catch (error) {
              console.error("Error deleting comment:", error);
              Alert.alert("Error", "Failed to delete comment");
            }
          },
        },
      ]
    );
  }, []);

  const handleReply = useCallback((commentId: string, userName: string) => {
    setReplyingTo(commentId);
    setReplyingToUser(userName);
    inputRef.current?.focus();
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyingToUser("");
  }, []);

  const toggleReplies = useCallback((commentId: string) => {
    setShowReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }, []);

  const handleLikeComment = useCallback(
    async (commentId: string) => {
      const isLiked = likedComments.has(commentId);
      const currentLikes = commentLikes[commentId] || 0;

      // Optimistic update
      setLikedComments((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(commentId);
        } else {
          newSet.add(commentId);
        }
        return newSet;
      });

      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: isLiked ? currentLikes - 1 : currentLikes + 1,
      }));

      // TODO: Call API to like/unlike comment
      // await allMediaAPI.likeComment(commentId);
    },
    [likedComments, commentLikes]
  );

  const handleRefresh = useCallback(() => {
    loadComments(1, true);
  }, [loadComments]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadComments(page + 1);
    }
  }, [loading, hasMore, page, loadComments]);

  // Professional date formatting
  const formatDate = useCallback((dateString: string) => {
    try {
      // Handle different date formats from mock data
      let date: Date;

      if (dateString.includes("HRS AGO") || dateString.includes("HRS")) {
        const hours = parseInt(dateString.replace(/\D/g, ""));
        date = new Date(Date.now() - hours * 60 * 60 * 1000);
      } else if (
        dateString.includes("DAYS AGO") ||
        dateString.includes("DAY")
      ) {
        const days = parseInt(dateString.replace(/\D/g, ""));
        date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      } else if (dateString.includes("W")) {
        const weeks = parseInt(dateString.replace(/\D/g, ""));
        date = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
      } else {
        date = new Date(dateString);
      }

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      if (diffInMinutes < 1) return "now";
      if (diffInMinutes < 60) return `${diffInMinutes}m`;
      if (diffInHours < 24) return `${diffInHours}h`;
      if (diffInDays < 7) return `${diffInDays}d`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "now";
    }
  }, []);

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => {
      const hasReplies = item.replies && item.replies.length > 0;
      const showRepliesForThis = showReplies[item._id];
      const isLiked = likedComments.has(item._id);
      const likeCount = commentLikes[item._id] || item.likes || 0;

      return (
        <View style={styles.commentItem}>
          <View style={styles.commentHeader}>
            <View style={styles.commentAuthor}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.user.firstName?.[0]?.toUpperCase() || "U"}
                </Text>
              </View>
              <View style={styles.commentInfo}>
                <Text style={styles.authorName}>
                  {item.user.firstName} {item.user.lastName}
                </Text>
                <Text style={styles.commentDate}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => handleDeleteComment(item._id)}
            >
              <Icon name="more-vert" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.commentContent}>{item.content}</Text>

          {/* Professional Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleLikeComment(item._id)}
            >
              <Icon
                name={isLiked ? "favorite" : "favorite-border"}
                size={16}
                color={isLiked ? "#e91e63" : "#666"}
              />
              <Text style={[styles.actionText, isLiked && styles.likedText]}>
                {likeCount > 0 ? likeCount : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                handleReply(
                  item._id,
                  `${item.user.firstName} ${item.user.lastName}`
                )
              }
            >
              <Icon name="reply" size={16} color="#666" />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>

            {hasReplies && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => toggleReplies(item._id)}
              >
                <Icon
                  name={
                    showRepliesForThis
                      ? "keyboard-arrow-up"
                      : "keyboard-arrow-down"
                  }
                  size={16}
                  color="#666"
                />
                <Text style={styles.actionText}>
                  {showRepliesForThis ? "Hide" : "Show"} {item.replies?.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Professional Replies Section */}
          {hasReplies && showRepliesForThis && (
            <View style={styles.repliesContainer}>
              {item.replies?.map((reply) => (
                <View key={reply._id} style={styles.replyItem}>
                  <View style={styles.replyHeader}>
                    <View style={styles.replyAvatar}>
                      <Text style={styles.replyAvatarText}>
                        {reply.user.firstName?.[0]?.toUpperCase() || "U"}
                      </Text>
                    </View>
                    <View style={styles.replyInfo}>
                      <Text style={styles.replyAuthorName}>
                        {reply.user.firstName} {reply.user.lastName}
                      </Text>
                      <Text style={styles.replyDate}>
                        {formatDate(reply.createdAt)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.replyContent}>{reply.content}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      );
    },
    [
      showReplies,
      likedComments,
      commentLikes,
      formatDate,
      handleDeleteComment,
      handleLikeComment,
      handleReply,
      toggleReplies,
    ]
  );

  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#666" />
      </View>
    );
  }, [loading]);

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Icon name="chat-bubble-outline" size={64} color="#ddd" />
        <Text style={styles.emptyText}>No comments yet</Text>
        <Text style={styles.emptySubtext}>
          Be the first to share your thoughts!
        </Text>
      </View>
    ),
    []
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <StatusBar
        backgroundColor="rgba(0, 0, 0, 0.5)"
        barStyle="light-content"
      />

      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: modalOpacity,
              transform: [{ translateY: modalTranslateY }],
            },
          ]}
        >
          {/* Professional Header */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerOpacity,
              },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Comments</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Content Title */}
          <Animated.View
            style={[
              styles.contentTitleContainer,
              {
                opacity: contentOpacity,
              },
            ]}
          >
            <Text style={styles.contentTitle} numberOfLines={2}>
              {contentTitle}
            </Text>
          </Animated.View>

          {/* Comments List */}
          <Animated.View
            style={[
              styles.commentsContainer,
              {
                opacity: contentOpacity,
              },
            ]}
          >
            <FlatList
              ref={flatListRef}
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item._id}
              style={styles.commentsList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={["#007AFF"]}
                  tintColor="#007AFF"
                />
              }
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmpty}
              contentContainerStyle={{
                paddingBottom: isKeyboardVisible ? keyboardHeight + 120 : 120,
              }}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>

          {/* Professional Reply Indicator */}
          {replyingTo && (
            <View style={styles.replyIndicator}>
              <View style={styles.replyIndicatorContent}>
                <Text style={styles.replyIndicatorText}>
                  Replying to {replyingToUser}
                </Text>
                <TouchableOpacity onPress={handleCancelReply}>
                  <Icon name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Professional Comment Input */}
          <Animated.View
            style={[
              styles.inputContainer,
              {
                transform: [
                  { translateY: inputTranslateY },
                  { scale: inputScale },
                ],
              },
            ]}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                placeholder={
                  replyingTo
                    ? `Reply to ${replyingToUser}...`
                    : "Add a comment..."
                }
                placeholderTextColor="#999"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newComment.trim() || submitting) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    position: "absolute",
    top: MODAL_TOP_OFFSET,
    left: 0,
    right: 0,
    height: MODAL_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  contentTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  contentTitle: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  commentsContainer: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
  },
  commentItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  commentAuthor: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  commentInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
  },
  commentDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  commentContent: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 12,
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
  },
  actionText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    fontWeight: "500",
  },
  likedText: {
    color: "#e91e63",
  },
  repliesContainer: {
    marginTop: 16,
    marginLeft: 24,
    paddingLeft: 20,
    borderLeftWidth: 2,
    borderLeftColor: "#e0e0e0",
  },
  replyItem: {
    marginBottom: 16,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  replyAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  replyAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  replyInfo: {
    flex: 1,
  },
  replyAuthorName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#000",
  },
  replyDate: {
    fontSize: 11,
    color: "#999",
    marginTop: 1,
  },
  replyContent: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginLeft: 38,
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: INPUT_HEIGHT,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingHorizontal: 20,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    fontSize: 15,
    backgroundColor: "#f8f9fa",
    color: "#000",
    maxHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  replyIndicator: {
    position: "absolute",
    bottom: INPUT_HEIGHT,
    left: 0,
    right: 0,
    backgroundColor: "#f0f8ff",
    borderTopWidth: 1,
    borderTopColor: "#007AFF",
  },
  replyIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  replyIndicatorText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});

export default CommentModal;
