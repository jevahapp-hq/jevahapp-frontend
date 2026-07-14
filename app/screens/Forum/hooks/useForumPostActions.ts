import { useState } from "react";
import { Alert } from "react-native";
import { ForumPost as ForumPostType } from "../../../utils/communityAPI";
import { validateForumPostForm } from "../../../utils/communityHelpers";
import { embedLinksFromText } from "../utils/embedLinksFromText";

type CreatePostFn = (data: {
  content: string;
  embeddedLinks?: any[];
}) => Promise<any>;

type UpdatePostFn = (
  postId: string,
  data: { content: string; embeddedLinks?: any[] }
) => Promise<any>;

type DeletePostFn = (postId: string) => Promise<any>;

type LikePostFn = (
  postId: string,
  userLiked: boolean,
  likesCount: number
) => Promise<any>;

type RefreshPostsFn = () => Promise<any>;

type UseForumPostActionsArgs = {
  selectedForumId: string | null;
  createPost: CreatePostFn;
  updatePost: UpdatePostFn;
  deletePost: DeletePostFn;
  likePost: LikePostFn;
  refreshPosts: RefreshPostsFn;
};

export function useForumPostActions({
  selectedForumId,
  createPost,
  updatePost,
  deletePost,
  likePost,
  refreshPosts,
}: UseForumPostActionsArgs) {
  const [newPostText, setNewPostText] = useState("");
  const [editingPost, setEditingPost] = useState<ForumPostType | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPosts();
    setRefreshing(false);
  };

  const handleStartConversation = async () => {
    if (!newPostText.trim()) {
      Alert.alert("Error", "Please enter your message");
      return;
    }

    if (!selectedForumId) {
      Alert.alert("Error", "No forum selected");
      return;
    }

    const embeddedLinks = await embedLinksFromText(newPostText);

    const validation = validateForumPostForm({
      content: newPostText,
      embeddedLinks: embeddedLinks.length > 0 ? embeddedLinks : undefined,
    });

    if (!validation.valid) {
      Alert.alert("Validation Error", validation.errors.join("\n"));
      return;
    }

    const result = await createPost({
      content: newPostText,
      embeddedLinks: embeddedLinks.length > 0 ? embeddedLinks : undefined,
    });

    if (result) {
      setNewPostText("");
      Alert.alert("Success", "Post created successfully!");
    }
  };

  const handleLikePost = async (post: ForumPostType) => {
    await likePost(post._id, post.userLiked || false, post.likesCount || 0);
  };

  const handleEditPost = async () => {
    if (!editingPost || !editPostText.trim()) {
      Alert.alert("Error", "Please enter your message");
      return;
    }

    const embeddedLinks = await embedLinksFromText(editPostText);

    const validation = validateForumPostForm({
      content: editPostText,
      embeddedLinks: embeddedLinks.length > 0 ? embeddedLinks : undefined,
    });

    if (!validation.valid) {
      Alert.alert("Validation Error", validation.errors.join("\n"));
      return;
    }

    const result = await updatePost(editingPost._id, {
      content: editPostText,
      embeddedLinks: embeddedLinks.length > 0 ? embeddedLinks : undefined,
    });

    if (result) {
      setEditingPost(null);
      setEditPostText("");
      Alert.alert("Success", "Post updated successfully!");
    } else {
      Alert.alert("Error", "Failed to update post. Please try again.");
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deletePost(postId);
            if (result) {
              Alert.alert("Success", "Post deleted successfully!");
            } else {
              Alert.alert("Error", "Failed to delete post. Please try again.");
            }
          },
        },
      ]
    );
  };

  const openEditPost = (post: ForumPostType) => {
    setEditingPost(post);
    setEditPostText(post.content);
  };

  const closeEditPost = () => {
    setEditingPost(null);
    setEditPostText("");
  };

  return {
    newPostText,
    setNewPostText,
    editingPost,
    editPostText,
    setEditPostText,
    refreshing,
    handleRefresh,
    handleStartConversation,
    handleLikePost,
    handleEditPost,
    handleDeletePost,
    openEditPost,
    closeEditPost,
  };
}
