import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ApiError } from "../../../utils/apiErrorHandler";
import { Forum, ForumPost } from "../../../utils/communityAPI";
import { PostComposer } from "./PostComposer";
import { styles } from "../styles";

type ForumEmptyStatesProps = {
  isInitialLoading: boolean;
  categoriesError: ApiError | null;
  categories: Forum[];
  discussionsError: ApiError | null;
  discussions: Forum[];
  postsError: ApiError | null;
  posts: ForumPost[];
  selectedCategoryId: string | null;
  selectedForumId: string | null;
  activeDiscussionTitle?: string;
  newPostText: string;
  onChangeNewPostText: (text: string) => void;
  onStartConversation: () => void;
  onCreateForum: () => void;
};

export function ForumEmptyStates({
  isInitialLoading,
  categoriesError,
  categories,
  discussionsError,
  discussions,
  postsError,
  posts,
  selectedCategoryId,
  selectedForumId,
  activeDiscussionTitle,
  newPostText,
  onChangeNewPostText,
  onStartConversation,
  onCreateForum,
}: ForumEmptyStatesProps) {
  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DF930E" />
        <Text style={styles.loadingText}>Loading forum posts...</Text>
      </View>
    );
  }

  if (categoriesError && categories.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Error loading categories</Text>
        <Text style={styles.errorText}>
          {categoriesError?.error || "Unable to load forum categories."}
        </Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="layers-outline" size={80} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No forum categories yet</Text>
        <Text style={styles.emptyText}>
          Forum categories are required before discussions can begin. Please check
          back soon.
        </Text>
      </View>
    );
  }

  if (discussionsError && discussions.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Error loading forums</Text>
        <Text style={styles.errorText}>
          {discussionsError?.error ||
            "Unable to load forums for this category."}
        </Text>
      </View>
    );
  }

  if (discussions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-circle-outline" size={80} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No forums in this category</Text>
        <Text style={styles.emptyText}>
          Be the first to create a discussion in{" "}
          {categories.find((category) => category._id === selectedCategoryId)
            ?.title || "this category"}
          .
        </Text>
        <TouchableOpacity
          style={styles.createForumButtonInEmpty}
          onPress={onCreateForum}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.createForumButtonText}>Create Forum</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (postsError && posts.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Error loading posts</Text>
        <Text style={styles.errorText}>
          {postsError?.error || "Unable to load posts right now."}
        </Text>
      </View>
    );
  }

  if (!selectedForumId) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DF930E" />
        <Text style={styles.loadingText}>Select a forum to view posts</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyStateWithPostInput}>
        <View style={styles.emptyStateMessage}>
          <Ionicons name="chatbubbles-outline" size={80} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>
            Be the first to start a conversation in{" "}
            {activeDiscussionTitle || "this forum"}!
          </Text>
        </View>

        {selectedForumId && (
          <PostComposer
            forumTitle={activeDiscussionTitle}
            value={newPostText}
            onChangeText={onChangeNewPostText}
            onSubmit={onStartConversation}
          />
        )}
      </View>
    );
  }

  return null;
}
