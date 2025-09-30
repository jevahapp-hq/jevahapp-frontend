import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthHeader from "../components/AuthHeader";
import { SafeImage } from "../components/SafeImage";
import { useNotifications } from "../hooks/useNotifications";
import { notificationAPIService } from "../services/NotificationAPIService";

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    loadMoreNotifications,
    hasMore,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      Alert.alert("Success", "All notifications marked as read");
    } catch (error) {
      Alert.alert("Error", "Failed to mark notifications as read");
    }
  }, [markAllAsRead]);

  const handleLoadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await loadMoreNotifications();
    }
  }, [hasMore, loading, loadMoreNotifications]);

  const handleNotificationPress = useCallback(
    async (notification: any) => {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }
      // TODO: Navigate to relevant content or user profile
    },
    [markAsRead]
  );

  // Utility functions
  const formatTimeAgo = useCallback((dateString: string): string => {
    return notificationAPIService.formatTimeAgo(dateString);
  }, []);

  const getNotificationIcon = useCallback((type: string): string => {
    return notificationAPIService.getNotificationIcon(type);
  }, []);

  const getNotificationColor = useCallback((type: string): string => {
    return notificationAPIService.getNotificationColor(type);
  }, []);

  const groupNotificationsByTime = useCallback(
    (notifications: any[]): any[] => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const newNotifications = notifications.filter(
        (notif) => new Date(notif.createdAt) > oneDayAgo
      );
      const weekNotifications = notifications.filter(
        (notif) =>
          new Date(notif.createdAt) > oneWeekAgo &&
          new Date(notif.createdAt) <= oneDayAgo
      );
      const monthNotifications = notifications.filter(
        (notif) =>
          new Date(notif.createdAt) > oneMonthAgo &&
          new Date(notif.createdAt) <= oneWeekAgo
      );

      const sections: any[] = [];

      if (newNotifications.length > 0) {
        sections.push({ category: "New", items: newNotifications });
      }
      if (weekNotifications.length > 0) {
        sections.push({ category: "Last 7 days", items: weekNotifications });
      }
      if (monthNotifications.length > 0) {
        sections.push({ category: "Last 30 days", items: monthNotifications });
      }

      return sections;
    },
    []
  );

  const renderNotificationItem = (notification: any) => (
    <TouchableOpacity
      key={notification._id}
      onPress={() => handleNotificationPress(notification)}
      className={`bg-white rounded-[10px] shadow-sm p-3 h-[215px] mb-4 ${
        !notification.isRead ? "border-l-4 border-[#256E63]" : ""
      }`}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[#475467] mb-1 font-medium">
          {getNotificationIcon(notification.type)} {notification.title}
        </Text>
        {!notification.isRead && (
          <View className="w-2 h-2 bg-[#256E63] rounded-full" />
        )}
      </View>

      <View className="flex-row items-center mb-2">
        <SafeImage
          uri={notification.metadata?.actorAvatar}
          className="w-6 h-6 rounded-full mr-2"
          fallbackText={
            notification.metadata?.actorName?.[0]?.toUpperCase() || "U"
          }
          showFallback={true}
        />
        <Text className="font-rubik-semibold text-[#667085] text-[12px]">
          {notification.metadata?.actorName || "Someone"}
        </Text>
        <View className="flex-row items-center ml-3">
          <Text className="text-[#FFD9B3] text-[18px] text-xs font-rubik">
            •
          </Text>
          <Text className="text-xs text-[#667085] font-rubik ml-1">
            {formatTimeAgo(notification.createdAt)}
          </Text>
        </View>
      </View>

      <Text className="mb-2 ml-8 text-[#1D2939] font-rubik">
        {notification.message}
      </Text>

      <TouchableOpacity>
        <Text className="text-[#256E63] font-bold text-xs ml-8">REPLY</Text>
      </TouchableOpacity>

      {notification.metadata?.thumbnailUrl && (
        <View className="mt-3 flex-row items-start space-x-3 bg-[#F3F3F4] rounded-md p-3">
          <Image
            source={{ uri: notification.metadata.thumbnailUrl }}
            className="w-14 h-14 rounded-md"
          />
          <View className="flex-1 ml-3">
            <Text className="font-rubik-semibold text-[#1D2939]">
              {notification.metadata.contentTitle || "Content"}
            </Text>
            <Text
              className="text-[#667085] font-rubik text-sm"
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {notification.metadata.contentType || "media"}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Ionicons name="notifications-outline" size={64} color="#D1D5DB" />
      <Text className="text-[#6B7280] text-lg font-rubik-semibold mt-4">
        No Notifications
      </Text>
      <Text className="text-[#9CA3AF] text-sm font-rubik text-center mt-2 px-8">
        You'll see notifications here when someone likes, comments, or shares
        your content.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color="#FEA74E" />
      <Text className="text-[#6B7280] text-sm font-rubik mt-4">
        Loading notifications...
      </Text>
    </View>
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-4">
          <AuthHeader title="Notifications" />
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#256E63" />
          <Text className="mt-4 text-gray-600">Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedNotifications = groupNotificationsByTime(notifications);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4">
        <AuthHeader title="Notifications" />
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            className="bg-[#256E63] px-4 py-2 rounded-lg self-end mt-2"
          >
            <Text className="text-white font-semibold text-sm">
              Mark all as read ({unreadCount})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error State */}
      {error && (
        <View className="mx-4 mb-4 bg-red-50 p-3 rounded-lg">
          <Text className="text-red-800 text-sm font-rubik-semibold">
            {error}
          </Text>
        </View>
      )}

      {/* Scrollable Body */}
      <ScrollView
        className="px-7 bg-[#F3F3F4]"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - 20;
          if (isCloseToBottom && hasMore && !loading) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {groupedNotifications.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-6xl mb-4">🔔</Text>
            <Text className="text-xl font-semibold text-gray-800 mb-2">
              No notifications yet
            </Text>
            <Text className="text-gray-600 text-center">
              When people interact with your content, you'll see notifications
              here.
            </Text>
          </View>
        ) : (
          groupedNotifications.map((section, idx) => (
            <View key={idx} className="mt-5">
              <Text className="text-[#1D2939] font-rubik-semibold mb-2">
                {section.category}
              </Text>
              {section.items.map(renderNotificationItem)}
            </View>
          ))
        )}

        {/* Load More Indicator */}
        {loading && notifications.length > 0 && (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#256E63" />
            <Text className="text-gray-600 text-sm mt-2">Loading more...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
