import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import ContentCard from "../components/ContentCard";
import { useNotification } from "../context/NotificationContext";
import { useLibraryStore } from "../store/useLibraryStore";
import { useMediaStore } from "../store/useUploadStore";
import allMediaAPI from "../utils/allMediaAPI";

const AllContentNew = ({ contentType = "ALL" }: { contentType?: string }) => {
  const {
    defaultContent,
    defaultContentLoading,
    defaultContentError,
    defaultContentPagination,
    fetchDefaultContent,
    loadMoreDefaultContent,
    refreshDefaultContent,
  } = useMediaStore();

  // Library store for tracking saved items
  const { loadSavedItems, isLoaded } = useLibraryStore();

  // Filter content based on contentType
  const filteredContent = useMemo(() => {
    if (!defaultContent || !Array.isArray(defaultContent)) return [];
    if (contentType === "ALL") return defaultContent;

    const typeMap: Record<string, string[]> = {
      LIVE: ["live"],
      SERMON: ["sermon", "teachings"],
      MUSIC: ["music", "audio"],
      "E-BOOKS": ["e-books", "ebook"],
      VIDEO: ["videos", "video"],
    };

    const allowedTypes = typeMap[contentType] || [contentType.toLowerCase()];
    return defaultContent.filter((item: any) =>
      allowedTypes.some((allowedType) =>
        item.contentType?.toLowerCase().includes(allowedType.toLowerCase())
      )
    );
  }, [defaultContent, contentType]);

  const notificationContext = useNotification();
  const router = useRouter();

  // Safety check for notification system
  const showNotification =
    notificationContext?.showNotification ||
    (() => {
      console.warn("Notification system not available");
    });

  // Load default content and library store on mount
  useEffect(() => {
    console.log("🚀 AllContentNew: Loading default content from backend...");
    console.log(
      "🌐 API Base URL:",
      process.env.EXPO_PUBLIC_API_URL || "https://jevahapp-backend.onrender.com"
    );

    // Test available endpoints first
    allMediaAPI.testAvailableEndpoints();

    // Load library store to track saved items
    loadSavedItems();

    // Then fetch content
    fetchDefaultContent({ page: 1, limit: 10 });
  }, [fetchDefaultContent, loadSavedItems]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refreshDefaultContent();
  }, [refreshDefaultContent]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    loadMoreDefaultContent();
  }, [loadMoreDefaultContent]);

  // Handle like
  const handleLike = useCallback(
    async (contentId: string, liked: boolean) => {
      try {
        console.log("🔄 Like action:", contentId, liked);

        // Call the like API
        const response = await allMediaAPI.toggleLike("media", contentId);

        if (response.success) {
          console.log("✅ Like successful:", response.data);
          // The ContentCard component will handle the UI update
          // based on the response from the API
        } else {
          console.error("❌ Like failed:", response.error);
          // Show error notification
          showNotification({
            type: "error",
            title: "Like Failed",
            message: response.error || "Failed to update like",
            icon: "heart",
            duration: 3000,
          });
        }
      } catch (error) {
        console.error("❌ Like error:", error);
        // Show error notification
        showNotification({
          type: "error",
          title: "Connection Error",
          message: "Unable to update like. Please check your connection.",
          icon: "wifi-off",
          duration: 3000,
        });
      }
    },
    [showNotification]
  );

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

  // Handle save to library
  const handleSaveToLibrary = async (
    contentId: string,
    isBookmarked: boolean
  ) => {
    console.log("🔍 DEBUG: handleSaveToLibrary function called!");
    console.log("🔍 DEBUG: Content ID:", contentId);
    console.log("🔍 DEBUG: Is bookmarked:", isBookmarked);

    try {
      let response;
      if (isBookmarked) {
        // Unbookmark content
        console.log("🔍 DEBUG: Calling unbookmarkContent API");
        response = await allMediaAPI.unbookmarkContent(contentId);
      } else {
        // Bookmark content
        console.log("🔍 DEBUG: Calling bookmarkContent API");
        response = await allMediaAPI.bookmarkContent(contentId);
      }

      console.log("🔍 DEBUG: API Response:", response);

      if (response.success) {
        // Success notification
        showNotification({
          type: "success",
          title: isBookmarked ? "Removed from Library" : "Saved to Library",
          message: isBookmarked
            ? "Content has been removed from your library"
            : "Content has been saved to your library",
          icon: isBookmarked ? "bookmark-remove" : "bookmark",
          actionText: isBookmarked ? undefined : "View Library",
          onAction: isBookmarked
            ? undefined
            : () => {
                // Navigate to library page
                router.push("/screens/library" as any);
              },
          duration: 4000,
        });
      } else {
        // Handle specific error cases
        const errorMessage = response.error || "Failed to update library";

        if (errorMessage.includes("Media already saved")) {
          // Already saved - show info notification with option to view library
          showNotification({
            type: "info",
            title: "Already in Library",
            message: "This content is already saved in your library",
            icon: "bookmark",
            actionText: "View Library",
            onAction: () => {
              router.push("/screens/library" as any);
            },
            duration: 5000,
          });
        } else if (errorMessage.includes("Media not found")) {
          // Not found error
          showNotification({
            type: "error",
            title: "Content Not Found",
            message: "This content could not be found",
            icon: "error",
            duration: 3000,
          });
        } else {
          // Generic error
          showNotification({
            type: "error",
            title: "Save Failed",
            message: errorMessage,
            icon: "error",
            duration: 4000,
          });
        }
      }
    } catch (error) {
      console.error("🔍 DEBUG: Bookmark error:", error);

      // Network or other errors
      showNotification({
        type: "error",
        title: "Connection Error",
        message: "Unable to save to library. Please check your connection.",
        icon: "wifi-off",
        duration: 4000,
      });
    }
  };

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
          {contentType === "ALL"
            ? "No content available"
            : `No ${contentType.toLowerCase()} content available`}
        </Text>
        <Text style={{ fontSize: 14, color: "#999", marginTop: 8 }}>
          Pull down to refresh
        </Text>
      </View>
    ),
    [contentType]
  );

  if ((defaultContentLoading && filteredContent.length === 0) || !isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#666" />
        <Text style={{ marginTop: 12, fontSize: 16, color: "#666" }}>
          Loading{" "}
          {contentType === "ALL"
            ? "content"
            : `${contentType.toLowerCase()} content`}
          ...
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
      data={filteredContent}
      renderItem={renderContentItem}
      keyExtractor={(item) => item._id}
      refreshControl={
        <RefreshControl
          refreshing={defaultContentLoading && filteredContent.length > 0}
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
