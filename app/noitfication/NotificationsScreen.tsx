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
      className={`bg-white rounded-[12px] shadow-sm p-4 mb-4 ${
        !notification.isRead ? "border-l-4 border-[#256E63]" : ""
      }`}
    >
      <View className="flex-row items-start">
        {/* Circle Avatar */}
        <View 
          className="mr-3" 
          style={{ 
            width: 40, 
            height: 40,
            overflow: 'hidden',
            borderRadius: 20,
          }}
        >
          <SafeImage
            uri={notification.metadata?.actorAvatar}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
            }}
            fallbackStyle={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#E4E7EC',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            fallbackText={
              notification.metadata?.actorName?.[0]?.toUpperCase() || "U"
            }
            showFallback={true}
          />
          {!notification.isRead && (
            <View 
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 14,
                height: 14,
                backgroundColor: '#256E63',
                borderRadius: 7,
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
            />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Name and Time Row */}
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-rubik-semibold text-[#1D2939] text-[15px]">
              {notification.metadata?.actorName || "Someone"}
            </Text>
            <Text className="text-[#98A2B3] font-rubik text-[12px]">
              {formatTimeAgo(notification.createdAt)}
            </Text>
          </View>

          {/* What they did */}
          <Text className="text-[#475467] font-rubik text-[14px] leading-5 mb-2">
            {notification.message || notification.title}
          </Text>

          {/* Content Preview if available */}
          {notification.metadata?.thumbnailUrl && (
            <View className="mt-2 flex-row items-center bg-[#F9FAFB] rounded-lg p-2 border border-[#E4E7EC]">
              <Image
                source={{ uri: notification.metadata.thumbnailUrl }}
                className="w-12 h-12 rounded-md"
                resizeMode="cover"
              />
              <View className="flex-1 ml-2">
                <Text 
                  className="font-rubik-semibold text-[#1D2939] text-[13px]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {notification.metadata.contentTitle || "Content"}
                </Text>
                <Text
                  className="text-[#667085] font-rubik text-[11px] mt-0.5"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {notification.metadata.contentType || "media"}
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity className="mt-2 self-start">
            <Text className="text-[#256E63] font-rubik-bold text-[12px]">
              REPLY
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
