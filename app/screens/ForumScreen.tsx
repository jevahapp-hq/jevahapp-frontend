import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";
import { useForums, useForumPosts, isForumPostOwner } from "../hooks/useForums";
import { formatTimestamp } from "../utils/communityHelpers";
import { ForumPost as ForumPostType, Forum } from "../utils/communityAPI";
import { extractLinkMetadata, validateForumPostForm } from "../utils/communityHelpers";

export default function ForumScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();
  const [newPostText, setNewPostText] = useState("");
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingPost, setEditingPost] = useState<ForumPostType | null>(null);
  const [editPostText, setEditPostText] = useState("");
  const [selectedPostOwners, setSelectedPostOwners] = useState<Record<string, boolean>>({});
  const [showCreateForumModal, setShowCreateForumModal] = useState(false);
  const [forumTitle, setForumTitle] = useState("");
  const [forumDescription, setForumDescription] = useState("");
  const [isCreatingForum, setIsCreatingForum] = useState(false);
  const slideAnim = useRef(
    new Animated.Value(Dimensions.get("window").width)
  ).current;

  // Get forums and posts
  const { forums, loading: forumsLoading, error: forumsError, createForum, loadForums } = useForums();
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
  
  // Only load posts when we have a forum selected
  const shouldLoadPosts = !!selectedForumId;

  // Check ownership for each post
  useEffect(() => {
    const checkOwnership = async () => {
      const ownershipMap: Record<string, boolean> = {};
      for (const post of posts) {
        ownershipMap[post._id] = await isForumPostOwner(post);
      }
      setSelectedPostOwners(ownershipMap);
    };
    if (posts.length > 0) {
      checkOwnership();
    }
  }, [posts]);

  // Set default forum when forums load
  useEffect(() => {
    if (forums.length > 0 && !selectedForumId) {
      setSelectedForumId(forums[0]._id);
    }
  }, [forums, selectedForumId]);

  useEffect(() => {
    // Slide in animation from right to left
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPosts();
    setRefreshing(false);
  };

  const handleBackToCommunity = () => {
    // Slide out animation to the right
    Animated.timing(slideAnim, {
      toValue: Dimensions.get("window").width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      router.push("/screens/PrayerWallScreen");
    });
  };

  const handleVideoPress = (url: string) => {
    Linking.openURL(url);
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

    // Extract links from text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = newPostText.match(urlRegex) || [];
    const embeddedLinks: any[] = [];

    // Process each URL
    for (const url of urls.slice(0, 5)) {
      // Remove URL from text (we'll show it in the embedded link)
      const linkMetadata = await extractLinkMetadata(url);
      embeddedLinks.push({
        url,
        ...linkMetadata,
      });
    }

    // Validate form
    const validation = validateForumPostForm({
      content: newPostText,
      embeddedLinks: embeddedLinks.length > 0 ? embeddedLinks : undefined,
    });

    if (!validation.valid) {
      Alert.alert("Validation Error", validation.errors.join("\n"));
      return;
    }

    // Create post
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
    await likePost(
      post._id,
      post.userLiked || false,
      post.likesCount || 0
    );
  };

  const handleEditPost = async () => {
    if (!editingPost || !editPostText.trim()) {
      Alert.alert("Error", "Please enter your message");
      return;
    }

    // Extract links from text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = editPostText.match(urlRegex) || [];
    const embeddedLinks: any[] = [];

    // Process each URL
    for (const url of urls.slice(0, 5)) {
      const linkMetadata = await extractLinkMetadata(url);
      embeddedLinks.push({
        url,
        ...linkMetadata,
      });
    }

    // Validate form
    const validation = validateForumPostForm({
      content: editPostText,
      embeddedLinks: embeddedLinks.length > 0 ? embeddedLinks : undefined,
    });

    if (!validation.valid) {
      Alert.alert("Validation Error", validation.errors.join("\n"));
      return;
    }

    // Update post
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

  const handleCreateForum = async () => {
    // Validation
    if (!forumTitle.trim() || forumTitle.trim().length < 3) {
      Alert.alert("Validation Error", "Forum title must be at least 3 characters");
      return;
    }

    if (forumTitle.trim().length > 100) {
      Alert.alert("Validation Error", "Forum title must be less than 100 characters");
      return;
    }

    if (!forumDescription.trim() || forumDescription.trim().length < 10) {
      Alert.alert("Validation Error", "Forum description must be at least 10 characters");
      return;
    }

    if (forumDescription.trim().length > 500) {
      Alert.alert("Validation Error", "Forum description must be less than 500 characters");
      return;
    }

    setIsCreatingForum(true);

    try {
      const result = await createForum({
        title: forumTitle.trim(),
        description: forumDescription.trim(),
      });

      if (result) {
        // Clear form
        setForumTitle("");
        setForumDescription("");
        setShowCreateForumModal(false);
        
        // Select the newly created forum
        setSelectedForumId(result._id);
        
        // Refresh forums list
        await loadForums();
        
        Alert.alert("Success", "Forum created successfully!");
      } else {
        Alert.alert("Error", "Failed to create forum. Please try again.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create forum. Please try again.");
    } finally {
      setIsCreatingForum(false);
    }
  };

  // Helper to get author name
  const getAuthorName = (post: ForumPostType): string => {
    if (post.author?.firstName && post.author?.lastName) {
      return `${post.author.firstName} ${post.author.lastName}`;
    }
    if (post.user?.firstName && post.user?.lastName) {
      return `${post.user.firstName} ${post.user.lastName}`;
    }
    if (post.author?.username) {
      return post.author.username;
    }
    if (post.user?.username) {
      return post.user.username;
    }
    return "User";
  };

  // Helper to get author initials
  const getAuthorInitials = (post: ForumPostType): string => {
    const name = getAuthorName(post);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderForumPost = (post: ForumPostType) => {
    const isOwner = selectedPostOwners[post._id] || false;

    return (
      <View key={post._id} style={styles.postContainer}>
      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
              {(post.author?.avatarUrl || post.user?.avatar) ? (
                <Image
                  source={{ uri: post.author?.avatarUrl || post.user?.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>{getAuthorInitials(post)}</Text>
              )}
          </View>
        </View>
        <View style={styles.userDetails}>
            <Text style={styles.userName}>{getAuthorName(post)}</Text>
            {post.forum?.title && (
              <Text style={styles.forumBadge}>{post.forum.title}</Text>
            )}
        </View>
          {isOwner && (
            <View style={styles.postActions}>
              <TouchableOpacity
                onPress={() => {
                  setEditingPost(post);
                  setEditPostText(post.content);
                }}
                style={styles.actionButton}
              >
                <Ionicons name="create-outline" size={18} color="#256E63" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeletePost(post._id)}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
      </View>

      {/* Post Content */}
      <View style={styles.postContent}>
        <Text style={styles.postText}>{post.content}</Text>
        <Text style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Text>

        {/* Embedded Links */}
        {post.embeddedLinks && post.embeddedLinks.length > 0 && (
          <View style={styles.embeddedLinksContainer}>
            {post.embeddedLinks.map((link, index) => (
          <TouchableOpacity
                key={index}
            style={styles.videoContainer}
                onPress={() => handleVideoPress(link.url)}
            activeOpacity={0.8}
          >
                {link.thumbnail && (
            <View style={styles.videoThumbnail}>
                    <Text style={styles.videoThumbnailText}>
                      {link.type === "video" ? "VIDEO" : "LINK"}
                    </Text>
              <View style={styles.playButton}>
                      <Ionicons
                        name={link.type === "video" ? "play" : "link"}
                        size={24}
                        color="white"
                      />
              </View>
            </View>
                )}
                {link.title && (
                  <Text style={styles.videoTitle}>{link.title}</Text>
                )}
                {link.description && (
                  <Text style={styles.videoDescription}>
                    {link.description}
                  </Text>
                )}
                <Text style={styles.videoUrl}>{link.url}</Text>
          </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Interaction Bar */}
      <View style={styles.interactionBar}>
        <View style={styles.leftInteractions}>
          <TouchableOpacity
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() => handleLikePost(post)}
          >
            <Ionicons
              name={post.userLiked ? "heart" : "heart-outline"}
              size={20}
              color={post.userLiked ? "#EF4444" : "#666"}
            />
            <Text style={styles.interactionText}>
              {post.likesCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.interactionButton}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/screens/ThreadScreen",
                params: { postId: post._id },
              })
            }
          >
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>
              {post.commentsCount || 0}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.interactionButton}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/screens/ThreadScreen",
              params: { postId: post._id },
            })
          }
        >
          <Text style={styles.greaterThanIcon}>{">"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  };

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateX: slideAnim }] }]}
    >
      <SafeAreaView style={{ flex: 1, paddingTop: 20 }}>
        <StatusBar barStyle="dark-content" backgroundColor="#FCFCFD" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBackToCommunity}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Forum</Text>

          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Forum Category Selector */}
        {forums.length > 0 && (
          <View style={styles.forumSelectorContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={forums}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.forumSelectorContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.forumChip,
                    selectedForumId === item._id && styles.forumChipActive,
                  ]}
                  onPress={() => setSelectedForumId(item._id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.forumChipText,
                      selectedForumId === item._id && styles.forumChipTextActive,
                    ]}
                  >
                    {item.title}
                  </Text>
          </TouchableOpacity>
              )}
            />
        </View>
        )}

        {/* Forum Posts */}
        {forumsLoading || postsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#DF930E" />
            <Text style={styles.loadingText}>Loading forum posts...</Text>
          </View>
        ) : forumsError && forums.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Error loading forums</Text>
            <Text style={styles.errorText}>{forumsError.error}</Text>
          </View>
        ) : postsError && posts.length === 0 ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={styles.errorTitle}>Error loading posts</Text>
            <Text style={styles.errorText}>{postsError.error}</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={80} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Be the first to start a conversation in the forum!
            </Text>
            <TouchableOpacity
              style={styles.createForumButtonInEmpty}
              onPress={() => setShowCreateForumModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createForumButtonText}>Create Forum</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
                <View style={styles.startConversationContainer}>
                  <View style={styles.plusButton}>
                    <Ionicons name="chatbubbles-outline" size={20} color="#666" />
                  </View>

                  <TextInput
                    style={styles.conversationInput}
                    placeholder={`Start a conversation in ${forums.find(f => f._id === selectedForumId)?.title || "this forum"}...`}
                    placeholderTextColor="#9CA3AF"
                    value={newPostText}
                    onChangeText={setNewPostText}
                    multiline
                    maxLength={5000}
                  />

                  {newPostText.trim().length > 0 && (
                    <TouchableOpacity
                      style={styles.sendButton}
                      onPress={handleStartConversation}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="send" size={20} color="#256E63" />
                  </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
            renderItem={({ item }) => renderForumPost(item)}
          />
        )}

        {/* Edit Post Modal */}
        <Modal
          visible={!!editingPost}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setEditingPost(null);
            setEditPostText("");
          }}
        >
          <View style={styles.editModal}>
            <View style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>Edit Post</Text>
                <TouchableOpacity
                  onPress={() => {
                    setEditingPost(null);
                    setEditPostText("");
                  }}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
            </View>
              <TextInput
                style={styles.editInput}
                value={editPostText}
                onChangeText={setEditPostText}
                placeholder="Edit your post..."
                multiline
                maxLength={5000}
                autoFocus
              />
              <View style={styles.editModalActions}>
                <TouchableOpacity
                  style={[styles.editButton, styles.cancelEditButton]}
                  onPress={() => {
                    setEditingPost(null);
                    setEditPostText("");
                  }}
                >
                  <Text style={styles.cancelEditButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, styles.saveEditButton]}
                  onPress={handleEditPost}
                  disabled={!editPostText.trim()}
                >
                  <Text style={styles.saveEditButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Forum Modal */}
        <Modal
          visible={showCreateForumModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowCreateForumModal(false);
            setForumTitle("");
            setForumDescription("");
          }}
        >
          <View style={styles.createForumModal}>
            <View style={styles.createForumModalContent}>
              <View style={styles.createForumModalHeader}>
                <Text style={styles.createForumModalTitle}>Create Forum</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreateForumModal(false);
                    setForumTitle("");
                    setForumDescription("");
                  }}
                  style={styles.closeButton}
                  disabled={isCreatingForum}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>

              <View style={styles.createForumForm}>
                <Text style={styles.createForumLabel}>Forum Title *</Text>
                <TextInput
                  style={styles.createForumInput}
                  value={forumTitle}
                  onChangeText={setForumTitle}
                  placeholder="Enter forum title (3-100 characters)"
                  maxLength={100}
                  editable={!isCreatingForum}
                />
                <Text style={styles.createForumHelperText}>
                  {forumTitle.length}/100 characters
                </Text>

                <Text style={styles.createForumLabel}>Description *</Text>
                <TextInput
                  style={[styles.createForumInput, styles.createForumTextArea]}
                  value={forumDescription}
                  onChangeText={setForumDescription}
                  placeholder="Enter forum description (10-500 characters)"
                  multiline
                  maxLength={500}
                  editable={!isCreatingForum}
                />
                <Text style={styles.createForumHelperText}>
                  {forumDescription.length}/500 characters
                </Text>
              </View>

              <View style={styles.createForumModalActions}>
                <TouchableOpacity
                  style={styles.cancelForumButton}
                  onPress={() => {
                    setShowCreateForumModal(false);
                    setForumTitle("");
                    setForumDescription("");
                  }}
                  disabled={isCreatingForum}
                >
                  <Text style={styles.cancelForumButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitForumButton,
                    (!forumTitle.trim() || !forumDescription.trim() || isCreatingForum) && styles.submitForumButtonDisabled,
                  ]}
                  onPress={handleCreateForum}
                  disabled={
                    !forumTitle.trim() ||
                    !forumDescription.trim() ||
                    isCreatingForum
                  }
                >
                  {isCreatingForum ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.submitForumButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#000",
    fontFamily: "Rubik-Bold",
  },
  filterButton: {
    padding: 8,
  },
  forumSelectorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  forumSelectorContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  forumChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginRight: 8,
  },
  forumChipActive: {
    backgroundColor: "#256E63",
    borderColor: "#256E63",
  },
  forumChipText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
    fontFamily: "Rubik-SemiBold",
  },
  forumChipTextActive: {
    color: "#fff",
  },
  postsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  postContainer: {
    backgroundColor: "white",
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
    fontFamily: "Rubik-Medium",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    fontFamily: "Rubik-Medium",
  },
  forumBadge: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    marginTop: 2,
  },
  postActions: {
    flexDirection: "row" as const,
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  postContent: {
    marginBottom: 12,
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#374151",
    fontFamily: "Rubik-Regular",
  },
  timestamp: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    textAlign: "right" as const,
    marginTop: 8,
  },
  videoContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: "hidden" as const,
  },
  videoThumbnail: {
    height: 120,
    backgroundColor: "#8B4513",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  videoThumbnailText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold" as const,
    fontFamily: "Rubik-Bold",
  },
  playButton: {
    position: "absolute" as const,
    top: 200,
    left: 200,
    transform: [{ translateX: -12 }, { translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    fontFamily: "Rubik-Medium",
    marginTop: 8,
    marginBottom: 4,
  },
  videoUrl: {
    fontSize: 12,
    color: "#3B82F6",
    fontFamily: "Rubik-Regular",
  },
  interactionBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  leftInteractions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  interactionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginRight: 20,
  },
  interactionText: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    marginLeft: 4,
  },
  greaterThanIcon: {
    fontSize: 18,
    color: "#666",
    fontFamily: "Rubik-Regular",
    fontWeight: "bold" as const,
  },
  startConversationContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  plusButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  conversationInput: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    fontFamily: "Rubik-Regular",
    paddingVertical: 8,
  },
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: 12,
  },
  bottomNavOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "transparent",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  embeddedLinksContainer: {
    marginTop: 12,
  },
  videoDescription: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    marginTop: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F8F5",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: 12,
  },
  // Loading, Error, and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#1F2937",
    marginTop: 16,
    fontFamily: "Rubik-Bold",
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginTop: 8,
    fontFamily: "Rubik-Regular",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold" as const,
    color: "#1F2937",
    marginTop: 24,
    fontFamily: "Rubik-Bold",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center" as const,
    marginTop: 12,
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: "Rubik-Regular",
  },
  createForumButtonInEmpty: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#256E63",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  createForumButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: "Rubik-SemiBold",
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center" as const,
  },
  editModal: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 1000,
  },
  editModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  editModalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 16,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#111827",
    fontFamily: "Rubik-Bold",
  },
  closeButton: {
    padding: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#374151",
    fontFamily: "Rubik-Regular",
    minHeight: 100,
    textAlignVertical: "top" as const,
    marginBottom: 16,
  },
  editModalActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 12,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center" as const,
  },
  cancelEditButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelEditButtonText: {
    color: "#374151",
    fontWeight: "600" as const,
    fontSize: 14,
    fontFamily: "Rubik-SemiBold",
  },
  saveEditButton: {
    backgroundColor: "#256E63",
  },
  saveEditButtonText: {
    color: "#fff",
    fontWeight: "600" as const,
    fontSize: 14,
    fontFamily: "Rubik-SemiBold",
  },
  createForumModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end" as const,
  },
  createForumModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "90%",
  },
  createForumModalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  createForumModalTitle: {
    fontSize: 22,
    fontWeight: "bold" as const,
    color: "#111827",
    fontFamily: "Rubik-Bold",
  },
  createForumForm: {
    marginBottom: 24,
  },
  createForumLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1F2937",
    fontFamily: "Rubik-SemiBold",
    marginBottom: 8,
    marginTop: 16,
  },
  createForumInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    fontFamily: "Rubik-Regular",
    backgroundColor: "#F9FAFB",
  },
  createForumTextArea: {
    minHeight: 120,
    textAlignVertical: "top" as const,
  },
  createForumHelperText: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
    marginTop: 4,
  },
  createForumModalActions: {
    flexDirection: "row" as const,
    gap: 12,
  },
  cancelForumButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelForumButtonText: {
    color: "#374151",
    fontWeight: "600" as const,
    fontSize: 16,
    fontFamily: "Rubik-SemiBold",
  },
  submitForumButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#256E63",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  submitForumButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.6,
  },
  submitForumButtonText: {
    color: "#fff",
    fontWeight: "600" as const,
    fontSize: 16,
    fontFamily: "Rubik-SemiBold",
  },
};
