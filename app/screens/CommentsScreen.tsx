import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import allMediaAPI from "../utils/allMediaAPI";

interface Comment {
  _id: string;
  comment: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  contentId: string;
  contentType: string;
  parentCommentId?: string;
  replies?: Comment[];
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

const CommentsScreen = () => {
  const router = useRouter();
  const { contentId, contentType = "media" } = useLocalSearchParams();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Load comments
  const loadComments = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        if (pageNum === 1) setLoading(true);

        const response = await allMediaAPI.getComments(
          contentType as string,
          contentId as string,
          pageNum,
          10
        );

        if (response.success) {
          const newComments = response.data.comments || [];

          if (append) {
            setComments((prev) => [...prev, ...newComments]);
          } else {
            setComments(newComments);
          }

          setHasMore(newComments.length === 10);
          setPage(pageNum);
        } else {
          Alert.alert("Error", response.error || "Failed to load comments");
        }
      } catch (error) {
        console.error("Error loading comments:", error);
        Alert.alert("Error", "Failed to load comments");
      } finally {
        setLoading(false);
      }
    },
    [contentId, contentType]
  );

  useEffect(() => {
    if (contentId) {
      loadComments(1, false);
    }
  }, [contentId, loadComments]);

  // Submit comment
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    try {
      setSubmitting(true);
      const response = await allMediaAPI.addComment(
        contentType as string,
        contentId as string,
        commentText.trim()
      );

      if (response.success) {
        setCommentText("");
        loadComments(1, false); // Reload comments
        Alert.alert("Success", "Comment added successfully");
      } else {
        Alert.alert("Error", response.error || "Failed to add comment");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      Alert.alert("Error", "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string) => {
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
                loadComments(1, false); // Reload comments
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
  };

  // Load more comments
  const loadMoreComments = () => {
    if (!loading && hasMore) {
      loadComments(page + 1, true);
    }
  };

  // Format time ago
  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const posted = new Date(createdAt);
    const diff = now.getTime() - posted.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Render comment item
  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.author?.firstName?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.commentAuthor}>
              {item.author?.firstName || "Unknown"}{" "}
              {item.author?.lastName || "User"}
            </Text>
            <Text style={styles.commentDate}>{getTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteComment(item._id)}
        >
          <Ionicons name="trash-outline" size={16} color="#e74c3c" />
        </TouchableOpacity>
      </View>
      <Text style={styles.commentText}>{item.comment}</Text>

      {/* Replies */}
      {item.replies && item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply) => (
            <View key={reply._id} style={styles.replyItem}>
              <View style={styles.replyHeader}>
                <View style={styles.replyAvatar}>
                  <Text style={styles.avatarText}>
                    {reply.author?.firstName?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
                <View style={styles.replyAuthorDetails}>
                  <Text style={styles.replyAuthor}>
                    {reply.author?.firstName || "Unknown"}{" "}
                    {reply.author?.lastName || "User"}
                  </Text>
                  <Text style={styles.replyDate}>
                    {getTimeAgo(reply.createdAt)}
                  </Text>
                </View>
              </View>
              <Text style={styles.replyText}>{reply.comment}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading && comments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#666" />
          <Text style={styles.loadingText}>Loading comments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={{ width: 24 }} />
        </View>

        <FlatList
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item._id}
          style={styles.commentsList}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreComments}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment!</Text>
            </View>
          }
          ListFooterComponent={
            loading && comments.length > 0 ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color="#666" />
              </View>
            ) : null
          }
        />

        <View style={styles.commentInput}>
          <TextInput
            style={styles.textInput}
            placeholder="Add a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            editable={!submitting}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || !commentText.trim()) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitComment}
            disabled={submitting || !commentText.trim()}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  loadingFooter: {
    padding: 16,
    alignItems: "center",
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e91e63",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  authorDetails: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  commentDate: {
    fontSize: 12,
    color: "#666",
  },
  commentText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginLeft: 40,
  },
  deleteButton: {
    padding: 4,
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 40,
  },
  replyItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#666",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  replyAuthorDetails: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  replyDate: {
    fontSize: 10,
    color: "#666",
  },
  replyText: {
    fontSize: 12,
    color: "#333",
    lineHeight: 16,
    marginLeft: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: "#e91e63",
    borderRadius: 20,
    padding: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 44,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
});

export default CommentsScreen;
