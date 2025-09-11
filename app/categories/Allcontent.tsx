import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
// import CommentModal from "../components/CommentModal";
import ContentCard from "../components/ContentCard";
import SocketManager from "../services/SocketManager";
import { useMediaStore } from "../store/useUploadStore";
import allMediaAPI from "../utils/allMediaAPI";

const AllContent = () => {
  console.log("🔍 DEBUG: AllContent component rendering");
  console.log("🔍 DEBUG: AllContent component is DEFINITELY rendering!");
  console.log("🔍 DEBUG: AllContent component STARTED!");

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

  // Real-time state
  const [socketManager, setSocketManager] = useState<SocketManager | null>(
    null
  );
  const [realTimeCounts, setRealTimeCounts] = useState<Record<string, any>>({});
  const [viewerCounts, setViewerCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const authToken = await AsyncStorage.getItem("auth_token");
        if (!authToken) {
          console.log("No auth token found, skipping Socket.IO connection");
          return;
        }

        const manager = new SocketManager({
          serverUrl: "https://jevahapp-backend.onrender.com",
          authToken,
        });

        // Set up event handlers
        manager.setEventHandlers({
          onContentReaction: (data) => {
            console.log("Real-time like received:", data);
            // Update local state if needed
          },
          onContentComment: (data) => {
            console.log("Real-time comment received:", data);
            // Update local state if needed
          },
          onCountUpdate: (data) => {
            console.log("Real-time count update:", data);
            setRealTimeCounts((prev) => ({
              ...prev,
              [data.contentId]: data,
            }));
          },
          onViewerCountUpdate: (data) => {
            console.log("Real-time viewer count:", data);
            setViewerCounts((prev) => ({
              ...prev,
              [data.contentId]: data.viewerCount,
            }));
          },
          onLikeNotification: (data) => {
            console.log("New like notification:", data);
            setNotifications((prev) => [
              ...prev,
              {
                id: Date.now(),
                type: "like",
                data,
                timestamp: new Date(),
              },
            ]);
          },
          onCommentNotification: (data) => {
            console.log("New comment notification:", data);
            setNotifications((prev) => [
              ...prev,
              {
                id: Date.now(),
                type: "comment",
                data,
                timestamp: new Date(),
              },
            ]);
          },
        });

        await manager.connect();
        setSocketManager(manager);
        console.log("✅ Socket.IO initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize Socket.IO:", error);
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketManager) {
        socketManager.disconnect();
      }
    };
  }, []);

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

  // Enhanced like handler with real-time updates
  const handleLike = useCallback(
    async (contentId: string, liked: boolean) => {
      try {
        console.log("Like action:", contentId, liked);

        // Send real-time like first for instant feedback
        if (socketManager) {
          socketManager.sendLike(contentId, "media");
        }

        // Then call API
        const response = await allMediaAPI.toggleLike("media", contentId);

        if (response.success) {
          console.log("✅ Like successful:", response.data);
          // Real-time updates will handle UI updates
        } else {
          console.error("❌ Like failed:", response.error);
          Alert.alert("Error", "Failed to update like");
        }
      } catch (error) {
        console.error("Like error:", error);
        Alert.alert("Error", "Failed to update like");
      }
    },
    [socketManager]
  );

  // Enhanced comment handler
  const handleComment = useCallback(
    (contentId: string) => {
      console.log("🎯 Opening comment modal for:", contentId);

      // Join content room for real-time updates
      if (socketManager) {
        socketManager.joinContentRoom(contentId, "media");
      }

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
    [defaultContent, socketManager]
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

  // Handle save to library - ACTUAL IMPLEMENTATION
  console.log("🔍 DEBUG: About to create handleSaveToLibrary function");
  console.log("🔍 DEBUG: Creating handleSaveToLibrary function NOW!");
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
        Alert.alert(
          "Success",
          isBookmarked ? "Removed from library" : "Saved to library"
        );
      } else {
        Alert.alert("Error", response.error || "Failed to update library");
      }
    } catch (error) {
      console.error("🔍 DEBUG: Bookmark error:", error);
      Alert.alert("Error", "Failed to update library");
    }
  };
  console.log(
    "🔍 DEBUG: handleSaveToLibrary function created:",
    !!handleSaveToLibrary
  );
  console.log(
    "🔍 DEBUG: handleSaveToLibrary function type:",
    typeof handleSaveToLibrary
  );
  console.log("🔍 DEBUG: handleSaveToLibrary function:", handleSaveToLibrary);

  // Enhanced render content item with real-time data
  const renderContentItem = ({ item }: { item: any }) => {
    // Get real-time data for this content
    const realTimeData = realTimeCounts[item._id] || {};
    const viewerCount = viewerCounts[item._id] || 0;

    // Merge real-time data with content
    const enhancedItem = {
      ...item,
      likeCount: realTimeData.likeCount ?? item.likeCount,
      commentCount: realTimeData.commentCount ?? item.commentCount,
      shareCount: realTimeData.shareCount ?? item.shareCount,
      viewCount: realTimeData.viewCount ?? item.viewCount,
      liveViewers: viewerCount,
    };

    console.log(
      "🔍 DEBUG: renderContentItem - handleSaveToLibrary:",
      !!handleSaveToLibrary
    );
    console.log("🔍 DEBUG: About to render ContentCard with props:");
    console.log(
      "🔍 DEBUG: - onSaveToLibrary:",
      !!handleSaveToLibrary,
      typeof handleSaveToLibrary
    );
    console.log("🔍 DEBUG: - handleLike:", !!handleLike);
    console.log("🔍 DEBUG: - handleComment:", !!handleComment);
    console.log("🔍 DEBUG: - handleShare:", !!handleShare);
    console.log("🔍 DEBUG: - handleAuthorPress:", !!handleAuthorPress);

    return (
      <ContentCard
        content={enhancedItem}
        onLike={handleLike}
        onComment={handleComment}
        onShare={handleShare}
        onAuthorPress={handleAuthorPress}
        onSaveToLibrary={handleSaveToLibrary}
        socketManager={socketManager}
      />
    );
  };

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

  // Render connection status
  const renderConnectionStatus = useCallback(() => {
    if (!socketManager) return null;

    return (
      <View
        style={{
          padding: 8,
          backgroundColor: socketManager.isConnected() ? "#4CAF50" : "#f44336",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 12 }}>
          {socketManager.isConnected() ? "🟢 Connected" : "🔴 Disconnected"}
        </Text>
      </View>
    );
  }, [socketManager]);

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
      {renderConnectionStatus()}

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
      {/* <CommentModal
        visible={commentModalVisible}
        onClose={() => {
          setCommentModalVisible(false);
          // Leave content room when closing modal
          if (socketManager && selectedContentId) {
            socketManager.leaveContentRoom(selectedContentId, "media");
          }
        }}
        contentId={selectedContentId}
        contentTitle={selectedContentTitle}
        onCommentPosted={(comment) => {
          console.log("New comment posted:", comment);
          // Send real-time comment
          if (socketManager) {
            socketManager.sendComment(selectedContentId, "media", comment.text);
          }
        }}
        socketManager={socketManager}
      /> */}
    </>
  );
};

export default AllContent;
