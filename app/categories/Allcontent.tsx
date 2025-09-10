import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import CommentModal from "../components/CommentModal";
import ContentCard from "../components/ContentCard";
import { useMediaStore } from "../store/useUploadStore";
import allMediaAPI from "../utils/allMediaAPI";

const AllContent = () => {
  const {
    defaultContent,
    defaultContentLoading,
    defaultContentError,
    defaultContentPagination,
    fetchDefaultContent,
    loadMoreDefaultContent,
    refreshDefaultContent,
  } = useMediaStore();

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState<string>("");
  const [selectedContentTitle, setSelectedContentTitle] = useState<string>("");

  // Load default content on mount
  useEffect(() => {
    console.log("🚀 AllContent: Loading default content from backend...");

    // Test available endpoints first
    allMediaAPI.testAvailableEndpoints();

    // Then fetch content
    fetchDefaultContent({ page: 1, limit: 10 });
  }, [fetchDefaultContent]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refreshDefaultContent();
  }, [refreshDefaultContent]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    loadMoreDefaultContent();
  }, [loadMoreDefaultContent]);

  // Handle like
  const handleLike = useCallback(async (contentId: string, liked: boolean) => {
    try {
      console.log("Like action:", contentId, liked);

      const response = await allMediaAPI.toggleLike("media", contentId);

      if (response.success) {
        console.log("✅ Like successful:", response.data);
        // The UI will update automatically through the ContentCard component
        // You can add additional state management here if needed
      } else {
        console.error("❌ Like failed:", response.error);
        Alert.alert("Error", "Failed to update like");
      }
    } catch (error) {
      console.error("Like error:", error);
      Alert.alert("Error", "Failed to update like");
    }
  }, []);

  // Handle comment
  const handleComment = useCallback(
    (contentId: string) => {
      console.log("🎯 Opening comment modal for:", contentId);
      console.log("📊 Available content items:", defaultContent.length);
      console.log(
        "🔍 Content item found:",
        defaultContent.find((item) => item._id === contentId)
      );

      // Find the content item to get the title
      const contentItem = defaultContent.find((item) => item._id === contentId);

      setSelectedContentId(contentId);
      setSelectedContentTitle(contentItem?.title || "Content");
      setCommentModalVisible(true);

      console.log("✅ Modal state set:", {
        contentId,
        title: contentItem?.title || "Content",
        modalVisible: true,
      });
    },
    [defaultContent]
  );

  // Handle share
  const handleShare = useCallback(async (contentId: string) => {
    try {
      console.log("Share action:", contentId);

      const response = await allMediaAPI.shareContent(
        "media",
        contentId,
        "general",
        "Check this out!"
      );

      if (response.success) {
        console.log("✅ Share successful:", response.data);
        Alert.alert("Success", "Content shared successfully!");
      } else {
        console.error("❌ Share failed:", response.error);
        Alert.alert("Error", "Failed to share content");
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share content");
    }
  }, []);

  // Handle author press
  const handleAuthorPress = useCallback((authorId: string) => {
    console.log("Navigate to author profile:", authorId);
    // Navigate to author profile
    // Example: router.push('/profile', { userId: authorId });
  }, []);

  // Handle save to library
  const handleSaveToLibrary = useCallback(
    async (contentId: string, isBookmarked: boolean) => {
      try {
        console.log("Save to library action:", contentId, isBookmarked);

        const response = isBookmarked
          ? await allMediaAPI.unbookmarkContent(contentId)
          : await allMediaAPI.bookmarkContent(contentId);

        if (response.success) {
          console.log("✅ Bookmark successful:", response.data);
          Alert.alert(
            "Success",
            isBookmarked ? "Removed from library" : "Saved to library"
          );
        } else {
          console.error("❌ Bookmark failed:", response.error);
          Alert.alert("Error", "Failed to update library");
        }
      } catch (error) {
        console.error("Bookmark error:", error);
        Alert.alert("Error", "Failed to update library");
      }
    },
    []
  );

  // Render content item
  const renderContentItem = useCallback(
    ({ item }: { item: any }) => (
      <ContentCard
        content={item}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onAuthorPress={handleAuthorPress}
        onSaveToLibrary={handleSaveToLibrary}
      />
    ),
    [
      handleLike,
      handleComment,
      handleShare,
      handleAuthorPress,
      handleSaveToLibrary,
    ]
  );

  // Render loading indicator
  const renderFooter = useCallback(() => {
    if (!defaultContentLoading) return null;

    return (
      <View style={{ padding: 20, alignItems: "center" }}>
        <ActivityIndicator size="small" color="#666" />
      </View>
    );
  }, [defaultContentLoading]);

  // Render empty state
  const renderEmpty = useCallback(
    () => (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        <Text style={{ fontSize: 18, color: "#666" }}>
          No content available
        </Text>
        <Text style={{ fontSize: 14, color: "#999", marginTop: 8 }}>
          Pull down to refresh
        </Text>
      </View>
    ),
    []
  );

  if (defaultContentLoading && defaultContent.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#666" />
        <Text style={{ marginTop: 12, fontSize: 16, color: "#666" }}>
          Loading content...
        </Text>
      </View>
    );
  }

  if (defaultContentError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 40,
        }}
      >
        <Text style={{ fontSize: 18, color: "#e74c3c", textAlign: "center" }}>
          Error loading content
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#666",
            marginTop: 8,
            textAlign: "center",
          }}
        >
          {defaultContentError}
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={defaultContent}
        renderItem={renderContentItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={defaultContentLoading && defaultContent.length > 0}
            onRefresh={handleRefresh}
            colors={["#666"]}
            tintColor="#666"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
      />

      {/* Comment Modal */}
      <CommentModal
        visible={commentModalVisible}
        onClose={() => setCommentModalVisible(false)}
        contentId={selectedContentId}
        contentTitle={selectedContentTitle}
        onCommentPosted={(comment) => {
          console.log("New comment posted:", comment);
          // You can add additional logic here if needed
        }}
      />
    </>
  );
};

export default AllContent;
