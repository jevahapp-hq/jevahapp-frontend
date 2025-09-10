import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import ContentCard from "../components/ContentCard";
import { useMediaStore } from "../store/useUploadStore";
import allMediaAPI from "../utils/allMediaAPI";

const AllContentNew = () => {
  const {
    defaultContent,
    defaultContentLoading,
    defaultContentError,
    defaultContentPagination,
    fetchDefaultContent,
    loadMoreDefaultContent,
    refreshDefaultContent,
  } = useMediaStore();

  // Load default content on mount
  useEffect(() => {
    console.log("🚀 AllContentNew: Loading default content from backend...");
    console.log(
      "🌐 API Base URL:",
      process.env.EXPO_PUBLIC_API_URL || "https://jevahapp-backend.onrender.com"
    );

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
      // TODO: Call your like API
      console.log("Like action:", contentId, liked);
      // const response = await toggleLike('media', contentId);
      // if (response.success) {
      //   // Update local state
      // }
    } catch (error) {
      console.error("Like error:", error);
    }
  }, []);

  // Handle comment
  const handleComment = useCallback((contentId: string) => {
    // TODO: Navigate to comments screen
    console.log("Navigate to comments for:", contentId);
  }, []);

  // Handle share
  const handleShare = useCallback(async (contentId: string) => {
    try {
      // TODO: Call your share API
      console.log("Share action:", contentId);
      // const response = await shareContent('media', contentId, 'general', 'Check this out!');
      // if (response.success) {
      //   // Handle success
      // }
    } catch (error) {
      console.error("Share error:", error);
    }
  }, []);

  // Handle author press
  const handleAuthorPress = useCallback((authorId: string) => {
    // TODO: Navigate to author profile
    console.log("Navigate to author profile:", authorId);
  }, []);

  // Render content item
  const renderContentItem = useCallback(
    ({ item }: { item: any }) => (
      <ContentCard
        content={item}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onAuthorPress={handleAuthorPress}
      />
    ),
    [handleLike, handleComment, handleShare, handleAuthorPress]
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
  );
};

export default AllContentNew;
