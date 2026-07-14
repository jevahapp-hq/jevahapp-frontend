import { useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  SafeAreaView,
  StatusBar,
  View,
} from "react-native";
import BottomNavOverlay from "../../components/layout/BottomNavOverlay";
import { useForums, useForumPosts } from "../../hooks/useForums";
import { navigateMainTab } from "../../utils/navigation";
import { CategoryChipList } from "./components/CategoryChipList";
import { CreateForumModal } from "./components/CreateForumModal";
import { EditPostModal } from "./components/EditPostModal";
import { ForumEmptyStates } from "./components/ForumEmptyStates";
import { ForumHeader } from "./components/ForumHeader";
import { ForumPostCard } from "./components/ForumPostCard";
import { PostComposer } from "./components/PostComposer";
import { useCreateForum } from "./hooks/useCreateForum";
import { useForumAnimation } from "./hooks/useForumAnimation";
import { useForumOwnership } from "./hooks/useForumOwnership";
import { useForumPostActions } from "./hooks/useForumPostActions";
import { useForumSelection } from "./hooks/useForumSelection";
import { styles } from "./styles";

export default function ForumScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");

  const {
    categories,
    discussions,
    selectedCategoryId,
    selectCategory,
    categoriesLoading,
    discussionsLoading,
    categoriesError,
    discussionsError,
    createForum,
  } = useForums();

  const {
    selectedForumId,
    setSelectedForumId,
    setPendingForumId,
    handleCategorySelect,
  } = useForumSelection({ discussions, selectCategory });

  const {
    posts,
    loading: postsLoading,
    error: postsError,
    hasMore,
    loadMore,
    refresh: refreshPosts,
    createPost,
    updatePost,
    deletePost,
    likePost,
  } = useForumPosts(selectedForumId || "");

  const { slideAnim, handleBackToCommunity } = useForumAnimation();
  const selectedPostOwners = useForumOwnership(posts);

  const {
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
  } = useForumPostActions({
    selectedForumId,
    createPost,
    updatePost,
    deletePost,
    likePost,
    refreshPosts,
  });

  const {
    showCreateForumModal,
    forumTitle,
    setForumTitle,
    forumDescription,
    setForumDescription,
    selectedCategoryForCreation,
    setSelectedCategoryForCreation,
    isCreatingForum,
    openCreateForumModal,
    closeCreateForumModal,
    handleCreateForum,
  } = useCreateForum({
    categories,
    selectedCategoryId,
    discussions,
    createForum,
    selectCategory,
    setSelectedForumId,
    setPendingForumId,
  });

  const isInitialLoading =
    (categoriesLoading && categories.length === 0) ||
    (discussionsLoading && discussions.length === 0) ||
    (postsLoading && posts.length === 0);

  const activeDiscussion = selectedForumId
    ? discussions.find((discussion) => discussion._id === selectedForumId)
    : null;

  const emptyStates = (
    <ForumEmptyStates
      isInitialLoading={isInitialLoading}
      categoriesError={categoriesError}
      categories={categories}
      discussionsError={discussionsError}
      discussions={discussions}
      postsError={postsError}
      posts={posts}
      selectedCategoryId={selectedCategoryId}
      selectedForumId={selectedForumId}
      activeDiscussionTitle={activeDiscussion?.title}
      newPostText={newPostText}
      onChangeNewPostText={setNewPostText}
      onStartConversation={handleStartConversation}
      onCreateForum={openCreateForumModal}
    />
  );

  const showPostsList =
    !isInitialLoading &&
    !(categoriesError && categories.length === 0) &&
    categories.length > 0 &&
    !(discussionsError && discussions.length === 0) &&
    discussions.length > 0 &&
    !(postsError && posts.length === 0) &&
    !!selectedForumId &&
    posts.length > 0;

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView style={{ flex: 1, paddingTop: 20 }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FCFCFD" />

        <ForumHeader onBack={handleBackToCommunity} />

        <CategoryChipList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelect={handleCategorySelect}
        />

        {showPostsList ? (
          <FlatList
            style={styles.postsContainer}
            data={posts}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEndReached={() => {
              if (!postsLoading && hasMore) {
                loadMore();
              }
            }}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              postsLoading && posts.length > 0 ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#DF930E" />
                </View>
              ) : null
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            ListHeaderComponent={
              selectedForumId ? (
                <PostComposer
                  forumTitle={activeDiscussion?.title}
                  value={newPostText}
                  onChangeText={setNewPostText}
                  onSubmit={handleStartConversation}
                />
              ) : null
            }
            renderItem={({ item }) => (
              <ForumPostCard
                post={item}
                isOwner={selectedPostOwners[item._id] || false}
                onEdit={openEditPost}
                onDelete={handleDeletePost}
                onLike={handleLikePost}
              />
            )}
          />
        ) : (
          emptyStates
        )}

        <EditPostModal
          visible={!!editingPost}
          editPostText={editPostText}
          onChangeText={setEditPostText}
          onClose={closeEditPost}
          onSave={handleEditPost}
        />

        <CreateForumModal
          visible={showCreateForumModal}
          categories={categories}
          categoriesLoading={categoriesLoading}
          forumTitle={forumTitle}
          forumDescription={forumDescription}
          selectedCategoryForCreation={selectedCategoryForCreation}
          isCreatingForum={isCreatingForum}
          onChangeTitle={setForumTitle}
          onChangeDescription={setForumDescription}
          onSelectCategory={setSelectedCategoryForCreation}
          onClose={closeCreateForumModal}
          onSubmit={handleCreateForum}
        />

        <BottomNavOverlay
          selectedTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            navigateMainTab(tab as any);
          }}
        />
      </SafeAreaView>
    </Animated.View>
  );
}
